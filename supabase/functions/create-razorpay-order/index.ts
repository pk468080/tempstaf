import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PaymentAction = "create_order" | "mark_payment_failed";

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req: Request) => {
  let failureBookingId: string | null = null;
  let shouldMarkPaymentFailed = false;

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse(
        { success: false, error: "Method not allowed" },
        405
      );
    }

    const authorization =
      req.headers.get("Authorization");

    if (!authorization) {
      return jsonResponse(
        {
          success: false,
          error: "Authentication required",
        },
        401
      );
    }

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const razorpayKeyId =
      Deno.env.get("RAZORPAY_KEY_ID");

    const razorpayKeySecret =
      Deno.env.get("RAZORPAY_KEY_SECRET");

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      throw new Error(
        "Supabase server configuration is missing."
      );
    }

    if (
      !razorpayKeyId ||
      !razorpayKeySecret
    ) {
      throw new Error(
        "Razorpay secrets are not configured."
      );
    }

    const userClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
      }
    );

    const {
      data: {
        user,
      },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        {
          success: false,
          error: "Authentication required.",
        },
        401
      );
    }

    const body = await req.json();

    const action: PaymentAction =
      body?.action === "mark_payment_failed"
        ? "mark_payment_failed"
        : "create_order";

    const bookingId =
      body?.bookingId;

    if (
      !bookingId ||
      typeof bookingId !== "string"
    ) {
      return jsonResponse(
        {
          success: false,
          error: "bookingId is required.",
        },
        400
      );
    }

    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    const {
      data: booking,
      error: bookingError,
    } = await adminClient
      .from("bookings")
      .select(
        `
          id,
          customer_id,
          status,
          fulfillment_type,
          total_amount,
          pricing_snapshot
        `
      )
      .eq("id", bookingId)
      .eq("customer_id", user.id)
      .maybeSingle();

    if (bookingError) {
      console.error(
        "Booking lookup failed:",
        bookingError
      );

      throw new Error(
        "Unable to load booking."
      );
    }

    if (!booking) {
      return jsonResponse(
        {
          success: false,
          error: "Booking not found.",
        },
        404
      );
    }

    if (action === "mark_payment_failed") {
      if (booking.status === "paid") {
        return jsonResponse(
          {
            success: false,
            error: "A paid booking cannot be marked as payment failed.",
          },
          409
        );
      }

      if (booking.status === "pending_payment") {
        const { error: statusError } = await adminClient
          .from("bookings")
          .update({ status: "payment_failed" })
          .eq("id", bookingId)
          .eq("customer_id", user.id)
          .eq("status", "pending_payment");

        if (statusError) {
          throw new Error("Unable to mark the booking payment as failed.");
        }
      }

      return jsonResponse({
        success: true,
        bookingId,
        status: "payment_failed",
      });
    }

    if (
      booking.fulfillment_type !== "scheduled" &&
      booking.fulfillment_type !== "instant"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "This payment flow is only for instant or scheduled bookings.",
        },
        400
      );
    }

    if (
      booking.status !== "pending_payment" &&
      booking.status !== "payment_failed"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "This booking is not awaiting payment.",
        },
        409
      );
    }

    if (booking.status === "payment_failed") {
      const { error: statusError } = await adminClient
        .from("bookings")
        .update({ status: "pending_payment" })
        .eq("id", bookingId)
        .eq("customer_id", user.id)
        .eq("status", "payment_failed");

      if (statusError) {
        throw new Error("Unable to reopen the booking for payment.");
      }
    }

    failureBookingId = bookingId;
    shouldMarkPaymentFailed = true;

    const amount =
      Number(booking.total_amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new Error(
        "Booking has an invalid payment amount."
      );
    }

    const pricingSnapshot =
      booking.pricing_snapshot;

    const currency =
      pricingSnapshot &&
      typeof pricingSnapshot === "object" &&
      "currency" in pricingSnapshot &&
      typeof pricingSnapshot.currency === "string"
        ? pricingSnapshot.currency
        : null;

    if (!currency) {
      throw new Error(
        "Booking payment currency is missing."
      );
    }

    /*
     * Reuse an existing pending Razorpay order
     * for this booking when possible.
     */
    const {
      data: existingPayment,
      error: existingPaymentError,
    } = await adminClient
      .from("payments")
      .select(
        `
          id,
          provider_order_id,
          amount,
          currency,
          status
        `
      )
      .eq("booking_id", bookingId)
      .eq("provider", "razorpay")
      .eq("status", "pending")
      .not(
        "provider_order_id",
        "is",
        null
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    if (existingPaymentError) {
      console.error(
        "Existing payment lookup failed:",
        existingPaymentError
      );

      throw new Error(
        "Unable to load existing payment."
      );
    }

      if (
      existingPayment?.provider_order_id &&
      Number(existingPayment.amount) === amount &&
      existingPayment.currency === currency
    ) {
      const razorpayAuth = btoa(
        `${razorpayKeyId}:${razorpayKeySecret}`
      );

      /*
       * A local "pending" payment does not prove that the
       * Razorpay order is still payable. The previous checkout
       * may already have succeeded while local finalization failed.
       *
       * Ask Razorpay for the payments attached to this order before
       * reusing the order.
       */
      const paymentsResponse = await fetch(
        `https://api.razorpay.com/v1/orders/${encodeURIComponent(
          existingPayment.provider_order_id
        )}/payments`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${razorpayAuth}`,
          },
        }
      );

      const paymentsData =
        await paymentsResponse.json();

      if (!paymentsResponse.ok) {
        console.error(
          "Razorpay existing-order lookup failed:",
          paymentsData
        );

        throw new Error(
          paymentsData?.error?.description ||
            "Unable to verify existing Razorpay order."
        );
      }

      const capturedPayment =
        Array.isArray(paymentsData?.items)
          ? paymentsData.items.find(
              (item: Record<string, unknown>) =>
                item.status === "captured"
            )
          : null;

      if (capturedPayment?.id) {
        /*
         * We have provider-side proof that this order was already paid.
         * Never open Checkout again for this order.
         */
        const capturedAmount =
          Number(capturedPayment.amount);

        const capturedCurrency =
          typeof capturedPayment.currency === "string"
            ? capturedPayment.currency
            : null;

        if (
          !Number.isFinite(capturedAmount) ||
          capturedAmount !== Math.round(amount * 100)
        ) {
          shouldMarkPaymentFailed = false;

          console.error(
            "Captured Razorpay amount does not match booking amount.",
            {
              bookingId,
              expectedAmount: Math.round(amount * 100),
              capturedAmount,
              providerOrderId:
                existingPayment.provider_order_id,
              providerPaymentId:
                capturedPayment.id,
            }
          );

          throw new Error(
            "The captured Razorpay payment amount does not match this booking."
          );
        }

        if (
          !capturedCurrency ||
          capturedCurrency !== currency
        ) {
          shouldMarkPaymentFailed = false;

          console.error(
            "Captured Razorpay currency does not match booking currency.",
            {
              bookingId,
              expectedCurrency: currency,
              capturedCurrency,
              providerOrderId:
                existingPayment.provider_order_id,
              providerPaymentId:
                capturedPayment.id,
            }
          );

          throw new Error(
            "The captured Razorpay payment currency does not match this booking."
          );
        }

        /*
         * From this point onward Razorpay has confirmed a successful
         * payment. Do not mark the booking as payment_failed if local
         * finalization encounters an error.
         */
        shouldMarkPaymentFailed = false;

        const { data: finalizationResult, error: finalizationError } =
          await adminClient.rpc(
            "finalize_razorpay_payment",
            {
              p_payment_id: existingPayment.id,
              p_provider_payment_id:
                String(capturedPayment.id),
              p_paid_at:
                typeof capturedPayment.created_at === "number"
                  ? new Date(
                      capturedPayment.created_at * 1000
                    ).toISOString()
                  : new Date().toISOString(),
            }
          );

        if (finalizationError) {
          console.error(
            "Existing Razorpay payment finalization failed:",
            finalizationError
          );

          throw new Error(
            "A Razorpay payment was found, but it could not be finalized."
          );
        }

        if (
          !finalizationResult ||
          finalizationResult.success !== true
        ) {
          console.error(
            "Unexpected existing Razorpay finalization result:",
            finalizationResult
          );

          throw new Error(
            "A Razorpay payment was found, but it could not be finalized."
          );
        }

        return jsonResponse({
          success: true,
          alreadyPaid: true,
          bookingId,
          paymentId: String(capturedPayment.id),
          status:
            finalizationResult.booking_status ??
            "paid",
          assigned:
            finalizationResult.assigned ?? false,
          workerId:
            finalizationResult.worker_id ?? null,
        });
      }

      /*
       * No captured payment exists.
       * The pending Razorpay order can safely be reused.
       */
      return jsonResponse({
        success: true,
        keyId: razorpayKeyId,
        orderId:
          existingPayment.provider_order_id,
        amount: Math.round(amount * 100),
        currency,
      });
    }

    const amountInPaise =
      Math.round(amount * 100);

    if (
      !Number.isInteger(amountInPaise) ||
      amountInPaise <= 0
    ) {
      throw new Error(
        "Invalid payment amount."
      );
    }

    const receipt =
      `ts_${bookingId}`;

    const razorpayAuth =
      btoa(
        `${razorpayKeyId}:${razorpayKeySecret}`
      );

    const razorpayResponse =
      await fetch(
        "https://api.razorpay.com/v1/orders",
        {
          method: "POST",
          headers: {
            Authorization:
              `Basic ${razorpayAuth}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            amount:
              amountInPaise,
            currency,
            receipt,
            notes: {
              tempstaff_booking_id:
                bookingId,
            },
          }),
        }
      );

    const razorpayData =
      await razorpayResponse.json();

    if (!razorpayResponse.ok) {
      console.error(
        "Razorpay order creation failed:",
        razorpayData
      );

      throw new Error(
        razorpayData?.error?.description ||
          "Unable to create Razorpay order."
      );
    }

    const {
      error: paymentInsertError,
    } = await adminClient
      .from("payments")
      .insert({
        booking_id:
          bookingId,
        provider:
          "razorpay",
        provider_order_id:
          razorpayData.id,
        amount,
        currency,
        status:
          "pending",
      });

    if (paymentInsertError) {
      console.error(
        "Payment record creation failed:",
        paymentInsertError
      );

      /*
       * The Razorpay order exists, but the local
       * payment record does not. Do not pretend
       * that the payment is ready.
       */
      throw new Error(
        "Unable to create payment record."
      );
    }

    return jsonResponse({
      success: true,
      keyId: razorpayKeyId,
      orderId:
        razorpayData.id,
      amount:
        razorpayData.amount,
      currency:
        razorpayData.currency,
      receipt:
        razorpayData.receipt,
    });
  } catch (error) {
    if (shouldMarkPaymentFailed && failureBookingId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (supabaseUrl && serviceRoleKey) {
        const statusClient = createClient(
          supabaseUrl,
          serviceRoleKey
        );

        const { error: statusError } = await statusClient
          .from("bookings")
          .update({ status: "payment_failed" })
          .eq("id", failureBookingId)
          .eq("status", "pending_payment");

        if (statusError) {
          console.error(
            "Unable to mark failed payment order:",
            statusError
          );
        }
      }
    }

    console.error(
      "[TempStaff] create-razorpay-order error:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      500
    );
  }
});
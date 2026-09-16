import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    if (
      booking.fulfillment_type !==
      "scheduled"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "This payment flow is only for scheduled bookings.",
        },
        400
      );
    }

    if (
      booking.status !==
      "pending_payment"
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
      return jsonResponse({
        success: true,
        keyId: razorpayKeyId,
        orderId:
          existingPayment.provider_order_id,
        amount:
          Math.round(amount * 100),
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
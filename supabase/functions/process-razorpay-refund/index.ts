import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

type RefundRow = {
  id: string;
  payment_id: string;
  booking_id: string;
  amount: number | string;
  currency: string;
  status: string;
  provider_refund_id: string | null;
  failure_reason: string | null;
  refund_request_id: string | null;
  updated_at?: string;
};

function basicAuth(keyId: string, keySecret: string) {
  return `Basic ${btoa(`${keyId}:${keySecret}`)}`;
}

async function readProviderError(response: Response) {
  const data = await response.json().catch(() => null);
  return {
    data,
    status: response.status,
    message:
      data?.error?.description ||
      data?.error?.reason ||
      data?.message ||
      `Razorpay request failed with HTTP ${response.status}`,
  };
}

async function finalizeRefund(
  supabaseUrl: string,
  serviceRoleKey: string,
  refundId: string,
  status: "processing" | "succeeded" | "failed" | "cancelled",
  providerRefundId?: string | null,
  failureReason?: string | null,
) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/finalize_payment_refund`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_refund_id: refundId,
        p_status: status,
        p_provider_refund_id: providerRefundId || null,
        p_failure_reason: failureReason || null,
      }),
    },
  );

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message ||
        result?.error ||
        `Unable to finalize refund as ${status}`,
    );
  }

  return result;
}

async function fetchRazorpayPayment(
  paymentId: string,
  keyId: string,
  keySecret: string,
) {
  const response = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: basicAuth(keyId, keySecret),
      },
    },
  );

  const parsed = await readProviderError(response);

  if (!response.ok) {
    const error = new Error(parsed.message);
    Object.assign(error, {
      providerStatus: parsed.status,
      providerData: parsed.data,
    });
    throw error;
  }

  return parsed.data;
}

async function fetchRazorpayRefunds(
  paymentId: string,
  keyId: string,
  keySecret: string,
) {
  const response = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(
      paymentId,
    )}/refunds?count=100`,
    {
      headers: {
        Authorization: basicAuth(keyId, keySecret),
      },
    },
  );

  const parsed = await readProviderError(response);

  if (!response.ok) {
    const error = new Error(parsed.message);
    Object.assign(error, {
      providerStatus: parsed.status,
      providerData: parsed.data,
    });
    throw error;
  }

  return Array.isArray(parsed.data?.items)
    ? parsed.data.items
    : [];
}

async function getAdminContext(
  req: Request,
  supabaseUrl: string,
  serviceRoleKey: string,
) {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return {
      ok: false as const,
      response: json(
        { success: false, error: "Authentication required" },
        401,
      ),
    };
  }

  const auth = await fetch(
    `${supabaseUrl}/auth/v1/user`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: authHeader,
      },
    },
  );

  if (!auth.ok) {
    return {
      ok: false as const,
      response: json(
        {
          success: false,
          error: "Authentication could not be verified",
        },
        401,
      ),
    };
  }

  const user = await auth.json();

  const admin = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(
      user.id,
    )}&role=eq.admin&is_active=eq.true&select=id&limit=1`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  const admins = await admin.json().catch(() => []);

  if (
    !admin.ok ||
    !Array.isArray(admins) ||
    admins.length !== 1
  ) {
    return {
      ok: false as const,
      response: json(
        { success: false, error: "Admin access required" },
        403,
      ),
    };
  }

  return { ok: true as const, user };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json(
        { success: false, error: "Method not allowed" },
        405,
      );
    }

    const body = await req.json().catch(() => null);
    const refundId = body?.refundId;

    if (typeof refundId !== "string" || !refundId) {
      return json(
        { success: false, error: "refundId is required" },
        400,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!supabaseUrl || !serviceRoleKey || !keyId || !keySecret) {
      return json(
        {
          success: false,
          error: "Server payment configuration is missing",
        },
        503,
      );
    }

    const adminContext = await getAdminContext(
      req,
      supabaseUrl,
      serviceRoleKey,
    );

    if (!adminContext.ok) {
      return adminContext.response;
    }

    const headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    };

    const refundResponse = await fetch(
      `${supabaseUrl}/rest/v1/payment_refunds?id=eq.${encodeURIComponent(
        refundId,
      )}&select=id,payment_id,booking_id,amount,currency,status,provider_refund_id,failure_reason,refund_request_id,updated_at&limit=1`,
      { headers },
    );

    const rows = await refundResponse.json().catch(() => []);

    if (
      !refundResponse.ok ||
      !Array.isArray(rows) ||
      rows.length !== 1
    ) {
      return json(
        { success: false, error: "Refund not found" },
        404,
      );
    }

    const refund = rows[0] as RefundRow;

    if (refund.status === "succeeded") {
      return json({
        success: true,
        alreadyProcessed: true,
        refundId,
        providerRefundId: refund.provider_refund_id || null,
      });
    }

    const paymentResponse = await fetch(
      `${supabaseUrl}/rest/v1/payments?id=eq.${encodeURIComponent(
        refund.payment_id,
      )}&select=id,provider,provider_payment_id,currency,status,amount&limit=1`,
      { headers },
    );

    const payments = await paymentResponse.json().catch(() => []);

    if (
      !paymentResponse.ok ||
      !Array.isArray(payments) ||
      payments.length !== 1
    ) {
      if (refund.status === "pending") {
        return json(
          {
            success: false,
            error:
              "Payment record could not be loaded. Refund remains pending and no provider request was made.",
          },
          503,
        );
      }

      return json(
        {
          success: false,
          processing: true,
          error:
            "Refund is processing, but its payment record could not be loaded. No duplicate provider request was made.",
        },
        503,
      );
    }

    const payment = payments[0];

    if (
      payment.provider !== "razorpay" ||
      !payment.provider_payment_id
    ) {
      const reason =
        payment.provider !== "razorpay"
          ? "Unsupported payment provider"
          : "Provider payment ID is missing";

      if (refund.status === "pending") {
        await finalizeRefund(
          supabaseUrl,
          serviceRoleKey,
          refundId,
          "failed",
          null,
          reason,
        );

        return json(
          { success: false, error: reason },
          409,
        );
      }

      return json(
        {
          success: false,
          processing: true,
          error:
            "Refund is processing and requires manual reconciliation.",
        },
        409,
      );
    }

    if (refund.status === "processing") {
      try {
        const gatewayRefunds = await fetchRazorpayRefunds(
          payment.provider_payment_id,
          keyId,
          keySecret,
        );

        const matchingRefund = gatewayRefunds.find(
          (item: Record<string, unknown>) =>
            item?.id &&
            item?.notes &&
            typeof item.notes === "object" &&
            String(
              (item.notes as Record<string, unknown>)
                .tempstaff_refund_id || "",
            ) === refundId,
        );

        if (matchingRefund?.id) {
          try {
            const finalResult = await finalizeRefund(
              supabaseUrl,
              serviceRoleKey,
              refundId,
              "succeeded",
              String(matchingRefund.id),
              null,
            );

            return json({
              success: true,
              reconciled: true,
              refundId,
              status: "succeeded",
              providerRefundId: String(matchingRefund.id),
              result: finalResult,
            });
          } catch (error) {
            console.error(
              "[TempStaff] Razorpay refund exists but local reconciliation failed:",
              error,
            );

            return json(
              {
                success: false,
                processing: true,
                providerRefundId: String(matchingRefund.id),
                error:
                  "Razorpay refund exists, but local finalization failed. No duplicate refund will be attempted.",
              },
              500,
            );
          }
        }

        return json(
          {
            success: false,
            processing: true,
            error:
              "No matching Razorpay refund was found. No duplicate refund was attempted.",
            razorpayRefundCount: gatewayRefunds.length,
          },
          409,
        );
      } catch (error) {
        console.error(
          "[TempStaff] Razorpay refund reconciliation failed:",
          error,
        );

        const providerStatus =
          typeof (error as any)?.providerStatus === "number"
            ? (error as any).providerStatus
            : null;

        const providerMessage =
          error instanceof Error
            ? error.message
            : "Unable to reconcile Razorpay refunds.";

        return json(
          {
            success: false,
            processing: true,
            error:
              "Razorpay reconciliation failed. The refund remains processing and no duplicate refund was attempted.",
            providerStatus,
            providerMessage,
          },
          502,
        );
      }
    }

    if (refund.status !== "pending") {
      return json(
        {
          success: false,
          error:
            `Refund is not processable in status ${refund.status}`,
        },
        409,
      );
    }

    let providerPayment: any;

    try {
      providerPayment = await fetchRazorpayPayment(
        payment.provider_payment_id,
        keyId,
        keySecret,
      );
    } catch (error) {
      console.error(
        "[TempStaff] Razorpay payment verification failed:",
        error,
      );

      return json(
        {
          success: false,
          error:
            "Razorpay payment verification failed. No refund was submitted.",
          providerStatus:
            typeof (error as any)?.providerStatus === "number"
              ? (error as any).providerStatus
              : null,
          providerMessage:
            error instanceof Error
              ? error.message
              : "Unable to verify Razorpay payment.",
        },
        502,
      );
    }

    if (
      providerPayment?.id !== payment.provider_payment_id
    ) {
      return json(
        {
          success: false,
          error:
            "Razorpay returned an unexpected payment record. No refund was submitted.",
        },
        502,
      );
    }

    const amountPaise = Math.round(
      Number(refund.amount) * 100,
    );

    if (
      !Number.isFinite(amountPaise) ||
      amountPaise <= 0
    ) {
      return json(
        { success: false, error: "Invalid refund amount" },
        409,
      );
    }

    if (
      Number(providerPayment.amount) !==
        Math.round(Number(payment.amount) * 100) ||
      providerPayment.currency !== payment.currency
    ) {
      return json(
        {
          success: false,
          error:
            "Razorpay payment amount/currency does not match the local payment record. No refund was submitted.",
        },
        409,
      );
    }

    if (
      !["captured", "refunded"].includes(
        String(providerPayment.status),
      )
    ) {
      return json(
        {
          success: false,
          error:
            `Razorpay payment is not refundable in status ${providerPayment.status || "unknown"}.`,
        },
        409,
      );
    }

    if (
      Number(providerPayment.amount_refunded || 0) +
        amountPaise >
      Number(providerPayment.amount || 0)
    ) {
      return json(
        {
          success: false,
          error:
            "Refund amount exceeds the remaining refundable Razorpay amount.",
        },
        409,
      );
    }

    const claimResponse = await fetch(
      `${supabaseUrl}/rest/v1/payment_refunds?id=eq.${encodeURIComponent(
        refundId,
      )}&status=eq.pending`,
      {
        method: "PATCH",
        headers: {
          ...headers,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          status: "processing",
          updated_at: new Date().toISOString(),
        }),
      },
    );

    const claimed = await claimResponse.json().catch(() => []);

    if (
      !claimResponse.ok ||
      !Array.isArray(claimed) ||
      claimed.length !== 1
    ) {
      return json(
        {
          success: false,
          error:
            "Refund is already being processed or could not be claimed.",
        },
        409,
      );
    }

    let razorpayResponse: Response;

    try {
      razorpayResponse = await fetch(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(
          payment.provider_payment_id,
        )}/refund`,
        {
          method: "POST",
          headers: {
            Authorization: basicAuth(keyId, keySecret),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: amountPaise,
            notes: {
              tempstaff_refund_id: refundId,
              refund_request_id:
                refund.refund_request_id || "",
            },
          }),
        },
      );
    } catch (error) {
      console.error(
        "[TempStaff] Razorpay refund request outcome is unknown:",
        error,
      );

      return json(
        {
          success: false,
          processing: true,
          error:
            "The Razorpay refund request could not be confirmed. The refund remains processing and will not be submitted again automatically.",
        },
        502,
      );
    }

    const razorpayData = await razorpayResponse
      .json()
      .catch(() => null);

    if (!razorpayResponse.ok) {
      const failureReason =
        razorpayData?.error?.description ||
        razorpayData?.error?.reason ||
        `Razorpay refund failed with HTTP ${razorpayResponse.status}`;

      await finalizeRefund(
        supabaseUrl,
        serviceRoleKey,
        refundId,
        "failed",
        null,
        failureReason,
      );

      return json(
        {
          success: false,
          error: failureReason,
          providerStatus: razorpayResponse.status,
        },
        502,
      );
    }

    const providerRefundId =
      typeof razorpayData?.id === "string"
        ? razorpayData.id
        : null;

    if (!providerRefundId) {
      return json(
        {
          success: false,
          processing: true,
          error:
            "Razorpay accepted the refund but did not return a refund ID. Reconciliation is required.",
        },
        502,
      );
    }

    try {
      const finalResult = await finalizeRefund(
        supabaseUrl,
        serviceRoleKey,
        refundId,
        "succeeded",
        providerRefundId,
        null,
      );

      return json({
        success: true,
        refundId,
        status: "succeeded",
        providerRefundId,
        result: finalResult,
      });
    } catch (error) {
      console.error(
        "[TempStaff] Refund succeeded at Razorpay but local finalization failed:",
        error,
      );

      return json(
        {
          success: false,
          processing: true,
          providerRefundId,
          error:
            "Razorpay processed the refund, but local finalization failed. No duplicate refund will be attempted.",
        },
        500,
      );
    }
  } catch (error) {
    console.error(
      "[TempStaff] process-razorpay-refund error:",
      error,
    );

    return json(
      {
        success: false,
        error: "Unexpected server error",
      },
      500,
    );
  }
});

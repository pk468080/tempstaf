import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Method not allowed",
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const authHeader =
      req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: "Authentication required",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const body = await req.json();

    const packageId = body?.packageId;

    if (
      !packageId ||
      typeof packageId !== "string"
    ) {
      return new Response(
        JSON.stringify({
          error: "packageId is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const razorpayKeyId =
      Deno.env.get("RAZORPAY_KEY_ID");

    const razorpayKeySecret =
      Deno.env.get("RAZORPAY_KEY_SECRET");

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    if (
      !razorpayKeyId ||
      !razorpayKeySecret
    ) {
      throw new Error(
        "Razorpay secrets are not configured."
      );
    }

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      throw new Error(
        "Supabase server configuration is missing."
      );
    }

    /*
     * Get the current active price directly
     * from Supabase.
     *
     * IMPORTANT:
     * The mobile app does NOT tell Razorpay
     * how much to charge.
     */
    const priceResponse = await fetch(
      `${supabaseUrl}/rest/v1/service_variant_prices` +
        `?service_variant_id=eq.${encodeURIComponent(
          packageId
        )}` +
        `&is_active=eq.true` +
        `&effective_from=lte.${encodeURIComponent(
          new Date().toISOString()
        )}` +
        `&select=price,currency,effective_from,effective_to` +
        `&order=effective_from.desc` +
        `&limit=1`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization:
            `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (!priceResponse.ok) {
      const errorText =
        await priceResponse.text();

      console.error(
        "Supabase price lookup failed:",
        errorText
      );

      throw new Error(
        "Unable to verify package price."
      );
    }

    const prices =
      await priceResponse.json();

    if (
      !Array.isArray(prices) ||
      prices.length === 0
    ) {
      return new Response(
        JSON.stringify({
          error:
            "No active price found for this package.",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    const priceRow = prices[0];

    const price = Number(
      priceRow.price
    );

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      throw new Error(
        "Invalid package price."
      );
    }

    /*
     * Razorpay expects amount in paise.
     * Example:
     * ₹400 = 40000 paise
     */
    const amountInPaise =
      Math.round(price * 100);

    const receipt =
      `ts_${crypto.randomUUID()}`;

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
            amount: amountInPaise,
            currency: "INR",
            receipt,
            notes: {
              tempstaff_package_id:
                packageId,
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

    return new Response(
      JSON.stringify({
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
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "[TempStaff] create-razorpay-order error:",
      error
    );

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  }
});

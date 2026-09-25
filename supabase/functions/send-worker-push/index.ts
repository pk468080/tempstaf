import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";

const MAX_EXPO_BATCH_SIZE = 100;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function isExpoToken(token: unknown): token is string {
  return (
    typeof token === "string" &&
    token.trim().startsWith("ExponentPushToken[") &&
    token.trim().endsWith("]")
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

export default {
  fetch: withSupabase(
    { auth: "secret" },
    async (req, ctx) => {
      if (req.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
      }

      let payload: any;

      try {
        payload = await req.json();
      } catch {
        return json({ error: "Invalid JSON body" }, 400);
      }

      if (
        payload?.type !== "INSERT" ||
        payload?.table !== "notifications" ||
        payload?.schema !== "public"
      ) {
        return json({ ignored: true });
      }

      const record = payload?.record;
      const userId = record?.user_id;
      const title = String(record?.title ?? "").trim();
      const body = String(record?.message ?? "").trim();

      if (!userId || !title || !body) {
        return json(
          { error: "Notification record is incomplete" },
          400,
        );
      }

      const { data: pushTokens, error: pushTokenError } =
        await ctx.supabaseAdmin
          .from("push_tokens")
          .select("token")
          .eq("user_id", userId)
          .eq("is_active", true);

      if (pushTokenError) {
        console.error("Failed to load push_tokens:", pushTokenError);
        return json({ error: "Unable to load push token" }, 500);
      }

      const tokenSet = new Set<string>();

      for (const row of pushTokens ?? []) {
        if (isExpoToken(row?.token)) {
          tokenSet.add(row.token.trim());
        }
      }

      const tokens = Array.from(tokenSet);

      if (tokens.length === 0) {
        return json({
          sent: 0,
          batches: 0,
          retired_tokens: 0,
          reason: "No active Expo push tokens",
        });
      }

      const retiredTokens = new Set<string>();
      let sent = 0;
      const batchResults: unknown[] = [];

      for (const tokenBatch of chunk(tokens, MAX_EXPO_BATCH_SIZE)) {
        const messages = tokenBatch.map((to) => ({
          to,
          sound: "default",
          title,
          body,
          data: {
            notification_id: record.id ?? null,
            booking_id: record.booking_id ?? null,
            notification_type:
              record.notification_type ?? "general",
          },
          channelId: "booking-assignment",
        }));

        const expoResponse = await fetch(
          "https://exp.host/--/api/v2/push/send",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(messages),
          },
        );

        const expoBodyText = await expoResponse.text();

        let expoBody: any = expoBodyText;

        try {
          expoBody = JSON.parse(expoBodyText);
        } catch {
          // Keep non-JSON response text for diagnostics.
        }

        if (!expoResponse.ok) {
          console.error(
            "Expo push send failed:",
            expoResponse.status,
            expoBodyText,
          );

          return json(
            {
              error: "Push delivery failed",
              status: expoResponse.status,
              sent_before_failure: sent,
            },
            502,
          );
        }

        const tickets = Array.isArray(expoBody?.data)
          ? expoBody.data
          : [];

        for (let i = 0; i < Math.min(tickets.length, tokenBatch.length); i += 1) {
          const ticket = tickets[i];

          if (
            ticket?.status === "error" &&
            ticket?.details?.error === "DeviceNotRegistered"
          ) {
            retiredTokens.add(tokenBatch[i]);
          }
        }

        sent += messages.length;
        batchResults.push(expoBody);
      }

      if (retiredTokens.size > 0) {
        const { error: retireError } = await ctx.supabaseAdmin
          .from("push_tokens")
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .in("token", Array.from(retiredTokens));

        if (retireError) {
          console.error(
            "Failed to retire invalid Expo push tokens:",
            retireError,
          );
        }
      }

      return json({
        sent,
        batches: Math.ceil(tokens.length / MAX_EXPO_BATCH_SIZE),
        retired_tokens: retiredTokens.size,
        expo: batchResults.length === 1 ? batchResults[0] : batchResults,
      });
    },
  ),
};

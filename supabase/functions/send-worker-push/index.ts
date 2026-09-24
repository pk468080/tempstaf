import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";

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

      const tokenSet = new Set<string>();

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

      for (const row of pushTokens ?? []) {
        if (isExpoToken(row?.token)) {
          tokenSet.add(row.token.trim());
        }
      }

      const { data: legacyTokens, error: legacyTokenError } =
        await ctx.supabaseAdmin
          .from("worker_push_tokens")
          .select("expo_push_token")
          .eq("worker_id", userId);

      if (legacyTokenError) {
        console.warn(
          "Failed to load legacy worker_push_tokens:",
          legacyTokenError,
        );
      } else {
        for (const row of legacyTokens ?? []) {
          if (isExpoToken(row?.expo_push_token)) {
            tokenSet.add(row.expo_push_token.trim());
          }
        }
      }

      const tokens = Array.from(tokenSet);

      if (tokens.length === 0) {
        return json({
          sent: 0,
          reason: "No active Expo push tokens",
        });
      }

      const messages = tokens.map((to) => ({
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

      let expoBody: unknown = expoBodyText;

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
          },
          502,
        );
      }

      return json({
        sent: messages.length,
        expo: expoBody,
      });
    },
  ),
};

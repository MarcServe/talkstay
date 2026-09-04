/**
 * Stripe Connect webhooks → mark TalkStay tickets paid.
 *
 * Configure in Stripe Dashboard (platform + Connect):
 *   Endpoint: https://<project>.supabase.co/functions/v1/talkstay-stripe-webhook
 *   Events: checkout.session.completed, account.updated
 *   Secret → STRIPE_CONNECT_WEBHOOK_SECRET
 *
 * Direct charges on connected accounts: enable "Listen to events on Connected accounts".
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
      },
    });
  }

  // Same override as talkstay-stripe: prefer a TalkStay-only test key over
  // TalkWeb's shared live one, so the two never need to agree on which mode
  // they're in. constructEvent() below is a local signature check, not a
  // network call, so this key only matters if a future addition here calls
  // out to the Stripe API — kept consistent with talkstay-stripe regardless.
  const STRIPE_KEY = Deno.env.get("TALKSTAY_STRIPE_SECRET_KEY") || Deno.env.get("STRIPE_SECRET_KEY");
  // Two secrets, tried in turn, so live and test webhooks can both point here.
  // Stripe issues a DIFFERENT signing secret per endpoint, and test mode is a
  // separate endpoint — with one slot you have to swap the value to test and
  // swap it back to go live, which means production webhooks are broken for
  // the length of every test. Accepting either costs nothing: a payload still
  // has to carry a valid signature for one of them.
  const WH_SECRETS = [
    Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET"),
    Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET_TEST"),
  ].filter((v): v is string => !!v);
  if (!STRIPE_KEY || !WH_SECRETS.length) {
    console.error("Missing STRIPE_SECRET_KEY or STRIPE_CONNECT_WEBHOOK_SECRET");
    return json({ error: "Webhook not configured" }, 500);
  }

  const stripe = new Stripe(STRIPE_KEY, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ error: "No signature" }, 400);

  const rawBody = await req.text();
  let event: Stripe.Event | null = null;
  let lastErr: unknown = null;
  for (const secret of WH_SECRETS) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
      break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (!event) {
    console.error("Webhook signature failed against all configured secrets", lastErr);
    return json({ error: "Invalid signature" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (event.type === "account.updated") {
      const acct = event.data.object as Stripe.Account;
      if (acct.id) {
        await admin.from("ts_hotels").update({
          stripe_charges_enabled: !!acct.charges_enabled,
          stripe_details_submitted: !!acct.details_submitted,
        }).eq("stripe_account_id", acct.id);
      }
      return json({ received: true });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid" && session.status !== "complete") {
        return json({ received: true, skipped: true });
      }

      const { data: row } = await admin
        .from("ts_stripe_checkouts")
        .select("id, hotel_id, request_ids, status")
        .eq("stripe_checkout_session_id", session.id)
        .maybeSingle();

      let requestIds: string[] = (row?.request_ids as string[]) ?? [];
      if (!requestIds.length && session.metadata?.talkstay_request_ids) {
        requestIds = String(session.metadata.talkstay_request_ids).split(",").map((s) => s.trim()).filter(Boolean);
      }

      if (row?.id) {
        await admin.from("ts_stripe_checkouts").update({
          status: "complete",
          completed_at: new Date().toISOString(),
          stripe_payment_intent_id:
            typeof session.payment_intent === "string" ? session.payment_intent : null,
        }).eq("id", row.id);
      }

      if (requestIds.length) {
        const patch: Record<string, unknown> = { payment_status: "paid" };
        if (row?.id) patch.stripe_checkout_id = row.id;
        await admin
          .from("ts_service_requests")
          .update(patch)
          .in("id", requestIds)
          .eq("is_chargeable", true);
      }

      return json({ received: true, settled: requestIds.length });
    }

    return json({ received: true });
  } catch (e) {
    console.error("talkstay-stripe-webhook handler", e);
    return json({ error: e instanceof Error ? e.message : "handler failed" }, 500);
  }
});

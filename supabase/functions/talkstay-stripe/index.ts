/**
 * TalkStay Stripe Connect — property onboarding + guest Checkout.
 *
 * Secrets (Supabase Edge):
 *   TALKSTAY_STRIPE_SECRET_KEY     REQUIRED in practice, not just for testing —
 *                                  see below. Falls back to STRIPE_SECRET_KEY
 *                                  only because that keeps this function from
 *                                  hard-failing when unset.
 *   STRIPE_SECRET_KEY              TalkWeb's own key on this shared account —
 *                                  a RESTRICTED key scoped to TalkWeb's billing
 *                                  (Customers, Subscriptions, Checkout Sessions
 *                                  for TalkWeb's OWN products). It has no
 *                                  Connect permissions and CANNOT create or
 *                                  manage connected accounts — confirmed live,
 *                                  2026-09-03: stripe.accounts.create() failed
 *                                  with "does not have the required
 *                                  permissions ... connected_account_write".
 *   STRIPE_CONNECT_WEBHOOK_SECRET  (for talkstay-stripe-webhook)
 *   PUBLIC_APP_URL                 (e.g. https://talkstay.talkweb.io)
 *
 * Owners never paste API keys — they click Connect and finish Stripe Express.
 *
 * On the key: earlier revisions of this comment said TALKSTAY_STRIPE_SECRET_KEY
 * was a testing convenience to be unset once confident, falling back to the
 * shared key permanently. That was wrong — the shared key's restricted scope
 * means it can NEVER perform Connect operations, test or live, so falling back
 * to it is a dead end, not an end state. TalkStay needs its own key: a second
 * RESTRICTED key on the same Stripe account, created separately from TalkWeb's,
 * granted write access to Accounts / Account Links / Checkout Sessions (and
 * whatever this account's dashboard groups under "Connect") and nothing else —
 * so it is exactly as unable to touch TalkWeb's customers or subscriptions as
 * TalkWeb's key is unable to touch TalkStay's connected accounts. That is the
 * real separation: not two Stripe accounts, but two keys with disjoint,
 * minimal scopes on one. Use a sk_test_/rk_test_ key here during development,
 * then a properly-scoped rk_live_ key for production — never the shared one.
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function stripeClient() {
  // TALKSTAY_STRIPE_SECRET_KEY should always be set in any working deployment —
  // TalkWeb's STRIPE_SECRET_KEY is a restricted key with no Connect permissions,
  // so falling back to it doesn't degrade this function, it breaks it (confirmed
  // live: "connected_account_write" permission denied on accounts.create).
  // The fallback exists only so a missing config fails with Stripe's own clear
  // permission error instead of a confusing empty-string key error here.
  const key = Deno.env.get("TALKSTAY_STRIPE_SECRET_KEY") || Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

function appBaseUrl() {
  return (Deno.env.get("PUBLIC_APP_URL") || "https://talkstay.talkweb.io").replace(/\/$/, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const stripe = stripeClient();

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    // ─── Guest: start Checkout for unpaid chargeables (QR token auth) ───
    if (action === "create_guest_checkout") {
      const hotelSlug = String(body.hotelSlug ?? "").trim().toLowerCase();
      const roomId = String(body.roomId ?? "").trim();
      const token = String(body.token ?? "").trim();
      const sessionId = String(body.sessionId ?? "").trim();
      if (!hotelSlug || !roomId || !token || !sessionId) {
        return json({ error: "hotelSlug, roomId, token, and sessionId required" }, 400);
      }

      const { data: hotel } = await admin
        .from("ts_hotels")
        .select("id, name, slug, stripe_account_id, stripe_charges_enabled, stripe_platform_fee_bps, branding")
        .eq("slug", hotelSlug)
        .maybeSingle();
      if (!hotel) return json({ error: "Property not found" }, 404);
      if (!hotel.stripe_account_id || !hotel.stripe_charges_enabled) {
        return json({ error: "Card payments are not enabled for this property yet." }, 400);
      }
      // The guest UI already hides the button when a property has switched card
      // pay off; this refuses the request too, so a stale tab or a replayed URL
      // can't take a payment the property has opted out of. Read defensively:
      // a failed read (migration not applied) means "not opted out".
      {
        const { data: optRow, error: optErr } = await admin
          .from("ts_hotels")
          .select("card_payments_enabled")
          .eq("id", hotel.id)
          .maybeSingle();
        if (!optErr && optRow && optRow.card_payments_enabled === false) {
          return json({ error: "This property is not taking card payments right now." }, 400);
        }
      }

      const { data: tok } = await admin
        .from("ts_room_tokens")
        .select("id, room_id, is_active")
        .eq("room_id", roomId)
        .eq("token", token)
        .eq("is_active", true)
        .maybeSingle();
      if (!tok) return json({ error: "Invalid guest link" }, 403);

      // Scope the bill exactly as the guest's folio does, or the card charges
      // the wrong amount. talkstay-guest-chat's scopeToGuestBill() bills a
      // checked-in room for its whole stay (room + everything since
      // checked_in_at, across however many chat sessions the guest opened) and
      // bills a public area by session alone, since a bar stool has no stay to
      // anchor to. Scoping by session here regardless meant a room guest saw a
      // stay total on their folio and Checkout collected only the current
      // session's slice of it — or refused with "nothing to pay" when the
      // charges were raised in an earlier session. Same rule, duplicated rather
      // than shared only because these are two separate edge functions.
      const { data: payRoom } = await admin
        .from("ts_rooms")
        .select("is_public, checked_in_at")
        .eq("id", roomId)
        .maybeSingle();

      let unpaidQ = admin
        .from("ts_service_requests")
        .select("id, summary, price, currency, payment_status, is_chargeable, session_id")
        .eq("hotel_id", hotel.id)
        .eq("is_chargeable", true)
        .eq("payment_status", "unpaid");

      unpaidQ = !payRoom?.is_public && payRoom?.checked_in_at
        ? unpaidQ.eq("room_id", roomId).gte("created_at", payRoom.checked_in_at)
        : unpaidQ.eq("room_id", roomId).eq("session_id", sessionId);

      const { data: unpaid } = await unpaidQ;

      const rows = (unpaid ?? []).filter((r: { price: number | null }) => typeof r.price === "number" && Number(r.price) > 0);
      if (!rows.length) return json({ error: "Nothing to pay with a card right now." }, 400);

      const currency = String(rows[0].currency || "GBP").toLowerCase();
      const line_items = rows.map((r: { summary: string; price: number; currency?: string }) => ({
        quantity: 1,
        price_data: {
          currency,
          unit_amount: Math.round(Number(r.price) * 100),
          product_data: {
            name: String(r.summary || "Order").slice(0, 120),
          },
        },
      }));
      const amountTotal = rows.reduce((s: number, r: { price: number }) => s + Number(r.price), 0);
      const amountCents = Math.round(amountTotal * 100);
      const requestIds = rows.map((r: { id: string }) => r.id);
      const guestPath = `/h/${hotel.slug}/r/${roomId}?t=${encodeURIComponent(token)}`;

      // TalkStay platform fee (basis points). Default 2.5% if unset.
      const envBps = Number(Deno.env.get("TALKSTAY_PLATFORM_FEE_BPS") ?? "250");
      const hotelBps = hotel.stripe_platform_fee_bps;
      const feeBps = Math.max(0, Math.min(3000,
        typeof hotelBps === "number" && Number.isFinite(hotelBps) ? hotelBps : (Number.isFinite(envBps) ? envBps : 250),
      ));
      const applicationFeeAmount = feeBps > 0 ? Math.max(1, Math.round(amountCents * feeBps / 10000)) : 0;

      const paymentIntentData: Record<string, unknown> = {
        metadata: {
          talkstay_hotel_id: hotel.id,
          talkstay_guest_session: sessionId.slice(0, 200),
          talkstay_fee_bps: String(feeBps),
        },
      };
      if (applicationFeeAmount > 0) {
        paymentIntentData.application_fee_amount = applicationFeeAmount;
      }
      // This account also runs TalkWeb's own subscription billing on its
      // platform balance. A direct charge on a connected account (below) uses
      // that account's OWN statement descriptor by default — Stripe doesn't
      // borrow the platform's — so this suffix is redundant for correctness.
      // It's set anyway so a guest's card statement is legible at a glance:
      // "PROPERTY NAME* TALKSTAY" rather than a bare property name that gives
      // no hint which system took the payment. 22-char Stripe limit; 8 well
      // inside it.
      paymentIntentData.statement_descriptor_suffix = "TALKSTAY";

      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          line_items,
          success_url: `${appBaseUrl()}${guestPath}&pay=success`,
          cancel_url: `${appBaseUrl()}${guestPath}&pay=cancel`,
          client_reference_id: sessionId.slice(0, 200),
          metadata: {
            talkstay_hotel_id: hotel.id,
            talkstay_room_id: roomId,
            talkstay_guest_session: sessionId.slice(0, 200),
            talkstay_request_ids: requestIds.join(",").slice(0, 450),
            talkstay_fee_bps: String(feeBps),
          },
          payment_intent_data: paymentIntentData,
        },
        { stripeAccount: hotel.stripe_account_id },
      );

      await admin.from("ts_stripe_checkouts").insert({
        hotel_id: hotel.id,
        guest_session_id: sessionId,
        room_id: roomId,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
        request_ids: requestIds,
        amount_total: amountTotal,
        currency: currency.toUpperCase(),
        status: "open",
        application_fee_amount: applicationFeeAmount > 0 ? applicationFeeAmount / 100 : null,
        platform_fee_bps: feeBps,
      });

      return json({ url: session.url, sessionId: session.id, feeBps, applicationFeeAmount });
    }

    // ─── Staff / owner actions (JWT) ───
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Not signed in" }, 401);
    const userId = userData.user.id;

    const hotelId = String(body.hotelId ?? "").trim();
    if (!hotelId) return json({ error: "hotelId required" }, 400);

    const { data: hotel } = await admin
      .from("ts_hotels")
      .select("id, user_id, name, slug, stripe_account_id, stripe_charges_enabled, stripe_details_submitted, stripe_connected_at, stripe_platform_fee_bps, contact_email")
      .eq("id", hotelId)
      .maybeSingle();
    if (!hotel) return json({ error: "Property not found" }, 404);

    const isOwner = hotel.user_id === userId;
    let isAdmin = isOwner;
    if (!isAdmin) {
      const { data: staff } = await admin
        .from("ts_staff")
        .select("role, department_key, status")
        .eq("hotel_id", hotelId)
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      isAdmin = !!staff && (staff.role === "owner" || (staff.role === "manager" && !staff.department_key));
    }
    if (!isAdmin) return json({ error: "Only property admins can manage payments" }, 403);

    if (action === "status") {
      let charges = !!hotel.stripe_charges_enabled;
      let details = !!hotel.stripe_details_submitted;
      let payouts = false;
      // What Stripe is actually still waiting for. Without this the panel can
      // only say "almost there", which tells a property nothing about why they
      // still can't take a card — the difference between "we're reviewing you"
      // and "you never added a bank account" is the whole answer.
      let due: string[] = [];
      let pastDue: string[] = [];
      let disabledReason: string | null = null;
      if (hotel.stripe_account_id) {
        try {
          const acct = await stripe.accounts.retrieve(hotel.stripe_account_id);
          charges = !!acct.charges_enabled;
          details = !!acct.details_submitted;
          payouts = !!acct.payouts_enabled;
          const req = (acct as { requirements?: Record<string, unknown> }).requirements ?? {};
          due = ((req.currently_due as string[]) ?? []).slice(0, 12);
          pastDue = ((req.past_due as string[]) ?? []).slice(0, 12);
          disabledReason = (req.disabled_reason as string) ?? null;
          await admin.from("ts_hotels").update({
            stripe_charges_enabled: charges,
            stripe_details_submitted: details,
          }).eq("id", hotelId);
        } catch { /* keep cached flags */ }
      }
      const envBps = Number(Deno.env.get("TALKSTAY_PLATFORM_FEE_BPS") ?? "250");
      const hotelBps = hotel.stripe_platform_fee_bps;
      const feeBps = typeof hotelBps === "number" && Number.isFinite(hotelBps)
        ? hotelBps
        : (Number.isFinite(envBps) ? envBps : 250);
      let cardPaymentsEnabled = true;
      {
        const { data: optRow, error: optErr } = await admin
          .from("ts_hotels")
          .select("card_payments_enabled")
          .eq("id", hotelId)
          .maybeSingle();
        if (!optErr && optRow) cardPaymentsEnabled = optRow.card_payments_enabled !== false;
      }
      return json({
        connected: !!hotel.stripe_account_id,
        accountId: hotel.stripe_account_id,
        chargesEnabled: charges,
        detailsSubmitted: details,
        connectedAt: hotel.stripe_connected_at,
        platformFeeBps: feeBps,
        platformFeePercent: feeBps / 100,
        cardPaymentsEnabled,
        payoutsEnabled: payouts,
        requirementsDue: due,
        requirementsPastDue: pastDue,
        disabledReason,
      });
    }

    if (action === "connect_onboarding") {
      let accountId = hotel.stripe_account_id as string | null;
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          country: String(body.country || "GB").toUpperCase().slice(0, 2),
          email: hotel.contact_email || userData.user.email || undefined,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_profile: {
            name: hotel.name,
            url: `${appBaseUrl()}/h/${hotel.slug}`,
          },
          metadata: { talkstay_hotel_id: hotelId },
        });
        accountId = account.id;
        await admin.from("ts_hotels").update({
          stripe_account_id: accountId,
          stripe_connected_at: new Date().toISOString(),
        }).eq("id", hotelId);
      }

      const refreshUrl = `${appBaseUrl()}/app?stripe=refresh&hotel=${hotelId}`;
      const returnUrl = `${appBaseUrl()}/app?stripe=return&hotel=${hotelId}`;
      const link = await stripe.accountLinks.create({
        account: accountId!,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      });
      return json({ url: link.url, accountId });
    }

    if (action === "connect_dashboard") {
      if (!hotel.stripe_account_id) return json({ error: "Connect Stripe first" }, 400);
      const login = await stripe.accounts.createLoginLink(hotel.stripe_account_id);
      return json({ url: login.url });
    }

    if (action === "payments_summary") {
      const sinceDays = Math.min(365, Math.max(1, Number(body.sinceDays ?? 30)));
      const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();

      const [{ data: checkouts }, { data: charges }, { data: rooms }] = await Promise.all([
        admin.from("ts_stripe_checkouts")
          .select("id, room_id, amount_total, currency, status, created_at, completed_at, request_ids, application_fee_amount")
          .eq("hotel_id", hotelId)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(200),
        // The operations side of the ledger: every chargeable request, however
        // it was eventually settled.
        admin.from("ts_service_requests")
          .select("id, summary, price, currency, payment_status, created_at, room_id")
          .eq("hotel_id", hotelId)
          .eq("is_chargeable", true)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(2000),
        admin.from("ts_rooms").select("id, room_number, is_public").eq("hotel_id", hotelId),
      ]);

      const roomById = new Map((rooms ?? []).map((r: any) => [r.id, r]));
      const money = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v ?? 0) || 0);

      const paidCheckouts = (checkouts ?? []).filter((c: any) => c.status === "complete");
      const cardCollected = paidCheckouts.reduce((t: number, c: any) => t + money(c.amount_total), 0);
      // Requests Stripe actually settled, so "paid by other means" is the
      // remainder rather than a guess.
      const cardSettledIds = new Set<string>(
        paidCheckouts.flatMap((c: any) => (c.request_ids ?? []) as string[]),
      );

      const chargeRows = (charges ?? []) as any[];
      const paidRows = chargeRows.filter((r) => r.payment_status === "paid");
      const totalPaid = paidRows.reduce((t, r) => t + money(r.price), 0);
      const otherCollected = paidRows
        .filter((r) => !cardSettledIds.has(r.id))
        .reduce((t, r) => t + money(r.price), 0);
      const outstanding = chargeRows
        .filter((r) => r.payment_status !== "paid")
        .reduce((t, r) => t + money(r.price), 0);

      const currency = paidRows.find((r) => r.currency)?.currency
        ?? (checkouts ?? []).find((c: any) => c.currency)?.currency ?? "GBP";

      return json({
        sinceDays,
        currency,
        totals: {
          cardCollected,
          otherCollected,
          totalPaid,
          outstanding,
          cardCount: paidCheckouts.length,
          chargeableCount: chargeRows.length,
        },
        // The rows behind each tile. Without these a total is just a number the
        // property has to take on faith — and the one that matters most here is
        // outstanding, where "which fourteen?" is the actual question.
        items: chargeRows.slice(0, 300).map((r: any) => {
          const room = roomById.get(r.room_id);
          return {
            id: r.id,
            summary: String(r.summary ?? "Charge").slice(0, 140),
            price: money(r.price),
            currency: r.currency ?? currency,
            paid: r.payment_status === "paid",
            settledByCard: cardSettledIds.has(r.id),
            createdAt: r.created_at,
            roomLabel: room ? String(room.room_number) : null,
          };
        }),
        payments: (checkouts ?? []).map((c: any) => {
          const room = roomById.get(c.room_id);
          return {
            id: c.id,
            amount: money(c.amount_total),
            currency: c.currency ?? currency,
            status: c.status,
            createdAt: c.created_at,
            completedAt: c.completed_at,
            itemCount: (c.request_ids ?? []).length,
            fee: c.application_fee_amount == null ? null : money(c.application_fee_amount),
            roomLabel: room ? String(room.room_number) : null,
            isPublicArea: !!room?.is_public,
          };
        }),
      });
    }

    if (action === "set_card_payments") {
      const enabled = body.enabled !== false;
      const { error } = await admin
        .from("ts_hotels")
        .update({ card_payments_enabled: enabled })
        .eq("id", hotelId);
      if (error) {
        // Say which step is missing rather than surfacing "column ... does not
        // exist" to someone looking at a toggle.
        const missing = /card_payments_enabled/i.test(error.message) || error.code === "42703";
        return json({
          error: missing
            ? "This switch needs the card-payments migration applied first (20260903000005)."
            : error.message,
        }, missing ? 400 : 500);
      }
      return json({ ok: true, cardPaymentsEnabled: enabled });
    }

    if (action === "disconnect") {
      // Soft-disconnect in TalkStay only — Stripe account remains the property's.
      await admin.from("ts_hotels").update({
        stripe_account_id: null,
        stripe_charges_enabled: false,
        stripe_details_submitted: false,
        stripe_connected_at: null,
      }).eq("id", hotelId);
      return json({ ok: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    console.error("talkstay-stripe", e);
    return json({ error: e instanceof Error ? e.message : "Stripe error" }, 500);
  }
});

import { supabase } from "@/integrations/supabase/client";

async function invokeStripe(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("talkstay-stripe", { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) {
        const j = await ctx.json();
        if (j?.error) msg = j.error;
      }
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as Record<string, unknown>;
}

export type StripeConnectStatus = {
  connected: boolean;
  accountId: string | null;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  connectedAt: string | null;
  /** TalkStay application fee in basis points (e.g. 250 = 2.5%). */
  platformFeeBps: number;
  /** Same fee as a percent (e.g. 2.5). */
  platformFeePercent: number;
  /** The property's own switch — card pay needs this AND chargesEnabled. */
  cardPaymentsEnabled: boolean;
};

export type PaymentRow = {
  id: string; amount: number; currency: string;
  status: "open" | "complete" | "expired";
  createdAt: string; completedAt: string | null;
  itemCount: number; fee: number | null;
  roomLabel: string | null; isPublicArea: boolean;
};

export type PaymentsSummary = {
  sinceDays: number;
  currency: string;
  totals: {
    cardCollected: number; otherCollected: number; totalPaid: number;
    outstanding: number; cardCount: number; chargeableCount: number;
  };
  payments: PaymentRow[];
};

/** Card payments plus the operations-side reconciliation for the same window. */
export async function fetchPaymentsSummary(
  hotelId: string, sinceDays = 30,
): Promise<PaymentsSummary> {
  return await invokeStripe({ action: "payments_summary", hotelId, sinceDays }) as unknown as PaymentsSummary;
}

/** Turn the guest-facing card option on or off for this property. */
export async function setCardPayments(hotelId: string, enabled: boolean): Promise<void> {
  await invokeStripe({ action: "set_card_payments", hotelId, enabled });
}

export async function fetchStripeStatus(hotelId: string): Promise<StripeConnectStatus> {
  const data = await invokeStripe({ action: "status", hotelId });
  const bps = Number(data.platformFeeBps);
  const pct = Number(data.platformFeePercent);
  return {
    connected: !!data.connected,
    accountId: (data.accountId as string) ?? null,
    chargesEnabled: !!data.chargesEnabled,
    detailsSubmitted: !!data.detailsSubmitted,
    connectedAt: (data.connectedAt as string) ?? null,
    platformFeeBps: Number.isFinite(bps) ? bps : 250,
    platformFeePercent: Number.isFinite(pct) ? pct : (Number.isFinite(bps) ? bps / 100 : 2.5),
    // Absent (older deployed function, or migration not applied) means on —
    // the switch is an opt-OUT, so a missing value must never read as "off".
    cardPaymentsEnabled: data.cardPaymentsEnabled !== false,
  };
}

/** Opens Stripe Express onboarding — property never pastes API keys. */
export async function startStripeConnect(hotelId: string, country = "GB"): Promise<string> {
  const data = await invokeStripe({ action: "connect_onboarding", hotelId, country });
  const url = data.url as string;
  if (!url) throw new Error("No Stripe onboarding URL returned");
  return url;
}

export async function openStripeDashboard(hotelId: string): Promise<string> {
  const data = await invokeStripe({ action: "connect_dashboard", hotelId });
  const url = data.url as string;
  if (!url) throw new Error("No Stripe dashboard URL");
  return url;
}

export async function disconnectStripe(hotelId: string): Promise<void> {
  await invokeStripe({ action: "disconnect", hotelId });
}

/** Guest Checkout for unpaid chargeables on this stay / table. */
export async function startGuestCardCheckout(args: {
  hotelSlug: string;
  roomId: string;
  token: string;
  sessionId: string;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke("talkstay-stripe", {
    body: { action: "create_guest_checkout", ...args },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  const url = (data as { url?: string })?.url;
  if (!url) throw new Error("Checkout could not start");
  return url;
}

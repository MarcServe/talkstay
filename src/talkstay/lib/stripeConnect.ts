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
  /** Stripe can pay money out to their bank (separate from taking charges). */
  payoutsEnabled: boolean;
  /** Raw Stripe requirement keys still outstanding. */
  requirementsDue: string[];
  /** Outstanding AND past their deadline — these actively block the account. */
  requirementsPastDue: string[];
  /** Stripe's reason the account is restricted, when it gives one. */
  disabledReason: string | null;
};

/** Stripe's requirement keys are API paths, not sentences. Translate the ones
 *  that actually come up in Express onboarding; anything unmapped falls back to
 *  a readable version of the key rather than being hidden, because a
 *  requirement nobody can see is a requirement nobody completes. */
export function describeRequirement(key: string): string {
  const exact: Record<string, string> = {
    "external_account": "Add the bank account payouts should go to",
    "business_profile.url": "Add a business website or profile URL",
    "business_profile.mcc": "Choose the business category",
    "business_profile.product_description": "Describe what the business sells",
    "individual.verification.document": "Upload photo ID for the account holder",
    "individual.verification.additional_document": "Upload a second proof of identity",
    "individual.id_number": "Provide the account holder's ID number",
    "individual.dob.day": "Add the account holder's date of birth",
    "individual.address.line1": "Add the account holder's address",
    "company.tax_id": "Add the company tax or registration number",
    "company.verification.document": "Upload a company registration document",
    "company.directors_provided": "Confirm the company's directors",
    "company.owners_provided": "Confirm the company's beneficial owners",
    "tos_acceptance.date": "Accept Stripe's terms of service",
    "settings.dashboard.display_name": "Set the name shown on customer statements",
  };
  if (exact[key]) return exact[key];
  // person_xxx.verification.document → "Verification document for a person"
  if (/^person_/.test(key)) return `Identity details for an owner or director (${key.split(".").slice(1).join(" ") || "details"})`;
  return key.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export type PaymentRow = {
  id: string; amount: number; currency: string;
  status: "open" | "complete" | "expired";
  createdAt: string; completedAt: string | null;
  itemCount: number; fee: number | null;
  roomLabel: string | null; isPublicArea: boolean;
};

export type ChargeItem = {
  id: string; summary: string; price: number; currency: string;
  paid: boolean; settledByCard: boolean;
  createdAt: string; roomLabel: string | null;
};

export type PaymentsSummary = {
  sinceDays: number;
  currency: string;
  totals: {
    cardCollected: number; otherCollected: number; totalPaid: number;
    outstanding: number; cardCount: number; chargeableCount: number;
  };
  payments: PaymentRow[];
  /** The chargeable requests behind the totals, newest first (capped at 300). */
  items: ChargeItem[];
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
    payoutsEnabled: !!data.payoutsEnabled,
    requirementsDue: (data.requirementsDue as string[]) ?? [],
    requirementsPastDue: (data.requirementsPastDue as string[]) ?? [],
    disabledReason: (data.disabledReason as string) ?? null,
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

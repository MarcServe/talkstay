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
};

export async function fetchStripeStatus(hotelId: string): Promise<StripeConnectStatus> {
  const data = await invokeStripe({ action: "status", hotelId });
  return {
    connected: !!data.connected,
    accountId: (data.accountId as string) ?? null,
    chargesEnabled: !!data.chargesEnabled,
    detailsSubmitted: !!data.detailsSubmitted,
    connectedAt: (data.connectedAt as string) ?? null,
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

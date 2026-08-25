import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CreditCard, ExternalLink, Loader2, CheckCircle2, Unplug } from "lucide-react";
import type { Hotel } from "@/talkstay/lib/hotels";
import {
  disconnectStripe,
  fetchStripeStatus,
  openStripeDashboard,
  startStripeConnect,
  type StripeConnectStatus,
} from "@/talkstay/lib/stripeConnect";

/**
 * One-click Stripe Connect for the property — no API keys for the venue.
 * Once charges_enabled, guest Pay by card works for unpaid menu/orders.
 */
export default function PaymentsPanel({ hotel }: { hotel: Hotel }) {
  const [status, setStatus] = useState<StripeConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      setStatus(await fetchStripeStatus(hotel.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load payment status");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotel.id]);

  const connect = async () => {
    setBusy(true);
    try {
      const url = await startStripeConnect(hotel.id);
      window.location.assign(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't start Stripe Connect");
      setBusy(false);
    }
  };

  const dashboard = async () => {
    setBusy(true);
    try {
      const url = await openStripeDashboard(hotel.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't open Stripe");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!confirm("Disconnect Stripe from TalkStay? Guests won’t be able to pay by card until you reconnect. Your Stripe account itself is unchanged.")) {
      return;
    }
    setBusy(true);
    try {
      await disconnectStripe(hotel.id);
      toast.success("Stripe disconnected from this property");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't disconnect");
    } finally {
      setBusy(false);
    }
  };

  const ready = !!status?.chargesEnabled;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold tracking-tight">Payments</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect your Stripe account once. Guests can then pay unpaid orders by card
              (rooms, tables, bar, restaurant) — TalkStay marks them <span className="font-medium text-foreground">Paid</span>{" "}
              automatically when Stripe confirms payment. No API keys to paste.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking Stripe…
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className={`rounded-xl border px-4 py-3 ${ready ? "border-emerald-200 bg-emerald-50/70" : "bg-muted/30"}`}>
              <div className="flex items-center gap-2 text-sm font-medium">
                {ready ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Card payments live
                  </>
                ) : status?.connected ? (
                  <>Almost there — finish Stripe setup</>
                ) : (
                  <>Stripe not connected</>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {ready
                  ? "Checkout works on guest My requests / folio for unpaid priced items."
                  : status?.connected
                    ? "Return from Stripe and refresh if this still says incomplete."
                    : "Takes a few minutes in Stripe’s secure onboarding."}
              </p>
              {status?.accountId && (
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">{status.accountId}</p>
              )}
            </div>

            <div className="rounded-xl border bg-muted/20 px-4 py-3">
              <p className="text-sm font-medium">TalkStay application fee</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                On each successful guest card payment, TalkStay takes{" "}
                <span className="font-semibold text-foreground">
                  {(status?.platformFeePercent ?? 2.5).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}%
                </span>
                {" "}as a platform fee (Stripe Connect application fee). The rest settles to your Stripe account.
                Stripe’s own processing fees still apply on top.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {!ready && (
                <Button type="button" disabled={busy} className="bg-violet-600 hover:bg-violet-700" onClick={() => void connect()}>
                  {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CreditCard className="mr-1.5 h-4 w-4" />}
                  {status?.connected ? "Continue Stripe setup" : "Connect Stripe"}
                </Button>
              )}
              {status?.connected && (
                <Button type="button" variant="outline" disabled={busy} onClick={() => void dashboard()}>
                  <ExternalLink className="mr-1.5 h-4 w-4" /> Stripe dashboard
                </Button>
              )}
              <Button type="button" variant="ghost" disabled={busy || loading} onClick={() => void refresh()}>
                Refresh status
              </Button>
              {status?.connected && (
                <Button type="button" variant="ghost" disabled={busy} className="text-destructive" onClick={() => void disconnect()}>
                  <Unplug className="mr-1.5 h-4 w-4" /> Disconnect
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Platform ops: set <code className="text-[11px]">STRIPE_SECRET_KEY</code>, optional{" "}
        <code className="text-[11px]">TALKSTAY_PLATFORM_FEE_BPS</code> (default 250 = 2.5%), deploy{" "}
        <code className="text-[11px]">talkstay-stripe</code> +{" "}
        <code className="text-[11px]">talkstay-stripe-webhook</code>, and point a Stripe Connect
        webhook at the webhook function (events: <code className="text-[11px]">checkout.session.completed</code>,{" "}
        <code className="text-[11px]">account.updated</code>).
      </p>
    </div>
  );
}

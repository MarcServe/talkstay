import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CreditCard, ExternalLink, Loader2, CheckCircle2, Unplug } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { Hotel } from "@/talkstay/lib/hotels";
import {
  disconnectStripe,
  fetchStripeStatus,
  openStripeDashboard,
  describeRequirement,
  fetchPaymentsSummary,
  setCardPayments,
  startStripeConnect,
  type PaymentsSummary,
  type StripeConnectStatus,
} from "@/talkstay/lib/stripeConnect";
import { formatMoney } from "@/talkstay/lib/statusStyles";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";

/**
 * One-click Stripe Connect for the property — no API keys for the venue.
 * Once charges_enabled, guest Pay by card works for unpaid menu/orders.
 */
export default function PaymentsPanel({ hotel }: { hotel: Hotel }) {
  const [status, setStatus] = useState<StripeConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<PaymentsSummary | null>(null);
  const [sinceDays, setSinceDays] = useState(30);
  /** Which total the list underneath is breaking down. Defaults to card, which
   *  is what this panel showed before the tiles became selectable. */
  const [drill, setDrill] = useState<"card" | "other" | "paid" | "outstanding">("card");

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
    // Separate from status on purpose: the ledger is worth showing even when
    // Stripe isn't connected, because "collected another way" is still money
    // this property took, and the outstanding figure still matters.
    try {
      setSummary(await fetchPaymentsSummary(hotel.id, sinceDays));
    } catch {
      setSummary(null);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotel.id, sinceDays]);

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

  // Live for guests only when Stripe can charge AND the property wants it.
  const stripeReady = !!status?.chargesEnabled;
  const cardOn = status?.cardPaymentsEnabled !== false;
  const ready = stripeReady && cardOn;

  const toggleCardPayments = async (next: boolean) => {
    setBusy(true);
    try {
      await setCardPayments(hotel.id, next);
      setStatus((prev) => (prev ? { ...prev, cardPaymentsEnabled: next } : prev));
      toast.success(next ? "Card payments on" : "Card payments off — guests won't see the card option");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't change that");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* Ledger: card takings next to what operations says was chargeable, so
          "what did we actually collect" is answerable without exporting
          anything or opening Stripe. */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight">Collected</h3>
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <Button
                key={d} type="button" size="sm"
                variant={sinceDays === d ? "default" : "ghost"}
                className={`h-7 px-2.5 text-xs ${sinceDays === d ? "bg-violet-600 hover:bg-violet-700" : ""}`}
                onClick={() => setSinceDays(d)}
              >
                {d}d
              </Button>
            ))}
          </div>
        </div>

        {!summary ? (
          <p className="mt-4 text-xs text-muted-foreground">No payment data yet.</p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([
                { key: "card" as const, label: "By card", value: summary.totals.cardCollected, hint: `${summary.totals.cardCount} payment${summary.totals.cardCount === 1 ? "" : "s"}` },
                { key: "other" as const, label: "Other means", value: summary.totals.otherCollected, hint: "desk, POS, cash" },
                { key: "paid" as const, label: "Total paid", value: summary.totals.totalPaid, hint: `of ${summary.totals.chargeableCount} chargeable` },
                { key: "outstanding" as const, label: "Outstanding", value: summary.totals.outstanding, hint: "still unpaid" },
              ]).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setDrill(t.key)}
                  aria-pressed={drill === t.key}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    drill === t.key
                      ? "border-violet-400 bg-violet-50 ring-1 ring-violet-300"
                      : "bg-muted/20 hover:border-violet-300 hover:bg-violet-50/40"
                  }`}
                >
                  <p className="text-[11px] text-muted-foreground">{t.label}</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">
                    {formatMoney(t.value, summary.currency)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{t.hint}</p>
                </button>
              ))}
            </div>

            {/* The reconciliation itself: card + other should equal total paid.
                Stated rather than assumed, because they diverge if a request is
                marked paid by staff after a card payment already covered it. */}
            {Math.abs((summary.totals.cardCollected + summary.totals.otherCollected) - summary.totals.totalPaid) > 0.01 && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                Card and other means don’t add up to total paid — a charge may have been marked
                paid manually after a card payment already covered it.
              </p>
            )}

            {(() => {
              // Card stays a list of Stripe checkouts — one payment can settle
              // several charges, so collapsing it into charge rows would double
              // count against the total above it.
              if (drill === "card") {
                return summary.payments.length === 0 ? (
                  <p className="mt-4 text-xs text-muted-foreground">
                    No card payments in the last {summary.sinceDays} days.
                  </p>
                ) : (
                  <div className="mt-4 divide-y overflow-hidden rounded-xl border">
                    {summary.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">
                            {p.roomLabel ? formatRoomLabel(p.roomLabel) : "Unknown area"}
                            <span className="ml-1.5 font-normal text-muted-foreground">
                              · {p.itemCount} item{p.itemCount === 1 ? "" : "s"}
                            </span>
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(p.completedAt ?? p.createdAt).toLocaleString()}
                            {p.fee != null && ` · fee ${formatMoney(p.fee, p.currency)}`}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-semibold tabular-nums">{formatMoney(p.amount, p.currency)}</p>
                          <p className={`text-[10px] ${p.status === "complete" ? "text-emerald-700" : "text-muted-foreground"}`}>
                            {p.status === "complete" ? "paid" : p.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              const rows = (summary.items ?? []).filter((i) =>
                drill === "outstanding" ? !i.paid
                  : drill === "paid" ? i.paid
                  : i.paid && !i.settledByCard);
              const empty = {
                other: "Nothing was collected outside Stripe in this period.",
                paid: "Nothing has been paid in this period.",
                outstanding: "Nothing outstanding — every charge is settled.",
              }[drill];

              return rows.length === 0 ? (
                <p className="mt-4 text-xs text-muted-foreground">{empty}</p>
              ) : (
                <>
                  <div className="mt-4 divide-y overflow-hidden rounded-xl border">
                    {rows.map((i) => (
                      <div key={i.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{i.summary}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {i.roomLabel ? formatRoomLabel(i.roomLabel) : "Unknown area"}
                            {" · "}{new Date(i.createdAt).toLocaleDateString()}
                            {i.paid && i.settledByCard && " · card"}
                          </p>
                        </div>
                        <p className={`shrink-0 text-xs font-semibold tabular-nums ${i.paid ? "" : "text-amber-700"}`}>
                          {formatMoney(i.price, i.currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                  {/* The cap is on the server; saying so beats a list that
                      quietly stops short of the total above it. */}
                  {rows.length >= 300 && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Showing the 300 most recent — the totals above cover the full period.
                    </p>
                  )}
                </>
              );
            })()}
          </>
        )}
      </div>
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
                ) : stripeReady && !cardOn ? (
                  <>Card payments switched off</>
                ) : status?.connected ? (
                  <>Almost there — finish Stripe setup</>
                ) : (
                  <>Stripe not connected</>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {ready
                  ? "Checkout works on guest My requests / folio for unpaid priced items."
                  : stripeReady && !cardOn
                    ? "Stripe is connected and ready — you've chosen not to offer card payment to guests."
                    : status?.connected
                      ? "Return from Stripe and refresh if this still says incomplete."
                      : "Takes a few minutes in Stripe’s secure onboarding."}
              </p>
              {status?.accountId && (
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">{status.accountId}</p>
              )}

              {/* Named, not counted: "3 items outstanding" still leaves someone
                  clicking into Stripe to find out which three. */}
              {status?.connected && !stripeReady && (status.requirementsDue.length > 0 || status.requirementsPastDue.length > 0) && (
                <div className="mt-3 rounded-lg border bg-background p-3">
                  <p className="text-xs font-medium">Stripe still needs:</p>
                  <ul className="mt-1.5 space-y-1">
                    {[...new Set([...status.requirementsPastDue, ...status.requirementsDue])].map((key) => (
                      <li key={key} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <span className={status.requirementsPastDue.includes(key) ? "text-amber-600" : "text-muted-foreground"}>•</span>
                        <span>
                          {describeRequirement(key)}
                          {status.requirementsPastDue.includes(key) && (
                            <span className="ml-1 font-medium text-amber-700">— overdue</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Continue Stripe setup below takes you straight to these.
                  </p>
                </div>
              )}

              {/* Charges and payouts are separate permissions — a property can
                  be taking cards while their money is still held. */}
              {status?.connected && stripeReady && !status.payoutsEnabled && (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                  Cards work, but Stripe isn't paying out yet — usually a missing bank account
                  or verification. Money is held safely in the meantime.
                </p>
              )}
            </div>

            <div className="flex items-start justify-between gap-4 rounded-xl border px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Offer card payment to guests</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {!status?.connected
                    ? "Connect Stripe first — there's nothing to switch on until a payout account exists."
                    : "Off means guests never see a card option — requests still get priced and tracked, you just collect them your own way (front desk, your POS, cash). Nothing is disconnected, so you can switch it back on any time."}
                </p>
              </div>
              <Switch
                checked={cardOn && !!status?.connected}
                disabled={busy || loading || !status?.connected}
                onCheckedChange={(v) => void toggleCardPayments(v)}
                aria-label="Offer card payment to guests"
              />
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

    </div>
  );
}

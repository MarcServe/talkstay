import { Button } from "@/components/ui/button";
import { Loader2, Banknote } from "lucide-react";
import {
  formatMoney,
  PAYMENT_STYLE,
  paymentLabel,
  statusBadge,
  statusDot,
  statusLabel,
} from "@/talkstay/lib/statusStyles";
import type { GuestPaymentTiming, GuestRequest } from "@/talkstay/lib/guest";

export function unpaidChargeables(reqs: GuestRequest[]) {
  return reqs.filter(
    (r) => r.is_chargeable && (r.payment_status ?? "unpaid") === "unpaid" && r.status !== "cancelled",
  );
}

export function folioTotals(unpaid: GuestRequest[]) {
  const priced = unpaid.filter((r) => typeof r.price === "number" && Number(r.price) > 0);
  const owedTotal = priced.length
    ? priced.reduce((sum, r) => sum + Number(r.price), 0)
    : null;
  const currency = unpaid.find((r) => r.currency)?.currency ?? "GBP";
  return { owedTotal, currency, pricedCount: priced.length };
}

/** Itemized stay balance — used on Check-out page and My requests. */
export function GuestFolio({
  requests,
  paymentTiming,
  payBusy,
  onPayNow,
  onPayAtCheckout,
  variant = "page",
}: {
  requests: GuestRequest[];
  paymentTiming: GuestPaymentTiming | null;
  payBusy?: boolean;
  onPayNow: () => void;
  onPayAtCheckout: () => void;
  variant?: "page" | "compact";
}) {
  const unpaid = unpaidChargeables(requests);
  const paid = requests.filter(
    (r) => r.is_chargeable && r.payment_status === "paid" && r.status !== "cancelled",
  );
  const { owedTotal, currency } = folioTotals(unpaid);
  const isPage = variant === "page";

  if (!unpaid.length && !paid.length) {
    return (
      <div className={`rounded-2xl border border-emerald-200 bg-emerald-50/80 ${isPage ? "px-4 py-5" : "px-3.5 py-3"}`}>
        <p className="text-sm font-semibold text-emerald-950">Nothing to pay</p>
        <p className="mt-1 text-xs text-emerald-900/80">
          Chargeable room service and extras will appear here with prices as they’re added.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {unpaid.length > 0 && (
        <div className={`rounded-2xl border border-amber-300/90 bg-amber-50 ${isPage ? "px-4 py-4" : "px-3.5 py-3"} text-amber-950`}>
          <div className="flex items-start gap-2.5">
            <Banknote className={`${isPage ? "mt-0.5 h-5 w-5" : "mt-0.5 h-4 w-4"} shrink-0 text-amber-700`} />
            <div className="min-w-0 flex-1">
              <p className={`${isPage ? "text-base" : "text-sm"} font-semibold tracking-tight`}>
                {owedTotal != null
                  ? `You currently owe ${formatMoney(owedTotal, currency)}`
                  : `${unpaid.length} unpaid item${unpaid.length === 1 ? "" : "s"}`}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-amber-900/80">
                {paymentTiming === "pay_now"
                  ? "We've asked the team to collect payment in your room."
                  : paymentTiming === "at_checkout"
                    ? "You'll settle this at checkout — no card needed in the app."
                    : "Pay now (someone collects in your room) or settle at the desk on checkout. Online card pay isn’t wired yet."}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  className="h-10 bg-amber-700 text-white hover:bg-amber-800"
                  disabled={!!payBusy || paymentTiming === "pay_now"}
                  onClick={onPayNow}
                >
                  {payBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {paymentTiming === "pay_now" ? "Team notified" : "Pay now"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 border-amber-300 bg-white/80"
                  disabled={!!payBusy || paymentTiming === "at_checkout"}
                  onClick={onPayAtCheckout}
                >
                  {paymentTiming === "at_checkout" ? "At checkout" : "Pay at checkout"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`rounded-2xl border bg-white/80 ${isPage ? "p-4" : "p-3"}`}>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {unpaid.length ? "Open charges" : "Charges"}
        </h3>
        <ul className="mt-2 divide-y">
          {unpaid.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug">{r.summary}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge(r.status)}`}>
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot(r.status)}`} />
                    {statusLabel(r.status)}
                  </span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${PAYMENT_STYLE[r.payment_status ?? "unpaid"]}`}>
                    {paymentLabel(r.payment_status ?? "unpaid")}
                  </span>
                </div>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">
                {r.price != null ? formatMoney(r.price, r.currency) : "TBC"}
              </p>
            </li>
          ))}
        </ul>
        {unpaid.length > 0 && owedTotal != null && (
          <div className="mt-2 flex items-center justify-between border-t pt-2.5 text-sm font-semibold">
            <span>Total due</span>
            <span className="tabular-nums">{formatMoney(owedTotal, currency)}</span>
          </div>
        )}
      </div>

      {paid.length > 0 && (
        <div className={`rounded-2xl border border-emerald-200/80 bg-emerald-50/50 ${isPage ? "p-4" : "p-3"}`}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-900/70">Already paid</h3>
          <ul className="mt-2 divide-y divide-emerald-200/60">
            {paid.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <p className="min-w-0 text-sm text-emerald-950/90">{r.summary}</p>
                <p className="shrink-0 text-sm font-medium tabular-nums text-emerald-900">
                  {r.price != null ? formatMoney(r.price, r.currency) : "Paid"}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

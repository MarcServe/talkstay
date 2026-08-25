import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { folioPayCopy, orderLocationKind } from "@/talkstay/lib/locationOrders";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";

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

/** Itemized stay / location balance — used on Check-out page and My requests. */
export function GuestFolio({
  requests,
  paymentTiming,
  payBusy,
  onPayNow,
  onPayAtCheckout,
  onChargeToRoom,
  onPayByCard,
  cardPayEnabled = false,
  variant = "page",
  isPublic = false,
  billingRoomNumber = null,
}: {
  requests: GuestRequest[];
  paymentTiming: GuestPaymentTiming | null;
  payBusy?: boolean;
  onPayNow: () => void;
  /** Maps to session payment_timing `at_checkout` — room bill or pay at counter. */
  onPayAtCheckout: () => void;
  /** Public QR: verify check-in code then charge to that occupied room. */
  onChargeToRoom?: (code: string) => void | Promise<void>;
  /** Stripe Checkout when the property has Connect live. */
  onPayByCard?: () => void;
  cardPayEnabled?: boolean;
  variant?: "page" | "compact";
  /** Public QR area (lobby, bar, spa…). */
  isPublic?: boolean;
  /** Verified billing room after check-in code (public QR only). */
  billingRoomNumber?: string | null;
}) {
  const unpaid = unpaidChargeables(requests);
  const paid = requests.filter(
    (r) => r.is_chargeable && r.payment_status === "paid" && r.status !== "cancelled",
  );
  const { owedTotal, currency, pricedCount } = folioTotals(unpaid);
  const isPage = variant === "page";
  const copy = folioPayCopy(orderLocationKind(isPublic));
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const chargedToRoom = paymentTiming === "charge_to_room" && !!billingRoomNumber;
  const deferred = paymentTiming === "at_checkout";
  const canCard = cardPayEnabled && !!onPayByCard && pricedCount > 0;

  if (!unpaid.length && !paid.length) {
    return (
      <div className={`rounded-2xl border border-emerald-200 bg-emerald-50/80 ${isPage ? "px-4 py-5" : "px-3.5 py-3"}`}>
        <p className="text-sm font-semibold text-emerald-950">Nothing to pay</p>
        <p className="mt-1 text-xs text-emerald-900/80">{copy.emptyHint}</p>
      </div>
    );
  }

  const hint = paymentTiming === "pay_now"
    ? copy.unpaidHintPayNow
    : chargedToRoom
      ? `${copy.unpaidHintChargeRoom}${billingRoomNumber ? ` (${formatRoomLabel(billingRoomNumber)})` : ""}`
      : deferred
        ? copy.unpaidHintDeferred
        : copy.unpaidHintUnset;

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
              <p className="mt-1 text-[11px] leading-snug text-amber-900/80">{hint}</p>

              {canCard && (
                <Button
                  size="sm"
                  className="mt-3 h-11 w-full bg-violet-700 text-white hover:bg-violet-800"
                  disabled={!!payBusy}
                  onClick={onPayByCard}
                >
                  {payBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                  {payBusy ? copy.payCardBusy : `${copy.payCardIdle}${owedTotal != null ? ` · ${formatMoney(owedTotal, currency)}` : ""}`}
                </Button>
              )}

              {isPublic ? (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      className="h-10 bg-amber-700 text-white hover:bg-amber-800"
                      disabled={!!payBusy || paymentTiming === "pay_now"}
                      onClick={onPayNow}
                    >
                      {payBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      {paymentTiming === "pay_now" ? copy.payNowActive : copy.payNowIdle}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 border-amber-300 bg-white/80"
                      disabled={!!payBusy || deferred}
                      onClick={() => { setCodeOpen(false); onPayAtCheckout(); }}
                    >
                      {deferred ? copy.deferActive : copy.deferIdle}
                    </Button>
                  </div>
                  {chargedToRoom ? (
                    <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-950">
                      Charging to {formatRoomLabel(billingRoomNumber!)}
                    </p>
                  ) : onChargeToRoom ? (
                    codeOpen ? (
                      <form
                        className="space-y-2 rounded-xl border border-amber-300/80 bg-white/80 p-3"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!code.trim() || payBusy) return;
                          void Promise.resolve(onChargeToRoom(code.trim()))
                            .then(() => {
                              setCode("");
                              setCodeOpen(false);
                            })
                            .catch(() => { /* parent toasts */ });
                        }}
                      >
                        <p className="text-[11px] leading-snug text-amber-900/85">{copy.codeHint}</p>
                        <Input
                          value={code}
                          onChange={(e) => setCode(e.target.value.toUpperCase())}
                          placeholder="e.g. R3K8NW"
                          className="h-10 tracking-[0.18em]"
                          autoCapitalize="characters"
                          autoComplete="one-time-code"
                          disabled={!!payBusy}
                        />
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" className="h-9 flex-1 bg-amber-800 text-white hover:bg-amber-900" disabled={!!payBusy || !code.trim()}>
                            {payBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                            {copy.codeSubmit}
                          </Button>
                          <Button type="button" size="sm" variant="ghost" className="h-9" disabled={!!payBusy} onClick={() => setCodeOpen(false)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 w-full border-amber-400 bg-white/90 font-medium"
                        disabled={!!payBusy}
                        onClick={() => setCodeOpen(true)}
                      >
                        {copy.chargeRoomIdle}
                      </Button>
                    )
                  ) : null}
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    className="h-10 bg-amber-700 text-white hover:bg-amber-800"
                    disabled={!!payBusy || paymentTiming === "pay_now"}
                    onClick={onPayNow}
                  >
                    {payBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {paymentTiming === "pay_now" ? copy.payNowActive : copy.payNowIdle}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 border-amber-300 bg-white/80"
                    disabled={!!payBusy || deferred || chargedToRoom}
                    onClick={onPayAtCheckout}
                  >
                    {deferred || chargedToRoom ? copy.deferActive : copy.deferIdle}
                  </Button>
                </div>
              )}
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

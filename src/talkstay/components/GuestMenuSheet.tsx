import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Minus, Plus, ShoppingBag, TriangleAlert, X } from "lucide-react";
import { formatMoney } from "@/talkstay/lib/statusStyles";
import {
  fetchGuestMenu,
  orderGuestMenuItems,
  type GuestMenuItem,
} from "@/talkstay/lib/guest";

/**
 * Guest digital menu — tap items from the staff catalog, send as chargeable
 * requests. Works for restaurants and hotel F&B public QRs alike.
 */
export default function GuestMenuSheet({
  hotelSlug, roomId, token, sessionId, brand, onClose, onOrdered,
}: {
  hotelSlug: string;
  roomId: string;
  token: string;
  sessionId: string;
  brand: string;
  onClose: () => void;
  onOrdered: (summaries: string[]) => void;
}) {
  const [items, setItems] = useState<GuestMenuItem[]>([]);
  const [depts, setDepts] = useState<{ key: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  // Distinct from "loaded fine, nothing on it" — a genuinely empty catalog and
  // a failed fetch used to render the exact same "No menu items yet" card,
  // which is how a real error (stale token, a 500) read as "this property
  // just hasn't set up a menu" with no way to tell the difference or retry.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  const load = useCallback(
    (cancelledRef: { cancelled: boolean }) => {
      setLoading(true);
      setLoadError(null);
      fetchGuestMenu({ hotelSlug, roomId, token, sessionId })
        .then((payload) => {
          if (cancelledRef.cancelled) return;
          setItems(payload.items);
          setDepts(payload.departments);
        })
        .catch((err) => {
          if (cancelledRef.cancelled) return;
          // eslint-disable-next-line no-console
          console.error("fetchGuestMenu failed:", err);
          const code = typeof err?.code === "string" ? err.code : "";
          const friendly = code === "checked_out"
            ? "This stay has ended, so the menu isn't available anymore."
            : "Couldn't load the menu — check your connection and try again.";
          setLoadError(friendly);
          toast.error(friendly);
        })
        .finally(() => {
          if (!cancelledRef.cancelled) setLoading(false);
        });
    },
    [hotelSlug, roomId, token, sessionId],
  );

  useEffect(() => {
    const ref = { cancelled: false };
    load(ref);
    return () => { ref.cancelled = true; };
  }, [load, retryTick]);

  const visible = useMemo(
    () => (deptFilter === "all" ? items : items.filter((i) => i.departmentKey === deptFilter)),
    [items, deptFilter],
  );

  const cartLines = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = items.find((i) => i.id === id);
        return item ? { item, qty } : null;
      })
      .filter(Boolean) as { item: GuestMenuItem; qty: number }[];
  }, [cart, items]);

  const cartTotal = cartLines.reduce(
    (sum, { item, qty }) => sum + (typeof item.price === "number" ? item.price * qty : 0),
    0,
  );
  const cartCurrency = cartLines[0]?.item.currency ?? "GBP";
  const cartCount = cartLines.reduce((n, l) => n + l.qty, 0);
  /** Distinct teams in the cart. One bartender carrying one tray needs no
   *  instruction, so the "bring it together" option only appears above one. */
  const cartDepts = useMemo(
    () => [...new Set(cartLines.map(({ item }) => item.departmentKey))],
    [cartLines],
  );
  const [together, setTogether] = useState(true);

  const setQty = (id: string, qty: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = Math.min(20, qty);
      return next;
    });
  };

  const placeOrder = async () => {
    if (!cartLines.length) return;
    setBusy(true);
    try {
      const res = await orderGuestMenuItems({
        hotelSlug,
        roomId,
        token,
        sessionId,
        items: cartLines.map(({ item, qty }) => ({ id: item.id, qty })),
        together: cartDepts.length > 1 ? together : undefined,
      });
      toast.success(res.reply);
      onOrdered(res.requests.map((r) => r.summary));
      setCart({});
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send the order");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-talkstay
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="ts-glass-strong flex h-full w-full max-w-md flex-col overflow-hidden border-l border-white/50"
        style={{
          backgroundImage: "linear-gradient(165deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.78) 100%)",
          backdropFilter: "blur(22px) saturate(1.45)",
          WebkitBackdropFilter: "blur(22px) saturate(1.45)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Menu</h2>
            <p className="text-xs text-muted-foreground">Tap to add · send to the team</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {depts.length > 1 && (
          <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b px-3 py-2">
            <button
              type="button"
              onClick={() => setDeptFilter("all")}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${
                deptFilter === "all" ? "text-white" : "border bg-background text-muted-foreground"
              }`}
              style={deptFilter === "all" ? { backgroundColor: brand } : undefined}
            >
              All
            </button>
            {depts.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDeptFilter(d.key)}
                className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${
                  deptFilter === d.key ? "text-white" : "border bg-background text-muted-foreground"
                }`}
                style={deptFilter === d.key ? { backgroundColor: brand } : undefined}
              >
                {d.name}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading menu…
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-dashed px-4 py-10 text-center">
              <TriangleAlert className="mx-auto mb-2 h-5 w-5 text-amber-600" />
              <p className="text-sm font-medium">{loadError}</p>
              <Button
                variant="outline" size="sm" className="mt-3"
                onClick={() => setRetryTick((t) => t + 1)}
              >
                Try again
              </Button>
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed px-4 py-10 text-center">
              <p className="text-sm font-medium">No menu items yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ask staff — or speak / type your order to the assistant.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {visible.map((item) => {
                const qty = cart[item.id] ?? 0;
                const off = item.available === false;
                const backAt = off && item.availableAt
                  ? new Date(item.availableAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : null;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                      off ? "bg-muted/40" : "bg-background/90"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${off ? "text-muted-foreground line-through" : ""}`}>
                        {item.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {off ? (
                          <span className="font-medium text-amber-700 dark:text-amber-300">
                            {backAt ? `Back at ${backAt}` : "Unavailable right now"}
                          </span>
                        ) : (
                          <>
                            {item.departmentName}
                            {typeof item.price === "number"
                              ? ` · ${formatMoney(item.price, item.currency)}`
                              : " · ask for price"}
                          </>
                        )}
                      </p>
                    </div>
                    {off ? (
                      <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                        Off
                      </span>
                    ) : qty === 0 ? (
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 shrink-0 text-white"
                        style={{ backgroundColor: brand }}
                        onClick={() => setQty(item.id, 1)}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" /> Add
                      </Button>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-9 w-9"
                          onClick={() => setQty(item.id, qty - 1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-6 text-center text-sm font-semibold tabular-nums">{qty}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-9 w-9"
                          onClick={() => setQty(item.id, qty + 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {cartCount > 0 && (
          <div className="shrink-0 border-t bg-background/95 px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">{cartCount} item{cartCount === 1 ? "" : "s"}</span>
              <span className="font-semibold tabular-nums">
                {cartTotal > 0 ? formatMoney(cartTotal, cartCurrency) : "—"}
              </span>
            </div>
            {/* Only when two teams are involved — the kitchen and the bar can't
                see each other's tickets, so this is the only way the guest can
                say "please don't bring the drinks ten minutes early". */}
            {cartDepts.length > 1 && (
              <label className="mb-2 flex cursor-pointer items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                <input
                  type="checkbox"
                  checked={together}
                  onChange={(e) => setTogether(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border"
                />
                <span className="text-xs leading-snug">
                  <span className="font-medium">Bring it all together</span>
                  <span className="block text-muted-foreground">
                    Your food and drinks arrive at the same time, rather than whichever is ready first.
                  </span>
                </span>
              </label>
            )}
            <Button
              type="button"
              className="h-11 w-full text-white"
              style={{ backgroundColor: brand }}
              disabled={busy}
              onClick={() => void placeOrder()}
            >
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ShoppingBag className="mr-1.5 h-4 w-4" />}
              {busy ? "Sending…" : "Send order"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

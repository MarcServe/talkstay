import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronDown, Loader2, Phone, AlertTriangle, X, Plus, Minus } from "lucide-react";
import { listRooms, listCatalogItems, type CatalogItem, type Hotel, type Room } from "@/talkstay/lib/hotels";
import { formatRoomLabel, guestStayLabel } from "@/talkstay/lib/roomLabel";
import { useDemo } from "@/talkstay/demo/DemoContext";
import { OPEN_STATUSES } from "@/talkstay/lib/data";
import { useOpsQueue } from "@/talkstay/hooks/useTalkStayQueries";
import { useHotelDepartments } from "@/talkstay/hooks/useHotelDepartments";
import { formatMoney, statusBadge, statusLabel } from "@/talkstay/lib/statusStyles";
import { logOrderChargeableLabel } from "@/talkstay/lib/locationOrders";

type OrderSource = "phone" | "walk_in" | "front_desk";

type OpenRow = {
  id: string;
  department_key: string;
  summary: string;
  summary_staff?: string | null;
  status: string;
  source?: string | null;
  created_at: string;
  /** Who and where — shown on the card so nobody opens a ticket just to find
   *  out it's Table 24. */
  guest_first_name?: string | null;
  guest_locator?: string | null;
  ts_rooms?: { room_number?: string | null } | null;
};

const SOURCE_LABEL: Record<OrderSource, string> = {
  phone: "Phone",
  walk_in: "Walk-in",
  front_desk: "Front desk",
};

const STAFF_LOG_SOURCES = new Set(["phone", "walk_in", "front_desk"]);

function minsAgo(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

function sourceLabel(s?: string | null) {
  if (s === "phone") return "Phone";
  if (s === "walk_in") return "Walk-in";
  if (s === "front_desk") return "Front desk";
  if (s === "repeat") return "Repeat";
  if (s === "pulse") return "Stay feedback";
  return "Guest app";
}

/** Staff bookkeeping: log a phone / walk-in / front-desk order so it appears in the
 *  queue. Guest-app tickets already land on Operations — search there first. */
export default function LogOrderDialog({
  hotel,
  lockedDepartment = null,
  variant = "modal",
  onClose,
  onCreated,
  onOpenRequest,
}: {
  hotel: Hotel;
  lockedDepartment?: string | null;
  /** `panel` = full-page form (sidebar menu). `modal` = overlay from Operations. */
  variant?: "modal" | "panel";
  onClose?: () => void;
  onCreated: () => void;
  /** When set, open tickets for the selected room can jump straight to that request. */
  onOpenRequest?: (requestId: string) => void;
}) {
  const demo = useDemo();
  const { departments: hotelDepts, deptLabel } = useHotelDepartments(hotel.id);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState("");
  const [dept, setDept] = useState(lockedDepartment || "housekeeping");
  const [source, setSource] = useState<OrderSource>("phone");
  const [summary, setSummary] = useState("");
  const [guestNote, setGuestNote] = useState("");
  const [priority, setPriority] = useState("normal");
  const [chargeable, setChargeable] = useState(false);
  const [price, setPrice] = useState("");
  // Tapped menu items, kept separate from the free-text box so picking never
  // overwrites something a staff member is part-way through typing.
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [openRows, setOpenRows] = useState<OpenRow[]>([]);
  const [dupBlock, setDupBlock] = useState<OpenRow[] | null>(null);
  const [loggedOpen, setLoggedOpen] = useState(false);

  // Panel only: compact list of open staff-logged orders for this department (or all for managers).
  const { data: queue } = useOpsQueue(variant === "panel" ? hotel.id : undefined, "3d");

  const recentLogged = useMemo(() => {
    if (variant !== "panel") return [];
    const rows = queue?.requests ?? [];
    return rows
      .filter((r) =>
        (OPEN_STATUSES as readonly string[]).includes(r.status)
        && !!r.source
        && STAFF_LOG_SOURCES.has(r.source)
        && (!lockedDepartment || r.department_key === lockedDepartment),
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 12);
  }, [variant, queue?.requests, lockedDepartment]);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === roomId) ?? null,
    [rooms, roomId],
  );
  const selectedIsPublic = !!selectedRoom?.is_public;

  useEffect(() => {
    if (lockedDepartment) setDept(lockedDepartment);
  }, [lockedDepartment]);

  useEffect(() => {
    if (demo) {
      setRooms(demo.state.rooms as unknown as Room[]);
      return;
    }
    listRooms(hotel.id).then(setRooms).catch(() => setRooms([]));
  }, [hotel.id, demo, demo?.version, demo?.state.rooms]);

  useEffect(() => {
    if (!roomId) { setOpenRows([]); return; }
    if (demo) {
      setOpenRows(demo.listOpenForRoom(roomId) as OpenRow[]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke("talkstay-staff", {
        body: { action: "open_for_room", hotelId: hotel.id, roomId },
      });
      if (cancelled) return;
      if (error || (data as any)?.error) {
        setOpenRows([]);
        return;
      }
      setOpenRows(((data as any)?.open as OpenRow[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, [roomId, hotel.id, demo, demo?.version]);

  const activeDept = lockedDepartment || dept;
  useEffect(() => {
    let cancelled = false;
    setPicked({});
    if (demo || !activeDept) { setItems([]); return; }
    // Scoped to where the order is being taken: the outlet's own list plus the
    // department-wide items, so a pool-bar ticket shows pool-bar prices.
    listCatalogItems(hotel.id, activeDept, { roomId: roomId || null }).then((rows) => {
      if (!cancelled) setItems(rows);
    });
    return () => { cancelled = true; };
  }, [hotel.id, activeDept, roomId, demo]);

  const pickedList = useMemo(
    () => items.filter((i) => (picked[i.id] ?? 0) > 0),
    [items, picked],
  );
  const pickedLine = pickedList
    .map((i) => (picked[i.id] > 1 ? `${picked[i.id]}× ${i.name}` : i.name))
    .join(", ");
  const pickedTotal = pickedList.reduce(
    (sum, i) => sum + (typeof i.price === "number" ? i.price * picked[i.id] : 0), 0,
  );
  const bump = (id: string, by: number) =>
    setPicked((p) => {
      const next = Math.max(0, (p[id] ?? 0) + by);
      const out = { ...p };
      if (next === 0) delete out[id]; else out[id] = next;
      return out;
    });

  const submit = async (force = false) => {
    if (!roomId) { toast.error("Pick a room first."); return; }
    // Picked items and free text combine — staff often tap two drinks and then
    // type "no ice".
    const ordered = [pickedLine, summary.trim()].filter(Boolean).join(" · ");
    if (!ordered) { toast.error("Pick an item or say what was requested."); return; }
    const note = guestNote.trim();
    const summaryText = note ? `${note} · ${ordered}` : ordered;
    setBusy(true);
    setDupBlock(null);
    try {
      if (demo) {
        const out = demo.logStaffOrder({
          roomId,
          departmentKey: lockedDepartment || dept,
          summary: summaryText,
          source,
          priority,
          force,
          isChargeable: chargeable,
          price: chargeable ? (price.trim() !== "" ? Number(price) : (pickedTotal > 0 ? pickedTotal : null)) : null,
        });
        if ((out as any)?.duplicate) {
          setDupBlock(((out as any).open as OpenRow[]) ?? []);
          setBusy(false);
          return;
        }
        toast.success(`Logged for ${formatRoomLabel(rooms.find((r) => r.id === roomId)?.room_number)} — on the Operations queue.`);
        setSummary("");
        setGuestNote("");
        onCreated();
        onClose?.();
        setBusy(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("talkstay-staff", {
        body: {
          action: "create_request",
          hotelId: hotel.id,
          roomId,
          departmentKey: lockedDepartment || dept,
          summary: summaryText,
          source,
          priority,
          force,
          isChargeable: chargeable,
          price: chargeable ? (price.trim() !== "" ? Number(price) : (pickedTotal > 0 ? pickedTotal : null)) : null,
        },
      });
      const bodyErr = (data as any)?.error as string | undefined;
      if ((data as any)?.duplicate) {
        setDupBlock(((data as any).open as OpenRow[]) ?? []);
        setBusy(false);
        return;
      }
      if (error || bodyErr) throw new Error(bodyErr || error?.message || "Couldn't log order");
      toast.success(`Logged for ${formatRoomLabel((data as any)?.roomNumber)} — team notified.`);
      setSummary("");
      setGuestNote("");
      onCreated();
      onClose?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't log order");
    } finally {
      setBusy(false);
    }
  };

  const loggedList = variant === "panel" && (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setLoggedOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
        aria-expanded={loggedOpen}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium">
            Open logged orders
            {lockedDepartment ? ` · ${deptLabel(lockedDepartment)}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {recentLogged.length === 0
              ? "No phone / walk-in / front-desk orders open right now."
              : `${recentLogged.length} open · tap to ${loggedOpen ? "hide" : "review"} before logging another`}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${loggedOpen ? "rotate-180" : ""}`}
        />
      </button>
      {loggedOpen && recentLogged.length > 0 && (
        <ul className="divide-y border-t">
          {recentLogged.map((r) => {
            const row = (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{formatRoomLabel(r.ts_rooms?.room_number)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge(r.status)}`}>
                    {statusLabel(r.status)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {sourceLabel(r.source)}
                    {!lockedDepartment ? ` · ${deptLabel(r.department_key)}` : ""}
                    {" · "}
                    {minsAgo(r.created_at)}m ago
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {r.summary_staff || r.summary}
                </p>
              </>
            );
            return (
              <li key={r.id}>
                {onOpenRequest ? (
                  <button
                    type="button"
                    onClick={() => onOpenRequest(r.id)}
                    className="w-full px-4 py-2.5 text-left transition-colors hover:bg-violet-50/70"
                  >
                    {row}
                    <span className="mt-1 block text-[11px] font-medium text-violet-700">Open on Operations →</span>
                  </button>
                ) : (
                  <div className="px-4 py-2.5">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const form = (
    <div className={variant === "panel" ? "space-y-4" : "space-y-3"}>
      {variant === "panel" && (
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Phone className="h-5 w-5 text-violet-600" /> Log phone / walk-in
          </h2>
            <p className="mt-1 text-sm text-muted-foreground">
            Use this only when a guest called, walked up, or asked reception — and the request isn’t
            already on Operations. Guest-app tickets appear automatically; search the room there first
            so you don’t re-log the same order.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Lobby / restaurant walk-ups: choose a <span className="font-medium text-foreground">Public QR</span> area.
          </p>
        </div>
      )}

      {variant === "modal" && (
        <div className="mb-1 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Phone className="h-5 w-5 text-violet-600" /> Log phone / walk-in
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              For calls and walk-ins that aren’t already on the board. Prefer searching the room on
              Operations if the guest may have used the room assistant.
              {" "}Lobby / restaurant walk-ups: pick a Public QR area.
            </p>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Room / area</Label>
          <Select value={roomId} onValueChange={setRoomId}>
            <SelectTrigger><SelectValue placeholder="Select room or public area" /></SelectTrigger>
            <SelectContent>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  <span className="inline-flex items-center gap-2">
                    {formatRoomLabel(r.room_number)}
                    {r.is_public ? (
                      <span className="rounded border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-800">
                        Public
                      </span>
                    ) : null}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Bedroom stay, or a Public QR location (lobby, bar, restaurant, pool, spa, conference). Room number is not required for walk-ins — pick the area.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Guest name / table (optional)</Label>
          <Input
            value={guestNote}
            onChange={(e) => setGuestNote(e.target.value)}
            placeholder="e.g. Table 4 · Sara"
            maxLength={80}
          />
          <p className="text-[11px] text-muted-foreground">
            Prepended to the order summary so walk-ups are easy to spot on Operations.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>How it came in</Label>
            <Select value={source} onValueChange={(v) => setSource(v as OrderSource)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(SOURCE_LABEL) as OrderSource[]).map((k) => (
                  <SelectItem key={k} value={k}>{SOURCE_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!lockedDepartment ? (
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={dept} onValueChange={setDept}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {hotelDepts.map((d) => (
                    <SelectItem key={d.key} value={d.key}>{d.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input
                value={deptLabel(lockedDepartment)}
                disabled
              />
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Tap to add</Label>
              {pickedList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPicked({})}
                  className="text-[11px] text-muted-foreground underline hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {items.map((i) => {
                const qty = picked[i.id] ?? 0;
                return (
                  <span
                    key={i.id}
                    className={`inline-flex items-center overflow-hidden rounded-full border text-xs ${
                      qty > 0 ? "border-violet-400 bg-violet-50" : "bg-background"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => bump(i.id, 1)}
                      className="px-2.5 py-1.5 hover:bg-violet-100/60"
                    >
                      {qty > 0 && <strong className="mr-1">{qty}×</strong>}
                      {i.name}
                      {typeof i.price === "number" && (
                        <span className="ml-1 text-muted-foreground">
                          {formatMoney(i.price, i.currency)}
                        </span>
                      )}
                    </button>
                    {qty > 0 && (
                      <button
                        type="button"
                        aria-label={`Remove one ${i.name}`}
                        onClick={() => bump(i.id, -1)}
                        className="border-l px-1.5 py-1.5 text-muted-foreground hover:bg-violet-100/60"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
            {pickedList.length > 0 && (
              <p className="text-xs">
                <span className="text-muted-foreground">Order: </span>{pickedLine}
                {pickedTotal > 0 && (
                  <span className="ml-1 font-medium">
                    · {formatMoney(pickedTotal, pickedList[0]?.currency)}
                  </span>
                )}
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label>{items.length > 0 ? "Anything else / notes" : "What was ordered / requested"}</Label>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="e.g. 2 club sandwiches and a bottle of still water"
            rows={3}
            autoFocus={variant === "modal"}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3 space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-emerald-950">
            <input
              type="checkbox"
              checked={chargeable}
              onChange={(e) => setChargeable(e.target.checked)}
              className="h-4 w-4 rounded border-emerald-300"
            />
            {logOrderChargeableLabel(selectedIsPublic)}
          </label>
          {chargeable && selectedIsPublic && (
            <p className="text-[11px] leading-snug text-emerald-900/75">
              Public / walk-in orders: collect pay now, at the counter, or on delivery — not charged to a room bill.
            </p>
          )}
          {chargeable && (
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="max-w-[10rem] bg-white"
              />
            </div>
          )}
        </div>

        {openRows.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-950">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5" /> Already open for this room
            </p>
            <ul className="space-y-1.5">
              {openRows.map((o) => {
                const who = guestStayLabel(
                  o.guest_first_name,
                  o.ts_rooms?.room_number ?? selectedRoom?.room_number,
                  { locator: o.guest_locator, fallback: "" },
                );
                const body = (
                  <>
                    {who && (
                      <div className="text-sm font-semibold text-amber-950">{who}</div>
                    )}
                    <span className="font-medium">
                      {deptLabel(o.department_key)}
                    </span>
                    {" · "}
                    <span className="capitalize">{o.status.replace(/_/g, " ")}</span>
                    {" · "}
                    {sourceLabel(o.source)} · {minsAgo(o.created_at)}m ago
                    <div className="mt-0.5 text-amber-900/80">{o.summary_staff || o.summary}</div>
                    {onOpenRequest && (
                      <div className="mt-1 text-[11px] font-medium text-violet-700">Open ticket →</div>
                    )}
                  </>
                );
                return (
                  <li key={o.id}>
                    {onOpenRequest ? (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenRequest(o.id);
                          onClose?.();
                        }}
                        className="w-full rounded-lg border border-amber-200/80 bg-white/70 px-2.5 py-1.5 text-left text-xs transition-colors hover:border-violet-300 hover:bg-violet-50/60"
                      >
                        {body}
                      </button>
                    ) : (
                      <div className="rounded-lg border border-amber-200/80 bg-white/70 px-2.5 py-1.5 text-xs">
                        {body}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[11px] text-amber-800/90">
              {onOpenRequest
                ? "Open an existing ticket instead of logging again — unless this is a genuine second order."
                : "Check Operations for this room before logging — someone may already be handling it."}
            </p>
          </div>
        )}

        {dupBlock && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-sm text-rose-950">
            <p className="font-medium">Same team already has an open order for this room.</p>
            <p className="mt-1 text-xs text-rose-900/85">
              If reception already took this call, don’t log again — open the existing ticket on Operations instead. Only force-log if it’s genuinely a second order.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setDupBlock(null)}>
                Go back
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() => void submit(true)}
              >
                Log another anyway
              </Button>
            </div>
          </div>
        )}

        {!dupBlock && (
          <Button
            type="button"
            className="w-full bg-violet-600 hover:bg-violet-700 sm:w-auto"
            disabled={busy}
            onClick={() => void submit(false)}
          >
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Phone className="mr-1.5 h-4 w-4" />}
            Log phone / walk-in
          </Button>
        )}
      </div>
    </div>
  );

  if (variant === "panel") {
    return (
      <div className="max-w-lg space-y-3">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          {form}
        </div>
        {loggedList}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-background p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {form}
      </div>
    </div>
  );
}

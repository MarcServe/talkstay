import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Phone, AlertTriangle, X } from "lucide-react";
import { DEPARTMENTS, listRooms, type Hotel, type Room } from "@/talkstay/lib/hotels";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";
import { useDemo } from "@/talkstay/demo/DemoContext";

type OrderSource = "phone" | "walk_in" | "front_desk";

type OpenRow = {
  id: string;
  department_key: string;
  summary: string;
  summary_staff?: string | null;
  status: string;
  source?: string | null;
  created_at: string;
};

const SOURCE_LABEL: Record<OrderSource, string> = {
  phone: "Phone",
  walk_in: "Walk-in",
  front_desk: "Front desk",
};

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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState("");
  const [dept, setDept] = useState(lockedDepartment || "housekeeping");
  const [source, setSource] = useState<OrderSource>("phone");
  const [summary, setSummary] = useState("");
  const [priority, setPriority] = useState("normal");
  const [busy, setBusy] = useState(false);
  const [openRows, setOpenRows] = useState<OpenRow[]>([]);
  const [dupBlock, setDupBlock] = useState<OpenRow[] | null>(null);

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

  const submit = async (force = false) => {
    if (!roomId) { toast.error("Pick a room first."); return; }
    if (!summary.trim()) { toast.error("What was ordered / requested?"); return; }
    setBusy(true);
    setDupBlock(null);
    try {
      if (demo) {
        const out = demo.logStaffOrder({
          roomId,
          departmentKey: lockedDepartment || dept,
          summary: summary.trim(),
          source,
          priority,
          force,
        });
        if (out.duplicate) {
          setDupBlock((out.open as OpenRow[]) ?? []);
          toast.warning("Possible duplicate — this room already has an open order for that team.");
          return;
        }
        toast.success(`Logged for ${formatRoomLabel(out.roomNumber ?? "")} — shows on the queue (demo).`);
        onCreated();
        onClose?.();
        setSummary("");
        setRoomId("");
        return;
      }
      const { data, error } = await supabase.functions.invoke("talkstay-staff", {
        body: {
          action: "create_request",
          hotelId: hotel.id,
          roomId,
          departmentKey: lockedDepartment || dept,
          summary: summary.trim(),
          source,
          priority,
          force,
        },
      });
      const bodyErr = (data as any)?.error as string | undefined;
      if ((data as any)?.duplicate) {
        setDupBlock(((data as any).open as OpenRow[]) ?? []);
        toast.warning("Possible duplicate — this room already has an open order for that team.");
        return;
      }
      if (error || bodyErr) throw new Error(bodyErr || error?.message || "Couldn't log order");
      toast.success(`Logged for ${formatRoomLabel((data as any)?.roomNumber)} — team notified.`);
      onCreated();
      onClose?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't log order");
    } finally {
      setBusy(false);
    }
  };

  const form = (
    <div className={variant === "panel" ? "max-w-lg space-y-4" : "space-y-3"}>
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
          <Label>Room</Label>
          <Select value={roomId} onValueChange={setRoomId}>
            <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
            <SelectContent>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>{formatRoomLabel(r.room_number)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d.key} value={d.key}>{d.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input
                value={DEPARTMENTS.find((d) => d.key === lockedDepartment)?.display_name ?? lockedDepartment}
                disabled
              />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>What was ordered / requested</Label>
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

        {openRows.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-950">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5" /> Already open for this room
            </p>
            <ul className="space-y-1.5">
              {openRows.map((o) => {
                const body = (
                  <>
                    <span className="font-medium">
                      {DEPARTMENTS.find((d) => d.key === o.department_key)?.display_name ?? o.department_key}
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
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        {form}
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

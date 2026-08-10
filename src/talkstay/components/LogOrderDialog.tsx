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

/** Staff bookkeeping: log a phone / walk-in order so it appears in the queue
 *  and blocks the room assistant from creating a duplicate. */
export default function LogOrderDialog({
  hotel,
  lockedDepartment = null,
  onClose,
  onCreated,
}: {
  hotel: Hotel;
  lockedDepartment?: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
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
    listRooms(hotel.id).then(setRooms).catch(() => setRooms([]));
  }, [hotel.id]);

  useEffect(() => {
    if (!roomId) { setOpenRows([]); return; }
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
  }, [roomId, hotel.id]);

  const submit = async (force = false) => {
    if (!roomId) { toast.error("Pick a room first."); return; }
    if (!summary.trim()) { toast.error("What was ordered / requested?"); return; }
    setBusy(true);
    setDupBlock(null);
    try {
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
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't log order");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-background p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Phone className="h-5 w-5 text-violet-600" /> Log order
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Record a phone, walk-in or front-desk order so it shows in the queue and the room assistant won’t create a second one.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

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
              autoFocus
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
                {openRows.map((r) => (
                  <li key={r.id} className="rounded-lg bg-white/70 px-2.5 py-1.5 text-xs">
                    <span className="font-medium">{DEPARTMENTS.find((d) => d.key === r.department_key)?.display_name ?? r.department_key}</span>
                    {" · "}
                    {sourceLabel(r.source)} · {minsAgo(r.created_at)}m ago
                    <div className="mt-0.5 text-muted-foreground">{r.summary_staff || r.summary}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {dupBlock && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-950">
              <p className="font-medium">Same team already has an open order for this room.</p>
              <p className="mt-1 text-xs text-rose-800/80">
                If reception already took this call, don’t log again — open the existing ticket instead. Only force-log if it’s genuinely a second order.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setDupBlock(null)}>Go back</Button>
                <Button size="sm" variant="destructive" disabled={busy} onClick={() => submit(true)}>
                  {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                  Log another anyway
                </Button>
              </div>
            </div>
          )}
        </div>

        {!dupBlock && (
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => submit(false)} disabled={busy}>
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Phone className="mr-1.5 h-4 w-4" />}
              Log order
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { DEPARTMENTS } from "@/talkstay/lib/hotels";

const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-600",
  accepted: "bg-amber-500/15 text-amber-600",
  in_progress: "bg-amber-500/15 text-amber-600",
  on_the_way: "bg-violet-500/15 text-violet-600",
  completed: "bg-green-500/15 text-green-600",
  guest_confirmed: "bg-green-600/20 text-green-700",
  reopened: "bg-orange-500/15 text-orange-600",
  escalated: "bg-red-500/15 text-red-600",
  cancelled: "bg-muted text-muted-foreground",
};

const deptLabel = (k: string) => DEPARTMENTS.find((d) => d.key === k)?.display_name ?? k;
const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

interface RequestRow {
  id: string;
  hotel_id: string;
  room_id: string | null;
  department_key: string;
  intent: string | null;
  summary: string;
  summary_staff: string | null;
  status: string;
  priority: string;
  is_complaint: boolean;
  needs_triage: boolean;
  guest_language: string | null;
  session_id: string | null;
  conversation: unknown;
  created_at: string;
  updated_at: string;
  ts_rooms?: { room_number: string } | null;
}

interface EventRow {
  id: string;
  status: string;
  actor_type: string | null;
  note: string | null;
  created_at: string;
}

interface MsgRow {
  id: string;
  sender: string;
  staff_label: string | null;
  body: string;
  body_guest: string | null;
  created_at: string;
}

interface ChatTurn {
  role: string;
  content: string;
  at?: string;
  intent?: string | null;
}

/** Full request dossier: summary, lifecycle timeline, staff replies, guest chat. */
export default function RequestDetailSheet({
  requestId, open, onOpenChange, onChanged,
}: {
  requestId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [req, setReq] = useState<RequestRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [reply, setReply] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);

  useEffect(() => {
    if (!open || !requestId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setReq(null);
      setEvents([]);
      setMessages([]);
      setChat([]);
      setReply("");

      const { data: row, error } = await supabase
        .from("ts_service_requests")
        .select("id, hotel_id, room_id, department_key, intent, summary, summary_staff, status, priority, is_complaint, needs_triage, guest_language, session_id, conversation, created_at, updated_at, ts_rooms(room_number)")
        .eq("id", requestId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !row) {
        toast.error(error?.message ?? "Couldn't load that request.");
        setLoading(false);
        return;
      }
      const r = row as any as RequestRow;
      setReq(r);

      const [{ data: ev }, { data: msgs }] = await Promise.all([
        supabase.from("ts_request_events")
          .select("id, status, actor_type, note, created_at")
          .eq("request_id", requestId)
          .order("created_at", { ascending: true }),
        supabase.from("ts_request_messages")
          .select("id, sender, staff_label, body, body_guest, created_at")
          .eq("request_id", requestId)
          .order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      setEvents((ev as EventRow[]) ?? []);
      setMessages((msgs as MsgRow[]) ?? []);

      // One stay = one session_id, so the full session transcript is shared by
      // every request from that guest. Scope chat to THIS request's window
      // (after the previous request → before the next), else use the snapshot
      // saved on the request row at create time.
      let turns: ChatTurn[] = [];
      if (r.session_id) {
        const { data: siblings } = await supabase
          .from("ts_service_requests")
          .select("id, created_at")
          .eq("hotel_id", r.hotel_id)
          .eq("session_id", r.session_id)
          .order("created_at", { ascending: true });
        const list = siblings ?? [];
        const idx = list.findIndex((s) => s.id === r.id);
        // Include a short lead-in before this request so staff see what triggered it.
        const createdMs = new Date(r.created_at).getTime();
        const prevEnd = idx > 0 ? new Date(list[idx - 1].created_at).getTime() : 0;
        const windowStartIso = new Date(
          Math.max(prevEnd, createdMs - 20 * 60_000), // max 20 min before this request
        ).toISOString();
        const windowEndIso = idx >= 0 && idx < list.length - 1
          ? list[idx + 1].created_at
          : new Date(createdMs + 2 * 60 * 60_000).toISOString(); // 2h after if last

        let q = supabase
          .from("ts_interactions")
          .select("role, content, intent, created_at")
          .eq("hotel_id", r.hotel_id)
          .eq("session_id", r.session_id)
          .gte("created_at", windowStartIso)
          .lt("created_at", windowEndIso)
          .order("created_at", { ascending: true })
          .limit(100);
        const { data: ix } = await q;
        if (ix?.length) {
          turns = ix
            .filter((t: any) => t.content)
            .map((t: any) => ({
              role: t.role, content: t.content as string,
              at: t.created_at, intent: t.intent,
            }));
        }
      }
      if (!turns.length && Array.isArray(r.conversation)) {
        turns = (r.conversation as any[])
          .filter((t) => t?.content || t?.text)
          .map((t) => ({
            role: String(t.role === "user" ? "guest" : (t.role ?? "guest")),
            content: String(t.content ?? t.text ?? ""),
            at: t.at ?? t.created_at,
          }));
      }
      if (!cancelled) {
        setChat(turns);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, requestId]);

  const sendReply = async () => {
    if (!req || !reply.trim()) return;
    setReplyBusy(true);
    const { data, error } = await supabase.functions.invoke("talkstay-reply", {
      body: { requestId: req.id, body: reply.trim() },
    });
    setReplyBusy(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Couldn't send");
      return;
    }
    setReply("");
    toast.success("Reply sent to the guest.");
    // Refresh messages in-place.
    const { data: msgs } = await supabase
      .from("ts_request_messages")
      .select("id, sender, staff_label, body, body_guest, created_at")
      .eq("request_id", req.id)
      .order("created_at", { ascending: true });
    setMessages((msgs as MsgRow[]) ?? []);
    onChanged?.();
  };

  const closeAs = async (to: "completed" | "cancelled") => {
    if (!req) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("ts_service_requests")
      .update({ status: to, assigned_staff_id: user?.id ?? null })
      .eq("id", req.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("ts_request_events").insert({
      request_id: req.id, status: to, actor_type: "staff", actor_id: user?.id ?? null,
      note: user?.email ?? "staff",
    });
    supabase.functions.invoke("talkstay-notify", {
      body: { requestId: req.id, event: to },
    }).then(() => {}, () => {});
    toast.success(to === "completed" ? "Marked complete — guest notified." : "Cancelled — guest notified.");
    setReq({ ...req, status: to });
    onChanged?.();
  };

  const isOpen = req ? !["completed", "guest_confirmed", "cancelled"].includes(req.status) : false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 py-5 text-left">
          <SheetTitle>
            {req ? `Room ${req.ts_rooms?.room_number ?? "—"}` : "Request"}
          </SheetTitle>
          <SheetDescription>
            {req
              ? `${deptLabel(req.department_key)} · ${fmtWhen(req.created_at)}`
              : "Loading full request details…"}
          </SheetDescription>
        </SheetHeader>

        {loading || !req ? (
          <div className="flex items-center gap-2 px-6 py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-6 px-6 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[req.status] ?? "bg-muted"}`}>
                {req.status.replace(/_/g, " ")}
              </span>
              {req.priority === "urgent" && <Badge className="bg-red-500/15 text-red-600">Urgent</Badge>}
              {req.is_complaint && <Badge className="bg-red-500/15 text-red-600">Complaint</Badge>}
              {req.needs_triage && <Badge className="bg-amber-500/15 text-amber-600">Check routing</Badge>}
              {req.guest_language && (
                <Badge variant="secondary">{req.guest_language}</Badge>
              )}
              {req.intent && <Badge variant="secondary">{req.intent}</Badge>}
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Request</h3>
              <p className="mt-1 text-sm font-medium">{req.summary_staff || req.summary}</p>
              {req.summary_staff && req.summary_staff !== req.summary && (
                <p className="mt-1 text-xs italic text-muted-foreground">{req.summary}</p>
              )}
              {isOpen && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => closeAs("completed")}>Mark complete</Button>
                  <Button size="sm" variant="outline" onClick={() => closeAs("cancelled")}>Cancel request</Button>
                </div>
              )}
            </div>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Updates ({events.length})
              </h3>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No status updates yet.</p>
              ) : (
                <ol className="space-y-2 border-l-2 border-muted pl-4">
                  {events.map((e) => (
                    <li key={e.id} className="relative text-sm">
                      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-violet-500" />
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium">{e.status.replace(/_/g, " ")}</span>
                        <span className="text-xs text-muted-foreground">{fmtWhen(e.created_at)}</span>
                      </div>
                      {(e.note || e.actor_type) && (
                        <p className="text-xs text-muted-foreground">
                          {[e.actor_type, e.note].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Staff replies ({messages.length})
              </h3>
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No staff replies yet.</p>
              ) : (
                <div className="space-y-2">
                  {messages.map((m) => (
                    <div key={m.id} className="rounded-xl border bg-muted/30 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{m.sender === "staff" ? (m.staff_label || "Staff") : "Guest"}</span>
                        <span>{fmtWhen(m.created_at)}</span>
                      </div>
                      <p className="mt-1">{m.body}</p>
                      {m.body_guest && m.body_guest !== m.body && (
                        <p className="mt-0.5 text-xs italic text-muted-foreground">Guest saw: {m.body_guest}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center gap-2">
                <Input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }}
                  placeholder="Reply to the guest…"
                  className="h-9"
                />
                <Button size="sm" disabled={replyBusy || !reply.trim()} onClick={sendReply}>
                  {replyBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </section>

            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <MessageCircle className="h-3.5 w-3.5" /> Chat around this request ({chat.length})
              </h3>
              {chat.length === 0 ? (
                <p className="text-sm text-muted-foreground">No conversation transcript for this request.</p>
              ) : (
                <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border p-3">
                  {chat.map((t, i) => {
                    const guest = t.role === "guest";
                    return (
                      <div
                        key={i}
                        className={`rounded-xl px-3 py-2 text-sm ${
                          guest ? "bg-violet-50 text-foreground" : "bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <div className="mb-0.5 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                          <span>{guest ? "Guest" : "Assistant"}{t.intent ? ` · ${t.intent}` : ""}</span>
                          {t.at && <span>{fmtWhen(t.at)}</span>}
                        </div>
                        {t.content}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

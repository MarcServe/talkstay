import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { talkstayKeys, type RequestDetailData } from "@/talkstay/lib/data";
import { useRequestDetail } from "@/talkstay/hooks/useTalkStayQueries";
import { statusAccent, statusBadge, statusLabel } from "@/talkstay/lib/statusStyles";

const deptLabel = (k: string) => DEPARTMENTS.find((d) => d.key === k)?.display_name ?? k;
const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** Full request dossier: summary, lifecycle timeline, staff replies, guest chat. */
export default function RequestDetailSheet({
  requestId, open, onOpenChange, onChanged,
}: {
  requestId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}) {
  const qc = useQueryClient();
  const { data, isPending, isFetching, isPlaceholderData, isError, error, refetch } =
    useRequestDetail(requestId, open);

  const req = data?.request ?? null;
  const events = data?.events ?? [];
  const messages = data?.messages ?? [];
  const chat = data?.chat ?? [];
  // Instant header from ops cache; only blank when nothing is cached yet.
  const loading = isPending && !req;

  const [reply, setReply] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);

  useEffect(() => {
    if (!open) setReply("");
  }, [open, requestId]);

  useEffect(() => {
    if (open && isError && error) toast.error(error.message);
  }, [open, isError, error]);

  const sendReply = async () => {
    if (!req || !reply.trim()) return;
    setReplyBusy(true);
    const { data: res, error: err } = await supabase.functions.invoke("talkstay-reply", {
      body: { requestId: req.id, body: reply.trim() },
    });
    setReplyBusy(false);
    const invokeErr = (res as { error?: string } | null)?.error;
    if (err || invokeErr) {
      toast.error(invokeErr ?? err?.message ?? "Couldn't send");
      return;
    }
    setReply("");
    toast.success("Reply sent to the guest.");
    await refetch();
    onChanged?.();
  };

  const closeAs = async (to: "completed" | "cancelled") => {
    if (!req) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: updated, error: err } = await supabase
      .from("ts_service_requests")
      .update({ status: to, assigned_staff_id: user?.id ?? null })
      .eq("id", req.id)
      .eq("status", req.status)
      .select("id")
      .maybeSingle();
    if (err) { toast.error(err.message); return; }
    if (!updated) {
      toast.message("That request just changed — reloading.");
      await refetch();
      onChanged?.();
      return;
    }
    await supabase.from("ts_request_events").insert({
      request_id: req.id, status: to, actor_type: "staff", actor_id: user?.id ?? null,
      note: user?.email ?? "staff",
    });
    supabase.functions.invoke("talkstay-notify", {
      body: { requestId: req.id, event: to },
    }).then(() => {}, () => {});
    toast.success(to === "completed" ? "Marked complete — guest notified." : "Cancelled — guest notified.");
    qc.setQueryData<RequestDetailData>(talkstayKeys.request(req.id), (prev) =>
      prev ? { ...prev, request: { ...prev.request, status: to } } : prev,
    );
    await refetch();
    onChanged?.();
  };

  const isOpen = req ? !["completed", "guest_confirmed", "cancelled"].includes(req.status) : false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="ts-glass-strong flex w-full flex-col gap-0 overflow-y-auto border-l p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 py-5 text-left">
          <SheetTitle>
            {req ? `Room ${req.ts_rooms?.room_number ?? "—"}` : "Request"}
          </SheetTitle>
          <SheetDescription>
            {req
              ? `${deptLabel(req.department_key)} · ${fmtWhen(req.created_at)}${isPlaceholderData && isFetching ? " · loading details…" : ""}`
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
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(req.status)}`}>
                {statusLabel(req.status)}
              </span>
              {req.priority === "urgent" && <Badge className="border border-rose-200 bg-rose-100 text-rose-800">Urgent</Badge>}
              {req.is_complaint && <Badge className="border border-rose-200 bg-rose-100 text-rose-800">Complaint</Badge>}
              {req.needs_triage && <Badge className="border border-amber-200 bg-amber-100 text-amber-900">Check routing</Badge>}
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
                      <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${statusAccent(e.status)}`} />
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(e.status)}`}>
                          {statusLabel(e.status)}
                        </span>
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

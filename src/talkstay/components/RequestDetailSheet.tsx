import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { ArrowRightLeft, Loader2, MessageCircle, Send, UserRound } from "lucide-react";
import { DEPARTMENTS } from "@/talkstay/lib/hotels";
import { talkstayKeys, type RequestDetailData } from "@/talkstay/lib/data";
import { useRequestDetail } from "@/talkstay/hooks/useTalkStayQueries";
import { statusAccent, statusBadge, statusLabel } from "@/talkstay/lib/statusStyles";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";
import { useDemo } from "@/talkstay/demo/DemoContext";

const deptLabel = (k: string) => DEPARTMENTS.find((d) => d.key === k)?.display_name ?? k;
const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

type HandlerRow = {
  id: string;
  name: string;
  department_key: string | null;
  user_id?: string | null;
};

/** Full request dossier: summary, team coordination, timeline, guest replies. */
export default function RequestDetailSheet({
  requestId, open, onOpenChange, onChanged,
}: {
  requestId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}) {
  const qc = useQueryClient();
  const demo = useDemo();
  const { data, isPending, isFetching, isPlaceholderData, isError, error, refetch } =
    useRequestDetail(requestId, open);

  const req = data?.request ?? null;
  const events = data?.events ?? [];
  const messages = data?.messages ?? [];
  const chat = data?.chat ?? [];
  const loading = isPending && !req;

  const [reply, setReply] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [teamNote, setTeamNote] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [handlers, setHandlers] = useState<HandlerRow[]>([]);
  const [handlerPick, setHandlerPick] = useState("");
  const [handlerName, setHandlerName] = useState("");
  const [assignBusy, setAssignBusy] = useState(false);
  const [forwardDept, setForwardDept] = useState("");
  const [forwardNote, setForwardNote] = useState("");
  const [forwardBusy, setForwardBusy] = useState(false);

  const latestHandler = useMemo(
    () => [...events].reverse().find((e) => e.status === "assigned")?.note ?? null,
    [events],
  );

  useEffect(() => {
    if (!open) {
      setReply("");
      setTeamNote("");
      setHandlerPick("");
      setHandlerName("");
      setForwardDept("");
      setForwardNote("");
    }
  }, [open, requestId]);

  useEffect(() => {
    if (open && isError && error) toast.error(error.message);
  }, [open, isError, error]);

  useEffect(() => {
    if (!open || !req) return;
    if (demo) {
      setHandlers(
        demo.state.staff
          .filter((s) => s.status === "active")
          .map((s) => ({
            id: s.id,
            name: s.name || s.email,
            department_key: s.department_key,
          })),
      );
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: res } = await supabase.functions.invoke("talkstay-staff", {
        body: { action: "list_handlers", hotelId: req.hotel_id },
      });
      if (cancelled) return;
      const rows = ((res as { staff?: HandlerRow[] } | null)?.staff) ?? [];
      setHandlers(rows);
    })();
    return () => { cancelled = true; };
  }, [open, req?.hotel_id, demo, demo?.version, demo?.state.staff]);

  const sendReply = async () => {
    if (!req || !reply.trim()) return;
    setReplyBusy(true);
    if (demo) {
      demo.reply(req.id, reply.trim());
      setReplyBusy(false);
      setReply("");
      toast.success("Reply saved in demo (not sent to a real guest).");
      onChanged?.();
      return;
    }
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

  const postTeamNote = async () => {
    if (!req || !teamNote.trim()) return;
    setNoteBusy(true);
    if (demo) {
      demo.addNote(req.id, teamNote.trim());
      setNoteBusy(false);
      setTeamNote("");
      toast.success("Team note added (demo).");
      onChanged?.();
      return;
    }
    const { data: res, error: err } = await supabase.functions.invoke("talkstay-staff", {
      body: {
        action: "add_note",
        hotelId: req.hotel_id,
        requestId: req.id,
        note: teamNote.trim(),
      },
    });
    setNoteBusy(false);
    const invokeErr = (res as { error?: string } | null)?.error;
    if (err || invokeErr) {
      toast.error(invokeErr ?? err?.message ?? "Couldn't add note");
      return;
    }
    setTeamNote("");
    toast.success("Team note posted — the department was notified.");
    await refetch();
    onChanged?.();
  };

  const markHandler = async () => {
    if (!req) return;
    const picked = handlers.find((h) => h.id === handlerPick);
    const name = (picked?.name || handlerName).trim();
    if (!name) {
      toast.error("Pick a teammate or type who is handling this.");
      return;
    }
    setAssignBusy(true);
    if (demo) {
      demo.assignHandler(req.id, name);
      setAssignBusy(false);
      setHandlerPick("");
      setHandlerName("");
      toast.success(`${name} marked as handling (demo).`);
      onChanged?.();
      return;
    }
    const { data: res, error: err } = await supabase.functions.invoke("talkstay-staff", {
      body: {
        action: "assign_handler",
        hotelId: req.hotel_id,
        requestId: req.id,
        staffId: picked?.id || undefined,
        handlerName: name,
      },
    });
    setAssignBusy(false);
    const invokeErr = (res as { error?: string } | null)?.error;
    if (err || invokeErr) {
      toast.error(invokeErr ?? err?.message ?? "Couldn't assign");
      return;
    }
    setHandlerPick("");
    setHandlerName("");
    toast.success(`${name} is marked as handling.`);
    await refetch();
    onChanged?.();
  };

  const forwardToDept = async () => {
    if (!req || !forwardDept) return;
    setForwardBusy(true);
    if (demo) {
      demo.forwardRequest(req.id, forwardDept, forwardNote.trim() || undefined);
      setForwardBusy(false);
      setForwardDept("");
      setForwardNote("");
      toast.success(`Forwarded to ${deptLabel(forwardDept)} (demo).`);
      onChanged?.();
      return;
    }
    const { data: res, error: err } = await supabase.functions.invoke("talkstay-staff", {
      body: {
        action: "forward_request",
        hotelId: req.hotel_id,
        requestId: req.id,
        departmentKey: forwardDept,
        note: forwardNote.trim() || undefined,
      },
    });
    setForwardBusy(false);
    const invokeErr = (res as { error?: string } | null)?.error;
    if (err || invokeErr) {
      toast.error(invokeErr ?? err?.message ?? "Couldn't forward");
      return;
    }
    const to = forwardDept;
    setForwardDept("");
    setForwardNote("");
    toast.success(`Forwarded to ${deptLabel(to)} — they were notified.`);
    await refetch();
    onChanged?.();
  };

  const closeAs = async (to: "completed" | "cancelled") => {
    if (!req) return;
    let cancelReason = "";
    if (to === "cancelled") {
      const typed = window.prompt("Optional: why are you cancelling this request?", "");
      if (typed === null) return;
      cancelReason = typed.trim().slice(0, 280);
    }
    if (demo) {
      demo.advance(req.id, to, cancelReason ? { cancelReason } : undefined);
      toast.success(to === "completed" ? "Marked complete (demo)." : "Cancelled (demo).");
      onChanged?.();
      return;
    }
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
    const who = user?.email ?? "staff";
    await supabase.from("ts_request_events").insert({
      request_id: req.id, status: to, actor_type: "staff", actor_id: user?.id ?? null,
      note: to === "cancelled" && cancelReason ? `${who} — ${cancelReason}` : who,
    });
    supabase.functions.invoke("talkstay-notify", {
      body: {
        requestId: req.id,
        event: to,
        ...(to === "cancelled" && cancelReason ? { note: cancelReason } : {}),
      },
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
            {req ? formatRoomLabel(req.ts_rooms?.room_number) : "Request"}
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
              {latestHandler && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-teal-800">
                  <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {latestHandler}
                </p>
              )}
              {isOpen && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => closeAs("completed")}>Mark complete</Button>
                  <Button size="sm" variant="outline" onClick={() => closeAs("cancelled")}>Cancel request</Button>
                </div>
              )}
            </div>

            {isOpen && (
              <section className="space-y-4 rounded-2xl border border-violet-200/70 bg-violet-50/40 p-4">
                <div>
                  <h3 className="text-sm font-semibold text-violet-950">Team coordination</h3>
                  <p className="mt-0.5 text-xs text-violet-900/75">
                    Internal only — guests don’t see these. Use notes to chase another team, mark who’s
                    handling, or forward the ticket to the right department.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-violet-950">Team note</label>
                  <Textarea
                    value={teamNote}
                    onChange={(e) => setTeamNote(e.target.value)}
                    rows={2}
                    placeholder="e.g. Room called — please hurry breakfast, or message the guest you’re almost done"
                    className="bg-white/90"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={noteBusy || !teamNote.trim()}
                    onClick={() => void postTeamNote()}
                  >
                    {noteBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                    Post note to team
                  </Button>
                </div>

                <div className="space-y-2 border-t border-violet-200/60 pt-3">
                  <label className="text-xs font-medium text-violet-950">Who’s handling</label>
                  <Select
                    value={handlerPick || "__none__"}
                    onValueChange={(v) => {
                      setHandlerPick(v === "__none__" ? "" : v);
                      if (v !== "__none__") setHandlerName("");
                    }}
                  >
                    <SelectTrigger className="bg-white/90"><SelectValue placeholder="Pick a teammate" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Type a name instead…</SelectItem>
                      {handlers.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name}{h.department_key ? ` · ${deptLabel(h.department_key)}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!handlerPick && (
                    <Input
                      value={handlerName}
                      onChange={(e) => setHandlerName(e.target.value)}
                      placeholder="Or type a name…"
                      className="bg-white/90"
                    />
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-teal-300 text-teal-900 hover:bg-teal-50"
                    disabled={assignBusy || (!handlerPick && !handlerName.trim())}
                    onClick={() => void markHandler()}
                  >
                    {assignBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <UserRound className="mr-1.5 h-3.5 w-3.5" />}
                    Mark as handling
                  </Button>
                </div>

                <div className="space-y-2 border-t border-violet-200/60 pt-3">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-violet-950">
                    <ArrowRightLeft className="h-3.5 w-3.5" /> Forward to department
                  </label>
                  <Select value={forwardDept || undefined} onValueChange={setForwardDept}>
                    <SelectTrigger className="bg-white/90"><SelectValue placeholder="Choose team…" /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.filter((d) => d.key !== req.department_key).map((d) => (
                        <SelectItem key={d.key} value={d.key}>{d.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={forwardNote}
                    onChange={(e) => setForwardNote(e.target.value)}
                    placeholder="Optional handoff note…"
                    className="bg-white/90"
                  />
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700"
                    disabled={forwardBusy || !forwardDept}
                    onClick={() => void forwardToDept()}
                  >
                    {forwardBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />}
                    Forward ticket
                  </Button>
                </div>
              </section>
            )}

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
                      {e.note && (
                        <p className={`text-xs ${e.status === "staff_note" ? "mt-0.5 font-medium text-violet-900" : "text-muted-foreground"}`}>
                          {e.status === "staff_note" || e.status === "assigned" || e.status === "forwarded"
                            ? e.note
                            : [e.actor_type, e.note].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {!e.note && e.actor_type && (
                        <p className="text-xs text-muted-foreground">{e.actor_type}</p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Guest messages ({messages.length})
              </h3>
              <p className="mb-2 text-[11px] text-muted-foreground">
                These go to the guest — use Team note above for staff-only messages.
              </p>
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No guest replies yet.</p>
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

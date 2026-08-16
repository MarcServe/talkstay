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
import { ArrowRightLeft, Loader2, MessageCircle, Send, UserRound, StickyNote, Banknote } from "lucide-react";
import { talkstayKeys, type PaymentStatus, type RequestDetailData } from "@/talkstay/lib/data";
import { useRequestDetail } from "@/talkstay/hooks/useTalkStayQueries";
import { useHotelDepartments } from "@/talkstay/hooks/useHotelDepartments";
import { formatMoney, PAYMENT_STYLE, paymentLabel, statusAccent, statusBadge, statusLabel } from "@/talkstay/lib/statusStyles";
import { guestStayLabel } from "@/talkstay/lib/roomLabel";
import { useDemo } from "@/talkstay/demo/DemoContext";

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** Prefer the edge function's JSON error over Supabase's generic non-2xx toast. */
async function edgeError(res: unknown, err: unknown, fallback: string) {
  const bodyErr = (res as { error?: string } | null)?.error;
  if (bodyErr) return bodyErr;
  const anyErr = err as { message?: string; context?: Response } | null;
  try {
    if (anyErr?.context && typeof anyErr.context.json === "function") {
      const j = await anyErr.context.json() as { error?: string };
      if (j?.error) return String(j.error);
    }
  } catch { /* ignore */ }
  if (anyErr?.message && !anyErr.message.includes("non-2xx")) return anyErr.message;
  return fallback;
}

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
  const { departments: hotelDepts, deptLabel } = useHotelDepartments(req?.hotel_id);
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
  const [teamAction, setTeamAction] = useState<"message" | "handler" | "forward" | null>("message");
  const [priceDraft, setPriceDraft] = useState("");
  const [billingBusy, setBillingBusy] = useState(false);

  const latestHandler = useMemo(
    () => [...events].reverse().find((e) => e.status === "assigned")?.note ?? null,
    [events],
  );

  const guestSignal = useMemo(() => {
    const e = [...events].reverse().find((ev) =>
      ["guest_updated", "guest_reminded", "guest_cancelled", "updated", "payment_requested"].includes(ev.status)
      || (ev.status === "escalated" && ev.actor_type === "guest")
    );
    if (!e) return null;
    const kind =
      e.status === "payment_requested" || (e.note ?? "").toLowerCase().includes("pay now") || (e.note ?? "").toLowerCase().includes("collect payment")
        ? "payment"
        : e.status === "guest_updated" || e.status === "updated" || (e.note ?? "").toLowerCase().includes("updated")
          ? "update"
          : e.status === "guest_reminded" || (e.note ?? "").toLowerCase().includes("remind") || (e.note ?? "").toLowerCase().includes("waiting")
            ? "remind"
            : e.status === "guest_cancelled" || (e.note ?? "").toLowerCase().includes("cancel")
              ? "cancel"
              : "followup";
    return { kind, note: e.note, at: e.created_at };
  }, [events]);

  useEffect(() => {
    if (!open) {
      setReply("");
      setTeamNote("");
      setHandlerPick("");
      setHandlerName("");
      setForwardDept("");
      setForwardNote("");
      setTeamAction("message");
      setPriceDraft("");
    }
  }, [open, requestId]);

  useEffect(() => {
    if (!req) return;
    setPriceDraft(req.price != null ? String(req.price) : "");
  }, [req?.id, req?.price]);

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
    if (err || (res as { error?: string } | null)?.error) {
      toast.error(await edgeError(res, err, "Couldn't add note"));
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
    if (err || (res as { error?: string } | null)?.error) {
      toast.error(await edgeError(res, err, "Couldn't assign handler"));
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
    if (err || (res as { error?: string } | null)?.error) {
      toast.error(await edgeError(res, err, "Couldn't forward ticket"));
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

  const saveBilling = async (patch: {
    is_chargeable?: boolean;
    payment_status?: PaymentStatus | null;
    price?: number | null;
  }) => {
    if (!req) return;
    setBillingBusy(true);
    try {
      const nextChargeable = patch.is_chargeable ?? !!req.is_chargeable;
      const nextPayment =
        patch.payment_status !== undefined
          ? patch.payment_status
          : nextChargeable
            ? (req.payment_status ?? "unpaid")
            : null;
      const nextPrice = patch.price !== undefined ? patch.price : req.price ?? null;

      if (demo) {
        demo.setBilling(req.id, {
          is_chargeable: nextChargeable,
          payment_status: nextPayment,
          price: nextPrice,
        });
        toast.success("Billing updated (demo).");
        onChanged?.();
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { error: err } = await supabase
        .from("ts_service_requests")
        .update({
          is_chargeable: nextChargeable,
          payment_status: nextChargeable ? nextPayment : null,
          price: nextChargeable ? nextPrice : null,
        })
        .eq("id", req.id);
      if (err) { toast.error(err.message); return; }

      const who = user?.email ?? "staff";
      const label = !nextChargeable
        ? "Marked not chargeable"
        : nextPayment === "paid"
          ? "Marked paid"
          : nextPayment === "waived"
            ? "Marked waived"
            : nextPayment === "unpaid"
              ? "Marked unpaid"
              : "Updated billing";
      await supabase.from("ts_request_events").insert({
        request_id: req.id,
        status: "staff_note",
        actor_type: "staff",
        actor_id: user?.id ?? null,
        note: `${who} — ${label}${nextPrice != null ? ` · ${formatMoney(nextPrice, req.currency)}` : ""}`,
      });

      qc.setQueryData<RequestDetailData>(talkstayKeys.request(req.id), (prev) =>
        prev
          ? {
              ...prev,
              request: {
                ...prev.request,
                is_chargeable: nextChargeable,
                payment_status: nextChargeable ? nextPayment : null,
                price: nextChargeable ? nextPrice : null,
              },
            }
          : prev,
      );
      toast.success(`${label}.`);
      await refetch();
      onChanged?.();
    } finally {
      setBillingBusy(false);
    }
  };

  const isOpen = req ? !["completed", "guest_confirmed", "cancelled"].includes(req.status) : false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="ts-glass-strong flex w-full flex-col gap-0 overflow-y-auto border-l p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 py-5 text-left">
          <SheetTitle>
            {req ? guestStayLabel(req.guest_first_name, req.ts_rooms?.room_number) : "Request"}
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
              {req.is_chargeable && (
                <Badge className={PAYMENT_STYLE[req.payment_status ?? "unpaid"] ?? PAYMENT_STYLE.unpaid}>
                  {paymentLabel(req.payment_status ?? "unpaid")}
                  {req.price != null ? ` · ${formatMoney(req.price, req.currency)}` : ""}
                </Badge>
              )}
            </div>

            {guestSignal && (
              <div
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${
                  guestSignal.kind === "update"
                    ? "border-amber-300 bg-amber-50 text-amber-950"
                    : guestSignal.kind === "cancel"
                      ? "border-slate-300 bg-slate-50 text-slate-800"
                      : guestSignal.kind === "payment"
                        ? "border-amber-400 bg-amber-50 text-amber-950"
                        : "border-rose-200 bg-rose-50 text-rose-900"
                }`}
              >
                {guestSignal.kind === "update"
                  ? "✏️ Guest updated their order"
                  : guestSignal.kind === "remind"
                    ? "⏰ Guest reminded you — still waiting"
                    : guestSignal.kind === "cancel"
                      ? "✕ Guest cancelled this order"
                      : guestSignal.kind === "payment"
                        ? "💷 Guest wants to pay now — collect in the room"
                        : "⚠ Guest followed up"}
                {guestSignal.note ? ` — "${guestSignal.note}"` : ""}
              </div>
            )}

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

            <section className="space-y-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-emerald-950">
                    <Banknote className="h-4 w-4" />
                    Billing / checkout
                  </h3>
                  <p className="mt-1 text-xs text-emerald-900/75">
                    Mark chargeable orders paid before the guest checks out. Fulfillment status stays separate.
                    Upload menus in Knowledge so the guest assistant can attach prices when it knows them.
                  </p>
                </div>
                {req.is_chargeable ? (
                  <Badge className={PAYMENT_STYLE[req.payment_status ?? "unpaid"] ?? PAYMENT_STYLE.unpaid}>
                    {paymentLabel(req.payment_status ?? "unpaid")}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not chargeable</Badge>
                )}
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[7rem] flex-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Amount</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={priceDraft}
                    onChange={(e) => setPriceDraft(e.target.value)}
                    placeholder="0.00"
                    className="mt-1 h-9 bg-white"
                    disabled={billingBusy || !req.is_chargeable}
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9"
                  disabled={billingBusy || !req.is_chargeable}
                  onClick={() => {
                    const n = priceDraft.trim() === "" ? null : Number(priceDraft);
                    if (n != null && (Number.isNaN(n) || n < 0)) {
                      toast.error("Enter a valid amount.");
                      return;
                    }
                    void saveBilling({ price: n });
                  }}
                >
                  Save amount
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {!req.is_chargeable ? (
                  <Button
                    size="sm"
                    disabled={billingBusy}
                    onClick={() => void saveBilling({ is_chargeable: true, payment_status: "unpaid" })}
                  >
                    Mark chargeable
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      disabled={billingBusy || req.payment_status === "paid"}
                      className="bg-emerald-700 hover:bg-emerald-800"
                      onClick={() => void saveBilling({ payment_status: "paid" })}
                    >
                      Mark paid
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={billingBusy || req.payment_status === "unpaid"}
                      onClick={() => void saveBilling({ payment_status: "unpaid" })}
                    >
                      Mark unpaid
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={billingBusy || req.payment_status === "waived"}
                      onClick={() => void saveBilling({ payment_status: "waived" })}
                    >
                      Waive
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={billingBusy}
                      onClick={() => void saveBilling({ is_chargeable: false, payment_status: null, price: null })}
                    >
                      Not chargeable
                    </Button>
                  </>
                )}
              </div>
            </section>

            {isOpen && (
              <section className="space-y-3 rounded-2xl border-2 border-amber-300/80 bg-amber-50/50 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-amber-950">Talk to your team (not the guest)</h3>
                    <p className="mt-1 text-xs text-amber-900/80">
                      Pick one action below. Guests never see these — scroll down to the green box to message the guest.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900">
                    Staff only
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      { key: "message" as const, label: "1. Send a note", hint: "Chase / update staff", Icon: StickyNote },
                      { key: "handler" as const, label: "2. Who’s on it", hint: "Assign a person", Icon: UserRound },
                      { key: "forward" as const, label: "3. Wrong team?", hint: "Move the ticket", Icon: ArrowRightLeft },
                    ] as const
                  ).map(({ key, label, hint, Icon }) => {
                    const on = teamAction === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTeamAction(on ? null : key)}
                        className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                          on
                            ? "border-amber-400 bg-white ring-2 ring-amber-500/25"
                            : "border-amber-200/80 bg-white/70 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-sm font-medium text-amber-950">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-amber-700" />
                          {label}
                        </div>
                        <p className="mt-0.5 text-[11px] text-amber-900/70">{hint}</p>
                      </button>
                    );
                  })}
                </div>

                {teamAction === "message" && (
                  <div className="space-y-2 rounded-xl border border-amber-300 bg-white p-3">
                    <p className="text-sm font-medium text-amber-950">Send an internal note</p>
                    <p className="text-xs text-amber-900/80">
                      Use this when reception or a manager needs to tell {deptLabel(req.department_key)} something
                      about this order — for example that the guest called again, or to hurry up.
                    </p>
                    <p className="text-[11px] text-amber-800/70">
                      Example: “Room called — please hurry breakfast, or message them you’re almost done.”
                    </p>
                    <Textarea
                      value={teamNote}
                      onChange={(e) => setTeamNote(e.target.value)}
                      rows={3}
                      placeholder="Write your message to the team…"
                      className="border-amber-200 bg-amber-50/30 focus-visible:ring-amber-400"
                    />
                    <Button
                      size="sm"
                      className="bg-amber-600 text-white hover:bg-amber-700"
                      disabled={noteBusy || !teamNote.trim()}
                      onClick={() => void postTeamNote()}
                    >
                      {noteBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <StickyNote className="mr-1.5 h-3.5 w-3.5" />}
                      Send note to {deptLabel(req.department_key)}
                    </Button>
                  </div>
                )}

                {teamAction === "handler" && (
                  <div className="space-y-2 rounded-xl border border-amber-300 bg-white p-3">
                    <p className="text-sm font-medium text-amber-950">Say who’s handling this</p>
                    <p className="text-xs text-amber-900/80">
                      So everyone knows who owns it — pick a teammate from the list, or type a name.
                    </p>
                    {latestHandler && (
                      <p className="rounded-lg border border-amber-200 bg-amber-50/60 px-2.5 py-1.5 text-xs text-amber-950">
                        Currently: {latestHandler}
                      </p>
                    )}
                    <Select
                      value={handlerPick || undefined}
                      onValueChange={(v) => {
                        setHandlerPick(v);
                        setHandlerName("");
                      }}
                    >
                      <SelectTrigger className="border-amber-200 bg-white"><SelectValue placeholder="Pick a teammate (optional)" /></SelectTrigger>
                      <SelectContent>
                        {handlers.map((h) => (
                          <SelectItem key={h.id} value={h.id}>
                            {h.name}{h.department_key ? ` · ${deptLabel(h.department_key)}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative">
                      <span className="mb-1 block text-[11px] text-amber-900/70">Or type a name</span>
                      <Input
                        value={handlerName}
                        onChange={(e) => {
                          setHandlerName(e.target.value);
                          if (e.target.value.trim()) setHandlerPick("");
                        }}
                        placeholder="e.g. Mark"
                        className="border-amber-200 bg-white"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="bg-amber-700 text-white hover:bg-amber-800"
                      disabled={assignBusy || (!handlerPick && !handlerName.trim())}
                      onClick={() => void markHandler()}
                    >
                      {assignBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <UserRound className="mr-1.5 h-3.5 w-3.5" />}
                      Save who’s handling
                    </Button>
                  </div>
                )}

                {teamAction === "forward" && (
                  <div className="space-y-2 rounded-xl border border-amber-300 bg-white p-3">
                    <p className="text-sm font-medium text-amber-950">Send this ticket to another department</p>
                    <p className="text-xs text-amber-900/80">
                      Only if this request is with the wrong team. It leaves {deptLabel(req.department_key)} and
                      appears on the new department’s Operations board (they get notified).
                    </p>
                    <Select value={forwardDept || undefined} onValueChange={setForwardDept}>
                      <SelectTrigger className="border-amber-200 bg-white"><SelectValue placeholder="Which department should handle it?" /></SelectTrigger>
                      <SelectContent>
                        {hotelDepts.filter((d) => d.key !== req.department_key).map((d) => (
                          <SelectItem key={d.key} value={d.key}>{d.display_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={forwardNote}
                      onChange={(e) => setForwardNote(e.target.value)}
                      rows={2}
                      placeholder="Optional: why you’re sending it / what they need to know…"
                      className="border-amber-200 bg-white"
                    />
                    <Button
                      size="sm"
                      className="bg-amber-800 text-white hover:bg-amber-900"
                      disabled={forwardBusy || !forwardDept}
                      onClick={() => void forwardToDept()}
                    >
                      {forwardBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />}
                      {forwardDept
                        ? `Send to ${deptLabel(forwardDept)}`
                        : "Send to department"}
                    </Button>
                  </div>
                )}
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
                        <p className={`text-xs ${
                          e.status === "staff_note"
                            ? "mt-0.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-medium text-amber-950"
                            : "text-muted-foreground"
                        }`}
                        >
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

            <section className="space-y-3 rounded-2xl border-2 border-emerald-300/80 bg-emerald-50/50 p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-emerald-950">
                    Message the guest ({messages.length})
                  </h3>
                  <p className="mt-1 text-xs text-emerald-900/80">
                    This goes to the guest’s phone/app. For staff-only notes, use the amber box above.
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-900">
                  Guest sees this
                </span>
              </div>
              {messages.length === 0 ? (
                <p className="text-sm text-emerald-900/70">No guest replies yet.</p>
              ) : (
                <div className="space-y-2">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        m.sender === "staff"
                          ? "border-emerald-200 bg-white"
                          : "border-emerald-200/80 bg-emerald-100/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs text-emerald-900/70">
                        <span>{m.sender === "staff" ? (m.staff_label || "Staff") : "Guest"}</span>
                        <span>{fmtWhen(m.created_at)}</span>
                      </div>
                      <p className="mt-1 text-emerald-950">{m.body}</p>
                      {m.body_guest && m.body_guest !== m.body && (
                        <p className="mt-0.5 text-xs italic text-emerald-800/70">Guest saw: {m.body_guest}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }}
                  placeholder="Reply to the guest…"
                  className="h-9 border-emerald-200 bg-white focus-visible:ring-emerald-400"
                />
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled={replyBusy || !reply.trim()}
                  onClick={sendReply}
                >
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

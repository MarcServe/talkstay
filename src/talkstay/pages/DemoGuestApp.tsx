import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft, Bell, Check, ClipboardList, Loader2, Meh, MessageCircle,
  Mic, MicOff, Pencil, Send, Smile, Frown, Star, X,
} from "lucide-react";
import { RealtimeChat } from "@/utils/RealtimeChat";
import { conversationMemory } from "@/utils/ConversationMemory";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";
import { statusBadge, statusDot, statusLabel } from "@/talkstay/lib/statusStyles";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";
import NoIndexMeta from "@/talkstay/components/NoIndexMeta";
import { DemoProvider, useDemo, type DemoApi } from "@/talkstay/demo/DemoContext";
import { DEPARTMENTS } from "@/talkstay/lib/hotels";
import {
  fetchDemoContext, sendDemoMessage, type ChatMsg, type GuestRequest,
} from "@/talkstay/lib/guest";

const BRAND = "#4c2bb8";
const ROOM = "306";
const DEMO_SID_KEY = "talkstay:demo-guest-sid";
const PULSE_DONE_KEY = "talkstay:demo-guest-pulse";
/** Same image-layer treatment as a branded live guest stay. */
const DEMO_BG_PHOTO = "/marketing/guest-square.jpg";
const DEMO_BG_WASH = 0.78;

const GUEST_REQ_CARD: Record<string, string> = {
  new: "border-sky-300/80 bg-sky-100/90 border-l-4 border-l-sky-500",
  accepted: "border-amber-300/80 bg-amber-100/90 border-l-4 border-l-amber-500",
  in_progress: "border-amber-300/80 bg-amber-100/90 border-l-4 border-l-amber-500",
  on_the_way: "border-teal-300/80 bg-teal-100/90 border-l-4 border-l-teal-500",
  completed: "border-emerald-300/80 bg-emerald-100/90 border-l-4 border-l-emerald-500",
  guest_confirmed: "border-emerald-400/80 bg-emerald-100/95 border-l-4 border-l-emerald-600",
  reopened: "border-orange-300/80 bg-orange-100/90 border-l-4 border-l-orange-500",
  cancelled: "border-slate-300/90 bg-slate-200/80 border-l-4 border-l-slate-400",
};

type Msg =
  | { role: "assistant" | "user"; content: string }
  | { role: "request"; content: string; reqId: string }
  | { role: "notice"; content: string }
  | { role: "staff"; content: string; label?: string }
  | { role: "pulse" };

function deptLabel(key: string) {
  return DEPARTMENTS.find((d) => d.key === key)?.display_name ?? key;
}

function getDemoSessionId() {
  let sid = localStorage.getItem(DEMO_SID_KEY);
  if (!sid) {
    sid = `demo_sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEMO_SID_KEY, sid);
  }
  return sid;
}

function DemoPulseCard({
  brand, onSubmit, onDismiss,
}: {
  brand: string;
  onSubmit: (rating: number, text: string) => void;
  onDismiss: () => void;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState("");
  const FACES = [
    { value: 5, label: "Great", Icon: Smile },
    { value: 3, label: "Okay", Icon: Meh },
    { value: 2, label: "Not great", Icon: Frown },
  ];
  return (
    <div className="rounded-2xl border bg-white/95 p-4 shadow-sm" style={{ borderColor: `${brand}55` }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">How has your stay been generally?</p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 rounded-full p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Overall vibe of the stay — managers see this on Insights.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {FACES.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-xs transition-colors ${
              rating === value ? "text-white" : "hover:bg-muted"
            }`}
            style={rating === value ? { backgroundColor: brand, borderColor: brand } : undefined}
          >
            <Icon className="h-6 w-6" />
            {label}
          </button>
        ))}
      </div>
      {rating != null && (
        <div className="mt-3 space-y-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={rating >= 4 ? "What stood out? (optional)" : "What should we fix? (optional)"}
            className="flex-1"
          />
          <Button
            type="button"
            className="w-full"
            style={{ backgroundColor: brand }}
            onClick={() => onSubmit(rating, text)}
          >
            Send
          </Button>
        </div>
      )}
    </div>
  );
}

function DemoNotifySheet({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [emailOn, setEmailOn] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [email, setEmail] = useState("");
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-background p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold">Get updates on this request?</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Same choice real guests see after a request is logged.
        </p>
        <label className="mt-4 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm">
          <span>Notify on this device</span>
          <input type="checkbox" checked={pushOn} onChange={(e) => setPushOn(e.target.checked)} />
        </label>
        <label className="mt-2 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm">
          <span>Email me</span>
          <input type="checkbox" checked={emailOn} onChange={(e) => setEmailOn(e.target.checked)} />
        </label>
        {emailOn && (
          <Input
            className="mt-2"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Not now</Button>
          <Button
            className="flex-1"
            style={{ backgroundColor: BRAND }}
            onClick={() => {
              toast.success(
                pushOn || emailOn
                  ? "Preferences saved for this demo stay."
                  : "Okay — you can still track requests here.",
              );
              onDone();
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function DemoRequestsSheet({
  demo, reqs, onClose,
}: {
  demo: DemoApi;
  reqs: Array<{
    id: string;
    department_key: string;
    summary: string;
    status: string;
  }>;
  onClose: () => void;
}) {
  const [nudged, setNudged] = useState<Record<string, boolean>>({});
  const [rated, setRated] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<Record<string, string>>({});
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const visible = reqs.filter((r) => r.status !== "cancelled");

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l bg-background p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">My requests</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Same close-out loop as a real stay — confirm, remind, update, cancel, and rate.
          Staff replies and status changes sync from the Operations demo.
        </p>
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No requests yet — ask for towels or report a problem.
          </p>
        ) : (
          <div className="space-y-3">
            {visible.map((r) => {
              const awaitingConfirm = r.status === "completed";
              const confirmed = r.status === "guest_confirmed";
              const isOpen = ["new", "accepted", "in_progress", "on_the_way", "reopened"].includes(r.status);
              const isEditing = editingId === r.id;
              const isCancelling = cancellingId === r.id;
              const cardTone = GUEST_REQ_CARD[r.status] ?? GUEST_REQ_CARD.new;
              return (
                <div key={r.id} className={`rounded-2xl border p-4 ${cardTone}`}>
                  <div className="text-[15px] font-medium leading-snug">{r.summary}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(r.status)}`}>
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot(r.status)}`} />
                      {statusLabel(r.status)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{deptLabel(r.department_key)}</span>
                  </div>

                  {awaitingConfirm && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium">Did you receive everything?</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            demo.guestConfirm(r.id);
                            toast.success("Thanks — request closed.");
                          }}
                        >
                          Yes, all good
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            demo.guestReopen(r.id);
                            toast.message("Back with the team — not done yet.");
                          }}
                        >
                          Not yet
                        </Button>
                      </div>
                    </div>
                  )}

                  {confirmed && (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      <p className="text-xs font-medium">How did we do?</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => {
                              setRated((p) => ({ ...p, [r.id]: n }));
                              demo.guestRate(r.id, n, comments[r.id]);
                            }}
                            className="rounded p-1 hover:bg-white/60"
                            aria-label={`${n} stars`}
                          >
                            <Star
                              className={`h-5 w-5 ${
                                (rated[r.id] ?? 0) >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      {rated[r.id] != null && (
                        <div className="flex gap-2">
                          <Input
                            value={comments[r.id] ?? ""}
                            onChange={(e) => setComments((p) => ({ ...p, [r.id]: e.target.value }))}
                            placeholder="Optional comment"
                            className="h-8 text-xs"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              demo.guestRate(r.id, rated[r.id]!, comments[r.id]);
                              toast.success("Review saved — check Insights in Operations.");
                            }}
                          >
                            Save
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {isOpen && (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      <p className="text-xs font-medium">What you can do</p>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-auto flex-col gap-1 py-2 text-xs"
                          disabled={!!nudged[r.id]}
                          onClick={() => {
                            demo.guestNudge(r.id);
                            setNudged((p) => ({ ...p, [r.id]: true }));
                            toast.success("We've reminded the team you're waiting.");
                          }}
                        >
                          <Bell className="h-3.5 w-3.5" />
                          {nudged[r.id] ? "Reminded" : "Remind"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-auto flex-col gap-1 py-2 text-xs"
                          onClick={() => {
                            setCancellingId(null);
                            setEditingId(isEditing ? null : r.id);
                            setEditText((p) => ({ ...p, [r.id]: p[r.id] ?? r.summary }));
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Update
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-auto flex-col gap-1 py-2 text-xs text-red-600"
                          onClick={() => {
                            setEditingId(null);
                            setCancellingId(isCancelling ? null : r.id);
                            setCancelReason("");
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      </div>
                      {isEditing && (
                        <div className="space-y-2">
                          <Input
                            value={editText[r.id] ?? ""}
                            onChange={(e) => setEditText((p) => ({ ...p, [r.id]: e.target.value }))}
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            className="w-full"
                            style={{ backgroundColor: BRAND }}
                            onClick={() => {
                              const note = (editText[r.id] ?? "").trim();
                              if (!note) return;
                              demo.guestUpdate(r.id, note);
                              setEditingId(null);
                              setNudged((p) => ({ ...p, [r.id]: true }));
                              toast.success("Updated — the team has been notified.");
                            }}
                          >
                            Save update
                          </Button>
                        </div>
                      )}
                      {isCancelling && (
                        <div className="space-y-2">
                          <Input
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Optional reason"
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="w-full"
                            onClick={() => {
                              demo.guestCancel(r.id, cancelReason);
                              setCancellingId(null);
                              toast.success("Cancelled — we've let the team know.");
                            }}
                          >
                            Confirm cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DemoGuestInner() {
  const demo = useDemo()!;
  const sid = useMemo(() => getDemoSessionId(), []);
  const [greeting, setGreeting] = useState(
    `Hi! You're in ${formatRoomLabel(ROOM)} at The Grand Hotel II. How can I help — anything you need, or a question about the hotel?`,
  );
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<"idle" | "connecting" | "connected">("idle");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [pulseHidden, setPulseHidden] = useState(() => localStorage.getItem(PULSE_DONE_KEY) === "1");
  const [pulseReady, setPulseReady] = useState(false);
  const chatRef = useRef<RealtimeChat | null>(null);
  const liveAssistantRef = useRef("");
  const lastRoutedVoiceRef = useRef<{ text: string; at: number }>({ text: "", at: 0 });
  const msgsRef = useRef<Msg[]>([]);
  const seenStaff = useRef<Set<string>>(new Set());
  const statusSeen = useRef<Record<string, string>>({});
  const statusBootstrapped = useRef(false);
  /** Ignore seed/history messages older than this mount (still show live replies). */
  const mountedAt = useRef(Date.now());
  const endRef = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const reqs = useMemo(
    () => demo.state.requests.filter((r) => r.ts_rooms?.room_number === ROOM || r.room_id === "demo-room-306"),
    [demo.state.requests, demo.version],
  );
  const openCount = useMemo(
    () => reqs.filter((r) => !["completed", "guest_confirmed", "cancelled"].includes(r.status)).length,
    [reqs],
  );

  useEffect(() => {
    msgsRef.current = msgs;
  }, [msgs]);

  useEffect(() => {
    let cancelled = false;
    fetchDemoContext()
      .then((ctx) => {
        if (cancelled) return;
        setGreeting(ctx.greeting);
        setMsgs([{ role: "assistant", content: ctx.greeting }]);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setMsgs([{ role: "assistant", content: greeting }]);
        setReady(true);
      });
    return () => {
      cancelled = true;
      chatRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Staff replies + status notices from Operations (localStorage + BroadcastChannel).
  useEffect(() => {
    if (!ready) return;
    const staffMsgs = demo.listStaffMessagesForGuest();
    const fresh = staffMsgs.filter((m) => !seenStaff.current.has(m.id));
    const cutoff = mountedAt.current - 120_000; // seeded history is hours old
    const toShow = fresh.filter((m) => {
      const t = Date.parse(m.created_at);
      return Number.isFinite(t) && t >= cutoff;
    });
    fresh.forEach((m) => seenStaff.current.add(m.id));

    if (toShow.length) {
      setMsgs((prev) => [
        ...prev,
        ...toShow.map((m) => ({
          role: "staff" as const,
          content: m.content,
          label: m.staff_label ?? undefined,
        })),
      ]);
      const last = toShow[toShow.length - 1];
      toast.message(last.staff_label ?? "Message from the team", { description: last.content });
    }

    for (const r of reqs) {
      const prev = statusSeen.current[r.id];
      if (!statusBootstrapped.current) {
        statusSeen.current[r.id] = r.status;
        continue;
      }
      if (prev && prev !== r.status) {
        if (r.status === "accepted") {
          setMsgs((p) => [...p, { role: "notice", content: `The team accepted: ${r.summary}` }]);
        } else if (r.status === "on_the_way") {
          setMsgs((p) => [...p, { role: "notice", content: `On the way — ${r.summary}` }]);
        } else if (r.status === "completed") {
          setMsgs((p) => [...p, {
            role: "notice",
            content: `Marked complete — please confirm you received everything: ${r.summary}`,
          }]);
          toast.message("Staff marked a request complete — confirm & rate in Requests.");
          setSheetOpen(true);
        } else if (r.status === "cancelled") {
          setMsgs((p) => [...p, { role: "notice", content: `Cancelled: ${r.summary}` }]);
        }
      }
      statusSeen.current[r.id] = r.status;
    }
    statusBootstrapped.current = true;
  }, [demo.version, ready, reqs, demo]);

  // Pulse after a calm pause — mirror GuestApp eligibility (don't reset on every notice).
  const pulseEligible = useMemo(() => {
    if (pulseHidden || !ready) return false;
    if (busy || notifyOpen || sheetOpen) return false;
    if (voiceState === "connecting" || isListening || isSpeaking) return false;
    if (input.trim()) return false;

    const userTurns = msgs.filter((m) => m.role === "user");
    if (userTurns.length < 1) return false;

    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      if (m.role === "notice" || m.role === "staff") continue;
      if (m.role === "request") return false;
      if (m.role === "user") return false;
      if (m.role === "assistant") break;
    }

    const tail = msgs.slice(-3);
    if (tail.some((m) => m.role === "request")) return false;
    return true;
  }, [pulseHidden, ready, busy, notifyOpen, sheetOpen, voiceState, isListening, isSpeaking, input, msgs]);

  useEffect(() => {
    if (!pulseEligible) {
      setPulseReady(false);
      return;
    }
    const userTurns = msgs.filter((m) => m.role === "user").length;
    const waitMs = userTurns >= 3 ? 8_000 : 12_000;
    const t = window.setTimeout(() => setPulseReady(true), waitMs);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-arm when eligibility flips
  }, [pulseEligible]);

  useEffect(() => {
    if (!pulseEligible || !pulseReady) return;
    const t = window.setTimeout(() => {
      scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
    }, 50);
    return () => window.clearTimeout(t);
  }, [pulseEligible, pulseReady]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy, isSpeaking]);

  const showPulse = pulseReady && pulseEligible && !msgs.some((m) => m.role === "pulse");

  const append = (m: Msg) => setMsgs((prev) => [...prev, m]);

  const mirrorRequests = (requests: GuestRequest[]) => {
    for (const r of requests) {
      const reqId = demo.addGuestRequest({
        summary: r.summary,
        department: r.department_key,
      });
      append({
        role: "request",
        content: `${deptLabel(r.department_key)} · ${r.summary}`,
        reqId,
      });
      if (!notifyOpen) setNotifyOpen(true);
    }
  };

  const routeThroughHotelBrain = async (text: string, surfaceReply: boolean) => {
    try {
      const history = msgsRef.current
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content })) as ChatMsg[];
      const res = await sendDemoMessage({ sessionId: sid, message: text, history });
      if (res.requests?.length) mirrorRequests(res.requests);
      if (surfaceReply) append({ role: "assistant", content: res.reply });
      return res;
    } catch {
      if (surfaceReply) {
        append({ role: "assistant", content: "Sorry — something went wrong. Please try again." });
      }
      return null;
    }
  };

  const sendTyped = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy || voiceState === "connecting") return;
    setInput("");
    append({ role: "user", content: text });
    setBusy(true);
    await routeThroughHotelBrain(text, true);
    setBusy(false);
  };

  const syncVoiceMemoryFromChat = () => {
    conversationMemory.clearMessages();
    for (const m of msgsRef.current) {
      if ((m.role === "user" || m.role === "assistant") && m.content?.trim()) {
        conversationMemory.addMessage(m.role, m.content.trim(), "chat");
      }
    }
  };

  const stopVoice = (auto = false) => {
    chatRef.current?.disconnect();
    chatRef.current = null;
    setVoiceState("idle");
    setIsListening(false);
    setIsSpeaking(false);
    if (auto) {
      append({
        role: "notice",
        content: "Voice paused after a quiet moment — tap the mic to carry on.",
      });
    }
  };

  const startVoice = async () => {
    setVoiceState("connecting");
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
      syncVoiceMemoryFromChat();
      const chat = new RealtimeChat("talkstay-demo", {
        onUserSpeechStart: () => setIsListening(true),
        onUserSpeechStop: () => setIsListening(false),
        onUserTranscript: (text, isFinal) => {
          if (isFinal && text.trim()) {
            const cleaned = text.trim();
            append({ role: "user", content: cleaned });
            conversationMemory.addMessage("user", cleaned, "voice");
            const now = Date.now();
            const prev = lastRoutedVoiceRef.current;
            const same = prev.text.toLowerCase() === cleaned.toLowerCase() && now - prev.at < 8_000;
            if (!same) {
              lastRoutedVoiceRef.current = { text: cleaned, at: now };
              void routeThroughHotelBrain(cleaned, false);
            }
          }
        },
        onAssistantTranscript: (text, isDone) => {
          if (isDone && text.trim() && text.trim() !== liveAssistantRef.current) {
            liveAssistantRef.current = text.trim();
            append({ role: "assistant", content: text.trim() });
            conversationMemory.addMessage("assistant", text.trim(), "voice");
          }
        },
        onAssistantAudioStart: () => setIsSpeaking(true),
        onAssistantAudioEnd: () => setIsSpeaking(false),
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err ?? "");
          if (/permission|not allowed|denied/i.test(msg)) {
            toast.error("Microphone blocked — allow mic access in browser settings, or type below.");
          }
        },
        onInactivityTimeout: () => stopVoice(true),
      } as any);
      chat.tokenFunction = "talkstay-voice-token";
      chat.tokenBody = { demo: true, sessionId: sid };
      chatRef.current = chat;
      await chat.init();
      setVoiceState("connected");
      toast.message("Voice is on — speak naturally. Tap the mic again to end.");
    } catch (err: unknown) {
      setVoiceState("idle");
      const msg = err instanceof Error ? err.message : String(err ?? "");
      if (/permission|not allowed|denied|NotAllowed/i.test(msg)) {
        toast.error("Microphone permission denied — allow access, or type your request.");
      } else {
        toast.error("Voice couldn't start — you can type your message below.");
      }
      append({ role: "assistant", content: "Voice couldn't start — you can type your message below." });
    }
  };

  const toggleVoice = () => (voiceState === "idle" ? void startVoice() : stopVoice());

  const orbLabel =
    voiceState === "connecting" ? "Setting up your microphone…"
    : isSpeaking ? "Speaking…"
    : voiceState === "connected" ? (isListening ? "Listening…" : "I'm listening — just talk")
    : "Tap to Talk";

  const washTop = Math.min(0.97, DEMO_BG_WASH + 0.04);
  const washBot = Math.min(0.97, DEMO_BG_WASH + 0.06);

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Connecting…
      </div>
    );
  }

  return (
    <div
      data-talkstay
      className="ts-atmosphere relative mx-auto flex h-[100dvh] max-w-md flex-col bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(hsla(38,26%,97%,${washTop}), hsla(210,20%,94%,${washBot})), url(${DEMO_BG_PHOTO})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-white/40 bg-background/70 px-3 py-2 backdrop-blur-md">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Back to demos">
          <Link to="/demo"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <TalkStayLogo size={22} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold leading-tight">The Grand Hotel II</h1>
          <p className="truncate text-xs text-muted-foreground">
            {formatRoomLabel(ROOM)} · Voice Stay
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0 gap-1.5 border-white/50 bg-white/60 px-2.5 text-xs backdrop-blur-sm"
          onClick={() => setSheetOpen(true)}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Requests
          {openCount > 0 && (
            <span className="rounded-full bg-violet-600 px-1.5 text-[10px] font-bold text-white">
              {openCount}
            </span>
          )}
        </Button>
      </header>

      <div className="shrink-0 border-b border-amber-200/50 bg-amber-50/75 px-3 py-1.5 text-center text-[11px] text-amber-950 backdrop-blur-sm">
        Keep Operations open in another tab — staff replies appear here live.{" "}
        <Link to="/demo/operations" className="font-semibold underline underline-offset-2">
          Operations
        </Link>
        .
      </div>

      <div className="shrink-0 border-b border-white/40 bg-background/65 px-3 py-2.5 backdrop-blur-md">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <button
            type="button"
            onClick={toggleVoice}
            disabled={voiceState === "connecting" || busy}
            className="relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-md transition hover:scale-[1.03] active:scale-[0.98] disabled:opacity-60"
            style={{
              background: isListening && !isSpeaking
                ? "linear-gradient(145deg, #ef4444, #b91c1c)"
                : `linear-gradient(145deg, ${BRAND}, ${BRAND}b3)`,
              boxShadow: voiceState === "connected" ? `0 0 0 4px ${BRAND}28` : undefined,
            }}
            aria-label={voiceState === "idle" ? "Tap to talk" : "End voice"}
          >
            {voiceState === "connecting" ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : voiceState === "connected" ? (
              <MicOff className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
            {(voiceState === "connected" || isListening) && (
              <span className="pointer-events-none absolute inset-[-4px] animate-ping rounded-full border-2 border-current opacity-20" />
            )}
          </button>
          <div className="flex items-center justify-center gap-2">
            <p className="text-sm font-semibold" style={{ color: BRAND }}>{orbLabel}</p>
            {voiceState !== "idle" && (
              <button
                type="button"
                onClick={() => stopVoice()}
                className="text-xs text-muted-foreground underline underline-offset-2"
              >
                End
              </button>
            )}
          </div>
          <p className="max-w-[18rem] text-[11px] leading-snug text-muted-foreground">
            {voiceState === "idle"
              ? (msgs.length <= 2
                ? "Tap the mic and ask for anything — towels, breakfast, a repair. Or type below."
                : "Tap to speak — or type below.")
              : isSpeaking
                ? "Assistant is speaking…"
                : "Go ahead — I’m listening"}
          </p>
        </div>
      </div>

      <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3 px-4 pb-4 pt-3">
          {msgs.map((m, i) => {
            if (m.role === "request") {
              return (
                <div key={i} className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setSheetOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-100 px-3 py-1 text-xs text-sky-800"
                  >
                    <Check className="h-3.5 w-3.5 text-sky-700" /> Sent to the team — {m.content}
                  </button>
                </div>
              );
            }
            if (m.role === "notice") {
              return (
                <div key={i} className="flex justify-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                    <MicOff className="h-3.5 w-3.5" /> {m.content}
                  </span>
                </div>
              );
            }
            if (m.role === "staff") {
              return (
                <div key={i} className="flex justify-start">
                  <div
                    className="max-w-[85%] rounded-2xl border border-white/50 px-4 py-2 text-sm shadow-sm backdrop-blur-md"
                    style={{ borderColor: `${BRAND}66`, background: `${BRAND}18` }}
                  >
                    <div className="mb-0.5 flex items-center gap-1 text-xs font-semibold" style={{ color: BRAND }}>
                      <MessageCircle className="h-3.5 w-3.5" /> {m.label ?? "The team"}
                    </div>
                    {m.content}
                  </div>
                </div>
              );
            }
            if (m.role === "pulse") return null;
            return (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    m.role === "user" ? "text-white" : "border border-white/50 bg-white/85 backdrop-blur-md"
                  }`}
                  style={m.role === "user" ? { backgroundColor: BRAND } : undefined}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
          {showPulse && (
            <DemoPulseCard
              brand={BRAND}
              onDismiss={() => {
                setPulseHidden(true);
                localStorage.setItem(PULSE_DONE_KEY, "1");
              }}
              onSubmit={(rating, text) => {
                demo.guestPulse({ rating, text });
                setPulseHidden(true);
                localStorage.setItem(PULSE_DONE_KEY, "1");
                append({
                  role: "assistant",
                  content: rating <= 2
                    ? "Thank you — a manager has been flagged on Insights so they can follow up."
                    : "Thank you — that stay feedback is on Insights for the team.",
                });
                toast.success("Stay review sent — open Insights in Operations.");
              }}
            />
          )}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="shrink-0 space-y-2 border-t border-white/40 bg-background/75 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void sendTyped(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            disabled={busy || voiceState === "connecting"}
            className="h-10"
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 shrink-0"
            disabled={busy || voiceState === "connecting" || !input.trim()}
            style={{ backgroundColor: BRAND }}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-center text-[10px] text-muted-foreground">
          <Link to="/demo/operations" className="underline underline-offset-2 hover:text-foreground">
            Open staff Operations demo
          </Link>
          {" · "}
          <Link to="/demo" className="underline underline-offset-2 hover:text-foreground">
            All demos
          </Link>
        </p>
      </div>

      {sheetOpen && (
        <DemoRequestsSheet
          demo={demo}
          reqs={reqs.map((r) => ({
            id: r.id,
            department_key: r.department_key,
            summary: r.summary,
            status: r.status,
          }))}
          onClose={() => setSheetOpen(false)}
        />
      )}

      {notifyOpen && (
        <DemoNotifySheet
          onClose={() => setNotifyOpen(false)}
          onDone={() => setNotifyOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * Marketing guest demo — full stay loop synced with /demo/operations.
 */
export default function DemoGuestApp() {
  return (
    <DemoProvider>
      <NoIndexMeta />
      <DemoGuestInner />
    </DemoProvider>
  );
}

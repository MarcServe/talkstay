import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, ClipboardList, Star, X, Mic, MicOff, Square, Globe, Check, MessageCircle, Smile, Meh, Frown, BellRing, Bell, Pencil, ExternalLink, RotateCcw } from "lucide-react";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";
import { toast } from "sonner";
import { RealtimeChat } from "@/utils/RealtimeChat";
import { conversationMemory } from "@/utils/ConversationMemory";
import { pushSupported } from "@/talkstay/lib/push";
import { alertIncoming } from "@/talkstay/lib/alerts";
import InstallAppBanner from "@/talkstay/components/InstallAppBanner";
import {
  fetchContext, sendMessage, fetchMyRequests, submitReview, saveGuestContact,
  confirmRequest, reopenRequest, cancelRequest, nudgeRequest, updateRequest, repeatRequest,
  fetchStaffMessages, enableDevicePush, disableDevicePush,
  getSessionId, getDeviceId, loadHistory, saveHistory, getNotifyChoice, setNotifyChoice,
  submitPulse, transcribePulseAudio, getPulseState, setPulseState,
  type ChatMsg, type GuestCard, type GuestRequest, type GuestBranding,
} from "@/talkstay/lib/guest";
import { statusBadge, statusDot, statusLabel } from "@/talkstay/lib/statusStyles";

/** Guest My-requests card washes — kept in this file so Tailwind always emits them. */
const GUEST_REQ_CARD: Record<string, string> = {
  new: "border-sky-300/80 bg-sky-100/90 border-l-4 border-l-sky-500 shadow-[0_8px_28px_rgba(14,165,233,0.12)]",
  accepted: "border-amber-300/80 bg-amber-100/90 border-l-4 border-l-amber-500 shadow-[0_8px_28px_rgba(245,158,11,0.12)]",
  in_progress: "border-amber-300/80 bg-amber-100/90 border-l-4 border-l-amber-500 shadow-[0_8px_28px_rgba(245,158,11,0.12)]",
  on_the_way: "border-teal-300/80 bg-teal-100/90 border-l-4 border-l-teal-500 shadow-[0_8px_28px_rgba(20,184,166,0.12)]",
  completed: "border-emerald-300/80 bg-emerald-100/90 border-l-4 border-l-emerald-500 shadow-[0_8px_28px_rgba(16,185,129,0.12)]",
  guest_confirmed: "border-emerald-400/80 bg-emerald-100/95 border-l-4 border-l-emerald-600 shadow-[0_8px_28px_rgba(16,185,129,0.14)]",
  reopened: "border-orange-300/80 bg-orange-100/90 border-l-4 border-l-orange-500 shadow-[0_8px_28px_rgba(249,115,22,0.12)]",
  escalated: "border-rose-300/80 bg-rose-100/90 border-l-4 border-l-rose-500 shadow-[0_8px_28px_rgba(244,63,94,0.12)]",
  cancelled: "border-slate-300/90 bg-slate-200/80 border-l-4 border-l-slate-400 shadow-[0_8px_28px_rgba(100,116,139,0.1)]",
};

type Ctx = {
  hotelName: string; roomNumber: string; greeting: string;
  branding?: GuestBranding; assistantId?: string | null;
  pulseAsk?: boolean;
};

type Msg =
  | ChatMsg
  | { role: "request"; content: string }
  | { role: "notice"; content: string }
  | { role: "staff"; content: string; label?: string };

type ViewerTarget = { url: string; title: string; kind: "page" | "image" };

function looksLikeImageUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg)(\?|#|$)/i.test(url);
}

/** Keeps guests inside TalkStay — images full-screen, pages in an in-app frame. */
function InAppViewer({ target, brand, onClose }: { target: ViewerTarget; brand: string; onClose: () => void }) {
  const [frameFailed, setFrameFailed] = useState(false);
  const isImage = target.kind === "image" || looksLikeImageUrl(target.url);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-muted" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{target.title || "View"}</p>
        <a
          href={target.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white"
          style={{ backgroundColor: brand }}
        >
          <ExternalLink className="h-3.5 w-3.5" /> Browser
        </a>
      </div>
      <div className="relative min-h-0 flex-1 bg-muted/40">
        {isImage ? (
          <div className="flex h-full items-center justify-center p-3">
            <img src={target.url} alt={target.title} className="max-h-full max-w-full object-contain" />
          </div>
        ) : frameFailed ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              This page can’t be shown inside the app (blocked by the website).
            </p>
            <a
              href={target.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: brand }}
            >
              <ExternalLink className="h-4 w-4" /> Open in browser
            </a>
          </div>
        ) : (
          <iframe
            title={target.title || "Page"}
            src={target.url}
            className="h-full w-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
            onError={() => setFrameFailed(true)}
          />
        )}
      </div>
    </div>
  );
}

function GuestInfoCard({
  card, brand, onOpen,
}: {
  card: GuestCard; brand: string; onOpen: (t: ViewerTarget) => void;
}) {
  const hasBody = (card.sections?.length ?? 0) > 0 || (card.links?.length ?? 0) > 0 || (card.images?.length ?? 0) > 0;
  if (!hasBody && !card.title) return null;
  return (
    <div className="mt-2 overflow-hidden rounded-xl border bg-background/80 text-left shadow-sm">
      {card.images?.[0] && (
        <button
          type="button"
          className="block w-full"
          onClick={() => onOpen({ url: card.images![0].url, title: card.images![0].alt || card.title || "Photo", kind: "image" })}
        >
          <img
            src={card.images[0].url}
            alt={card.images[0].alt || card.title || ""}
            className="h-36 w-full object-cover"
            loading="lazy"
          />
        </button>
      )}
      <div className="space-y-3 p-3">
        {card.title && (
          <div className="text-sm font-semibold tracking-tight" style={{ color: brand }}>{card.title}</div>
        )}
        {card.images?.[0]?.alt && (
          <p className="-mt-1 text-xs text-muted-foreground">{card.images[0].alt}</p>
        )}
        {card.sections?.map((sec, i) => (
          <div key={i}>
            {sec.title && <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{sec.title}</div>}
            <ul className="space-y-1">
              {sec.items.map((item, j) => (
                <li key={j} className="flex gap-2 text-sm leading-snug">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: brand }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {(card.images?.length ?? 0) > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {card.images!.slice(1).map((img, i) => (
              <button
                key={i}
                type="button"
                className="shrink-0"
                onClick={() => onOpen({ url: img.url, title: img.alt || "Photo", kind: "image" })}
              >
                <img src={img.url} alt={img.alt || ""} className="h-16 w-24 rounded-lg object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
        {!!card.links?.length && (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {card.links.map((l, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onOpen({
                  url: l.url,
                  title: l.label || "View",
                  kind: looksLikeImageUrl(l.url) ? "image" : "page",
                })}
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: brand }}
              >
                {l.label || "View"}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GuestApp() {
  const { hotelSlug = "", roomId = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [checkedOut, setCheckedOut] = useState(false);
  const [roomFull, setRoomFull] = useState(false);
  const [needCode, setNeedCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  // Labels for gate screens (ended / code) — from API or last successful visit.
  const [roomLabel, setRoomLabel] = useState<{ hotelName?: string; roomNumber?: string }>({});
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [viewer, setViewer] = useState<ViewerTarget | null>(null);
  const [pulseHidden, setPulseHidden] = useState(false);
  // Pulse only appears after a calm pause — never mid-request / mid-typing.
  const [pulseReady, setPulseReady] = useState(false);

  // Voice state (TalkWeb realtime stack)
  const [voiceState, setVoiceState] = useState<"idle" | "connecting" | "connected">("idle");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const chatRef = useRef<RealtimeChat | null>(null);
  const liveAssistantRef = useRef("");
  // Dedupe voice→hotel-brain routing so one spoken ask can't open two tickets.
  const lastRoutedVoiceRef = useRef<{ text: string; at: number }>({ text: "", at: 0 });

  const sid = hotelSlug && roomId ? getSessionId(hotelSlug, roomId) : "";
  const scroller = useRef<HTMLDivElement>(null);

  const loadContext = (code?: string) => {
    if (!hotelSlug || !roomId || !token) { setInvalid(true); return; }
    const labelKey = `talkstay:roomlabel:${hotelSlug}:${roomId}`;
    fetchContext(hotelSlug, roomId, token, code, sid)
      .then((c) => {
        setNeedCode(false); setCodeError(null);
        setCheckedOut(false); setRoomFull(false); setInvalid(false);
        setCtx(c);
        setRoomLabel({ hotelName: c.hotelName, roomNumber: c.roomNumber });
        try {
          localStorage.setItem(labelKey, JSON.stringify({ hotelName: c.hotelName, roomNumber: c.roomNumber }));
        } catch { /* ignore */ }
        const prev = loadHistory(sid) as Msg[];
        // Fresh stay after re-check-in: prefer greeting if history was wiped.
        setMsgs(prev.length ? prev : [{ role: "assistant", content: c.greeting }]);
      })
      .catch((e) => {
        const msg = String(e?.message ?? e);
        const fromErr = {
          hotelName: typeof e?.hotelName === "string" ? e.hotelName : undefined,
          roomNumber: typeof e?.roomNumber === "string" ? e.roomNumber : undefined,
        };
        let cached: { hotelName?: string; roomNumber?: string } = {};
        try { cached = JSON.parse(localStorage.getItem(labelKey) || "{}"); } catch { /* ignore */ }
        const labels = {
          hotelName: fromErr.hotelName || cached.hotelName,
          roomNumber: fromErr.roomNumber || cached.roomNumber,
        };
        if (labels.hotelName || labels.roomNumber) setRoomLabel(labels);

        if (msg.includes("checked_out")) {
          // Stay vacant OR this device is still on an old stay — clear local history.
          try {
            localStorage.removeItem(`talkstay:hist:${sid}`);
            localStorage.removeItem(`talkstay:notify:${sid}`);
            localStorage.removeItem(`talkstay:pulse:${sid}`);
          } catch { /* ignore */ }
          setCheckedOut(true);
          setNeedCode(false);
        } else if (msg.includes("room_full")) {
          setRoomFull(true);
        } else if (msg.includes("need_code")) {
          // New stay on an occupied room — collect the check-in code (also after
          // "stay ended" when the room has been re-let).
          setCheckedOut(false);
          setNeedCode(true); setCodeError(null);
        } else if (msg.includes("bad_code")) {
          setCheckedOut(false);
          setNeedCode(true); setCodeError("That code didn't match. Please check with reception.");
        } else setInvalid(true);
      });
  };

  useEffect(() => {
    loadContext();
    return () => { chatRef.current?.disconnect(); };
    // eslint-disable-next-line
  }, [hotelSlug, roomId, token]);

  useEffect(() => {
    if (sid && msgs.length) saveHistory(sid, msgs.filter((m) => m.role === "user" || m.role === "assistant") as ChatMsg[]);
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, sid]);

  const append = (m: Msg) => setMsgs((prev) => [...prev, m]);

  // Human staff replies: poll while the guest is here so a reply ("no red wine
  // tonight, but we have a lovely white") appears in the chat within seconds.
  const staffSeen = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!sid || !ctx) return;
    let active = true;
    const poll = async () => {
      const msgs = await fetchStaffMessages({ hotelSlug, roomId, token, sessionId: sid });
      if (!active) return;
      const fresh = msgs.filter((m) => !staffSeen.current.has(m.id));
      if (!fresh.length) return;
      fresh.forEach((m) => staffSeen.current.add(m.id));
      setMsgs((prev) => [...prev, ...fresh.map((m) => ({ role: "staff" as const, content: m.content, label: m.staff_label ?? undefined }))]);
      const last = fresh[fresh.length - 1];
      // Only announce replies that land while the guest is watching (not the
      // initial backfill of messages they've likely already read by email).
      if (staffSeen.current.size > fresh.length) {
        const title = last.staff_label ?? "Message from the team";
        toast.message(title, { description: last.content });
        void alertIncoming({
          title,
          body: last.content,
          tag: `staff-msg-${last.id}`,
          url: typeof window !== "undefined" ? window.location.href : undefined,
        });
      }
    };
    poll();
    const iv = setInterval(poll, 7000);
    return () => { active = false; clearInterval(iv); };
    // eslint-disable-next-line
  }, [sid, ctx, hotelSlug, roomId, token]);

  // Hotel layer: forward a final utterance to the TalkStay routing brain. If it
  // creates request(s), show confirmation chips + the notification choice sheet.
  const routeThroughHotelBrain = async (text: string, surfaceReply: boolean) => {
    try {
      const history = msgs.filter((m) => m.role === "user" || m.role === "assistant") as ChatMsg[];
      const res = await sendMessage({ hotelSlug, roomId, token, sessionId: sid, message: text, history });
      if (res.requests?.length) {
        for (const r of res.requests) {
          append({ role: "request", content: r.summary });
        }
        if (!getNotifyChoice(sid)) setNotifyOpen(true);
      }
      if (surfaceReply) {
        append({
          role: "assistant",
          content: res.reply,
          ...(res.cards?.length ? { cards: res.cards } : {}),
        });
      } else if (res.cards?.length) {
        // Voice speaks its own reply, but still surface KB cards (menu photos, etc.)
        // so guests see the same media they'd get in typed chat.
        append({
          role: "assistant",
          content: res.reply || "Here's what I found:",
          cards: res.cards,
        });
      }
      return res;
    } catch {
      if (surfaceReply) append({ role: "assistant", content: "Sorry — something went wrong. Please try again." });
      return null;
    }
  };

  // Typed path (single brain: talkstay-guest-chat).
  const sendTyped = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    setInput("");
    append({ role: "user", content: text });
    setBusy(true);
    await routeThroughHotelBrain(text, true);
    setBusy(false);
  };

  // Seed TalkWeb conversation memory from the on-screen transcript so voice
  // picks up mid-thread (typed request → continue by speaking, and vice versa).
  const syncVoiceMemoryFromChat = () => {
    conversationMemory.clearMessages();
    for (const m of msgs) {
      if ((m.role === "user" || m.role === "assistant") && m.content?.trim()) {
        conversationMemory.addMessage(m.role, m.content.trim(), "chat");
      }
    }
  };

  // Voice path (TalkWeb RealtimeChat → realtime-token, WebRTC).
  const startVoice = async () => {
    if (!ctx?.assistantId) {
      toast.error("Voice isn't set up for this room yet — please type instead.");
      return;
    }
    setVoiceState("connecting");
    try {
      // Ask for mic early so Safari/iPad shows a clear permission prompt.
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
      syncVoiceMemoryFromChat();
      const chat = new RealtimeChat(ctx.assistantId, {
        onUserSpeechStart: () => setIsListening(true),
        onUserSpeechStop: () => setIsListening(false),
        onUserTranscript: (text, isFinal) => {
          if (isFinal && text.trim()) {
            const cleaned = text.trim();
            append({ role: "user", content: cleaned });
            conversationMemory.addMessage("user", cleaned, "voice");
            // Hotel layer in background; spoken reply comes from the voice session.
            // Skip near-duplicate finals (common with Realtime) to avoid double tickets.
            const now = Date.now();
            const prev = lastRoutedVoiceRef.current;
            const same = prev.text.toLowerCase() === cleaned.toLowerCase() && now - prev.at < 8_000;
            if (!same) {
              lastRoutedVoiceRef.current = { text: cleaned, at: now };
              routeThroughHotelBrain(cleaned, false);
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
      // TalkStay's own token minter: verifies the room QR token server-side and
      // returns a hotel-aware realtime session.
      chat.tokenFunction = "talkstay-voice-token";
      // sessionId lets the voice session load the same open requests + recent
      // turns the typed hotel brain already uses — so mic ↔ keyboard stay in sync.
      chat.tokenBody = { hotelSlug, roomId, token, deviceId: getDeviceId(), sessionId: sid };
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

  // `auto` = the 30s idle timer fired (guest stopped talking / walked away).
  // Tell them why the mic went quiet so it doesn't feel like a glitch.
  const stopVoice = (auto = false) => {
    chatRef.current?.disconnect();
    chatRef.current = null;
    setVoiceState("idle");
    setIsListening(false);
    setIsSpeaking(false);
    if (auto) append({ role: "notice", content: "Voice paused after a quiet moment — tap the mic to carry on." });
  };

  const toggleVoice = () => (voiceState === "idle" ? startVoice() : stopVoice());

  // Pulse check eligibility — never interrupt someone mid-request or mid-type.
  // One real guest turn + a settled assistant reply is enough; then a short calm pause.
  // Server may omit pulseAsk on older deploys — treat missing as "ask" (only false opts out).
  // localStorage "done" = already answered; accidental dismiss is this visit only.
  const pulseEligible = useMemo(() => {
    if (ctx?.pulseAsk === false || pulseHidden || getPulseState(sid) === "done") return false;
    if (busy || notifyOpen || requestsOpen) return false;
    // Voice can stay "connected" for minutes — only block while actively talking.
    if (voiceState === "connecting" || isListening || isSpeaking) return false;
    if (input.trim()) return false; // still composing

    const userTurns = msgs.filter((m) => m.role === "user");
    if (userTurns.length < 1) return false;

    // Walk from the end: last conversational turn must be an assistant reply
    // (not the guest waiting, not a just-filed request chip).
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      if (m.role === "notice" || m.role === "staff") continue;
      if (m.role === "request") return false;
      if (m.role === "user") return false;
      if (m.role === "assistant") break;
    }

    // If a request was filed in the last few transcript items, give them space.
    const tail = msgs.slice(-3);
    if (tail.some((m) => m.role === "request")) return false;

    return true;
  }, [ctx?.pulseAsk, pulseHidden, sid, busy, voiceState, isListening, isSpeaking, notifyOpen, requestsOpen, input, msgs]);

  useEffect(() => {
    if (!pulseEligible) {
      setPulseReady(false);
      return;
    }
    // Quiet pause after the assistant finishes. Do NOT depend on msgs.length —
    // staff polls / notices were resetting the timer forever.
    const userTurns = msgs.filter((m) => m.role === "user").length;
    const waitMs = userTurns >= 3 ? 8_000 : 12_000;
    const t = window.setTimeout(() => setPulseReady(true), waitMs);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-arm when eligibility flips
  }, [pulseEligible]);

  // When the card mounts, scroll it into view (msgs effect won't fire).
  useEffect(() => {
    if (!pulseEligible || !pulseReady) return;
    const t = window.setTimeout(() => {
      scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
    }, 50);
    return () => window.clearTimeout(t);
  }, [pulseEligible, pulseReady]);

  if (checkedOut) {
    const roomLine = formatRoomLabel(roomLabel.roomNumber, { fallback: "this room" });
    const hotelBit = roomLabel.hotelName ? ` at ${roomLabel.hotelName}` : "";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-xl font-semibold">Your stay has ended</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Thank you for staying with us. The assistant for <strong>{roomLine}</strong>{hotelBit} is no longer
          active for the previous stay.
          If you've just checked in again, enter the new check-in code from reception — or ask them to
          confirm {roomLabel.roomNumber ? roomLine : "the room"} is checked in.
        </p>
        {roomLabel.roomNumber && (
          <p className="text-xs text-muted-foreground">
            Mention <strong>{roomLine}</strong> if you contact reception or share feedback.
          </p>
        )}
        <form
          className="flex w-full max-w-xs flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const v = codeInput.trim();
            if (!v) {
              // Retry without a code (hotels that don't require one, after re-check-in).
              loadContext();
              return;
            }
            setCodeError(null);
            loadContext(v);
          }}
        >
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            placeholder="Check-in code (if you have one)"
            autoCapitalize="characters"
            className="w-full rounded-xl border px-4 py-3 text-center text-lg tracking-[0.3em] outline-none focus:ring-2 focus:ring-primary"
          />
          {codeError && <p className="text-sm text-red-600">{codeError}</p>}
          <button type="submit" className="w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground">
            Connect to this stay
          </button>
          <button
            type="button"
            className="text-sm text-muted-foreground underline"
            onClick={() => loadContext()}
          >
            Try again without a code
          </button>
        </form>
      </div>
    );
  }
  if (roomFull) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-semibold">Too many devices on this room</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {formatRoomLabel(roomLabel.roomNumber, { fallback: "This room" })} already has the maximum number of
          connected devices for this stay.
          Please use a device that's already connected, or ask reception for help.
        </p>
      </div>
    );
  }
  if (needCode) {
    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      const v = codeInput.trim();
      if (!v) return;
      setCodeError(null);
      loadContext(v);
    };
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-4xl">🔑</div>
        <h1 className="text-xl font-semibold">Enter your check-in code</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          For your security, reception gave you a short code at check-in (it may be on your
          key-card sleeve or email). Enter it once to connect this device
          {roomLabel.roomNumber ? <> to <strong>{formatRoomLabel(roomLabel.roomNumber)}</strong></> : null}.
        </p>
        <form onSubmit={submit} className="flex w-full max-w-xs flex-col gap-3">
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            placeholder="e.g. 7F3K9P"
            autoFocus
            autoCapitalize="characters"
            className="w-full rounded-xl border px-4 py-3 text-center text-lg tracking-[0.3em] outline-none focus:ring-2 focus:ring-primary"
          />
          {codeError && <p className="text-sm text-red-600">{codeError}</p>}
          <button type="submit" className="w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground">
            Connect
          </button>
        </form>
      </div>
    );
  }
  if (invalid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-semibold">This QR link isn't valid</h1>
        <p className="text-sm text-muted-foreground">Please scan the code in your room again, or contact reception.</p>
      </div>
    );
  }
  if (!ctx) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Connecting…</div>;
  }

  const brand = ctx.branding?.primary_color || "#7c3aed";
  const logo = ctx.branding?.logo_url || undefined;
  // Prefer the poster's own background photo (the owner picked it on purpose);
  // fall back to the logo as a faint watermark. Wash strength is set in Branding.
  const bgPhoto = ctx.branding?.poster?.bg_image_url || logo || undefined;
  const washRaw = ctx.branding?.guest_bg_wash;
  const wash = washRaw != null && Number.isFinite(washRaw)
    ? Math.min(0.96, Math.max(0.2, washRaw))
    : 0.88;
  const washTop = Math.min(0.97, wash + 0.04);
  const washBot = Math.min(0.97, wash + 0.06);
  const voiceAvailable = !!ctx.assistantId;

  const orbLabel =
    voiceState === "connecting" ? "Setting up your microphone…"
    : isSpeaking ? "Speaking…"
    : voiceState === "connected" ? (isListening ? "Listening…" : "I'm listening — just talk")
    : "Tap to Talk";

  return (
    <div
      data-talkstay
      className="ts-atmosphere relative mx-auto flex h-[100dvh] max-w-md flex-col bg-cover bg-center"
      style={bgPhoto ? {
        backgroundImage: `linear-gradient(hsla(38,26%,97%,${washTop}), hsla(210,20%,94%,${washBot})), url(${bgPhoto})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      } : undefined}
    >
      <div className="shrink-0">
        <InstallAppBanner variant="guest" />
      </div>
      {/* Compact header — keep chat as the largest surface. */}
      <header className="flex shrink-0 items-center gap-2.5 border-b bg-background/80 px-3 py-2 backdrop-blur">
        {logo ? (
          <img src={logo} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: brand }}>
            <Globe className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0 flex-1 text-left">
          <h1 className="truncate text-sm font-bold leading-tight">{ctx.hotelName}</h1>
          <p className="truncate text-xs text-muted-foreground">
            {formatRoomLabel(ctx.roomNumber)} · Voice Stay
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 shrink-0 px-2.5 text-xs" onClick={() => setRequestsOpen(true)}>
          <ClipboardList className="mr-1 h-3.5 w-3.5" /> Requests
        </Button>
      </header>

      {/* Voice-first strip — centred under the header. */}
      <div className="shrink-0 border-b bg-background/90 px-3 py-2.5 backdrop-blur">
        {voiceAvailable ? (
          <div className="flex flex-col items-center gap-1.5 text-center">
            <button
              type="button"
              onClick={toggleVoice}
              disabled={voiceState === "connecting"}
              className="relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-md transition hover:scale-[1.03] active:scale-[0.98] disabled:opacity-60"
              style={{
                background: isListening && !isSpeaking
                  ? "linear-gradient(145deg, #ef4444, #b91c1c)"
                  : `linear-gradient(145deg, ${brand}, ${brand}b3)`,
                boxShadow: voiceState === "connected" ? `0 0 0 4px ${brand}28` : undefined,
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
              <p className="text-sm font-semibold" style={{ color: brand }}>{orbLabel}</p>
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
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Voice isn’t set up for this room yet — type below.
          </p>
        )}
      </div>

      {/* Transcript — grows to fill everything between voice strip and type dock. */}
      <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto">
      <div className="space-y-3 px-4 pb-4 pt-3">
        {msgs.map((m, i) =>
          m.role === "request" ? (
            <div key={i} className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-100 px-3 py-1 text-xs text-sky-800">
                <Check className="h-3.5 w-3.5 text-sky-700" /> Sent to the team — {m.content}
              </span>
            </div>
          ) : m.role === "notice" ? (
            <div key={i} className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                <MicOff className="h-3.5 w-3.5" /> {m.content}
              </span>
            </div>
          ) : m.role === "staff" ? (
            <div key={i} className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl border px-4 py-2 text-sm" style={{ borderColor: `${brand}66`, background: `${brand}12` }}>
                <div className="mb-0.5 flex items-center gap-1 text-xs font-semibold" style={{ color: brand }}>
                  <MessageCircle className="h-3.5 w-3.5" /> {m.label ?? "The team"}
                </div>
                {m.content}
              </div>
            </div>
          ) : (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "text-white" : "bg-muted"}`}
                style={m.role === "user" ? { backgroundColor: brand } : undefined}
              >
                {m.content}
                {m.role === "assistant" && m.cards?.map((card, ci) => (
                  <GuestInfoCard key={ci} card={card} brand={brand} onOpen={setViewer} />
                ))}
              </div>
            </div>
          )
        )}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground">…</div>
          </div>
        )}
        {/* After a real exchange + calm pause — never while ordering or composing. */}
        {pulseEligible && pulseReady && (
          <PulseCard
            hotelSlug={hotelSlug} roomId={roomId} token={token} sid={sid} brand={brand}
            onFinished={() => setPulseHidden(true)}
            onBeforeListen={() => {
              // Realtime voice holds the mic — release it before feedback dictation.
              if (voiceState !== "idle") stopVoice(false);
            }}
          />
        )}
      </div>
      </div>

      {/* Type dock — secondary to voice above. */}
      <div className="relative z-20 shrink-0 border-t bg-background/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <form
          onSubmit={(e) => { e.preventDefault(); sendTyped(input); }}
          className="flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              voiceState === "connected"
                ? "Or type while we listen…"
                : voiceAvailable
                  ? "Or type a message…"
                  : "Type your message…"
            }
            disabled={busy}
            className="h-9 text-sm"
          />
          <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={busy || !input.trim()} style={{ backgroundColor: brand }}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {notifyOpen && (
        <NotifySheet
          hotelSlug={hotelSlug} roomId={roomId} token={token} sid={sid}
          onDone={() => { setNotifyChoice(sid, "on"); setNotifyOpen(false); }}
          onClose={() => setNotifyOpen(false)}
        />
      )}
      {requestsOpen && (
        <RequestsSheet
          hotelSlug={hotelSlug} roomId={roomId} token={token} sid={sid}
          onClose={() => setRequestsOpen(false)}
        />
      )}
      {viewer && (
        <InAppViewer target={viewer} brand={brand} onClose={() => setViewer(null)} />
      )}
    </div>
  );
}

/** Mid-stay pulse — overall stay sentiment (separate from per-request ratings).
 *  Voice uses record → Whisper (not live browser SpeechRecognition). */
function PulseCard({ hotelSlug, roomId, token, sid, brand, onFinished, onBeforeListen }: {
  hotelSlug: string; roomId: string; token: string; sid: string;
  brand: string; onFinished: (state: "done" | "dismissed") => void;
  onBeforeListen?: () => void;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [result, setResult] = useState<{ reply: string; notifiedManager: boolean } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  /** Bumps on cancel/restart so a late onstop never transcribes a discarded clip. */
  const takeRef = useRef(0);

  const recordOk = typeof window !== "undefined" &&
    !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

  const releaseMic = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  };

  const cancelRecording = () => {
    takeRef.current += 1;
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    } catch { /* */ }
    releaseMic();
    setRecording(false);
    setTranscribing(false);
  };

  useEffect(() => () => {
    takeRef.current += 1;
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    } catch { /* */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const blobToBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = String(reader.result || "");
        resolve(dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl);
      };
      reader.onerror = () => reject(new Error("Couldn't read recording"));
      reader.readAsDataURL(blob);
    });

  const startRecording = async () => {
    if (!recordOk || busy || transcribing) return;
    onBeforeListen?.();
    cancelRecording();
    await new Promise((r) => setTimeout(r, 150));
    const take = ++takeRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (take !== takeRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "";
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const parts = chunksRef.current.slice();
        const type = recorder.mimeType || mimeType || "audio/webm";
        releaseMic();
        setRecording(false);
        if (take !== takeRef.current) return;
        if (!parts.length) {
          toast.error("No audio captured — try again or type.");
          return;
        }
        const blob = new Blob(parts, { type });
        if (blob.size < 800) {
          toast.error("That was too short — hold and speak, then tap stop.");
          return;
        }
        setTranscribing(true);
        try {
          const audioBase64 = await blobToBase64(blob);
          if (take !== takeRef.current) return;
          const { text: spoken } = await transcribePulseAudio({
            hotelSlug, roomId, token, sessionId: sid,
            audioBase64, mimeType: type.split(";")[0] || "audio/webm",
          });
          if (take !== takeRef.current) return;
          setText((prev) => [prev.trim(), spoken.trim()].filter(Boolean).join(" "));
        } catch (e: any) {
          if (take !== takeRef.current) return;
          const msg = String(e?.message || "");
          toast.error(
            msg.includes("not-allowed") || msg.toLowerCase().includes("permission")
              ? "Microphone permission needed to speak your feedback."
              : msg || "Couldn't transcribe that — please type instead.",
          );
        } finally {
          if (take === takeRef.current) setTranscribing(false);
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (e: any) {
      if (take === takeRef.current) {
        releaseMic();
        setRecording(false);
      }
      const name = String(e?.name || "");
      toast.error(
        name === "NotAllowedError"
          ? "Microphone permission needed to speak your feedback."
          : name === "NotFoundError"
            ? "No microphone found — please type instead."
            : "Microphone is busy — end Tap to Talk, then try again (or type).",
      );
    }
  };

  const stopRecording = () => {
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      } else {
        setRecording(false);
        releaseMic();
      }
    } catch {
      setRecording(false);
      releaseMic();
    }
  };

  const send = async (withRating: number) => {
    cancelRecording();
    setBusy(true);
    try {
      const res = await submitPulse({ hotelSlug, roomId, token, sessionId: sid, rating: withRating, text: text.trim() || undefined });
      setResult(res);
      setPulseState(sid, "done");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't send that — please try again.");
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: `${brand}66`, background: `${brand}0f` }}>
        <p>{result.reply}</p>
        {result.notifiedManager && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: brand }}>
            <BellRing className="h-3.5 w-3.5" /> A manager has been notified.
          </p>
        )}
        <button onClick={() => onFinished("done")} className="mt-3 block text-xs text-muted-foreground underline">Close</button>
      </div>
    );
  }

  const FACES = [
    { value: 5, label: "Great", Icon: Smile },
    { value: 3, label: "Okay", Icon: Meh },
    { value: 2, label: "Not great", Icon: Frown },
  ];
  const micBusy = busy || transcribing;

  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: `${brand}55` }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">How has your stay been generally?</p>
        <button onClick={() => { cancelRecording(); onFinished("dismissed"); }}
          aria-label="Dismiss" className="-mr-1 -mt-1 rounded-full p-1 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Overall vibe of the stay — not a single request. Tell us now and we can still put things right.
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {FACES.map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => setRating(value)}
            disabled={busy || recording || transcribing}
            className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-xs transition-colors ${rating === value ? "text-white" : "hover:bg-muted"}`}
            style={rating === value ? { backgroundColor: brand, borderColor: brand } : undefined}
          >
            <Icon className="h-6 w-6" />
            {label}
          </button>
        ))}
      </div>

      {rating != null && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={rating >= 4 ? "What stood out? (optional)" : "What would you like us to fix? (optional)"}
              disabled={busy || recording || transcribing}
              autoFocus={!recordOk}
              className="flex-1"
            />
            {recordOk && (
              <Button
                type="button"
                size="icon"
                variant={recording ? "default" : "outline"}
                disabled={micBusy && !recording}
                onClick={() => (recording ? stopRecording() : startRecording())}
                aria-label={recording ? "Stop recording" : "Record your feedback"}
                title={recording ? "Stop and turn into text" : "Speak instead of typing"}
                style={recording ? { backgroundColor: brand } : undefined}
              >
                {transcribing
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : recording
                    ? <Square className="h-3.5 w-3.5 fill-current" />
                    : <Mic className="h-4 w-4" />}
              </Button>
            )}
          </div>
          {recording ? (
            <p className="text-xs" style={{ color: brand }}>Recording… tap the square when you finish speaking.</p>
          ) : transcribing ? (
            <p className="text-xs text-muted-foreground">Turning your voice into text…</p>
          ) : recordOk ? (
            <p className="text-xs text-muted-foreground">Or tap the mic, speak, then stop — we’ll type it for you.</p>
          ) : null}
          <Button onClick={() => send(rating)} disabled={busy || recording || transcribing} className="w-full" style={{ backgroundColor: brand }}>
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Send
          </Button>
        </div>
      )}
    </div>
  );
}

function NotifySheet({ hotelSlug, roomId, token, sid, onDone, onClose }: {
  hotelSlug: string; roomId: string; token: string; sid: string;
  onDone: () => void; onClose: () => void;
}) {
  // Independent, multi-selectable channels — a guest can have either, both,
  // or neither. Push (if supported) commits immediately on toggle since it's
  // a live browser permission flow; email is typed then committed on Save.
  const canPush = pushSupported();
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [emailOn, setEmailOn] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  const togglePush = async (next: boolean) => {
    setPushBusy(true);
    try {
      if (next) {
        const { enableAlertSounds } = await import("@/talkstay/lib/alerts");
        await enableAlertSounds();
        await enableDevicePush({ hotelSlug, roomId, token, sessionId: sid });
        setPushOn(true);
        toast.success("You'll hear and see updates on this device.");
      } else {
        await disableDevicePush({ hotelSlug, roomId, token, sessionId: sid });
        setPushOn(false);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't enable notifications on this device.");
      setPushOn(false);
    } finally {
      setPushBusy(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      if (emailOn && emailValid) {
        await saveGuestContact({ hotelSlug, roomId, token, sessionId: sid, channel: "email", contact: email.trim() });
      }
      onDone();
    } catch {
      toast.error("Couldn't save — you can try again from here.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="ts-glass-strong w-full max-w-md rounded-t-2xl border border-b-0 p-5" onClick={(e) => e.stopPropagation()}>
        <p className="mb-1 font-medium">Your request has been sent.</p>
        <p className="mb-4 text-sm text-muted-foreground">How would you like updates? Choose as many as you like.</p>

        <div className="space-y-3">
          {canPush && (
            <label className="flex items-center gap-3 rounded-xl border p-3">
              <input
                type="checkbox" checked={pushOn} disabled={pushBusy}
                onChange={(e) => togglePush(e.target.checked)}
                className="h-4 w-4 shrink-0"
              />
              <span className="flex-1 text-sm">Notify me on this device</span>
              {pushBusy && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
            </label>
          )}

          <div className="rounded-xl border p-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox" checked={emailOn}
                onChange={(e) => setEmailOn(e.target.checked)}
                className="h-4 w-4 shrink-0"
              />
              <span className="flex-1 text-sm">Email me updates</span>
            </label>
            {emailOn && (
              <Input
                autoFocus type="email" inputMode="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" className="mt-2"
              />
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Not now</Button>
          <Button className="flex-1" disabled={saving || (emailOn && !emailValid)} onClick={save}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Save
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Only used to update you about this stay.</p>
      </div>
    </div>
  );
}

function RequestsSheet({ hotelSlug, roomId, token, sid, onClose }: {
  hotelSlug: string; roomId: string; token: string; sid: string; onClose: () => void;
}) {
  const [reqs, setReqs] = useState<GuestRequest[] | null>(null);
  // Optimistic guest close-out: id → "confirmed" | "reopened".
  const [resolved, setResolved] = useState<Record<string, "confirmed" | "reopened">>({});
  const [rated, setRated] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [nudged, setNudged] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<Record<string, string>>({});
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const reload = () =>
    fetchMyRequests(hotelSlug, roomId, token, sid).then(setReqs).catch(() => setReqs([]));

  useEffect(() => {
    reload();
  }, [hotelSlug, roomId, token, sid]);

  const confirmDone = async (r: GuestRequest) => {
    setResolved((p) => ({ ...p, [r.id]: "confirmed" }));
    try {
      await confirmRequest({ hotelSlug, roomId, token, sessionId: sid, requestId: r.id });
    } catch {
      setResolved((p) => { const n = { ...p }; delete n[r.id]; return n; });
    }
  };

  const cancelOpen = async (r: GuestRequest) => {
    setBusyId(r.id);
    try {
      await cancelRequest({
        hotelSlug, roomId, token, sessionId: sid, requestId: r.id,
        reason: cancelReason.trim() || undefined,
      });
      // Cancelled asks leave no guest record — drop from the list.
      setReqs((prev) => (prev ?? []).filter((x) => x.id !== r.id));
      setCancellingId(null);
      setCancelReason("");
      toast.success("Cancelled — we've let the team know.");
    } catch {
      toast.error("Couldn't cancel that request. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const remind = async (r: GuestRequest) => {
    setBusyId(r.id);
    try {
      await nudgeRequest({ hotelSlug, roomId, token, sessionId: sid, requestId: r.id });
      setNudged((p) => ({ ...p, [r.id]: true }));
      toast.success("We've reminded the team you're waiting.");
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      toast.error(
        msg.includes("too_soon")
          ? "You've already nudged them — please wait a few minutes."
          : "Couldn't send that reminder. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const saveUpdate = async (r: GuestRequest) => {
    const note = (editText[r.id] ?? "").trim();
    if (!note) return;
    setBusyId(r.id);
    try {
      const res = await updateRequest({
        hotelSlug, roomId, token, sessionId: sid, requestId: r.id, note,
      });
      setReqs((prev) => (prev ?? []).map((x) => x.id === r.id ? { ...x, summary: res.summary || note } : x));
      setEditingId(null);
      setNudged((p) => ({ ...p, [r.id]: true }));
      toast.success("Updated — the team has been notified.");
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      toast.error(
        msg.includes("too_soon")
          ? "Please wait a few minutes before updating again."
          : "Couldn't update that request. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const reopen = async (r: GuestRequest) => {
    setResolved((p) => ({ ...p, [r.id]: "reopened" }));
    try {
      await reopenRequest({ hotelSlug, roomId, token, sessionId: sid, requestId: r.id });
    } catch {
      setResolved((p) => { const n = { ...p }; delete n[r.id]; return n; });
    }
  };

  const rate = async (r: GuestRequest, n: number) => {
    setRated((p) => ({ ...p, [r.id]: n }));
    try {
      await submitReview({
        hotelSlug, roomId, token, sessionId: sid, requestId: r.id,
        rating: n, comment: comments[r.id]?.trim() || undefined,
      });
    } catch { /* ignore */ }
  };

  const sendComment = async (r: GuestRequest) => {
    const n = rated[r.id];
    if (!n) return;
    try {
      await submitReview({
        hotelSlug, roomId, token, sessionId: sid, requestId: r.id,
        rating: n, comment: comments[r.id]?.trim() || undefined,
      });
      setSent((p) => ({ ...p, [r.id]: true }));
    } catch { /* ignore */ }
  };

  /** Cancelled → put back in queue; completed → new ticket. Optional edited note. */
  const askAgain = async (r: GuestRequest) => {
    const note = (editText[r.id] ?? r.summary).trim();
    if (!note) return;
    setBusyId(r.id);
    try {
      const res = await repeatRequest({
        hotelSlug, roomId, token, sessionId: sid, requestId: r.id, note,
      });
      setResolved((p) => {
        const n = { ...p };
        delete n[r.id];
        return n;
      });
      setEditingId(null);
      if (res.mode === "reopen_cancelled") {
        setReqs((prev) => (prev ?? []).map((x) =>
          x.id === r.id ? { ...x, status: "new", summary: res.request?.summary || note } : x
        ));
        toast.success("Back with the team — request updated and reopened.");
      } else {
        await reload();
        toast.success("Asked again — the team has a new request.");
      }
    } catch {
      toast.error("Couldn't ask again. Please try once more.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div data-talkstay className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="ts-glass-strong flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-white/50 p-6"
        style={{
          backgroundImage: "linear-gradient(165deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.72) 45%, rgba(245,248,250,0.68) 100%)",
          backdropFilter: "blur(22px) saturate(1.45)",
          WebkitBackdropFilter: "blur(22px) saturate(1.45)",
          boxShadow: "-12px 0 40px rgba(15,23,42,0.12), inset 1px 0 0 rgba(255,255,255,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">My requests</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Track open and completed asks. You can remind, update, or cancel anything still in progress — cancelled requests are removed.
        </p>
        {reqs === null ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : reqs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests yet. Ask in chat or tap the mic.</p>
        ) : (
          <div className="space-y-3">
            {reqs.map((r) => {
              // Fold the guest's optimistic close-out over the fetched status.
              const effStatus =
                resolved[r.id] === "confirmed" ? "guest_confirmed"
                : resolved[r.id] === "reopened" ? "reopened"
                : r.status;
              if (effStatus === "cancelled") return null;
              const awaitingConfirm = effStatus === "completed";
              const confirmed = effStatus === "guest_confirmed";
              const wasReopened = effStatus === "reopened";
              const isOpen = ["new", "accepted", "in_progress", "on_the_way", "reopened"].includes(effStatus);
              const busy = busyId === r.id;
              const isEditing = editingId === r.id;
              const isCancelling = cancellingId === r.id;
              const cardTone = GUEST_REQ_CARD[effStatus] ?? GUEST_REQ_CARD.new;
              return (
                <div
                  key={r.id}
                  className={`rounded-2xl border p-4 backdrop-blur-md ${cardTone}`}
                >
                  <div className="text-[15px] font-medium leading-snug">{r.summary}</div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(effStatus)}`}>
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot(effStatus)}`} />
                      {statusLabel(effStatus)}
                    </span>
                  </div>

                  {/* Staff marked it done — the guest gets the final say. */}
                  {awaitingConfirm && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium">Did you receive everything?</p>
                      <p className="text-xs text-muted-foreground">Confirm so we can close it, or tell us it’s not done yet.</p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => confirmDone(r)}>Yes, all good</Button>
                        <Button size="sm" variant="outline" onClick={() => reopen(r)}>Not yet</Button>
                      </div>
                    </div>
                  )}

                  {/* Open request — remind / update / cancel with clear guidance. */}
                  {isOpen && (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      <p className="text-xs font-medium text-foreground">What you can do</p>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-auto flex-col gap-1 py-2 text-xs"
                          disabled={busy || nudged[r.id]}
                          onClick={() => remind(r)}
                        >
                          {busy && !isEditing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                          {nudged[r.id] ? "Reminded" : "Remind"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-auto flex-col gap-1 py-2 text-xs"
                          disabled={busy}
                          onClick={() => {
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
                          className="h-auto flex-col gap-1 py-2 text-xs text-red-600 hover:text-red-700"
                          disabled={busy}
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
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        <strong className="font-medium text-foreground/80">Remind</strong> nudges the team you’re still waiting.
                        {" "}
                        <strong className="font-medium text-foreground/80">Update</strong> changes what you asked for.
                        {" "}
                        <strong className="font-medium text-foreground/80">Cancel</strong> stops the request (it’s removed from this list).
                      </p>
                      {nudged[r.id] && !isEditing && !isCancelling && (
                        <p className="text-xs text-amber-600">Team notified — they’ll pick this up shortly.</p>
                      )}
                      {isEditing && (
                        <div className="space-y-2 rounded-xl bg-muted/40 p-3">
                          <p className="text-xs text-muted-foreground">What should we bring or do instead?</p>
                          <Input
                            value={editText[r.id] ?? ""}
                            onChange={(e) => setEditText((p) => ({ ...p, [r.id]: e.target.value }))}
                            placeholder="e.g. White wine instead of red"
                            disabled={busy}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button size="sm" disabled={busy || !(editText[r.id] ?? "").trim()} onClick={() => saveUpdate(r)}>
                              {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                              Send update
                            </Button>
                            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditingId(null)}>
                              Back
                            </Button>
                          </div>
                        </div>
                      )}
                      {isCancelling && (
                        <div className="space-y-2 rounded-xl border border-rose-200/70 bg-rose-50/50 p-3">
                          <p className="text-xs font-medium text-foreground">Cancel this request?</p>
                          <p className="text-[11px] text-muted-foreground">
                            Optional — why are you cancelling? Helps the team if something was wrong.
                          </p>
                          <Input
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="e.g. Ordered by mistake, no longer needed…"
                            disabled={busy}
                            autoFocus
                            maxLength={280}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={busy}
                              onClick={() => cancelOpen(r)}
                            >
                              {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                              Confirm cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() => { setCancellingId(null); setCancelReason(""); }}
                            >
                              Keep request
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {wasReopened && (
                    <p className="mt-3 text-xs text-amber-600">Thanks — we've let the team know. They're back on it.</p>
                  )}

                  {confirmed && (
                    <div className="mt-3 space-y-3">
                      <div className="space-y-2 rounded-xl border border-dashed p-3">
                        <p className="text-xs font-medium">How was this request?</p>
                        <p className="text-[11px] text-muted-foreground">
                          Rate this specific ask — separate from how the stay feels overall.
                        </p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button key={n} type="button" onClick={() => rate(r, n)} aria-label={`${n} stars`}>
                              <Star className={`h-5 w-5 ${(rated[r.id] ?? 0) >= n ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                            </button>
                          ))}
                        </div>
                        {rated[r.id] ? (
                          sent[r.id] ? (
                            <p className="text-xs text-green-600">Thanks — your feedback on this request was sent.</p>
                          ) : (
                            <div className="space-y-1.5">
                              <Input
                                value={comments[r.id] ?? ""}
                                onChange={(e) => setComments((p) => ({ ...p, [r.id]: e.target.value }))}
                                placeholder={(rated[r.id] ?? 0) >= 4 ? "What went well? (optional)" : "What could we do better? (optional)"}
                                className="h-9 text-sm"
                              />
                              <Button size="sm" variant="outline" onClick={() => sendComment(r)}>
                                Send feedback
                              </Button>
                            </div>
                          )
                        ) : null}
                      </div>
                      <div className="space-y-2 rounded-xl border border-dashed p-3">
                        <p className="text-xs font-medium">Need the same again?</p>
                        <Input
                          value={editText[r.id] ?? r.summary}
                          onChange={(e) => setEditText((p) => ({ ...p, [r.id]: e.target.value }))}
                          placeholder="Same request, or tweak it"
                          disabled={busy}
                        />
                        <Button size="sm" variant="outline" disabled={busy || !(editText[r.id] ?? r.summary).trim()} onClick={() => askAgain(r)}>
                          {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1 h-3.5 w-3.5" />}
                          Ask again
                        </Button>
                      </div>
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

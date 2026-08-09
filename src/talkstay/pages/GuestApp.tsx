import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, ClipboardList, Star, X, Mic, MicOff, Globe, Check, MessageCircle, Smile, Meh, Frown, BellRing } from "lucide-react";
import { toast } from "sonner";
import { RealtimeChat } from "@/utils/RealtimeChat";
import { pushSupported } from "@/talkstay/lib/push";
import {
  fetchContext, sendMessage, fetchMyRequests, submitReview, saveGuestContact,
  confirmRequest, reopenRequest, fetchStaffMessages, enableDevicePush, disableDevicePush,
  getSessionId, getDeviceId, loadHistory, saveHistory, getNotifyChoice, setNotifyChoice,
  submitPulse, getPulseState, setPulseState,
  STATUS_LABEL, type ChatMsg, type GuestRequest, type GuestBranding,
} from "@/talkstay/lib/guest";

type Ctx = {
  hotelName: string; roomNumber: string; greeting: string;
  branding?: GuestBranding; assistantId?: string | null;
  pulseAsk?: boolean;
};

type Msg = ChatMsg | { role: "request"; content: string } | { role: "notice"; content: string } | { role: "staff"; content: string; label?: string };

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
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [pulseHidden, setPulseHidden] = useState(false);

  // Voice state (TalkWeb realtime stack)
  const [voiceState, setVoiceState] = useState<"idle" | "connecting" | "connected">("idle");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const chatRef = useRef<RealtimeChat | null>(null);
  const liveAssistantRef = useRef("");

  const sid = hotelSlug && roomId ? getSessionId(hotelSlug, roomId) : "";
  const scroller = useRef<HTMLDivElement>(null);

  const loadContext = (code?: string) => {
    if (!hotelSlug || !roomId || !token) { setInvalid(true); return; }
    fetchContext(hotelSlug, roomId, token, code, sid)
      .then((c) => {
        setNeedCode(false); setCodeError(null);
        setCtx(c);
        const prev = loadHistory(sid) as Msg[];
        setMsgs(prev.length ? prev : [{ role: "assistant", content: c.greeting }]);
      })
      .catch((e) => {
        const msg = String(e?.message ?? e);
        if (msg.includes("checked_out")) {
          // Stay has ended — clear this device's cached history for privacy.
          try {
            localStorage.removeItem(`talkstay:hist:${sid}`);
            localStorage.removeItem(`talkstay:notify:${sid}`);
            localStorage.removeItem(`talkstay:pulse:${sid}`);
          } catch { /* ignore */ }
          setCheckedOut(true);
        } else if (msg.includes("room_full")) {
          setRoomFull(true);
        } else if (msg.includes("need_code")) {
          setNeedCode(true); setCodeError(null);
        } else if (msg.includes("bad_code")) {
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
      if (staffSeen.current.size > fresh.length) toast.message(last.staff_label ?? "Message from the team", { description: last.content });
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
      if (surfaceReply) append({ role: "assistant", content: res.reply });
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

  // Voice path (TalkWeb RealtimeChat → realtime-token, WebRTC).
  const startVoice = async () => {
    if (!ctx?.assistantId) return;
    setVoiceState("connecting");
    try {
      const chat = new RealtimeChat(ctx.assistantId, {
        onUserSpeechStart: () => setIsListening(true),
        onUserSpeechStop: () => setIsListening(false),
        onUserTranscript: (text, isFinal) => {
          if (isFinal && text.trim()) {
            append({ role: "user", content: text.trim() });
            // Hotel layer in background; spoken reply comes from the voice session.
            routeThroughHotelBrain(text.trim(), false);
          }
        },
        onAssistantTranscript: (text, isDone) => {
          if (isDone && text.trim() && text.trim() !== liveAssistantRef.current) {
            liveAssistantRef.current = text.trim();
            append({ role: "assistant", content: text.trim() });
          }
        },
        onAssistantAudioStart: () => setIsSpeaking(true),
        onAssistantAudioEnd: () => setIsSpeaking(false),
        onError: () => { /* keep session; transcript continues */ },
        onInactivityTimeout: () => stopVoice(true),
      } as any);
      // TalkStay's own token minter: verifies the room QR token server-side and
      // returns a hotel-aware realtime session.
      chat.tokenFunction = "talkstay-voice-token";
      chat.tokenBody = { hotelSlug, roomId, token, deviceId: getDeviceId() };
      chatRef.current = chat;
      await chat.init();
      setVoiceState("connected");
    } catch {
      setVoiceState("idle");
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

  if (checkedOut) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-semibold">Your stay has ended</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Thank you for staying with us. This room assistant is no longer active for this stay.
          If you're checking in again, please scan the code in your room.
        </p>
      </div>
    );
  }
  if (roomFull) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-semibold">Too many devices on this room</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This room already has the maximum number of connected devices for this stay.
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
          key-card sleeve). Enter it once to connect this device.
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
  // fall back to the logo as a faint watermark. A near-opaque wash over the
  // image keeps it subtle so message bubbles stay fully legible on top.
  const bgPhoto = ctx.branding?.poster?.bg_image_url || logo || undefined;
  const voiceAvailable = !!ctx.assistantId;

  const orbLabel =
    voiceState === "connecting" ? "Setting up your microphone…"
    : isSpeaking ? "Speaking…"
    : voiceState === "connected" ? (isListening ? "Listening…" : "I'm listening — just talk")
    : "Tap to Talk";

  return (
    <div
      className="mx-auto flex h-[100dvh] max-w-md flex-col bg-background bg-cover bg-center"
      style={bgPhoto ? { backgroundImage: `linear-gradient(rgba(255,255,255,.93), rgba(255,255,255,.93)), url(${bgPhoto})` } : undefined}
    >
      {/* Header — TalkWeb widget style */}
      <header className="border-b px-4 pb-3 pt-4 text-center">
        <div className="mb-1 flex items-start justify-end">
          <Button variant="outline" size="sm" onClick={() => setRequestsOpen(true)}>
            <ClipboardList className="mr-1 h-4 w-4" /> My requests
          </Button>
        </div>
        {logo && <img src={logo} alt="" className="mx-auto mb-2 h-14 w-14 rounded-xl object-cover" />}
        <h1 className="text-lg font-bold leading-tight">{ctx.hotelName}</h1>
        <p className="text-sm text-muted-foreground">Room {ctx.roomNumber} · Voice Stay</p>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          <Globe className="h-3.5 w-3.5" /> Speak Any Language
        </div>
      </header>

      {/* Conversation — the hero orb stays pinned at the top while the transcript
          scrolls behind it (frosted so scrolled messages read softly underneath). */}
      <div ref={scroller} className="relative flex-1 overflow-y-auto">
      {/* Voice orb — copied from TalkWeb's SimplifiedVoiceInterface */}
      <div
        className="sticky top-0 z-20 flex flex-col items-center gap-3 border-b py-6 bg-background/80 backdrop-blur-md"
        style={{ backgroundImage: `linear-gradient(180deg, ${brand}14, transparent)` }}
      >
        <div className="relative">
          {isSpeaking && (
            <div className="absolute inset-0 animate-pulse rounded-full">
              <div className="-m-2 h-28 w-28 rounded-full" style={{ background: `linear-gradient(135deg, ${brand}4d, ${brand}1a)` }} />
            </div>
          )}
          <button
            onClick={toggleVoice}
            disabled={!voiceAvailable || voiceState === "connecting"}
            className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full shadow-xl transition-all duration-300 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: isListening && !isSpeaking
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : `linear-gradient(135deg, ${brand}, ${brand}cc)`,
              boxShadow: isSpeaking ? `0 0 30px ${brand}80, 0 0 60px ${brand}4d` : undefined,
            }}
            aria-label={voiceState === "idle" ? "Start voice" : "Stop voice"}
          >
            {voiceState === "connecting" ? (
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            ) : (
              <div className="relative">
                <Mic className={`h-9 w-9 text-white ${isSpeaking ? "animate-pulse" : ""}`} />
                {isListening && !isSpeaking && (
                  <div className="absolute inset-0 animate-ping opacity-75">
                    <div className="h-full w-full rounded-full bg-white/20" />
                  </div>
                )}
              </div>
            )}
            {isSpeaking && (
              <>
                <div className="absolute inset-0 animate-ping rounded-full bg-white/10" style={{ animationDuration: "1.5s" }} />
                <div className="absolute inset-0 animate-ping rounded-full bg-white/5" style={{ animationDuration: "2s", animationDelay: "0.3s" }} />
              </>
            )}
          </button>
        </div>
        <div className="text-center">
          <p className="text-base font-semibold">{orbLabel}</p>
          {voiceState === "idle" && (
            <p className="text-xs text-muted-foreground">
              {voiceAvailable ? "Start a voice conversation" : "Voice unavailable — type below"}
            </p>
          )}
          {voiceState === "connected" && (
            <button onClick={() => stopVoice()} className="mt-0.5 text-xs text-muted-foreground underline">End voice</button>
          )}
        </div>
      </div>

      {/* Transcript scrolls underneath the pinned orb */}
      <div className="space-y-3 px-4 pb-4 pt-4">
        {msgs.map((m, i) =>
          m.role === "request" ? (
            <div key={i} className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-green-600" /> Sent to the team — {m.content}
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
              </div>
            </div>
          )
        )}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground">…</div>
          </div>
        )}
        {/* Only once the guest has actually said something — asking a stranger
            how their stay is going before they've engaged reads as a survey. */}
        {ctx?.pulseAsk && !pulseHidden && !getPulseState(sid) && msgs.some((m) => m.role === "user") && (
          <PulseCard
            hotelSlug={hotelSlug} roomId={roomId} token={token} sid={sid} brand={brand}
            onFinished={() => setPulseHidden(true)}
          />
        )}
      </div>
      </div>

      {/* Typed input — TalkWeb style */}
      <form
        onSubmit={(e) => { e.preventDefault(); sendTyped(input); }}
        className="flex items-center gap-2 border-t px-3 py-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Or type your message…"
          disabled={busy}
        />
        <Button type="submit" size="icon" disabled={busy || !input.trim()} style={{ backgroundColor: brand }}>
          <Send className="h-4 w-4" />
        </Button>
      </form>

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
    </div>
  );
}

/** "How has your stay been?" — asked DURING the stay, so a fixable problem gets
 *  fixed instead of surfacing two weeks later as a public review. */
function PulseCard({ hotelSlug, roomId, token, sid, brand, onFinished }: {
  hotelSlug: string; roomId: string; token: string; sid: string;
  brand: string; onFinished: (state: "done" | "dismissed") => void;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ reply: string; notifiedManager: boolean } | null>(null);

  const send = async (withRating: number) => {
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

  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: `${brand}55` }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">How has your stay been so far?</p>
        <button onClick={() => { setPulseState(sid, "dismissed"); onFinished("dismissed"); }}
          aria-label="Dismiss" className="-mr-1 -mt-1 rounded-full p-1 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Tell us now and we can still put it right before you leave.
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {FACES.map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => setRating(value)}
            disabled={busy}
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
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={rating >= 4 ? "What stood out? (optional)" : "What would you like us to fix? (optional)"}
            disabled={busy}
            autoFocus
          />
          <Button onClick={() => send(rating)} disabled={busy} className="w-full" style={{ backgroundColor: brand }}>
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
        await enableDevicePush({ hotelSlug, roomId, token, sessionId: sid });
        setPushOn(true);
        toast.success("You'll be notified on this device.");
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
      <div className="w-full max-w-md rounded-t-2xl bg-card p-5" onClick={(e) => e.stopPropagation()}>
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

// Coloured status dot for the "My requests" list — greys while pending,
// ambers while in flight, greens when done.
const STATUS_DOT: Record<string, string> = {
  new: "bg-slate-400",
  accepted: "bg-amber-400",
  in_progress: "bg-amber-400",
  on_the_way: "bg-violet-500",
  completed: "bg-green-500",
  guest_confirmed: "bg-green-500",
  reopened: "bg-orange-500",
  escalated: "bg-red-500",
  cancelled: "bg-slate-300",
};

function RequestsSheet({ hotelSlug, roomId, token, sid, onClose }: {
  hotelSlug: string; roomId: string; token: string; sid: string; onClose: () => void;
}) {
  const [reqs, setReqs] = useState<GuestRequest[] | null>(null);
  const [rated, setRated] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<Record<string, boolean>>({});
  // Optimistic guest close-out: id → "confirmed" | "reopened" (before refetch).
  const [resolved, setResolved] = useState<Record<string, "confirmed" | "reopened">>({});

  useEffect(() => {
    fetchMyRequests(hotelSlug, roomId, token, sid).then(setReqs).catch(() => setReqs([]));
  }, [hotelSlug, roomId, token, sid]);

  const confirmDone = async (r: GuestRequest) => {
    setResolved((p) => ({ ...p, [r.id]: "confirmed" }));
    try {
      await confirmRequest({ hotelSlug, roomId, token, sessionId: sid, requestId: r.id });
    } catch {
      setResolved((p) => { const n = { ...p }; delete n[r.id]; return n; });
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">My requests</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>
        {reqs === null ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : reqs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests yet.</p>
        ) : (
          <div className="space-y-3">
            {reqs.map((r) => {
              // Fold the guest's optimistic close-out over the fetched status.
              const effStatus =
                resolved[r.id] === "confirmed" ? "guest_confirmed"
                : resolved[r.id] === "reopened" ? "reopened"
                : r.status;
              const awaitingConfirm = effStatus === "completed";
              const confirmed = effStatus === "guest_confirmed";
              const wasReopened = effStatus === "reopened";
              return (
                <div key={r.id} className="rounded-2xl border p-4 shadow-sm">
                  <div className="text-[15px] font-medium leading-snug">{r.summary}</div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[effStatus] ?? "bg-slate-400"}`} />
                    {STATUS_LABEL[effStatus] ?? effStatus}
                  </div>

                  {/* Staff marked it done — the guest gets the final say. */}
                  {awaitingConfirm && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm">Did you receive everything?</p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => confirmDone(r)}>Yes, all good</Button>
                        <Button size="sm" variant="outline" onClick={() => reopen(r)}>Not yet</Button>
                      </div>
                    </div>
                  )}

                  {wasReopened && (
                    <p className="mt-3 text-xs text-amber-600">Thanks — we've let the team know. They're back on it.</p>
                  )}

                  {confirmed && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-1">
                        <span className="mr-1 text-xs text-muted-foreground">Rate:</span>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} onClick={() => rate(r, n)} aria-label={`${n} stars`}>
                            <Star className={`h-5 w-5 ${(rated[r.id] ?? 0) >= n ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                          </button>
                        ))}
                      </div>
                      {rated[r.id] ? (
                        sent[r.id] ? (
                          <p className="text-xs text-green-600">Thanks — your feedback has been sent.</p>
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

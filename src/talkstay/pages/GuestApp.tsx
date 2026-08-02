import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, ClipboardList, Star, X, Mic, Globe, Check } from "lucide-react";
import { RealtimeChat } from "@/utils/RealtimeChat";
import {
  fetchContext, sendMessage, fetchMyRequests, submitReview, saveGuestContact,
  getSessionId, loadHistory, saveHistory, getNotifyChoice, setNotifyChoice,
  STATUS_LABEL, type ChatMsg, type GuestRequest, type GuestBranding,
} from "@/talkstay/lib/guest";

type Ctx = {
  hotelName: string; roomNumber: string; greeting: string;
  branding?: GuestBranding; assistantId?: string | null;
};

type Msg = ChatMsg | { role: "request"; content: string };

export default function GuestApp() {
  const { hotelSlug = "", roomId = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [checkedOut, setCheckedOut] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);

  // Voice state (TalkWeb realtime stack)
  const [voiceState, setVoiceState] = useState<"idle" | "connecting" | "connected">("idle");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const chatRef = useRef<RealtimeChat | null>(null);
  const liveAssistantRef = useRef("");

  const sid = hotelSlug && roomId ? getSessionId(hotelSlug, roomId) : "";
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hotelSlug || !roomId || !token) { setInvalid(true); return; }
    fetchContext(hotelSlug, roomId, token)
      .then((c) => {
        setCtx(c);
        const prev = loadHistory(sid) as Msg[];
        setMsgs(prev.length ? prev : [{ role: "assistant", content: c.greeting }]);
      })
      .catch((e) => {
        if (String(e?.message ?? e).includes("checked_out")) {
          // Stay has ended — clear this device's cached history for privacy.
          try {
            localStorage.removeItem(`talkstay:hist:${sid}`);
            localStorage.removeItem(`talkstay:notify:${sid}`);
          } catch { /* ignore */ }
          setCheckedOut(true);
        } else setInvalid(true);
      });
    return () => { chatRef.current?.disconnect(); };
    // eslint-disable-next-line
  }, [hotelSlug, roomId, token]);

  useEffect(() => {
    if (sid && msgs.length) saveHistory(sid, msgs.filter((m) => m.role !== "request") as ChatMsg[]);
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, sid]);

  const append = (m: Msg) => setMsgs((prev) => [...prev, m]);

  // Hotel layer: forward a final utterance to the TalkStay routing brain. If it
  // creates request(s), show confirmation chips + the notification choice sheet.
  const routeThroughHotelBrain = async (text: string, surfaceReply: boolean) => {
    try {
      const history = msgs.filter((m) => m.role !== "request") as ChatMsg[];
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
        onInactivityTimeout: () => stopVoice(),
      } as any);
      // TalkStay's own token minter: verifies the room QR token server-side and
      // returns a hotel-aware realtime session.
      chat.tokenFunction = "talkstay-voice-token";
      chat.tokenBody = { hotelSlug, roomId, token };
      chatRef.current = chat;
      await chat.init();
      setVoiceState("connected");
    } catch {
      setVoiceState("idle");
      append({ role: "assistant", content: "Voice couldn't start — you can type your message below." });
    }
  };

  const stopVoice = () => {
    chatRef.current?.disconnect();
    chatRef.current = null;
    setVoiceState("idle");
    setIsListening(false);
    setIsSpeaking(false);
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
  const voiceAvailable = !!ctx.assistantId;

  const orbLabel =
    voiceState === "connecting" ? "Setting up your microphone…"
    : isSpeaking ? "Speaking…"
    : voiceState === "connected" ? (isListening ? "Listening…" : "I'm listening — just talk")
    : "Tap to Talk";

  return (
    <div className="mx-auto flex h-[100dvh] max-w-md flex-col bg-background">
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

      {/* Voice orb — copied from TalkWeb's SimplifiedVoiceInterface */}
      <div
        className="flex flex-col items-center gap-3 py-6"
        style={{ background: `linear-gradient(180deg, ${brand}0d, transparent)` }}
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
            <button onClick={stopVoice} className="mt-0.5 text-xs text-muted-foreground underline">End voice</button>
          )}
        </div>
      </div>

      {/* Transcript */}
      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        {msgs.map((m, i) =>
          m.role === "request" ? (
            <div key={i} className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-green-600" /> Sent to the team — {m.content}
              </span>
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
          onChoose={(c, contact) => {
            setNotifyChoice(sid, c);
            setNotifyOpen(false);
            if (contact) {
              saveGuestContact({ hotelSlug, roomId, token, sessionId: sid, channel: c, contact })
                .catch(() => { /* non-blocking */ });
            }
          }}
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

function NotifySheet({ onChoose, onClose }: {
  onChoose: (c: string, contact?: string) => void; onClose: () => void;
}) {
  const [mode, setMode] = useState<null | "email" | "whatsapp">(null);
  const [contact, setContact] = useState("");
  const valid = mode === "email"
    ? /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.trim())
    : contact.trim().replace(/\D/g, "").length >= 7;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <p className="mb-1 font-medium">Your request has been sent.</p>
        <p className="mb-4 text-sm text-muted-foreground">Where would you like updates?</p>

        {mode ? (
          <div className="space-y-2">
            <Input
              autoFocus
              type={mode === "email" ? "email" : "tel"}
              inputMode={mode === "email" ? "email" : "tel"}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={mode === "email" ? "you@example.com" : "+44 7…"}
            />
            <div className="flex gap-2">
              <Button className="flex-1" disabled={!valid} onClick={() => onChoose(mode, contact.trim())}>
                Send me updates
              </Button>
              <Button variant="ghost" onClick={() => { setMode(null); setContact(""); }}>Back</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Only used to update you about this stay.
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            <Button variant="outline" className="justify-start" onClick={() => setMode("email")}>Email</Button>
            <Button variant="outline" className="justify-start" onClick={() => setMode("whatsapp")}>WhatsApp</Button>
            <Button variant="outline" className="justify-start" onClick={() => onChoose("device")}>Notify this device</Button>
            <Button variant="outline" className="justify-start" onClick={() => onChoose("none")}>No updates</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function RequestsSheet({ hotelSlug, roomId, token, sid, onClose }: {
  hotelSlug: string; roomId: string; token: string; sid: string; onClose: () => void;
}) {
  const [reqs, setReqs] = useState<GuestRequest[] | null>(null);
  const [rated, setRated] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchMyRequests(hotelSlug, roomId, token, sid).then(setReqs).catch(() => setReqs([]));
  }, [hotelSlug, roomId, token, sid]);

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
      <div className="h-full w-full max-w-md overflow-y-auto bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">My requests</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        {reqs === null ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : reqs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests yet.</p>
        ) : (
          <div className="space-y-3">
            {reqs.map((r) => {
              const done = r.status === "completed" || r.status === "guest_confirmed";
              return (
                <div key={r.id} className="rounded-xl border p-4">
                  <div className="text-sm font-medium">{r.summary}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{STATUS_LABEL[r.status] ?? r.status}</div>
                  {done && (
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

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft, Check, ClipboardList, Loader2, Mic, MicOff, Send, X,
} from "lucide-react";
import { RealtimeChat } from "@/utils/RealtimeChat";
import { conversationMemory } from "@/utils/ConversationMemory";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";
import { statusBadge, statusLabel } from "@/talkstay/lib/statusStyles";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";
import { DemoProvider, useDemo } from "@/talkstay/demo/DemoContext";
import { DEPARTMENTS } from "@/talkstay/lib/hotels";
import {
  fetchDemoContext, sendDemoMessage, type ChatMsg, type GuestRequest,
} from "@/talkstay/lib/guest";

const BRAND = "#4c2bb8";
const ROOM = "306";
const DEMO_SID_KEY = "talkstay:demo-guest-sid";

type Msg =
  | { role: "assistant" | "user"; content: string }
  | { role: "request"; content: string; reqId: string }
  | { role: "notice"; content: string };

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
  const [voiceState, setVoiceState] = useState<"idle" | "connecting" | "connected">("idle");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const chatRef = useRef<RealtimeChat | null>(null);
  const liveAssistantRef = useRef("");
  const lastRoutedVoiceRef = useRef<{ text: string; at: number }>({ text: "", at: 0 });
  const msgsRef = useRef<Msg[]>([]);
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

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy, isSpeaking]);

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
        backgroundImage:
          "linear-gradient(hsla(38,26%,97%,.82), hsla(210,20%,94%,.88)), radial-gradient(ellipse at top, rgba(76,43,184,0.08), transparent 55%)",
      }}
    >
      <header className="flex shrink-0 items-center gap-2 border-b bg-background/80 px-3 py-2 backdrop-blur">
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
          className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"
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

      <div className="shrink-0 border-b bg-amber-50/90 px-3 py-1.5 text-center text-[11px] text-amber-950">
        Same voice as a real room QR — requests also show in{" "}
        <Link to="/demo/operations" className="font-semibold underline underline-offset-2">
          Operations
        </Link>
        .
      </div>

      <div className="shrink-0 border-b bg-background/90 px-3 py-2.5 backdrop-blur">
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
            return (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    m.role === "user" ? "text-white" : "bg-muted"
                  }`}
                  style={m.role === "user" ? { backgroundColor: BRAND } : undefined}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="shrink-0 space-y-2 border-t bg-background/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
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
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">My requests</h2>
              <Button variant="ghost" size="icon" onClick={() => setSheetOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Status updates when staff advance the ticket in the Operations demo (same browser).
            </p>
            {reqs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No requests yet — ask for towels or report a problem.
              </p>
            ) : (
              <div className="space-y-3">
                {reqs.map((r) => (
                  <div key={r.id} className="rounded-2xl border p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {deptLabel(r.department_key)}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge(r.status)}`}>
                        {statusLabel(r.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{r.summary}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Room {ROOM}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Marketing guest demo — real TalkStay voice + hotel brain, sandbox ops sync.
 */
export default function DemoGuestApp() {
  return (
    <DemoProvider>
      <DemoGuestInner />
    </DemoProvider>
  );
}

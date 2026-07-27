import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, ClipboardList, Star, X, Mic, MicOff } from "lucide-react";
import {
  fetchContext, sendMessage, fetchMyRequests, submitReview,
  getSessionId, loadHistory, saveHistory, getNotifyChoice, setNotifyChoice,
  STATUS_LABEL, type ChatMsg, type GuestRequest, type GuestBranding,
} from "@/talkstay/lib/guest";

type Ctx = { hotelName: string; roomNumber: string; greeting: string; branding?: GuestBranding };

export default function GuestApp() {
  const { hotelSlug = "", roomId = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const sid = hotelSlug && roomId ? getSessionId(hotelSlug, roomId) : "";
  const scroller = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const SpeechRecognition =
    typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
  const voiceSupported = !!SpeechRecognition;

  const speak = (text: string) => {
    try {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1; u.pitch = 1;
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  };

  const startListening = () => {
    if (!voiceSupported || busy) return;
    try {
      const rec = new SpeechRecognition();
      rec.lang = navigator.language || "en-GB";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e: any) => {
        const transcript = e.results?.[0]?.[0]?.transcript?.trim();
        if (transcript) send(transcript, true);
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recognitionRef.current = rec;
      setListening(true);
      rec.start();
    } catch { setListening(false); }
  };

  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  };

  useEffect(() => {
    if (!hotelSlug || !roomId || !token) { setInvalid(true); return; }
    fetchContext(hotelSlug, roomId, token)
      .then((c) => {
        setCtx(c);
        const prev = loadHistory(sid);
        setMsgs(prev.length ? prev : [{ role: "assistant", content: c.greeting }]);
      })
      .catch(() => setInvalid(true));
    // eslint-disable-next-line
  }, [hotelSlug, roomId, token]);

  useEffect(() => {
    if (sid && msgs.length) saveHistory(sid, msgs);
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, sid]);

  const send = async (raw: string, viaVoice = false) => {
    const text = raw.trim();
    if (!text || busy) return;
    setInput("");
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next);
    setBusy(true);
    try {
      const res = await sendMessage({ hotelSlug, roomId, token, sessionId: sid, message: text, history: msgs });
      setMsgs((m) => [...m, { role: "assistant", content: res.reply }]);
      if (viaVoice) speak(res.reply);
      if (res.requests?.length && !getNotifyChoice(sid)) setNotifyOpen(true);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Sorry — something went wrong. Please try again." }]);
    } finally {
      setBusy(false);
    }
  };

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

  const brand = ctx.branding?.primary_color || undefined;
  const logo = ctx.branding?.logo_url || undefined;

  return (
    <div className="mx-auto flex h-[100dvh] max-w-md flex-col bg-background">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2.5">
          {logo && <img src={logo} alt="" className="h-9 w-9 rounded-lg object-cover" />}
          <div>
            <div className="font-semibold leading-tight">{ctx.hotelName}</div>
            <div className="text-xs text-muted-foreground">Room {ctx.roomNumber}</div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setRequestsOpen(true)}>
          <ClipboardList className="mr-1 h-4 w-4" /> My requests
        </Button>
      </header>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "text-white" : "bg-muted"}`}
              style={m.role === "user" ? { backgroundColor: brand || "hsl(var(--primary))" } : undefined}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground">…</div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input, false); }}
        className="flex items-center gap-2 border-t px-3 py-3"
      >
        {voiceSupported && (
          <Button
            type="button" size="icon"
            variant={listening ? "default" : "outline"}
            onClick={() => (listening ? stopListening() : startListening())}
            disabled={busy}
            aria-label={listening ? "Stop listening" : "Speak"}
          >
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={listening ? "Listening…" : "Speak or type…"}
          disabled={busy}
        />
        <Button type="submit" size="icon" disabled={busy || !input.trim()} style={brand ? { backgroundColor: brand } : undefined}>
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {notifyOpen && (
        <NotifySheet
          onChoose={(c) => { setNotifyChoice(sid, c); setNotifyOpen(false); }}
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

function NotifySheet({ onChoose, onClose }: { onChoose: (c: string) => void; onClose: () => void }) {
  const opts = [
    { key: "whatsapp", label: "WhatsApp" },
    { key: "device", label: "Notify this device" },
    { key: "none", label: "No updates" },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <p className="mb-1 font-medium">Your request has been sent.</p>
        <p className="mb-4 text-sm text-muted-foreground">Where would you like updates?</p>
        <div className="grid gap-2">
          {opts.map((o) => (
            <Button key={o.key} variant="outline" className="justify-start" onClick={() => onChoose(o.key)}>
              {o.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function RequestsSheet({ hotelSlug, roomId, token, sid, onClose }: {
  hotelSlug: string; roomId: string; token: string; sid: string; onClose: () => void;
}) {
  const [reqs, setReqs] = useState<GuestRequest[] | null>(null);
  const [rated, setRated] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchMyRequests(hotelSlug, roomId, token, sid).then(setReqs).catch(() => setReqs([]));
  }, [hotelSlug, roomId, token, sid]);

  const rate = async (r: GuestRequest, n: number) => {
    setRated((p) => ({ ...p, [r.id]: n }));
    try { await submitReview({ hotelSlug, roomId, token, sessionId: sid, requestId: r.id, rating: n }); } catch { /* ignore */ }
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
                    <div className="mt-3 flex items-center gap-1">
                      <span className="mr-1 text-xs text-muted-foreground">Rate:</span>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => rate(r, n)} aria-label={`${n} stars`}>
                          <Star className={`h-5 w-5 ${(rated[r.id] ?? 0) >= n ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                        </button>
                      ))}
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

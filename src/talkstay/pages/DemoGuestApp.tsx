import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, ClipboardList, Loader2, Mic, Send, X,
} from "lucide-react";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";
import { statusBadge, statusLabel } from "@/talkstay/lib/statusStyles";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";

const BRAND = "#4c2bb8";
const HOTEL = "The Grand Hotel II";
const ROOM = "306";

type DemoReq = {
  id: string;
  summary: string;
  department: string;
  status: string;
  created_at: string;
};

type Msg =
  | { role: "assistant" | "user"; content: string }
  | { role: "request"; content: string; reqId: string };

const SUGGESTIONS = [
  "Can I get two extra towels?",
  "What time is breakfast?",
  "Please clean my room",
  "How much is a club sandwich?",
  "The AC isn't working",
];

function replyFor(text: string): { say: string; request?: Omit<DemoReq, "id" | "created_at"> } {
  const t = text.toLowerCase();
  if (/towel/.test(t)) {
    return {
      say: "Of course — I've sent Housekeeping two extra towels for Room 306. You'll see it under Requests.",
      request: { summary: "Deliver 2 extra towels", department: "Housekeeping", status: "new" },
    };
  }
  if (/breakfast|brunch/.test(t)) {
    return {
      say: "Breakfast is served daily from 7:00–10:30 in The Garden Room on the ground floor. Continental and hot options are included with your stay.",
    };
  }
  if (/clean|housekeep|maid|turndown/.test(t)) {
    return {
      say: "Done — I've asked Housekeeping to clean Room 306. They'll update the status when they accept.",
      request: { summary: "Room cleaning requested", department: "Housekeeping", status: "new" },
    };
  }
  if (/price|cost|menu|sandwich|drink|cocktail|wine|food|bar|dinner|lunch/.test(t)) {
    return {
      say: "From our in-room dining card: club sandwich £14, Caesar salad £11, house lager £6, espresso martini £12. I can place an order for you — just say what you'd like.",
    };
  }
  if (/ac|air.?con|broken|leak|problem|wifi|noise|complaint|not working|cold|hot/.test(t)) {
    return {
      say: "Sorry about that — I've raised a Maintenance ticket for Room 306 and flagged it for the team. You can track it under Requests.",
      request: { summary: "Report: AC / room issue", department: "Maintenance", status: "new" },
    };
  }
  if (/order|burger|fries|coffee|tea|water|champagne/.test(t)) {
    return {
      say: "Got it — I've sent that to the Kitchen. They'll confirm when it's on the way.",
      request: { summary: text.slice(0, 80), department: "Kitchen", status: "new" },
    };
  }
  return {
    say: "Happy to help. Try asking for towels, breakfast hours, room cleaning, menu prices, or report a problem — just like a real stay.",
  };
}

function advanceStatus(s: string): string {
  if (s === "new") return "accepted";
  if (s === "accepted") return "in_progress";
  if (s === "in_progress") return "completed";
  if (s === "completed") return "guest_confirmed";
  return s;
}

/**
 * Marketing guest demo — feels like the post-QR guest screen, fully offline.
 */
export default function DemoGuestApp() {
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content: `Hi! You're in Room ${ROOM} at ${HOTEL}. How can I help — anything you need, or a question about the hotel?`,
    },
  ]);
  const [reqs, setReqs] = useState<DemoReq[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const openCount = useMemo(
    () => reqs.filter((r) => !["completed", "guest_confirmed", "cancelled"].includes(r.status)).length,
    [reqs],
  );

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", content: text }]);
    await new Promise((r) => setTimeout(r, 550));
    const { say, request } = replyFor(text);
    let reqId: string | null = null;
    if (request) {
      reqId = `demo-g-${Date.now()}`;
      const row: DemoReq = {
        id: reqId,
        ...request,
        created_at: new Date().toISOString(),
      };
      setReqs((prev) => [row, ...prev]);
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: say },
        { role: "request", content: `${request.department} · ${request.summary}`, reqId },
      ]);
    } else {
      setMsgs((m) => [...m, { role: "assistant", content: say }]);
    }
    setBusy(false);
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  return (
    <div
      data-talkstay
      className="ts-atmosphere relative mx-auto flex h-[100dvh] max-w-md flex-col bg-cover bg-center"
      style={{
        backgroundImage:
          "linear-gradient(hsla(38,26%,97%,.82), hsla(210,20%,94%,.88)), radial-gradient(ellipse at top, rgba(76,43,184,0.08), transparent 55%)",
      }}
    >
      <div className="flex shrink-0 items-center gap-2 border-b bg-background/85 px-3 py-2 backdrop-blur">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Back to demos">
          <Link to="/demo"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <TalkStayLogo size={22} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight">{HOTEL}</p>
          <p className="truncate text-xs text-muted-foreground">
            {formatRoomLabel(ROOM)} · Guest demo
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 gap-1.5"
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
      </div>

      <div className="shrink-0 border-b bg-background/90 px-3 py-3 text-center backdrop-blur">
        <button
          type="button"
          disabled={busy}
          onClick={() => void send("Can I get two extra towels?")}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-[1.03] active:scale-[0.98]"
          style={{ backgroundColor: BRAND }}
          aria-label="Try a sample request"
        >
          <Mic className="h-7 w-7" />
        </button>
        <p className="mt-2 text-sm font-semibold">Tap to Talk</p>
        <p className="text-xs text-muted-foreground">
          Demo mode — tap the mic for towels, or type / try a suggestion below.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {msgs.map((m, i) => {
          if (m.role === "request") {
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSheetOpen(true)}
                className="ml-1 block max-w-[90%] rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-left text-xs text-violet-900"
              >
                Request logged · {m.content}
              </button>
            );
          }
          const mine = m.role === "user";
          return (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                mine ? "ml-auto text-white" : "border bg-white/90"
              }`}
              style={mine ? { backgroundColor: BRAND } : undefined}
            >
              {m.content}
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

      <div className="shrink-0 space-y-2 border-t bg-background/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy}
              onClick={() => void send(s)}
              className="shrink-0 rounded-full border bg-white px-2.5 py-1 text-[11px] text-muted-foreground hover:border-violet-300 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Or type a message…"
            disabled={busy}
            className="h-10"
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 shrink-0"
            disabled={busy || !input.trim()}
            style={{ backgroundColor: BRAND }}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-center text-[10px] text-muted-foreground">
          <Link to="/demo/operations" className="underline underline-offset-2 hover:text-foreground">
            See the staff Operations demo
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
              In a real stay these update live as Housekeeping or Kitchen works them.
              Tap a card to simulate the next status.
            </p>
            {reqs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No requests yet — ask for towels or report a problem in chat.
              </p>
            ) : (
              <div className="space-y-3">
                {reqs.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="w-full rounded-2xl border p-3.5 text-left transition hover:border-violet-300"
                    onClick={() => {
                      setReqs((prev) =>
                        prev.map((x) =>
                          x.id === r.id ? { ...x, status: advanceStatus(x.status) } : x,
                        ),
                      );
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">{r.department}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge(r.status)}`}>
                        {statusLabel(r.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{r.summary}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Room {ROOM} · tap to advance status
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

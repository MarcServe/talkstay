import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, BarChart3, BookOpen, Building2, CheckCircle2, Inbox, LogOut,
  Menu, Palette, PlayCircle, QrCode, RotateCcw, Users, X,
} from "lucide-react";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";
import OperationsPanel from "@/talkstay/components/OperationsPanel";
import InsightsPanel from "@/talkstay/components/InsightsPanel";
import {
  DemoProvider, clearDemoEntered, hasEnteredDemo, markDemoEntered, useDemo,
} from "@/talkstay/demo/DemoContext";

const NAV = [
  { key: "operations", label: "Operations", icon: Inbox, live: true, desc: "Work the live request queue — accept, start, complete, reply." },
  { key: "insights", label: "Insights", icon: BarChart3, live: true, desc: "See volumes, departments, ratings and guest pulse." },
  { key: "rooms", label: "Rooms & QR", icon: QrCode, live: false, desc: "Add rooms and print guest QR codes." },
  { key: "branding", label: "Branding", icon: Palette, live: false, desc: "Logo, colour and in-room poster." },
  { key: "departments", label: "Departments", icon: Building2, live: false, desc: "Teams, routing and notifications." },
  { key: "knowledge", label: "Knowledge", icon: BookOpen, live: false, desc: "What the assistant knows about your property." },
  { key: "staff", label: "Staff", icon: Users, live: false, desc: "Invite your team and set roles." },
] as const;

type NavKey = (typeof NAV)[number]["key"];

const STEPS = [
  {
    n: "1",
    title: "Open a new request",
    body: "In Operations, click a New card (try room 412 towels). Read the guest ask.",
  },
  {
    n: "2",
    title: "Advance the lifecycle",
    body: "Use Accept → Start → On the way → Complete. Watch the status colours change.",
  },
  {
    n: "3",
    title: "Reply to the guest",
    body: "Open a request and send a staff reply — in the real product this reaches their phone.",
  },
  {
    n: "4",
    title: "Check Insights",
    body: "Switch to Insights to see how request volume, teams and guest pulse look for managers.",
  },
] as const;

function DemoGate({ onEnter }: { onEnter: () => void }) {
  return (
    <div data-talkstay className="ts-atmosphere min-h-screen text-foreground">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <TalkStayLogo size={28} />
          <span className="text-lg font-semibold tracking-tight">TalkStay</span>
        </Link>
        <Button asChild variant="ghost" size="sm">
          <Link to="/app">Property sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-16">
        <div className="rounded-3xl border bg-gradient-to-b from-violet-50 to-white p-6 shadow-sm sm:p-10">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
            <PlayCircle className="h-3.5 w-3.5" />
            Interactive demo · no signup
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Try the operations dashboard in 2 minutes.
          </h1>
          <p className="mt-3 text-muted-foreground">
            This is a sandbox of The Grand Hotel II. Changes stay on your device only —
            nothing is saved to a real property, and your real sign-in path is untouched.
          </p>

          <ol className="mt-8 space-y-4">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
                  {s.n}
                </span>
                <div>
                  <p className="font-semibold tracking-tight">{s.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="bg-violet-600 hover:bg-violet-700" onClick={onEnter}>
              Enter demo <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/app">Create a real account</Link>
            </Button>
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            Campaign tip: share <span className="font-medium text-foreground">/demo</span> —
            no password, works on phone or desktop.
          </p>
        </div>
      </main>
    </div>
  );
}

function DemoTeaser({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 px-6 py-12 text-center">
      <CheckCircle2 className="mx-auto h-8 w-8 text-violet-500" />
      <h3 className="mt-3 text-lg font-semibold tracking-tight">{label} is available on your real property</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        The demo focuses on Operations and Insights — the workflows your team uses every day.
        Create a free account to configure rooms, branding, departments, knowledge and staff.
      </p>
      <Button asChild className="mt-5 bg-violet-600 hover:bg-violet-700">
        <Link to="/app">Get started for real <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
      </Button>
    </div>
  );
}

function DemoDashboard() {
  const demo = useDemo()!;
  const [active, setActive] = useState<NavKey>("operations");
  const [navOpen, setNavOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);

  const activeNav = NAV.find((n) => n.key === active)!;
  const go = (k: NavKey) => { setActive(k); setNavOpen(false); };

  const exit = () => {
    clearDemoEntered();
    window.location.href = "/";
  };

  const SidebarBody = (
    <div className="flex h-full flex-col bg-[#15111f] text-white/70">
      <div className="flex items-center justify-between px-5 py-4">
        <Link to="/" className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-80">
          <TalkStayLogo size={30} />
          <div className="min-w-0 font-semibold tracking-tight text-white">TalkStay</div>
        </Link>
        <button className="md:hidden" onClick={() => setNavOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5 text-white/60" />
        </button>
      </div>

      <div className="mx-3 mb-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5">
        <div className="text-xs font-semibold uppercase tracking-wide text-amber-200">Demo mode</div>
        <div className="mt-0.5 truncate text-sm font-medium text-white">{demo.hotel.name}</div>
        <div className="text-xs text-white/50">Owner · changes not saved</div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
        {NAV.map(({ key, label, icon: Icon, live }) => (
          <button
            key={key}
            onClick={() => go(key)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active === key ? "bg-violet-600 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">{label}</span>
            {!live && <span className="text-[10px] uppercase tracking-wide text-white/35">Locked</span>}
          </button>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        <button
          onClick={() => demo.reset()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white"
        >
          <RotateCcw className="h-4 w-4" /> Reset demo data
        </button>
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600/30 text-xs font-semibold text-violet-200">
            A
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">Alex Rivera</div>
            <div className="truncate text-xs text-white/40">demo@talkstay.io</div>
          </div>
          <button onClick={exit} aria-label="Exit demo" title="Exit demo">
            <LogOut className="h-4 w-4 text-white/40 hover:text-white" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div data-talkstay className="ts-atmosphere flex h-[100dvh] overflow-hidden">
      <aside className="hidden h-full w-64 shrink-0 md:block">{SidebarBody}</aside>
      {navOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setNavOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 md:hidden">{SidebarBody}</aside>
        </>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 flex min-w-0 shrink-0 items-center gap-3 border-b px-4 py-3 md:hidden">
          <button onClick={() => setNavOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <span className="min-w-0 truncate text-sm font-medium">{demo.hotel.name}</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
            Demo
          </span>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8">
          <div className="mx-auto min-w-0 max-w-5xl">
            {guideOpen && (
              <div className="mb-5 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-violet-900">How to explore</p>
                    <p className="mt-1 text-sm text-violet-800/80">
                      Work a New request in Operations (Accept → Complete), send a reply, then open Insights.
                      Reset anytime from the sidebar.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg p-1 text-violet-500 hover:bg-violet-100"
                    onClick={() => setGuideOpen(false)}
                    aria-label="Dismiss guide"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="mb-6 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">{activeNav.label}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{activeNav.desc}</p>
            </div>

            {active === "operations" && <OperationsPanel hotel={demo.hotel} />}
            {active === "insights" && <InsightsPanel hotel={demo.hotel} />}
            {active !== "operations" && active !== "insights" && (
              <DemoTeaser label={activeNav.label} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function DemoShell() {
  const [entered, setEntered] = useState(() => hasEnteredDemo());

  useEffect(() => {
    // Campaign UTM/source stays in the URL for analytics; no auth side effects.
  }, []);

  if (!entered) {
    return (
      <DemoGate
        onEnter={() => {
          markDemoEntered();
          setEntered(true);
        }}
      />
    );
  }

  return (
    <DemoProvider>
      <DemoDashboard />
    </DemoProvider>
  );
}

export default function DemoApp() {
  return <DemoShell />;
}

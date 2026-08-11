import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ArrowRight, BarChart3, BookOpen, Building2, Inbox, LogOut,
  Menu, Palette, PlayCircle, QrCode, RotateCcw, Users, X,
} from "lucide-react";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";
import OperationsPanel from "@/talkstay/components/OperationsPanel";
import InsightsPanel from "@/talkstay/components/InsightsPanel";
import {
  DemoBrandingPanel,
  DemoDepartmentsPanel,
  DemoKnowledgePanel,
  DemoRoomsPanel,
  DemoStaffPanel,
} from "@/talkstay/components/DemoSetupPanels";
import {
  DemoProvider, clearDemoEntered, hasEnteredDemo, markDemoEntered, useDemo,
} from "@/talkstay/demo/DemoContext";
import { DEPARTMENTS } from "@/talkstay/lib/hotels";

const NAV = [
  { key: "operations", label: "Operations", icon: Inbox, desc: "Work the live request queue — accept, start, complete, reply.", adminOnly: false },
  { key: "insights", label: "Insights", icon: BarChart3, desc: "See volumes, departments, ratings and guest pulse.", adminOnly: true },
  { key: "rooms", label: "Rooms & QR", icon: QrCode, desc: "Add rooms and print the QR code guests scan to reach you.", adminOnly: true },
  { key: "branding", label: "Branding", icon: Palette, desc: "Your logo, colour and the printable in-room poster.", adminOnly: true },
  { key: "departments", label: "Departments", icon: Building2, desc: "Teams, routing rules and per-department notifications.", adminOnly: true },
  { key: "knowledge", label: "Knowledge", icon: BookOpen, desc: "What the assistant knows — website, documents and property info.", adminOnly: true },
  { key: "staff", label: "Staff", icon: Users, desc: "Invite your team and manage their roles and access.", adminOnly: true },
] as const;

type NavKey = (typeof NAV)[number]["key"];

type DemoRole =
  | { kind: "owner" }
  | { kind: "manager" }
  | { kind: "staff"; department: string };

const ROLE_OPTIONS: { id: string; label: string; role: DemoRole }[] = [
  { id: "owner", label: "Owner (all departments)", role: { kind: "owner" } },
  { id: "manager", label: "Manager (all departments)", role: { kind: "manager" } },
  ...DEPARTMENTS.map((d) => ({
    id: `staff-${d.key}`,
    label: `${d.display_name} staff`,
    role: { kind: "staff" as const, department: d.key },
  })),
];

const STEPS = [
  {
    n: "1",
    title: "Pair with the Guest demo",
    body: "Open /demo/guest in another tab. Ask for towels or wine — it lands here on Room 306.",
  },
  {
    n: "2",
    title: "Reply & complete the loop",
    body: "Accept → Reply (“Coming in 10”) → Complete. The guest sees your reply, confirms, and can rate.",
  },
  {
    n: "3",
    title: "Switch roles & check Insights",
    body: "View as Housekeeping vs Owner. Guest stay reviews and star ratings appear under Insights.",
  },
  {
    n: "4",
    title: "Reset anytime",
    body: "Use Reset demo data in the sidebar to restore the sample hotel.",
  },
] as const;

function DemoGate({ onEnter }: { onEnter: () => void }) {
  return (
    <div data-talkstay className="ts-atmosphere min-h-screen text-foreground">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link to="/demo" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <TalkStayLogo size={28} />
          <span className="text-lg font-semibold tracking-tight">TalkStay</span>
        </Link>
        <Button asChild variant="ghost" size="sm">
          <Link to="/demo/guest">Guest demo</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-16">
        <div className="rounded-3xl border bg-gradient-to-b from-teal-50 to-white p-6 shadow-sm sm:p-10">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-teal-800">
            <PlayCircle className="h-3.5 w-3.5" />
            Operations dashboard demo · no signup
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            See how hotel staff run TalkStay.
          </h1>
          <p className="mt-3 text-muted-foreground">
            Incoming requests, department routing, status changes, guest confirmation and Insights —
            on a sandbox of The Grand Hotel II. Changes stay on your device only.
          </p>

          <div className="mt-5 rounded-xl border border-teal-200/80 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Department dashboards by role</p>
            <p className="mt-1">
              Owners and managers allocate staff to a department. Each staff member then gets their
              own queue — not a shared inbox. Try switching roles after you enter.
            </p>
          </div>

          <ol className="mt-8 space-y-4">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">
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
            <Button size="lg" className="bg-teal-700 hover:bg-teal-800" onClick={onEnter}>
              Enter operations demo <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/demo">All demos</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function roleLabel(role: DemoRole): string {
  if (role.kind === "owner") return "Owner · all departments";
  if (role.kind === "manager") return "Manager · all departments";
  const dept = DEPARTMENTS.find((d) => d.key === role.department)?.display_name ?? role.department;
  return `${dept} staff · department queue only`;
}

function DemoDashboard() {
  const demo = useDemo()!;
  const navigate = useNavigate();
  const [active, setActive] = useState<NavKey>("operations");
  const [navOpen, setNavOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);
  const [roleId, setRoleId] = useState("owner");

  const demoRole = ROLE_OPTIONS.find((r) => r.id === roleId)?.role ?? { kind: "owner" as const };
  const isAdmin = demoRole.kind === "owner" || demoRole.kind === "manager";
  const lockedDepartment = demoRole.kind === "staff" ? demoRole.department : null;
  const visibleNav = NAV.filter((n) => isAdmin || !n.adminOnly);
  const activeNav = visibleNav.find((n) => n.key === active) ?? visibleNav[0];

  useEffect(() => {
    if (!isAdmin && active !== "operations") setActive("operations");
  }, [isAdmin, active]);

  const go = (k: NavKey) => { setActive(k); setNavOpen(false); };

  const exit = () => {
    clearDemoEntered();
    navigate("/demo");
  };

  const SidebarBody = (
    <div className="flex h-full flex-col bg-[#15111f] text-white/70">
      <div className="flex items-center justify-between px-5 py-4">
        <Link to="/demo" className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-80">
          <TalkStayLogo size={30} />
          <div className="min-w-0 font-semibold tracking-tight text-white">TalkStay</div>
        </Link>
        <button className="md:hidden" onClick={() => setNavOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5 text-white/60" />
        </button>
      </div>

      <div className="mx-3 mb-2 space-y-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5">
        <div className="text-xs font-semibold uppercase tracking-wide text-amber-200">Demo mode</div>
        <div className="truncate text-sm font-medium text-white">{demo.hotel.name}</div>
        <label className="block text-[11px] text-white/50">
          View as
          <select
            className="mt-1 w-full rounded-md border border-white/15 bg-[#1c1628] px-2 py-1.5 text-xs text-white"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </label>
        <p className="text-[11px] leading-snug text-white/45">{roleLabel(demoRole)}</p>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
        {visibleNav.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => go(key)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active === key ? "bg-violet-600 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">{label}</span>
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
        <Link
          to="/demo/guest"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Guest experience
        </Link>
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
              <div className="mb-5 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-teal-950">How staff dashboards work</p>
                    <p className="mt-1 text-sm text-teal-900/80">
                      Owners/managers invite people and assign a department. Staff only see their
                      team's queue; managers see everything plus Insights. Use <strong>View as</strong> in
                      the sidebar to try each role.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg p-1 text-teal-600 hover:bg-teal-100"
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
              {!isAdmin && (
                <p className="mt-2 text-xs text-amber-800">
                  Viewing as department staff — Insights and setup tabs are hidden, matching a real invite.
                </p>
              )}
            </div>

            {active === "operations" && (
              <OperationsPanel hotel={demo.hotel} lockedDepartment={lockedDepartment} />
            )}
            {active === "insights" && isAdmin && <InsightsPanel hotel={demo.hotel} />}
            {active === "rooms" && isAdmin && <DemoRoomsPanel />}
            {active === "branding" && isAdmin && <DemoBrandingPanel />}
            {active === "departments" && isAdmin && <DemoDepartmentsPanel />}
            {active === "knowledge" && isAdmin && <DemoKnowledgePanel />}
            {active === "staff" && isAdmin && <DemoStaffPanel />}
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

/** Staff operations sandbox — routed at /demo/operations */
export default function DemoApp() {
  return <DemoShell />;
}

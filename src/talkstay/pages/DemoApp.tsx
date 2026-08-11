import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, BarChart3, BookOpen, Building2, Inbox, LogOut,
  Menu, Palette, Phone, QrCode, RotateCcw, Users, X,
} from "lucide-react";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";
import OperationsPanel from "@/talkstay/components/OperationsPanel";
import InsightsPanel from "@/talkstay/components/InsightsPanel";
import BrandingPanel from "@/talkstay/components/BrandingPanel";
import KnowledgePanel from "@/talkstay/components/KnowledgePanel";
import LogOrderDialog from "@/talkstay/components/LogOrderDialog";
import {
  DemoDepartmentsPanel,
  DemoRoomsPanel,
  DemoStaffPanel,
} from "@/talkstay/components/DemoSetupPanels";
import {
  DemoProvider, clearDemoEntered, markDemoEntered, useDemo,
} from "@/talkstay/demo/DemoContext";
import { DEPARTMENTS } from "@/talkstay/lib/hotels";
import NoIndexMeta from "@/talkstay/components/NoIndexMeta";

const NAV = [
  { key: "operations", label: "Operations", icon: Inbox, desc: "Live queue — search a room to open tickets fast. Guest-app requests land here automatically.", adminOnly: false },
  { key: "log_order", label: "Log order", icon: Phone, desc: "Only for phone, walk-in or front-desk calls that aren’t already on the board.", adminOnly: false },
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
  const [roleId, setRoleId] = useState("owner");
  const [focusRequestId, setFocusRequestId] = useState<string | null>(null);

  const demoRole = ROLE_OPTIONS.find((r) => r.id === roleId)?.role ?? { kind: "owner" as const };
  const isAdmin = demoRole.kind === "owner" || demoRole.kind === "manager";
  const lockedDepartment = demoRole.kind === "staff" ? demoRole.department : null;
  const visibleNav = NAV.filter((n) => isAdmin || !n.adminOnly);
  const activeNav = visibleNav.find((n) => n.key === active) ?? visibleNav[0];

  useEffect(() => {
    if (!isAdmin && active !== "operations" && active !== "log_order") setActive("operations");
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
            <div className="mb-6 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">{activeNav.label}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{activeNav.desc}</p>
              {!isAdmin && (
                <p className="mt-2 text-xs text-amber-800">
                  Viewing as department staff — Insights and setup tabs are hidden, matching a real invite.{" "}
                  <button
                    type="button"
                    className="font-semibold underline underline-offset-2 hover:text-amber-950"
                    onClick={() => setRoleId("owner")}
                  >
                    Back to all departments
                  </button>
                </p>
              )}
            </div>

            {active === "operations" && (
              <OperationsPanel
                hotel={demo.hotel}
                lockedDepartment={lockedDepartment}
                focusRequestId={focusRequestId}
                onClearDepartmentLock={
                  lockedDepartment
                    ? () => {
                        setRoleId("owner");
                        toast.message("Back to Owner — all departments");
                      }
                    : undefined
                }
              />
            )}
            {active === "log_order" && (
              <LogOrderDialog
                hotel={demo.hotel}
                lockedDepartment={lockedDepartment}
                variant="panel"
                onCreated={() => toast.message("Order is on the Operations queue.")}
                onOpenRequest={(id) => {
                  setFocusRequestId(id);
                  setActive("operations");
                }}
              />
            )}
            {active === "insights" && isAdmin && <InsightsPanel hotel={demo.hotel} />}
            {active === "rooms" && isAdmin && <DemoRoomsPanel />}
            {active === "branding" && isAdmin && (
              <BrandingPanel
                hotel={demo.hotel}
                onSaved={(b) => demo.updateBranding(b)}
              />
            )}
            {active === "departments" && isAdmin && <DemoDepartmentsPanel />}
            {active === "knowledge" && isAdmin && <KnowledgePanel hotel={demo.hotel} />}
            {active === "staff" && isAdmin && <DemoStaffPanel />}
          </div>
        </main>
      </div>
    </div>
  );
}

function DemoShell() {
  // Skip the instruction gate — open straight into the operations dashboard.
  useEffect(() => {
    markDemoEntered();
  }, []);

  return (
    <DemoProvider>
      <NoIndexMeta />
      <DemoDashboard />
    </DemoProvider>
  );
}

/** Staff operations sandbox — routed at /demo/operations */
export default function DemoApp() {
  return <DemoShell />;
}

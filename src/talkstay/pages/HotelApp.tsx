import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2, LogOut, Bell, Menu, X,
  Inbox, BarChart3, QrCode, Building2, BookOpen, Users, Palette,
} from "lucide-react";
import { enablePush, pushSupported } from "@/talkstay/lib/push";
import AuthPage from "@/talkstay/pages/AuthPage";
import OperationsPanel from "@/talkstay/components/OperationsPanel";
import InsightsPanel from "@/talkstay/components/InsightsPanel";
import RoomsPanel from "@/talkstay/components/RoomsPanel";
import DepartmentsPanel from "@/talkstay/components/DepartmentsPanel";
import KnowledgePanel from "@/talkstay/components/KnowledgePanel";
import StaffPanel from "@/talkstay/components/StaffPanel";
import BrandingPanel from "@/talkstay/components/BrandingPanel";
import { createHotel, getMyAccess, ingestHotelWebsite, DEPARTMENTS, type Hotel, type HotelAccess } from "@/talkstay/lib/hotels";

const NAV = [
  // `admin: true` = owner/manager only. Department staff see just Operations.
  { key: "operations", label: "Operations", icon: Inbox, admin: false },
  { key: "insights", label: "Insights", icon: BarChart3, admin: true },
  { key: "rooms", label: "Rooms & QR", icon: QrCode, admin: true },
  { key: "branding", label: "Branding", icon: Palette, admin: true },
  { key: "departments", label: "Departments", icon: Building2, admin: true },
  { key: "knowledge", label: "Knowledge", icon: BookOpen, admin: true },
  { key: "staff", label: "Staff", icon: Users, admin: true },
] as const;
type NavKey = (typeof NAV)[number]["key"];

function CreateHotel({ onCreated }: { onCreated: (h: Hotel) => void }) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [language, setLanguage] = useState("English");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      setStage("Creating your hotel…");
      const hotel = await createHotel({
        name: name.trim(),
        website_url: website.trim() || undefined,
        default_language: language,
      });

      // Starter knowledge from the hotel's website (TalkWeb scrape pipeline).
      if (website.trim() && hotel.assistant_id) {
        setStage("Reading your website…");
        try {
          const { chunks, crawlStarted } = await ingestHotelWebsite(
            hotel.assistant_id,
            website.trim().startsWith("http") ? website.trim() : `https://${website.trim()}`
          );
          toast.success(
            chunks > 0
              ? `Hotel created — indexed ${chunks} knowledge chunks from your website.${crawlStarted ? " Full site crawl running in the background." : ""}`
              : "Hotel created. Website scrape is running — check the Content section."
          );
        } catch {
          toast.message("Hotel created. Website scrape didn't finish — you can run it from the Content section.");
        }
      } else {
        toast.success("Hotel created");
      }
      onCreated(hotel);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create hotel");
    } finally {
      setBusy(false);
      setStage("");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-1 text-lg font-semibold">TalkStay</div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your hotel</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sets up your guest assistant, knowledge base and the standard service departments.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="hotel-name">Hotel name</Label>
            <Input id="hotel-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="The Grand Hotel" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hotel-web">Hotel website (optional)</Label>
            <Input id="hotel-web" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourhotel.com" />
            <p className="text-xs text-muted-foreground">
              We'll read your website so the assistant can answer guest questions from day one.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hotel-lang">Primary language</Label>
            <Input id="hotel-lang" value={language} onChange={(e) => setLanguage(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? (stage || "Creating…") : "Create hotel"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function NoAccess() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold">You're signed in, but not on a hotel team yet</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Ask your hotel manager to add your email under <strong>Staff</strong>. Once they do,
        refresh this page and your department's queue will appear here.
      </p>
      <Button variant="outline" onClick={() => supabase.auth.signOut()}>Sign out</Button>
    </div>
  );
}

function Panel({ active, hotel, onHotel, departmentKey }: {
  active: NavKey; hotel: Hotel; onHotel: (h: Hotel) => void; departmentKey?: string | null;
}) {
  switch (active) {
    case "operations": return <OperationsPanel hotel={hotel} lockedDepartment={departmentKey ?? null} />;
    case "insights": return <InsightsPanel hotel={hotel} />;
    case "rooms": return <RoomsPanel hotel={hotel} />;
    case "branding": return <BrandingPanel hotel={hotel} onSaved={(b) => onHotel({ ...hotel, branding: b })} />;
    case "departments": return <DepartmentsPanel hotel={hotel} />;
    case "knowledge": return <KnowledgePanel hotel={hotel} />;
    case "staff": return <StaffPanel hotel={hotel} />;
  }
}

export default function HotelApp() {
  const { user, loading } = useAuth();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [access, setAccess] = useState<HotelAccess | null>(null);
  const [loadingHotel, setLoadingHotel] = useState(true);
  const [active, setActive] = useState<NavKey>("operations");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!user) { setLoadingHotel(false); return; }
    setLoadingHotel(true);
    getMyAccess()
      .then((a) => { setAccess(a); return a.hotel; })
      .then(setHotel)
      .catch((e) => toast.error(e?.message ?? "Failed to load hotel"))
      .finally(() => setLoadingHotel(false));
  }, [user]);

  if (loading || (user && loadingHotel)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }
  if (!user) return <AuthPage />;
  // Only OWNERS get the create-hotel screen. A signed-in staff member with no
  // hotel membership is shown a clear "ask your manager" message instead.
  if (!hotel) {
    if (access && !access.isOwner) return <NoAccess />;
    return <CreateHotel onCreated={setHotel} />;
  }

  const isAdmin = access?.isOwner || access?.role === "manager" || access?.role === "owner";
  const visibleNav = NAV.filter((n) => isAdmin || !n.admin);
  const lockedDepartment = isAdmin ? null : access?.departmentKey ?? null;
  const roleLabel = isAdmin
    ? (access?.isOwner ? "Owner" : "Manager")
    : (lockedDepartment ? `${DEPARTMENTS.find((d) => d.key === lockedDepartment)?.display_name ?? lockedDepartment} team` : "Staff");

  // A department member should never sit on an admin tab (e.g. after a refresh).
  const effectiveActive: NavKey = visibleNav.some((n) => n.key === active) ? active : "operations";
  const activeLabel = NAV.find((n) => n.key === effectiveActive)?.label ?? "";
  const go = (k: NavKey) => { setActive(k); setNavOpen(false); };

  const SidebarBody = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="min-w-0">
          <div className="font-semibold tracking-tight">TalkStay</div>
          <div className="truncate text-xs text-muted-foreground">{hotel.name}</div>
          <div className="mt-0.5 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{roleLabel}</div>
        </div>
        <button className="md:hidden" onClick={() => setNavOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {visibleNav.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => go(key)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              effectiveActive === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>
      <div className="space-y-1 border-t p-3">
        {pushSupported() && (
          <button
            onClick={async () => {
              try { await enablePush(hotel.id); toast.success("Alerts enabled on this device."); }
              catch (e: any) { toast.error(e?.message ?? "Couldn't enable alerts"); }
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Bell className="h-4 w-4" /> Enable alerts
          </button>
        )}
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-background md:block">
        <div className="sticky top-0 h-screen">{SidebarBody}</div>
      </aside>

      {/* Mobile drawer */}
      {navOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setNavOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-background md:hidden">{SidebarBody}</aside>
        </>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur md:px-8">
          <button className="md:hidden" onClick={() => setNavOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold tracking-tight">{activeLabel}</h1>
        </header>
        <main className="flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-5xl">
            <Panel active={effectiveActive} hotel={hotel} onHotel={setHotel} departmentKey={lockedDepartment} />
          </div>
        </main>
      </div>
    </div>
  );
}

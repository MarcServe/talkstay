import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2, LogOut, Bell, Menu, X,
  Inbox, BarChart3, QrCode, Building2, BookOpen, Users,
} from "lucide-react";
import { enablePush, pushSupported } from "@/talkstay/lib/push";
import AuthPage from "@/talkstay/pages/AuthPage";
import OperationsPanel from "@/talkstay/components/OperationsPanel";
import InsightsPanel from "@/talkstay/components/InsightsPanel";
import RoomsPanel from "@/talkstay/components/RoomsPanel";
import DepartmentsPanel from "@/talkstay/components/DepartmentsPanel";
import KnowledgePanel from "@/talkstay/components/KnowledgePanel";
import StaffPanel from "@/talkstay/components/StaffPanel";
import { createHotel, getMyHotel, type Hotel } from "@/talkstay/lib/hotels";

const NAV = [
  { key: "operations", label: "Operations", icon: Inbox },
  { key: "insights", label: "Insights", icon: BarChart3 },
  { key: "rooms", label: "Rooms & QR", icon: QrCode },
  { key: "departments", label: "Departments", icon: Building2 },
  { key: "knowledge", label: "Knowledge", icon: BookOpen },
  { key: "staff", label: "Staff", icon: Users },
] as const;
type NavKey = (typeof NAV)[number]["key"];

function CreateHotel({ onCreated }: { onCreated: (h: Hotel) => void }) {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("English");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const hotel = await createHotel({ name: name.trim(), default_language: language });
      toast.success("Hotel created");
      onCreated(hotel);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create hotel");
    } finally {
      setBusy(false);
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
            <Label htmlFor="hotel-lang">Primary language</Label>
            <Input id="hotel-lang" value={language} onChange={(e) => setLanguage(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Creating…" : "Create hotel"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function Panel({ active, hotel }: { active: NavKey; hotel: Hotel }) {
  switch (active) {
    case "operations": return <OperationsPanel hotel={hotel} />;
    case "insights": return <InsightsPanel hotel={hotel} />;
    case "rooms": return <RoomsPanel hotel={hotel} />;
    case "departments": return <DepartmentsPanel hotel={hotel} />;
    case "knowledge": return <KnowledgePanel hotel={hotel} />;
    case "staff": return <StaffPanel hotel={hotel} />;
  }
}

export default function HotelApp() {
  const { user, loading } = useAuth();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loadingHotel, setLoadingHotel] = useState(true);
  const [active, setActive] = useState<NavKey>("operations");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!user) { setLoadingHotel(false); return; }
    setLoadingHotel(true);
    getMyHotel()
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
  if (!hotel) return <CreateHotel onCreated={setHotel} />;

  const activeLabel = NAV.find((n) => n.key === active)?.label ?? "";
  const go = (k: NavKey) => { setActive(k); setNavOpen(false); };

  const SidebarBody = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="min-w-0">
          <div className="font-semibold tracking-tight">TalkStay</div>
          <div className="truncate text-xs text-muted-foreground">{hotel.name}</div>
        </div>
        <button className="md:hidden" onClick={() => setNavOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => go(key)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
            <Panel active={active} hotel={hotel} />
          </div>
        </main>
      </div>
    </div>
  );
}

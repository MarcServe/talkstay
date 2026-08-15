import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2, LogOut, Bell, Menu, X, ChevronDown, Phone,
  Inbox, BarChart3, QrCode, Building2, BookOpen, Users, Palette, LifeBuoy,
} from "lucide-react";
import { enablePush, pushSupported } from "@/talkstay/lib/push";
import { enableAlertSounds, notificationPermission } from "@/talkstay/lib/alerts";
import AuthPage, { isPasswordSetupUrl } from "@/talkstay/pages/AuthPage";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";
import OperationsPanel from "@/talkstay/components/OperationsPanel";
import InsightsPanel from "@/talkstay/components/InsightsPanel";
import RoomsPanel from "@/talkstay/components/RoomsPanel";
import DepartmentsPanel from "@/talkstay/components/DepartmentsPanel";
import KnowledgePanel from "@/talkstay/components/KnowledgePanel";
import BrandingPanel from "@/talkstay/components/BrandingPanel";
import LogOrderDialog from "@/talkstay/components/LogOrderDialog";
import StaffAlertsHost from "@/talkstay/components/StaffAlertsHost";
import InstallAppBanner from "@/talkstay/components/InstallAppBanner";
import NoIndexMeta from "@/talkstay/components/NoIndexMeta";
import { createHotel, ingestHotelWebsite, DEPARTMENTS, type Hotel, type PropertyProfile } from "@/talkstay/lib/hotels";
import { talkstayKeys } from "@/talkstay/lib/data";
import {
  useHotelAccess, usePrefetchHotelData, invalidateOps,
} from "@/talkstay/hooks/useTalkStayQueries";
import PropertyProfileFields from "@/talkstay/components/PropertyProfileFields";
import { normalizeReferralCode, supportLabelForHotel, supportMailtoForHotel } from "@/talkstay/lib/partners";

const StaffPanel = lazy(() => import("@/talkstay/components/StaffPanel"));

const NAV = [
  // `admin: true` = owner/manager only. Department staff see Operations + Log order.
  { key: "operations", label: "Operations", icon: Inbox, admin: false, desc: "Live queue — search a room to open tickets fast. Guest-app requests land here automatically." },
  { key: "log_order", label: "Log order", icon: Phone, admin: false, desc: "Only for phone, walk-in or front-desk calls that aren’t already on the board." },
  { key: "insights", label: "Insights", icon: BarChart3, admin: true, desc: "Analytics board plus business intelligence — click charts to filter the brief and records." },
  { key: "rooms", label: "Rooms & QR", icon: QrCode, admin: true, desc: "Add rooms or named units and print the QR guests scan." },
  { key: "branding", label: "Branding", icon: Palette, admin: true, desc: "Logo, colour, property profile (type/address/scale), and the printable poster." },
  { key: "departments", label: "Departments", icon: Building2, admin: true, desc: "Teams, routing rules and per-department notifications." },
  { key: "knowledge", label: "Knowledge", icon: BookOpen, admin: true, desc: "What the assistant knows — website, documents and property info." },
  { key: "staff", label: "Staff", icon: Users, admin: true, desc: "Invite your team and manage their roles and access." },
] as const;
type NavKey = (typeof NAV)[number]["key"];

function CreateHotel({ onCreated }: { onCreated: (h: Hotel) => void }) {
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [language, setLanguage] = useState("English");
  const [property, setProperty] = useState<PropertyProfile>({ property_count: 1 });
  const [referralCode, setReferralCode] = useState(
    () => normalizeReferralCode(searchParams.get("ref")) ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      setStage("Creating your property…");
      const hotel = await createHotel({
        name: name.trim(),
        website_url: website.trim() || undefined,
        default_language: language,
        referral_code: referralCode.trim() || null,
        property: {
          ...property,
          type: property.type || undefined,
          address: property.address?.trim() || undefined,
          city: property.city?.trim() || undefined,
          region: property.region?.trim() || undefined,
          country: property.country?.trim() || undefined,
          postcode: property.postcode?.trim() || undefined,
          room_count: property.room_count ?? undefined,
          property_count: property.property_count ?? 1,
        },
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
              ? `Property created — indexed ${chunks} knowledge chunks from your website.${crawlStarted ? " Full site crawl running in the background." : ""}`
              : "Property created. Website scrape is running — check the Content section."
          );
        } catch {
          toast.message("Property created. Website scrape didn't finish — you can run it from the Content section.");
        }
      } else {
        toast.success("Property created");
      }
      onCreated(hotel);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create property");
    } finally {
      setBusy(false);
      setStage("");
    }
  };

  return (
    <div data-talkstay className="ts-atmosphere flex min-h-screen items-center justify-center px-4 py-10">
      <div className="ts-glass-strong w-full max-w-lg rounded-2xl border p-8">
        <div className="mb-1 text-lg font-semibold">TalkStay</div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your property</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sets up your guest assistant, knowledge base and the standard service departments.
          A little context on type and scale helps Insights give better business advice.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="hotel-name">Property name</Label>
            <Input id="hotel-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="The Grand Hotel / Seaview Apartment 3B" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hotel-web">Property website or listing (optional)</Label>
            <Input id="hotel-web" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourproperty.com" />
            <p className="text-xs text-muted-foreground">
              We'll read your website so the assistant can answer guest questions from day one.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hotel-lang">Primary language</Label>
            <Input id="hotel-lang" value={language} onChange={(e) => setLanguage(e.target.value)} />
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="mb-3 text-sm font-medium">Property profile</div>
            <PropertyProfileFields value={property} onChange={setProperty} compact />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hotel-ref">Referral code (optional)</Label>
            <Input
              id="hotel-ref"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder="Partner code"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Prefills from a ?ref= link when present. Used to route Support to your partner when one is assigned.
            </p>
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? (stage || "Creating…") : "Create property"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function NoAccess({ email }: { email?: string | null }) {
  return (
    <div data-talkstay className="ts-atmosphere flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold">You're signed in, but not on a property team yet</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Ask your property manager to add your email under <strong>Staff</strong>. Once they do,
        refresh this page and your department's queue will appear here.
      </p>
      {email && (
        <p className="max-w-sm text-xs text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{email}</span>.
          If you own a property, sign in with the same method you used when you created it
          (email/password and Google can be different accounts).
        </p>
      )}
      <Button variant="outline" onClick={() => supabase.auth.signOut()}>Sign out</Button>
    </div>
  );
}

function Panel({ active, hotel, onHotel, departmentKey, focusRequestId, onOpenRequest }: {
  active: NavKey;
  hotel: Hotel;
  onHotel: (h: Hotel) => void;
  departmentKey?: string | null;
  focusRequestId?: string | null;
  onOpenRequest?: (requestId: string) => void;
}) {
  const qc = useQueryClient();
  switch (active) {
    case "operations": return (
      <OperationsPanel
        hotel={hotel}
        lockedDepartment={departmentKey ?? null}
        focusRequestId={focusRequestId}
      />
    );
    case "log_order": return (
      <LogOrderDialog
        hotel={hotel}
        lockedDepartment={departmentKey ?? null}
        variant="panel"
        onCreated={() => { void invalidateOps(qc, hotel.id); }}
        onOpenRequest={onOpenRequest}
      />
    );
    case "insights": return <InsightsPanel hotel={hotel} />;
    case "rooms": return <RoomsPanel hotel={hotel} onHotel={onHotel} />;
    case "branding": return <BrandingPanel hotel={hotel} onSaved={(b) => onHotel({ ...hotel, branding: b })} />;
    case "departments": return <DepartmentsPanel hotel={hotel} />;
    case "knowledge": return <KnowledgePanel hotel={hotel} />;
    case "staff": return (
      <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
        <StaffPanel hotel={hotel} />
      </Suspense>
    );
  }
}

export default function HotelApp() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const { data: access, isPending: loadingHotel, isError, error, refetch: refetchAccess } =
    useHotelAccess(user?.id);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  usePrefetchHotelData(hotel?.id);

  const [active, setActive] = useState<NavKey>("operations");
  const [navOpen, setNavOpen] = useState(false);
  const [focusRequestId, setFocusRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (isError && error) toast.error(error.message ?? "Failed to load property");
  }, [isError, error]);

  // Keep local hotel in sync with cached access (create / login), without
  // wiping in-session edits until access actually changes.
  useEffect(() => {
    if (access?.hotel) setHotel(access.hotel);
    else if (!loadingHotel) setHotel(null);
  }, [access?.hotel, loadingHotel]);

  // A password-reset or team-invite link exchanges its code into a real
  // session immediately — but the person hasn't chosen a password yet. Keep
  // them on AuthPage's "set a password" screen rather than letting the
  // dashboard render underneath them just because `user` is now truthy.
  if (isPasswordSetupUrl()) return <AuthPage />;

  if (loading || (user && loadingHotel && !access)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }
  if (!user) return <AuthPage />;
  // Invited staff without a property → ask manager. Everyone else with no
  // hotel yet (incl. owners who haven't created one) → create-property screen.
  // IMPORTANT: `isOwner: false` alone is NOT "staff" — getMyAccess returns that
  // for brand-new accounts too.
  if (!hotel) {
    const isInvitedStaff = access?.role === "staff" || access?.role === "manager";
    if (isInvitedStaff) return <NoAccess email={user.email} />;
    return (
      <CreateHotel
        onCreated={(h) => {
          setHotel(h);
          void qc.invalidateQueries({ queryKey: talkstayKeys.access(user.id) });
          void refetchAccess();
        }}
      />
    );
  }

  const isAdmin = access?.isOwner || access?.role === "manager" || access?.role === "owner";
  const visibleNav = NAV.filter((n) => isAdmin || !n.admin);
  // Front Desk / Duty Manager coordinate across teams — same hotel-wide ops view as managers.
  const staffDept = isAdmin ? null : access?.departmentKey ?? null;
  const lockedDepartment =
    staffDept === "front_desk" || staffDept === "duty_manager" ? null : staffDept;
  const roleLabel = isAdmin
    ? (access?.isOwner ? "Owner" : "Manager")
    : (staffDept
      ? `${DEPARTMENTS.find((d) => d.key === staffDept)?.display_name ?? staffDept} team`
      : "Staff");

  // A department member should never sit on an admin tab (e.g. after a refresh).
  const effectiveActive: NavKey = visibleNav.some((n) => n.key === active) ? active : "operations";
  const activeNav = NAV.find((n) => n.key === effectiveActive);
  const activeLabel = activeNav?.label ?? "";
  const activeDesc = activeNav?.desc ?? "";
  const go = (k: NavKey) => { setActive(k); setNavOpen(false); };

  const identityName = access?.name || user?.email?.split("@")[0] || "You";
  const identityInitial = identityName.trim().charAt(0).toUpperCase() || "?";

  const SidebarBody = (
    <div className="flex h-full flex-col bg-[#15111f] text-white/70">
      <div className="flex items-center justify-between px-5 py-4">
        <Link to="/" className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-80" title="TalkStay home">
          <TalkStayLogo size={30} />
          <div className="min-w-0 font-semibold tracking-tight text-white">TalkStay</div>
        </Link>
        <button className="md:hidden" onClick={() => setNavOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5 text-white/60" />
        </button>
      </div>

      <div className="mx-3 mb-2 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-white">{hotel.name}</div>
          <div className="text-xs text-white/50">{roleLabel}</div>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-white/40" />
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
        {visibleNav.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => go(key)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              effectiveActive === key ? "bg-violet-600 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        <a
          href={supportMailtoForHotel(hotel.referral_code)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white"
        >
          <LifeBuoy className="h-4 w-4" /> {supportLabelForHotel(hotel.referral_code)}
        </a>
        {(pushSupported() || notificationPermission() !== "unsupported") && (
          <button
            onClick={async () => {
              try {
                const { iosNeedsHomeScreenInstall, IOS_ADD_HOME_SCREEN_HINT } = await import("@/talkstay/lib/install");
                if (iosNeedsHomeScreenInstall()) {
                  toast.message(IOS_ADD_HOME_SCREEN_HINT);
                  return;
                }
                const { permission } = await enableAlertSounds();
                if (permission !== "granted") {
                  toast.error(
                    permission === "denied"
                      ? "Notifications are blocked — enable them in browser settings."
                      : permission === "unsupported"
                        ? IOS_ADD_HOME_SCREEN_HINT
                        : "Couldn't enable alert sounds.",
                  );
                  return;
                }
                if (pushSupported()) await enablePush(hotel.id);
                toast.success("Alert sounds & notifications are on for this device.");
              } catch (e: any) {
                toast.error(e?.message ?? "Couldn't enable alerts");
              }
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white"
          >
            <Bell className="h-4 w-4" /> Enable alert sounds
          </button>
        )}
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600/30 text-xs font-semibold text-violet-200">
            {identityInitial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">{identityName}</div>
            <div className="truncate text-xs text-white/40">{user?.email}</div>
          </div>
          <button onClick={() => supabase.auth.signOut()} aria-label="Sign out" title="Sign out">
            <LogOut className="h-4 w-4 text-white/40 hover:text-white" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    // Viewport shell: overflow-x-hidden on min-h-screen was computing overflow-y
    // to auto without a max height, so the page couldn't scroll and sticky nav stuck.
    <div data-talkstay className="ts-atmosphere flex h-[100dvh] overflow-hidden">
      <NoIndexMeta />
      <StaffAlertsHost hotelId={hotel.id} departmentKey={lockedDepartment} />

      {/* Desktop sidebar — fixed column, not sticky */}
      <aside className="hidden h-full w-64 shrink-0 md:block print:!hidden">
        {SidebarBody}
      </aside>

      {/* Mobile drawer */}
      {navOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden print:hidden" onClick={() => setNavOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 print:hidden md:hidden">{SidebarBody}</aside>
        </>
      )}

      {/* Main column — only this pane scrolls */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 print:hidden">
          <InstallAppBanner hotelId={hotel.id} variant="staff" />
        </div>
        <header className="z-20 flex min-w-0 shrink-0 items-center gap-3 border-b px-4 py-3 print:hidden md:hidden">
          <button onClick={() => setNavOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <span className="min-w-0 truncate text-sm font-medium">{hotel.name}</span>
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 print:overflow-visible print:p-0">
          <div className="mx-auto min-w-0 max-w-5xl print:max-w-none">
            <div className="mb-6 min-w-0 print:mb-4">
              <h1 className="text-2xl font-bold tracking-tight">{activeLabel}</h1>
              {activeDesc && <p className="mt-1 text-sm text-muted-foreground print:hidden">{activeDesc}</p>}
              <p className="mt-1 hidden text-sm text-muted-foreground print:block">
                {hotel.name} · printed {new Date().toLocaleString()}
              </p>
            </div>
            <Panel
              active={effectiveActive}
              hotel={hotel}
              onHotel={setHotel}
              departmentKey={lockedDepartment}
              focusRequestId={focusRequestId}
              onOpenRequest={(id) => {
                setFocusRequestId(id);
                setActive("operations");
              }}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

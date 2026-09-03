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
  Loader2, Menu, X, Phone,
  Inbox, BarChart3, QrCode, Building2, BookOpen, Users, Palette, LifeBuoy, Mail,
} from "lucide-react";
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
import AccountPanel from "@/talkstay/components/AccountPanel";
import AlertSoundPicker from "@/talkstay/components/AlertSoundPicker";
import {
  createHotel,
  ingestHotelWebsite,
  type Hotel,
  type PropertyProfile,
  type AccessibleProperty,
  pickAccessibleProperty,
  readActiveHotelId,
  writeActiveHotelId,
  resolveLockedDepartment,
  canSeeNavItem,
  membershipRoleLabel,
} from "@/talkstay/lib/hotels";
import { talkstayKeys } from "@/talkstay/lib/data";
import {
  useHotelAccess, usePrefetchHotelData, invalidateOps,
} from "@/talkstay/hooks/useTalkStayQueries";
import PropertyProfileFields from "@/talkstay/components/PropertyProfileFields";
import PropertySwitcher from "@/talkstay/components/PropertySwitcher";
import {
  normalizeReferralCode,
  partnerForReferral,
  resolveSignupReferral,
  captureReferralFromSearch,
  clearStoredReferral,
  ensurePartnersLoaded,
} from "@/talkstay/lib/partners";

const StaffPanel = lazy(() => import("@/talkstay/components/StaffPanel"));
const CommunicationsPanel = lazy(() => import("@/talkstay/components/CommunicationsPanel"));

const NAV = [
  // `admin: true` = owner/manager only. Department staff see Operations + Log order.
  // Account lives in the sidebar footer (extreme bottom) — ops menu ends at Staff.
  { key: "operations", label: "Operations", icon: Inbox, admin: false, desc: "Live queue — search a room or public area to open tickets fast. Guest-app requests land here automatically." },
  { key: "log_order", label: "Log order", icon: Phone, admin: false, desc: "Only for phone, walk-in or front-desk calls that aren’t already on the board. Use Public QR areas for lobby, bar, restaurant, and walk-ups." },
  { key: "insights", label: "Insights", icon: BarChart3, admin: true, desc: "Analytics and business intelligence for this property — or across your portfolio when you own more than one." },
  { key: "rooms", label: "Rooms & QR", icon: QrCode, admin: true, desc: "Rooms for guest stays, plus Venues & tables for lobby, bar, pool, and restaurant QRs. Scan menus in Knowledge or Departments, then print table QRs here." },
  { key: "branding", label: "Branding", icon: Palette, admin: true, desc: "Logo, colour, property profile (type/address/scale), and the printable poster." },
  { key: "communications", label: "Communications", icon: Mail, admin: true, desc: "Guest emails who opted in — send occasional offers or news yourself. Not an automatic newsletter; every send includes unsubscribe." },
  { key: "departments", label: "Departments", icon: Building2, admin: true, desc: "Teams, routing rules and per-department notifications." },
  { key: "knowledge", label: "Knowledge", icon: BookOpen, admin: true, desc: "What the assistant knows — website, documents and property info." },
  { key: "staff", label: "Staff", icon: Users, admin: true, desc: "Invite your team and manage their roles and access." },
] as const;
type NavKey = (typeof NAV)[number]["key"] | "account";
const ACCOUNT_META = {
  key: "account" as const,
  label: "Account",
  desc: "Your email, role, Direct Support, and sign out.",
};

function CreateHotel({
  onCreated,
  onCancel,
  asAdditional,
  portfolioSize,
  inheritReferral,
}: {
  onCreated: (h: Hotel) => void;
  onCancel?: () => void;
  /** True when owner already has ≥1 property and is adding another. */
  asAdditional?: boolean;
  /** Current owned property count — used to seed the new profile's portfolio size. */
  portfolioSize?: number;
  /** Referral from an existing owned property (portfolio add). */
  inheritReferral?: string | null;
}) {
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [language, setLanguage] = useState("English");
  const [property, setProperty] = useState<PropertyProfile>({
    property_count: asAdditional ? Math.max(2, (portfolioSize ?? 1) + 1) : 1,
  });
  const resolved = resolveSignupReferral({
    searchParams,
    inheritFrom: inheritReferral ?? null,
  });
  const [referralCode, setReferralCode] = useState(() => resolved.code ?? "");
  const [partnersReady, setPartnersReady] = useState(false);
  const partner = partnerForReferral(referralCode);
  void partnersReady; // re-render after public partner map loads
  const partnerLocked = resolved.source === "url" || resolved.source === "stored" || resolved.source === "inherit";
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");

  useEffect(() => {
    captureReferralFromSearch(searchParams);
    void ensurePartnersLoaded().then(() => setPartnersReady(true));
  }, [searchParams]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      setStage("Creating your property…");
      const code = normalizeReferralCode(referralCode);
      const hotel = await createHotel({
        name: name.trim(),
        website_url: website.trim() || undefined,
        contact_email: contactEmail.trim() || null,
        default_language: language,
        referral_code: code,
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
        toast.success(asAdditional ? "Property added to your portfolio" : "Property created");
      }
      if (code) clearStoredReferral();
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
        <h1 className="text-2xl font-semibold tracking-tight">
          {asAdditional ? "Add another property" : "Create your property"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {asAdditional
            ? "Each property gets its own rooms, QR codes, departments, knowledge, website and contact email. You stay signed in with one owner account."
            : "Sets up your guest assistant, knowledge base and the standard service departments. A little context on type and scale helps Insights give better business advice."}
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
            <Label htmlFor="hotel-contact">Property contact email (optional)</Label>
            <Input
              id="hotel-contact"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="ops@yourproperty.com"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              For this property only (ops / guest contact). Your login email stays on the owner account and covers the whole portfolio.
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

          {partner || referralCode ? (
            <div className="space-y-1.5 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
              <Label htmlFor="hotel-ref">Partner referral</Label>
              {partner ? (
                <p className="text-sm font-medium text-violet-950">
                  Linked to <span className="text-violet-800">{partner.name}</span>
                  <span className="ml-1.5 font-mono text-xs font-normal text-violet-700/80">({referralCode})</span>
                </p>
              ) : (
                <Input
                  id="hotel-ref"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Partner code"
                  autoComplete="off"
                  readOnly={partnerLocked && !!resolved.source}
                />
              )}
              <p className="text-xs text-violet-900/70">
                {partner
                  ? resolved.source === "inherit"
                    ? "Carried over from your portfolio so Support stays with the same partner."
                    : "Support for this property routes to your partner. Applied automatically from your signup link."
                  : "Code will be saved on this property for partner tracking and Support routing."}
              </p>
            </div>
          ) : (
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
                If you were invited by a partner, use their link (<code className="text-[11px]">?ref=code</code>) — it applies automatically.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            {onCancel && (
              <Button type="button" variant="outline" className="sm:flex-1" disabled={busy} onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={busy} className={onCancel ? "sm:flex-1" : "w-full"}>
              {busy ? (stage || "Creating…") : asAdditional ? "Add property" : "Create property"}
            </Button>
          </div>
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

function Panel({ active, hotel, onHotel, departmentKey, focusRequestId, onOpenRequest, identity, portfolioHotels, canAddProperty, onAddProperty }: {
  active: NavKey;
  hotel: Hotel;
  onHotel: (h: Hotel) => void;
  departmentKey?: string | null;
  focusRequestId?: string | null;
  onOpenRequest?: (requestId: string) => void;
  identity: { email?: string | null; displayName: string; roleLabel: string };
  /** Other properties the owner can aggregate Insights across. */
  portfolioHotels?: Hotel[];
  canAddProperty?: boolean;
  onAddProperty?: () => void;
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
    case "insights": return (
      <InsightsPanel hotel={hotel} portfolioHotels={portfolioHotels} />
    );
    case "rooms": return <RoomsPanel hotel={hotel} onHotel={onHotel} />;
    case "branding": return (
      <BrandingPanel
        hotel={hotel}
        onSaved={(b) => onHotel({ ...hotel, branding: b })}
        onHotel={onHotel}
      />
    );
    case "communications": return (
      <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
        <CommunicationsPanel hotel={hotel} />
      </Suspense>
    );
    case "departments": return <DepartmentsPanel hotel={hotel} />;
    case "knowledge": return <KnowledgePanel hotel={hotel} />;
    case "staff": return (
      <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
        <StaffPanel hotel={hotel} scopedDepartment={departmentKey ?? null} />
      </Suspense>
    );
    case "account": return (
      <AccountPanel
        hotel={hotel}
        email={identity.email}
        displayName={identity.displayName}
        roleLabel={identity.roleLabel}
        canAddProperty={canAddProperty}
        onAddProperty={onAddProperty}
      />
    );
  }
}

export default function HotelApp() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: access, isPending: loadingHotel, isError, error, refetch: refetchAccess } =
    useHotelAccess(user?.id);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [membership, setMembership] = useState<AccessibleProperty | null>(null);
  const [addingProperty, setAddingProperty] = useState(false);
  usePrefetchHotelData(hotel?.id);

  const tabParam = searchParams.get("tab");
  const initialNav: NavKey =
    tabParam === "account" || NAV.some((n) => n.key === tabParam)
      ? (tabParam as NavKey)
      : "operations";
  const [active, setActive] = useState<NavKey>(initialNav);
  const [navOpen, setNavOpen] = useState(false);
  const [focusRequestId, setFocusRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (tabParam === "account") setActive("account");
  }, [tabParam]);

  // Tapping an OS notification lands here with ?request=<id>. Open that ticket,
  // then strip the param so a later refresh doesn't reopen a handled request.
  const requestParam = searchParams.get("request");
  useEffect(() => {
    if (!requestParam) return;
    setFocusRequestId(requestParam);
    setActive("operations");
    const next = new URLSearchParams(searchParams);
    next.delete("request");
    setSearchParams(next, { replace: true });
  }, [requestParam]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    captureReferralFromSearch(searchParams);
    void ensurePartnersLoaded();
  }, [searchParams]);

  useEffect(() => {
    if (isError && error) toast.error(error.message ?? "Failed to load property");
  }, [isError, error]);

  // Resolve active property from access list + persisted preference.
  useEffect(() => {
    if (!access) return;
    const list = access.hotels ?? [];
    if (!list.length) {
      if (!loadingHotel) {
        setHotel(null);
        setMembership(null);
      }
      return;
    }
    const preferred = user?.id ? readActiveHotelId(user.id) : null;
    const picked = pickAccessibleProperty(list, preferred)
      ?? pickAccessibleProperty(list, access.hotel?.id)
      ?? list[0];
    setHotel(picked.hotel);
    setMembership(picked);
    if (user?.id) writeActiveHotelId(user.id, picked.hotel.id);
  }, [access, loadingHotel, user?.id]);

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

  const properties = access?.hotels ?? [];
  const ownsAny = properties.some((p) => p.isOwner);

  if (addingProperty && ownsAny) {
    const owned = properties.filter((p) => p.isOwner);
    const inheritReferral =
      (hotel?.referral_code && owned.some((p) => p.hotel.id === hotel.id)
        ? hotel.referral_code
        : null) ||
      owned.find((p) => p.hotel.referral_code)?.hotel.referral_code ||
      null;
    return (
      <CreateHotel
        asAdditional
        portfolioSize={owned.length}
        inheritReferral={inheritReferral}
        onCancel={() => setAddingProperty(false)}
        onCreated={(h) => {
          writeActiveHotelId(user.id, h.id);
          setHotel(h);
          setMembership({
            hotel: h,
            isOwner: true,
            role: "owner",
            departmentKey: null,
            name: null,
          });
          setAddingProperty(false);
          void qc.invalidateQueries({ queryKey: talkstayKeys.access(user.id) });
          void refetchAccess();
        }}
      />
    );
  }

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
          writeActiveHotelId(user.id, h.id);
          setHotel(h);
          setMembership({
            hotel: h,
            isOwner: true,
            role: "owner",
            departmentKey: null,
            name: null,
          });
          void qc.invalidateQueries({ queryKey: talkstayKeys.access(user.id) });
          void refetchAccess();
        }}
      />
    );
  }

  const visibleNav = NAV.filter((n) => canSeeNavItem(membership, { admin: n.admin, key: n.key }));
  const lockedDepartment = resolveLockedDepartment(membership);
  const roleLabel = membershipRoleLabel(membership);

  // A department member should never sit on an admin tab (e.g. after a refresh).
  const effectiveActive: NavKey =
    active === "account" || visibleNav.some((n) => n.key === active) ? active : "operations";
  const activeNav = effectiveActive === "account"
    ? ACCOUNT_META
    : NAV.find((n) => n.key === effectiveActive);
  const activeLabel = activeNav?.label ?? "";
  const activeDesc = activeNav?.desc ?? "";
  const go = (k: NavKey) => {
    setActive(k);
    setNavOpen(false);
    if (k === "account") {
      setSearchParams({ tab: "account" }, { replace: true });
    } else if (searchParams.get("tab")) {
      setSearchParams({}, { replace: true });
    }
  };

  const selectProperty = (p: AccessibleProperty) => {
    if (p.hotel.id === hotel.id) return;
    writeActiveHotelId(user.id, p.hotel.id);
    setHotel(p.hotel);
    setMembership(p);
    setFocusRequestId(null);
    setActive("operations");
    setNavOpen(false);
    toast.message(`Switched to ${p.hotel.name}`);
  };

  const identityName = membership?.name || access?.name || user?.email?.split("@")[0] || "You";
  const identityInitial = identityName.trim().charAt(0).toUpperCase() || "?";
  const portfolioHotels = properties.filter((p) => p.isOwner).map((p) => p.hotel);

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

      <PropertySwitcher
        properties={properties.length ? properties : [{
          hotel,
          isOwner: !!membership?.isOwner,
          role: (membership?.role ?? "owner") as AccessibleProperty["role"],
          departmentKey: membership?.departmentKey ?? null,
          name: membership?.name ?? null,
        }]}
        activeId={hotel.id}
        roleLabel={roleLabel}
        canAdd={ownsAny || !!membership?.isOwner || membership?.role === "owner"}
        onSelect={selectProperty}
        onAdd={() => {
          setNavOpen(false);
          setAddingProperty(true);
        }}
      />

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

      {/* Footer pinned to bottom on desktop + mobile — ops menu ends at Staff */}
      <div className="mt-auto space-y-1 border-t border-white/10 p-3">
        <a
          href="/support"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white"
        >
          <LifeBuoy className="h-4 w-4" /> Support & FAQ
        </a>
        <AlertSoundPicker hotelId={hotel.id} />
        <button
          type="button"
          onClick={() => go("account")}
          className={`mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
            effectiveActive === "account"
              ? "bg-violet-600 text-white"
              : "text-white/60 hover:bg-white/5 hover:text-white"
          }`}
        >
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            effectiveActive === "account" ? "bg-white/20 text-white" : "bg-violet-600/30 text-violet-200"
          }`}>
            {identityInitial}
          </div>
          <div className="min-w-0 flex-1">
            <div className={`truncate text-sm font-medium ${
              effectiveActive === "account" ? "text-white" : "text-white/85"
            }`}>
              Account
            </div>
            {user?.email && (
              <div className={`truncate text-[11px] ${
                effectiveActive === "account" ? "text-white/75" : "text-white/40"
              }`}>
                {user.email}
              </div>
            )}
          </div>
        </button>
      </div>
    </div>
  );

  return (
    // Viewport shell: overflow-x-hidden on min-h-screen was computing overflow-y
    // to auto without a max height, so the page couldn't scroll and sticky nav stuck.
    <div data-talkstay className="ts-atmosphere flex h-[100dvh] overflow-hidden">
      <NoIndexMeta />
      <StaffAlertsHost
        hotelId={hotel.id}
        departmentKey={lockedDepartment}
        onOpenRequest={(id) => { setFocusRequestId(id); setActive("operations"); }}
      />

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
              portfolioHotels={portfolioHotels}
              canAddProperty={ownsAny || !!membership?.isOwner || membership?.role === "owner"}
              onAddProperty={() => setAddingProperty(true)}
              identity={{
                email: user?.email,
                displayName: identityName,
                roleLabel,
              }}
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

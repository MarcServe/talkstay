import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  BookOpen, Building2, Copy, Download, ExternalLink, FileSpreadsheet, Info,
  LayoutGrid, List, Mail, Palette, Plus, Printer, QrCode, RefreshCw,
  Search, Trash2, Upload, UserPlus, X,
} from "lucide-react";
import { DEPARTMENTS } from "@/talkstay/lib/hotels";
import { useDemo } from "@/talkstay/demo/DemoContext";
import { getPublicBaseUrl } from "@/config/environment";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";
import { cn } from "@/lib/utils";
import { KB_SCOPE_CARD, KB_SCOPE_STYLE, OCCUPANCY_STYLE } from "@/talkstay/lib/statusStyles";
import GuestAccessTip from "@/talkstay/components/GuestAccessTip";

const deptLabel = (k: string | null) =>
  !k ? "All departments" : DEPARTMENTS.find((d) => d.key === k)?.display_name ?? k;

const ALL_DEPTS = "__all__";
const ROOMS_VIEW_KEY = "talkstay-demo-rooms-view";

type RoomStatusFilter = "all" | "occupied" | "vacant" | "public";
type RoomsView = "card" | "list";
type KbScope = "site" | "general" | "department" | "room";

const SCOPE_LABEL: Record<KbScope, string> = {
  site: "Website & docs",
  general: "General",
  department: "Department",
  room: "Room",
};

function readRoomsView(): RoomsView {
  try {
    return localStorage.getItem(ROOMS_VIEW_KEY) === "list" ? "list" : "card";
  } catch {
    return "card";
  }
}

/** Short in-product explainers — demo visitors explore alone. */
function FeatureTip({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-sky-200/80 bg-sky-50/80 px-4 py-3 text-sm text-sky-950">
      <div className="flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <div className="min-w-0">
          <p className="font-semibold tracking-tight">{title}</p>
          <div className="mt-1 text-xs leading-relaxed text-sky-900/85">{children}</div>
        </div>
      </div>
    </div>
  );
}

function SandboxNote() {
  return (
    <p className="text-[11px] text-muted-foreground">
      Sandbox only — changes stay in this browser. Nothing is written to a live hotel account.
      Use <span className="font-medium text-foreground">Reset demo data</span> anytime.
    </p>
  );
}

/** Demo Rooms & QR — mirrors the real Rooms panel capabilities. */
export function DemoRoomsPanel() {
  const demo = useDemo()!;
  const [num, setNum] = useState("");
  const [floor, setFloor] = useState("");
  const [qrRoomId, setQrRoomId] = useState<string | null>(null);
  const [qrSurface, setQrSurface] = useState<"chat" | "checkin" | "checkout">("chat");
  const [emailFor, setEmailFor] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RoomStatusFilter>("all");
  const [view, setView] = useState<RoomsView>(readRoomsView);
  const rooms = demo.state.rooms;
  const qrRoom = rooms.find((r) => r.id === qrRoomId) ?? null;
  const requireCode = !!demo.hotel.require_checkin_code;
  const qrUrl = qrRoom
    ? qrSurface === "checkin"
      ? `${getPublicBaseUrl()}/demo/guest/checkin`
      : qrSurface === "checkout"
        ? `${getPublicBaseUrl()}/demo/guest/checkout`
        : `${getPublicBaseUrl()}/demo/guest?room=${encodeURIComponent(qrRoom.room_number)}`
    : "";

  const setRoomsView = (next: RoomsView) => {
    setView(next);
    try { localStorage.setItem(ROOMS_VIEW_KEY, next); } catch { /* ignore */ }
  };

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms.filter((r) => {
      if (q) {
        const hay = `${r.room_number} ${r.floor ?? ""} ${r.checkin_code ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter === "public") return !!r.is_public;
      if (statusFilter === "occupied") return !r.is_public && r.occupancy_status === "occupied";
      if (statusFilter === "vacant") return !r.is_public && r.occupancy_status !== "occupied";
      return true;
    });
  }, [rooms, search, statusFilter]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Code ${code} copied`);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const togglePublic = (roomId: string, currentlyPublic: boolean) => {
    demo.setRoomPublic(roomId, !currentlyPublic);
    toast.success(
      !currentlyPublic
        ? "Public QR — no check-in code, always open (demo)."
        : "Private unit again (demo).",
    );
  };

  const add = () => {
    if (!num.trim()) return;
    demo.addRoom(num.trim(), floor.trim() || null);
    setNum("");
    setFloor("");
    toast.success(`${formatRoomLabel(num.trim())} added with a QR code (demo).`);
  };

  return (
    <div className="space-y-5">
      <GuestAccessTip />
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => { e.preventDefault(); add(); }}
      >
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Name or number</label>
          <Input value={num} onChange={(e) => setNum(e.target.value)} placeholder="214 or Ocean Suite" className="w-44" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Floor / area (optional)</label>
          <Input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="2 or Garden" className="w-32" />
        </div>
        <Button type="submit" className="bg-violet-600 hover:bg-violet-700">
          <Plus className="mr-1.5 h-4 w-4" /> Add unit
        </Button>
      </form>

      <div className="flex items-start justify-between gap-4 rounded-2xl border bg-muted/30 p-4">
        <div className="min-w-0">
          <div className="text-sm font-medium">Require a check-in code (default)</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Property default for private rooms. New devices must enter the room’s code before connecting.
            Override per unit below — use <span className="font-medium text-foreground">Public QR</span> for
            lobby, bar, or shared spaces where anyone can scan freely.
          </p>
        </div>
        <Switch
          checked={requireCode}
          onCheckedChange={(v) => {
            demo.setRequireCheckinCode(v);
            toast.success(v ? "Check-in code now required (demo)." : "Check-in code turned off (demo).");
          }}
        />
      </div>

      {rooms.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No units yet. Add a room number or a name — a QR code is generated automatically.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, floor, or code…"
                className="h-9 pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RoomStatusFilter)}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All units</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="vacant">Vacant</SelectItem>
                <SelectItem value="public">Public QR</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex rounded-lg border p-0.5">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={`h-8 gap-1.5 px-2.5 ${view === "card" ? "bg-violet-100 text-violet-900 hover:bg-violet-100" : ""}`}
                onClick={() => setRoomsView("card")}
                aria-pressed={view === "card"}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={`h-8 gap-1.5 px-2.5 ${view === "list" ? "bg-violet-100 text-violet-900 hover:bg-violet-100" : ""}`}
                onClick={() => setRoomsView("list")}
                aria-pressed={view === "list"}
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">List</span>
              </Button>
            </div>
          </div>

          {filteredRooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No units match{search.trim() ? ` “${search.trim()}”` : ""}. Try another search or clear the filter.
            </p>
          ) : view === "list" ? (
            <div className="divide-y overflow-hidden rounded-2xl border bg-card">
              {filteredRooms.map((r) => {
                const isPublic = !!r.is_public;
                const showCode = !isPublic && !!r.checkin_code && r.occupancy_status === "occupied";
                return (
                  <div
                    key={r.id}
                    className={`flex flex-wrap items-center gap-3 px-4 py-3 ${isPublic ? "bg-sky-50/40" : ""}`}
                  >
                    <div className="min-w-[110px] flex-1">
                      <div className="font-semibold tracking-tight">{formatRoomLabel(r.room_number)}</div>
                      <div className="text-xs text-muted-foreground">
                        Floor {r.floor ?? "—"}
                      </div>
                    </div>

                    {showCode ? (
                      <button
                        type="button"
                        onClick={() => void copyCode(r.checkin_code!)}
                        title="Copy check-in code"
                        className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/40 px-2 py-1 font-mono text-sm tracking-widest hover:border-violet-300 hover:bg-violet-50/60"
                      >
                        {r.checkin_code}
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    ) : (
                      <span className="w-[88px] shrink-0 text-center text-[10px] text-muted-foreground">
                        {isPublic ? "No code" : "—"}
                      </span>
                    )}

                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs">
                      <span className={isPublic ? "font-medium text-sky-800" : "text-muted-foreground"}>
                        Public QR
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isPublic}
                        aria-label={`Public QR for ${formatRoomLabel(r.room_number)}`}
                        onClick={() => togglePublic(r.id, isPublic)}
                        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${isPublic ? "bg-sky-600" : "bg-muted-foreground/30"}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${isPublic ? "left-[18px]" : "left-0.5"}`} />
                      </button>
                    </label>

                    {isPublic ? (
                      <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-800">Public QR</Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className={`capitalize ${OCCUPANCY_STYLE[r.occupancy_status ?? "vacant"] ?? OCCUPANCY_STYLE.vacant}`}
                      >
                        {r.occupancy_status}
                      </Badge>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button size="sm" variant="outline" className="h-8" onClick={() => setQrRoomId(r.id)}>
                        <QrCode className="mr-1 h-3.5 w-3.5" /> QR
                      </Button>
                      <Button size="sm" variant="outline" className="h-8" asChild>
                        <Link to="/demo/guest" target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-1 h-3.5 w-3.5" /> Preview
                        </Link>
                      </Button>
                      {!isPublic && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => {
                            if (r.occupancy_status === "occupied") {
                              const unpaid = demo.state.requests.filter(
                                (req) => req.room_id === r.id && req.is_chargeable && (req.payment_status ?? "unpaid") === "unpaid",
                              );
                              const priced = unpaid.filter((req) => typeof req.price === "number" && Number(req.price) > 0);
                              const total = priced.reduce((sum, req) => sum + Number(req.price), 0);
                              const note = unpaid.length
                                ? priced.length
                                  ? `\n\n⚠ ${unpaid.length} unpaid chargeable item(s) · £${total.toFixed(2)} still owed.`
                                  : `\n\n⚠ ${unpaid.length} unpaid chargeable item(s) — settle in Operations first.`
                                : "";
                              if (!confirm(`Check out ${formatRoomLabel(r.room_number)}?${note}`)) return;
                            }
                            demo.toggleRoomOccupancy(r.id);
                          }}
                        >
                          {r.occupancy_status === "occupied" ? "Check out" : "Check in"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-destructive"
                        onClick={() => {
                          if (!confirm(`Delete ${formatRoomLabel(r.room_number)}?`)) return;
                          demo.removeRoom(r.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredRooms.map((r) => {
                const isPublic = !!r.is_public;
                return (
                <div
                  key={r.id}
                  className={`rounded-2xl border bg-card p-4 shadow-sm ${
                    isPublic ? "border-sky-300/80 ring-1 ring-sky-500/10" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{formatRoomLabel(r.room_number)}</div>
                      <div className="text-xs text-muted-foreground">
                        Floor {r.floor ?? "—"}
                        {!isPublic && r.checkin_code ? ` · code ${r.checkin_code}` : ""}
                      </div>
                    </div>
                    {isPublic ? (
                      <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-800">Public QR</Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className={`capitalize ${OCCUPANCY_STYLE[r.occupancy_status ?? "vacant"] ?? OCCUPANCY_STYLE.vacant}`}
                      >
                        {r.occupancy_status}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border bg-muted/30 px-2.5 py-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium">Public QR area</div>
                      <p className="text-[10px] leading-snug text-muted-foreground">
                        Lobby, bar, spa — no code, always open
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isPublic}
                      onClick={() => togglePublic(r.id, isPublic)}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${isPublic ? "bg-sky-600" : "bg-muted-foreground/30"}`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${isPublic ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setQrRoomId(r.id)}>
                      <QrCode className="mr-1 h-3.5 w-3.5" /> QR
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/demo/guest" target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-1 h-3.5 w-3.5" /> Preview
                      </Link>
                    </Button>
                    {!isPublic && r.checkin_code && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void copyCode(r.checkin_code!)}
                        >
                          <Copy className="mr-1 h-3.5 w-3.5" /> Code
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const code = demo.regenerateCheckinCode(r.id);
                            toast.success(code ? `New code: ${code}` : "Regenerated");
                          }}
                        >
                          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Regen
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setEmailFor(r.id); setEmailInput(""); }}>
                          <Mail className="mr-1 h-3.5 w-3.5" /> Email
                        </Button>
                      </>
                    )}
                    {!isPublic && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (r.occupancy_status === "occupied") {
                            const unpaid = demo.state.requests.filter(
                              (req) => req.room_id === r.id && req.is_chargeable && (req.payment_status ?? "unpaid") === "unpaid",
                            );
                            const priced = unpaid.filter((req) => typeof req.price === "number" && Number(req.price) > 0);
                            const total = priced.reduce((sum, req) => sum + Number(req.price), 0);
                            const note = unpaid.length
                              ? priced.length
                                ? `\n\n⚠ ${unpaid.length} unpaid chargeable item(s) · £${total.toFixed(2)} still owed.`
                                : `\n\n⚠ ${unpaid.length} unpaid chargeable item(s) — settle in Operations first.`
                              : "";
                            if (!confirm(`Check out ${formatRoomLabel(r.room_number)}?${note}`)) return;
                          }
                          demo.toggleRoomOccupancy(r.id);
                          toast.message(r.occupancy_status === "occupied" ? "Checked out (demo)." : "Checked in (demo).");
                        }}
                      >
                        {r.occupancy_status === "occupied" ? "Check out" : "Check in"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (!confirm(`Delete ${formatRoomLabel(r.room_number)}?`)) return;
                        demo.removeRoom(r.id);
                        toast.message("Removed (demo).");
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {emailFor === r.id && (
                    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border bg-muted/20 p-3">
                      <div className="min-w-[180px] flex-1">
                        <label className="mb-1 block text-xs text-muted-foreground">Guest email</label>
                        <Input
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="guest@email.com"
                        />
                      </div>
                      <Button
                        size="sm"
                        className="bg-violet-600 hover:bg-violet-700"
                        onClick={() => {
                          if (!emailInput.includes("@")) {
                            toast.error("Enter a valid email");
                            return;
                          }
                          toast.success(`Would email code ${r.checkin_code} to ${emailInput} (demo).`);
                          setEmailFor(null);
                        }}
                      >
                        Send code
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEmailFor(null)}>Cancel</Button>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {qrRoom && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-violet-50/60 p-6 text-center">
          <p className="text-sm font-medium">Guest QR · {formatRoomLabel(qrRoom.room_number)}</p>
          <div className="grid w-full max-w-xs grid-cols-3 gap-1 rounded-xl bg-white/80 p-1">
            {([
              ["chat", "Ask"],
              ["checkin", "In"],
              ["checkout", "Out"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setQrSurface(key)}
                className={`rounded-lg px-1.5 py-1.5 text-[11px] font-semibold ${
                  qrSurface === key ? "bg-violet-600 text-white" : "text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <QRCodeCanvas value={qrUrl} size={180} includeMargin />
          <p className="max-w-sm text-xs text-muted-foreground">
            {qrSurface === "checkout"
              ? "Checkout QR opens the stay balance with prices."
              : qrSurface === "checkin"
                ? "Check-in QR opens the arrival landing."
                : "Ask QR opens the guest assistant."}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to={qrSurface === "checkin" ? "/demo/guest/checkin" : qrSurface === "checkout" ? "/demo/guest/checkout" : "/demo/guest"} target="_blank" rel="noreferrer">
                Open
              </Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => setQrRoomId(null)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Demo Branding — Identity / Property / Poster tabs like the live panel. */
export function DemoBrandingPanel() {
  const demo = useDemo()!;
  const branding = demo.hotel.branding ?? {};
  const [color, setColor] = useState(branding.primary_color ?? "#4c2bb8");
  const [tagline, setTagline] = useState(branding.tagline ?? "");
  const [wash, setWash] = useState(branding.guest_bg_wash ?? 0.88);
  const [profile, setProfile] = useState({
    type: branding.property?.type ?? "hotel",
    address: branding.property?.address ?? "",
    city: branding.property?.city ?? "",
    room_count: branding.property?.room_count ?? 48,
  });

  return (
    <div className="space-y-5">
      <FeatureTip title="What Branding controls">
        Identity sets the colour, logo and tagline guests see. Property profile helps Insights give advice
        that fits your scale. Poster is the printable in-room QR card. Try changing the colour — it updates
        this sandbox only.
      </FeatureTip>
      <SandboxNote />

      <Tabs defaultValue="identity" className="space-y-5">
        <TabsList>
          <TabsTrigger value="identity"><Palette className="mr-1.5 h-4 w-4" /> Identity</TabsTrigger>
          <TabsTrigger value="property"><Building2 className="mr-1.5 h-4 w-4" /> Property</TabsTrigger>
          <TabsTrigger value="poster"><Printer className="mr-1.5 h-4 w-4" /> Poster</TabsTrigger>
        </TabsList>

        <TabsContent value="identity" className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Primary colour</label>
              <div className="flex items-center gap-3">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 cursor-pointer rounded" />
                <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Tagline</label>
              <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Guest background wash ({Math.round((1 - wash) * 100)}% photo visible)
              </label>
              <input
                type="range"
                min={0.5}
                max={0.95}
                step={0.01}
                value={wash}
                onChange={(e) => setWash(Number(e.target.value))}
                className="w-full"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Live properties upload a lobby/room photo; wash keeps text readable over it.
              </p>
            </div>
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              <Upload className="mb-2 h-4 w-4" />
              Logo upload — on a live account you’d drop a PNG/JPG here. Demo keeps the TalkStay mark.
            </div>
            <Button
              className="bg-violet-600 hover:bg-violet-700"
              onClick={() => {
                demo.updateBranding({ primary_color: color, tagline, guest_bg_wash: wash });
                toast.success("Branding saved (demo sandbox).");
              }}
            >
              <Palette className="mr-1.5 h-4 w-4" /> Save branding
            </Button>
          </div>
          <div
            className="flex flex-col justify-between rounded-3xl p-6 text-white shadow-lg"
            style={{ background: `linear-gradient(160deg, ${color}, #2e1065)` }}
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-white/70">In-room poster preview</p>
              <h3 className="mt-3 text-2xl font-bold">{demo.hotel.name.replace(" (Demo)", "")}</h3>
              <p className="mt-2 text-white/85">{tagline || "Need something? Just speak."}</p>
            </div>
            <div className="mt-8 rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="text-sm font-medium">Scan to speak with your room assistant</p>
              <p className="mt-1 text-xs text-white/70">Powered by TalkStay</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="property" className="max-w-xl space-y-4">
          <p className="text-sm text-muted-foreground">
            Tell TalkStay whether this is a hotel, Airbnb, or B&amp;B — Insights uses this for advice that
            fits your scale and location.
          </p>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Property type</label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={profile.type}
              onChange={(e) => setProfile((p) => ({ ...p, type: e.target.value }))}
            >
              <option value="hotel">Hotel</option>
              <option value="bnb">B&amp;B / Guesthouse</option>
              <option value="airbnb">Short-let / Airbnb</option>
              <option value="serviced">Serviced apartments</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Address</label>
            <Input
              value={profile.address}
              onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">City</label>
              <Input
                value={profile.city}
                onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Room count</label>
              <Input
                type="number"
                value={profile.room_count}
                onChange={(e) => setProfile((p) => ({ ...p, room_count: Number(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <Button
            className="bg-violet-600 hover:bg-violet-700"
            onClick={() => {
              demo.updateBranding({ property: profile });
              toast.success("Property profile saved (demo).");
            }}
          >
            Save property profile
          </Button>
        </TabsContent>

        <TabsContent value="poster">
          <FeatureTip title="Printable in-room poster">
            Live accounts generate a branded PDF with each room’s QR. Guests scan from the nightstand —
            no app download. Demo shows the same layout using your Identity colour.
          </FeatureTip>
          <div
            className="mx-auto mt-4 flex max-w-sm flex-col justify-between rounded-3xl p-8 text-white shadow-lg"
            style={{ background: `linear-gradient(160deg, ${color}, #2e1065)`, aspectRatio: "3/4" }}
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-white/70">In-room poster</p>
              <h3 className="mt-4 text-3xl font-bold">{demo.hotel.name.replace(" (Demo)", "")}</h3>
              <p className="mt-3 text-lg text-white/90">{tagline || "Need something? Just speak."}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 text-center text-violet-950">
              <div className="mx-auto mb-2 flex h-28 w-28 items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground">
                Room QR
              </div>
              <p className="text-sm font-semibold">Scan to speak with your room assistant</p>
              <p className="mt-1 text-xs text-muted-foreground">Powered by TalkStay</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Demo Departments — same layout as live Departments panel. */
export function DemoDepartmentsPanel() {
  const demo = useDemo()!;
  const [newDept, setNewDept] = useState("");

  const assignedTo = (deptKey: string) =>
    demo.state.staff.filter((s) => s.department_key === deptKey);

  const peopleFor = (deptKey: string) =>
    demo.state.staff.filter((s) => s.department_key !== deptKey);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Requests are auto-routed to these teams. Add an alert email and an escalation time for each.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            toast.message("Custom departments can be added on a live property — sandbox keeps the standard set.");
            setNewDept("");
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            placeholder="Add a department (e.g. Spa, Valet)"
            className="w-56"
          />
          <Button type="submit" size="sm" disabled={!newDept.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </form>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Escalation call:</span>
          <Input
            type="tel"
            defaultValue="+44 7700 900123"
            placeholder="+44 7… (rings when overdue)"
            className="h-8 w-52"
            onBlur={() => toast.message("Escalation phone saved in demo only.")}
          />
        </div>
      </div>

      <div className="divide-y rounded-2xl border">
        {demo.state.departments.map((d) => (
          <div key={d.id} className="space-y-2 px-4 py-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="flex items-center gap-3">
                <Switch
                  checked={d.is_active}
                  onCheckedChange={(v) => demo.patchDepartment(d.id, { is_active: v })}
                />
                <Input
                  defaultValue={d.display_name}
                  className="h-8 w-40 font-medium"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== d.display_name) demo.patchDepartment(d.id, { display_name: v });
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="email"
                  defaultValue={d.notify_email ?? ""}
                  placeholder="alert email (optional)"
                  className="h-8 w-56"
                  onBlur={(e) => {
                    const v = e.target.value.trim() || null;
                    if (v !== (d.notify_email ?? null)) demo.patchDepartment(d.id, { notify_email: v });
                  }}
                />
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>escalate after</span>
                  <Input
                    type="number"
                    min={1}
                    defaultValue={d.escalate_after_minutes}
                    className="h-8 w-16"
                    onBlur={(e) => {
                      const n = Math.max(1, parseInt(e.target.value || "5", 10));
                      if (n !== d.escalate_after_minutes) {
                        demo.patchDepartment(d.id, { escalate_after_minutes: n });
                      }
                    }}
                  />
                  <span>min</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pl-11">
              <span className="text-xs text-muted-foreground">Staff:</span>
              {assignedTo(d.key).map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                  {s.name || s.email}
                  <button
                    type="button"
                    onClick={() => {
                      demo.assignStaffDepartment(s.id, null);
                      toast.message(`${s.name} unassigned (demo).`);
                    }}
                    aria-label="remove"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </span>
              ))}
              {peopleFor(d.key).length > 0 && (
                <Select
                  value=""
                  onValueChange={(staffId) => {
                    demo.assignStaffDepartment(staffId, d.key);
                    toast.success("Staff assigned (demo).");
                  }}
                >
                  <SelectTrigger className="h-7 w-36 text-xs">
                    <SelectValue placeholder="+ add staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {peopleFor(d.key).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name || p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {demo.state.staff.length === 0 && (
                <span className="text-xs text-muted-foreground">— add people on the Staff tab first</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Assigned staff receive this team’s alerts. No email set? Alerts fall back to the property owner;
        complaints always also notify the owner.
      </p>
    </div>
  );
}

/** Demo Knowledge — same scope tabs + website/docs section as live. */
export function DemoKnowledgePanel() {
  const demo = useDemo()!;
  const [scope, setScope] = useState<KbScope>("site");
  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState("");
  const [dept, setDept] = useState("housekeeping");
  const [roomId, setRoomId] = useState(demo.state.rooms[0]?.id ?? "");
  const [website, setWebsite] = useState("https://www.your-property.com");

  const filtered = demo.state.knowledge.filter((k) => {
    if (scope === "site") return false;
    if (k.scope !== scope) return false;
    if (scope === "department" && k.department_key && k.department_key !== dept) return false;
    return true;
  });

  const add = () => {
    if (!title.trim() || !preview.trim()) return;
    demo.addKnowledge(title.trim(), preview.trim(), {
      scope: scope === "site" ? "general" : scope,
      department_key: scope === "department" ? dept : null,
      kind: "FAQ",
    });
    setTitle("");
    setPreview("");
    toast.success("Knowledge added (demo).");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {(["site", "general", "department", "room"] as KbScope[]).map((s) => (
          <Button
            key={s}
            size="sm"
            variant="outline"
            onClick={() => setScope(s)}
            className={cn(
              "border",
              scope === s
                ? KB_SCOPE_STYLE[s]
                : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/50",
            )}
          >
            {SCOPE_LABEL[s]}
          </Button>
        ))}
        {scope === "department" && (
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d.key} value={d.key}>{d.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {scope === "room" && (
          <Select value={roomId} onValueChange={setRoomId}>
            <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Select room" /></SelectTrigger>
            <SelectContent>
              {demo.state.rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>{formatRoomLabel(r.room_number)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {scope === "site" ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-dashed bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <Upload className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Website crawl &amp; document upload</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Paste your website to crawl pages, or upload menus / house rules as PDF or images.
                  TalkStay extracts answers for the guest assistant.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <div className="flex min-w-[220px] flex-1 items-center gap-2">
                    <Input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://your-hotel.com"
                      className="h-9"
                    />
                    <Button
                      size="sm"
                      className="shrink-0 bg-violet-600 hover:bg-violet-700"
                      onClick={() => toast.success("Website saved — crawl runs on live accounts (demo).")}
                    >
                      Update &amp; rescan
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.message("Document upload is available on live accounts.")}
                  >
                    <Upload className="mr-1 h-3.5 w-3.5" /> Upload menu / PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Website content powers general property answers. Add FAQs under General / Department / Room for
            layered knowledge the assistant only shares when relevant.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {scope === "general" && "General FAQs apply to every guest."}
            {scope === "department" && "Department entries surface when that team’s services are relevant."}
            {scope === "room" && "Room entries only apply to that unit’s guest."}
          </p>

          <div className={`space-y-3 rounded-2xl border p-4 ${KB_SCOPE_CARD[scope] ?? ""}`}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title — e.g. Pool hours" />
              <Input value={preview} onChange={(e) => setPreview(e.target.value)} placeholder="Answer guests should hear" />
            </div>
            <Button className="bg-violet-600 hover:bg-violet-700" onClick={add}>
              <Plus className="mr-1.5 h-4 w-4" /> Add to knowledge
            </Button>
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No entries in this scope yet.</p>
            ) : (
              filtered.map((k) => (
                <div key={k.id} className="flex items-start justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm">
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{k.title}</span>
                        <Badge variant="outline">{k.kind}</Badge>
                        <Badge variant="secondary">{SCOPE_LABEL[k.scope as KbScope] ?? k.scope}</Badge>
                        {k.department_key && (
                          <span className="text-[11px] text-muted-foreground">{deptLabel(k.department_key)}</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{k.preview}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      demo.removeKnowledge(k.id);
                      toast.message("Removed (demo).");
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Demo Staff — same invite + roster layout as live Staff panel. */
export function DemoStaffPanel() {
  const demo = useDemo()!;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dept, setDept] = useState(ALL_DEPTS);
  const [role, setRole] = useState("staff");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const deptOptions = useMemo(() => {
    const active = demo.state.departments.filter((d) => d.is_active);
    const list = active.length ? active : demo.state.departments;
    const map = new Map(list.map((d) => [d.key, d.display_name]));
    for (const s of demo.state.staff) {
      if (s.department_key && !map.has(s.department_key)) {
        map.set(s.department_key, s.department_key.replace(/_/g, " "));
      }
    }
    return [...map.entries()]
      .map(([key, display_name]) => ({ key, display_name }))
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [demo.state.departments, demo.state.staff, demo.version]);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter a staff email first.");
      return;
    }
    demo.addStaff({
      name: name.trim() || email.split("@")[0],
      email: email.trim(),
      department_key: dept === ALL_DEPTS ? null : dept,
      role,
    });
    setName("");
    setEmail("");
    toast.success("Staff added (demo — no invite email sent).");
  };

  return (
    <div className="space-y-5">
      <form onSubmit={add} className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs text-muted-foreground">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sarah" className="w-36" />
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">Staff email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@yourproperty.com" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Department</label>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_DEPTS}>All departments</SelectItem>
              {deptOptions.map((d) => <SelectItem key={d.key} value={d.key}>{d.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Role</label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="bg-violet-600 hover:bg-violet-700">
          <UserPlus className="mr-1 h-4 w-4" /> Add staff
        </Button>
      </form>

      <div className="rounded-2xl border border-dashed bg-muted/20 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <FileSpreadsheet className="h-5 w-5 shrink-0 text-violet-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Bulk import (CSV / Excel)</p>
            <p className="text-xs text-muted-foreground">
              Columns: name, email, department, role — max 100 per import. Each person gets an invite email.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const sample = "name,email,department,role\nSarah Campbell,sarah@hotel.com,bar,staff\nHelen Park,helen@hotel.com,housekeeping,staff\n";
              const blob = new Blob([sample], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "talkstay-staff-import.csv";
              a.click();
              URL.revokeObjectURL(url);
              toast.message("Sample CSV downloaded — import runs on live accounts.");
            }}
          >
            <Download className="mr-1 h-3.5 w-3.5" /> Sample CSV
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => toast.message("Upload roster is enabled on live Staff — add people above in the demo.")}
          >
            <Upload className="mr-1 h-3.5 w-3.5" /> Import team
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium text-right">Invite</th>
            </tr>
          </thead>
          <tbody>
            {demo.state.staff.map((s) => (
              <tr key={s.id} className="border-t align-middle">
                <td className="px-4 py-3">
                  <Input
                    className="h-8 w-36"
                    value={drafts[s.id] ?? s.name ?? ""}
                    placeholder="Add name"
                    onChange={(e) => setDrafts((d) => ({ ...d, [s.id]: e.target.value }))}
                    onBlur={() => {
                      const next = (drafts[s.id] ?? s.name ?? "").trim();
                      if (next && next !== (s.name ?? "")) {
                        demo.assignStaffDepartment(s.id, s.department_key);
                        toast.message("Name edits save on live Staff; sandbox keeps the roster interactive.");
                      }
                    }}
                  />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                <td className="px-4 py-3">
                  <Select
                    value={s.department_key ?? ALL_DEPTS}
                    onValueChange={(v) => {
                      demo.assignStaffDepartment(s.id, v === ALL_DEPTS ? null : v);
                      toast.success("Department updated (demo).");
                    }}
                  >
                    <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_DEPTS}>All departments</SelectItem>
                      {deptOptions.map((d) => (
                        <SelectItem key={d.key} value={d.key}>{d.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={s.role}
                    onValueChange={() => toast.message("Role changes apply on live Staff; use View as in the sidebar here.")}
                  >
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => toast.message(`Would resend invite to ${s.email} (demo).`)}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Resend invite
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (!confirm(`Remove ${s.email}?`)) return;
                        demo.removeStaff(s.id);
                        toast.message("Removed (demo).");
                      }}
                      aria-label={`Remove ${s.email}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
        <p><strong className="text-foreground">Staff</strong> see only their department&apos;s live queue.</p>
        <p className="mt-1">
          <strong className="text-foreground">Manager</strong> sees every department plus Insights. Use{" "}
          <strong className="text-foreground">View as</strong> in the sidebar to try a department staffer’s queue.
        </p>
      </div>
    </div>
  );
}


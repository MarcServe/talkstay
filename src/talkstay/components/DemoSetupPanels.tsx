import { useState } from "react";
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
  Mail, Palette, Plus, Printer, QrCode, RefreshCw, Trash2, Upload, UserPlus, Users, X,
} from "lucide-react";
import { DEPARTMENTS } from "@/talkstay/lib/hotels";
import { useDemo } from "@/talkstay/demo/DemoContext";
import { getPublicBaseUrl } from "@/config/environment";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";

const deptLabel = (k: string | null) =>
  !k ? "All departments" : DEPARTMENTS.find((d) => d.key === k)?.display_name ?? k;

const SCOPE_LABEL: Record<string, string> = {
  site: "Website & docs",
  general: "General",
  department: "Department",
  room: "Room",
};

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
  const [emailFor, setEmailFor] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const rooms = demo.state.rooms;
  const qrRoom = rooms.find((r) => r.id === qrRoomId) ?? null;
  const requireCode = !!demo.hotel.require_checkin_code;
  const qrUrl = qrRoom
    ? `${getPublicBaseUrl()}/demo/guest?room=${encodeURIComponent(qrRoom.room_number)}`
    : "";

  const add = () => {
    if (!num.trim()) return;
    demo.addRoom(num.trim(), floor.trim() || null);
    setNum("");
    setFloor("");
    toast.success(`${formatRoomLabel(num.trim())} added with a QR code (demo).`);
  };

  return (
    <div className="space-y-5">
      <FeatureTip title="What Rooms & QR does on a live property">
        Each unit gets a unique QR that opens that room’s guest assistant. Occupied rooms can require a
        check-in code so a previous guest’s saved link stops working. Preview opens the guest view;
        email sends the code + link to the booking email. In this demo, QR / Preview open the Guest demo
        for Room {qrRoom?.room_number ?? "306"}.
      </FeatureTip>
      <SandboxNote />

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
            Property default for private rooms. New devices must enter the room’s code before connecting —
            so a checked-out guest can’t keep chatting on a saved link.
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

      <div className="grid gap-3 sm:grid-cols-2">
        {rooms.map((r) => (
          <div key={r.id} className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{formatRoomLabel(r.room_number)}</div>
                <div className="text-xs text-muted-foreground">
                  Floor {r.floor ?? "—"}
                  {r.checkin_code ? ` · code ${r.checkin_code}` : ""}
                </div>
              </div>
              <Badge
                variant="outline"
                className={r.occupancy_status === "occupied" ? "border-emerald-300 text-emerald-700" : ""}
              >
                {r.occupancy_status}
              </Badge>
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
              {r.checkin_code && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(r.checkin_code!);
                        toast.success(`Code ${r.checkin_code} copied`);
                      } catch {
                        toast.error("Couldn't copy");
                      }
                    }}
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (r.occupancy_status === "occupied"
                    && !confirm(`Check out ${formatRoomLabel(r.room_number)}? Saved guest links would stop working on a live property.`)) {
                    return;
                  }
                  demo.toggleRoomOccupancy(r.id);
                  toast.message(r.occupancy_status === "occupied" ? "Checked out (demo)." : "Checked in (demo).");
                }}
              >
                {r.occupancy_status === "occupied" ? "Check out" : "Check in"}
              </Button>
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
                  <label className="mb-1 block text-xs text-muted-foreground">Guest email (from booking)</label>
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
                    toast.success(`Would email code ${r.checkin_code} to ${emailInput} (demo — no email sent).`);
                    setEmailFor(null);
                  }}
                >
                  Send code
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEmailFor(null)}>Cancel</Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {qrRoom && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-violet-50/60 p-6 text-center">
          <p className="text-sm font-medium">Guest QR · {formatRoomLabel(qrRoom.room_number)}</p>
          <QRCodeCanvas value={qrUrl} size={180} includeMargin />
          <p className="max-w-sm text-xs text-muted-foreground">
            Live properties print this on the in-room poster. Scanning opens that room’s assistant with a
            secure token. Demo QR opens the Guest experience.
          </p>
          <Button size="sm" variant="outline" onClick={() => setQrRoomId(null)}>Close</Button>
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

/** Demo Departments — staff chips, alert email, escalation like live. */
export function DemoDepartmentsPanel() {
  const demo = useDemo()!;
  const [newDept, setNewDept] = useState("");

  const assignedTo = (deptKey: string) =>
    demo.state.staff.filter((s) => s.department_key === deptKey);

  return (
    <div className="space-y-4">
      <FeatureTip title="What Departments does">
        Requests auto-route to the matching team. Assign staff so only that queue lights up for them.
        Set an alert email and “escalate after X minutes” so overdue tickets ring the duty phone.
        Managers still see every department; staff only see theirs (try <strong>View as</strong> in the sidebar).
      </FeatureTip>
      <SandboxNote />

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
          <Button type="submit" size="sm" variant="outline">
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
                  {demo.state.staff
                    .filter((s) => s.department_key !== d.key)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name || p.email}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
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

/** Demo Knowledge — scopes + website/docs section like live. */
export function DemoKnowledgePanel() {
  const demo = useDemo()!;
  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState("");
  const [scope, setScope] = useState<"general" | "department" | "room">("general");
  const [dept, setDept] = useState("housekeeping");

  const add = () => {
    if (!title.trim() || !preview.trim()) return;
    demo.addKnowledge(title.trim(), preview.trim(), {
      scope,
      department_key: scope === "department" ? dept : null,
      kind: "FAQ",
    });
    setTitle("");
    setPreview("");
    toast.success("Knowledge added (demo).");
  };

  return (
    <div className="space-y-5">
      <FeatureTip title="What Knowledge does">
        This is what the voice assistant knows. <strong>Website &amp; docs</strong> indexes your site and
        uploaded menus/PDFs. <strong>General</strong> FAQs apply everywhere. <strong>Department</strong> and{" "}
        <strong>Room</strong> entries only surface for that team or unit — e.g. a room-service menu or a note
        about a connecting door. Guests never see the admin labels; they just get the right answer.
      </FeatureTip>
      <SandboxNote />

      <div className="rounded-2xl border border-dashed bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <Upload className="mt-0.5 h-5 w-5 text-violet-600" />
          <div>
            <p className="text-sm font-medium">Website crawl &amp; document upload</p>
            <p className="mt-1 text-xs text-muted-foreground">
              On a live property you’d paste your website URL to crawl pages, and upload menus / house rules
              as PDF or images. TalkStay extracts answers automatically. Try the FAQ form below to feel the
              layered knowledge model in this sandbox.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast.message("Website crawl runs on live accounts — not in the sandbox.")}
              >
                Crawl website
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast.message("Document upload is available on live accounts. Add an FAQ below to explore scopes.")}
              >
                <Upload className="mr-1 h-3.5 w-3.5" /> Upload menu / PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium">Add knowledge</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title — e.g. Pool hours" />
          <Input value={preview} onChange={(e) => setPreview(e.target.value)} placeholder="Answer guests should hear" />
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Scope</label>
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={scope}
              onChange={(e) => setScope(e.target.value as typeof scope)}
            >
              <option value="general">General (all guests)</option>
              <option value="department">Department</option>
              <option value="room">Room-specific</option>
            </select>
          </div>
          {scope === "department" && (
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Department</label>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={dept}
                onChange={(e) => setDept(e.target.value)}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d.key} value={d.key}>{d.display_name}</option>
                ))}
              </select>
            </div>
          )}
          <Button className="bg-violet-600 hover:bg-violet-700" onClick={add}>
            <Plus className="mr-1.5 h-4 w-4" /> Add to knowledge
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {demo.state.knowledge.map((k) => (
          <div key={k.id} className="flex items-start justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{k.title}</span>
                  <Badge variant="outline">{k.kind}</Badge>
                  <Badge variant="secondary">{SCOPE_LABEL[k.scope] ?? k.scope}</Badge>
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
        ))}
      </div>
    </div>
  );
}

/** Demo Staff — invite + roster + live-share explainer. */
export function DemoStaffPanel() {
  const demo = useDemo()!;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dept, setDept] = useState("housekeeping");
  const [role, setRole] = useState("staff");

  const add = () => {
    if (!email.trim()) return;
    demo.addStaff({
      name: name.trim() || email.split("@")[0],
      email: email.trim(),
      department_key: dept === "all" ? null : dept,
      role,
    });
    setName("");
    setEmail("");
    toast.success("Staff added (demo — no invite email sent).");
  };

  return (
    <div className="space-y-5">
      <FeatureTip title="What Staff does">
        Invite teammates by email. <strong>Staff</strong> assigned to a department only see that queue;
        <strong> Managers / Owners</strong> see everything plus Insights and setup. Bulk CSV/Excel import
        onboards a whole roster at once. Live share links (below) let campaigns watch the ops board
        read-only — without signing in.
      </FeatureTip>
      <SandboxNote />

      <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4">
        <p className="text-sm font-semibold text-teal-950">Campaign live view (read-only)</p>
        <p className="mt-1 text-xs leading-relaxed text-teal-900/85">
          On a live property, Staff → Live share creates a public link like{" "}
          <code className="rounded bg-white/80 px-1">/live/…</code> so partners can watch the real queue
          update as guests message a room QR — no login, no edits. Use that when you want true real-time
          for a pitch; this sandbox keeps ops interactive without touching your admin hotel.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-3 border-teal-300 bg-white"
          onClick={() => toast.message("Create a Live share link from your signed-in Staff tab on a sandbox hotel.")}
        >
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> How live share works
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sarah" className="w-36" />
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@hotel.com" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Department</label>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={dept}
            onChange={(e) => setDept(e.target.value)}
          >
            <option value="all">All departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.key} value={d.key}>{d.display_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Role</label>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        <Button onClick={add} className="bg-violet-600 hover:bg-violet-700">
          <UserPlus className="mr-1.5 h-4 w-4" /> Invite staff
        </Button>
      </div>

      <div className="rounded-2xl border border-dashed p-4">
        <div className="flex flex-wrap items-center gap-3">
          <FileSpreadsheet className="h-5 w-5 text-violet-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Bulk import (CSV / Excel)</p>
            <p className="text-xs text-muted-foreground">
              Live accounts accept a roster upload. Columns: name, email, department, role.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const sample = "name,email,department,role\nSarah Campbell,sarah@hotel.com,bar,staff\n";
              const blob = new Blob([sample], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "talkstay-staff-sample.csv";
              a.click();
              URL.revokeObjectURL(url);
              toast.message("Sample CSV downloaded — import runs on live accounts.");
            }}
          >
            <Download className="mr-1 h-3.5 w-3.5" /> Sample CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.message("Upload is enabled on live Staff — add people one-by-one here in the demo.")}
          >
            <Upload className="mr-1 h-3.5 w-3.5" /> Upload roster
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Department</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {demo.state.staff.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{deptLabel(s.department_key)}</td>
                <td className="px-4 py-3 capitalize">{s.role}</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      demo.removeStaff(s.id);
                      toast.message("Removed (demo).");
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        After inviting, open Departments to attach people to team queues — or use View as in the sidebar to
        see a department staffer’s limited dashboard.
      </p>
    </div>
  );
}

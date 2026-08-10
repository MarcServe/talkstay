import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BookOpen, Building2, Palette, Plus, QrCode, Trash2, Users,
} from "lucide-react";
import { DEPARTMENTS } from "@/talkstay/lib/hotels";
import { useDemo } from "@/talkstay/demo/DemoContext";
import { getPublicBaseUrl } from "@/config/environment";

const deptLabel = (k: string | null) =>
  !k ? "All departments" : DEPARTMENTS.find((d) => d.key === k)?.display_name ?? k;

/** Demo Rooms & QR — full explore, in-memory only. */
export function DemoRoomsPanel() {
  const demo = useDemo()!;
  const [num, setNum] = useState("");
  const [floor, setFloor] = useState("");
  const [qrRoomId, setQrRoomId] = useState<string | null>(null);
  const rooms = demo.state.rooms;
  const qrRoom = rooms.find((r) => r.id === qrRoomId) ?? null;
  const qrUrl = qrRoom
    ? `${getPublicBaseUrl()}/demo?room=${encodeURIComponent(qrRoom.room_number)}`
    : "";

  const add = () => {
    if (!num.trim()) return;
    demo.addRoom(num.trim(), floor.trim() || null);
    setNum("");
    setFloor("");
    toast.success(`Room ${num.trim()} added (demo).`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Room number</label>
          <Input value={num} onChange={(e) => setNum(e.target.value)} placeholder="701" className="w-28" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Floor</label>
          <Input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="7" className="w-24" />
        </div>
        <Button onClick={add} className="bg-violet-600 hover:bg-violet-700">
          <Plus className="mr-1.5 h-4 w-4" /> Add room
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {rooms.map((r) => (
          <div key={r.id} className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">Room {r.room_number}</div>
                <div className="text-xs text-muted-foreground">
                  Floor {r.floor ?? "—"} · {r.occupancy_status}
                  {r.checkin_code ? ` · code ${r.checkin_code}` : ""}
                </div>
              </div>
              <Badge variant="outline" className={r.occupancy_status === "occupied" ? "border-emerald-300 text-emerald-700" : ""}>
                {r.occupancy_status}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setQrRoomId(r.id)}>
                <QrCode className="mr-1 h-3.5 w-3.5" /> QR
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                demo.toggleRoomOccupancy(r.id);
                toast.message(r.occupancy_status === "occupied" ? "Checked out (demo)." : "Checked in (demo).");
              }}>
                {r.occupancy_status === "occupied" ? "Check out" : "Check in"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => {
                demo.removeRoom(r.id);
                toast.message(`Room ${r.room_number} removed (demo).`);
              }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {qrRoom && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-violet-50/60 p-6 text-center">
          <p className="text-sm font-medium">Guest QR · Room {qrRoom.room_number}</p>
          <QRCodeCanvas value={qrUrl} size={180} includeMargin />
          <p className="max-w-sm text-xs text-muted-foreground">
            In production this opens the guest voice assistant for that room. In the demo it links back to /demo.
          </p>
          <Button size="sm" variant="outline" onClick={() => setQrRoomId(null)}>Close</Button>
        </div>
      )}
    </div>
  );
}

/** Demo Branding. */
export function DemoBrandingPanel() {
  const demo = useDemo()!;
  const [color, setColor] = useState(demo.hotel.branding?.primary_color ?? "#4c2bb8");
  const [tagline, setTagline] = useState(demo.hotel.branding?.tagline ?? "");

  const save = () => {
    demo.updateBranding({ primary_color: color, tagline });
    toast.success("Branding saved (demo).");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
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
        <Button onClick={save} className="bg-violet-600 hover:bg-violet-700">
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
    </div>
  );
}

/** Demo Departments. */
export function DemoDepartmentsPanel() {
  const demo = useDemo()!;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Toggle teams on or off. Active departments receive routed guest requests.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {demo.state.departments.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium">{d.display_name}</div>
                <div className="text-xs text-muted-foreground">{d.key}</div>
              </div>
            </div>
            <Button
              size="sm"
              variant={d.is_active ? "default" : "outline"}
              className={d.is_active ? "bg-violet-600 hover:bg-violet-700" : ""}
              onClick={() => {
                demo.toggleDepartment(d.id);
                toast.message(`${d.display_name} ${d.is_active ? "paused" : "activated"} (demo).`);
              }}
            >
              {d.is_active ? "Active" : "Paused"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Demo Knowledge. */
export function DemoKnowledgePanel() {
  const demo = useDemo()!;
  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState("");

  const add = () => {
    if (!title.trim() || !preview.trim()) return;
    demo.addKnowledge(title.trim(), preview.trim());
    setTitle("");
    setPreview("");
    toast.success("Knowledge added (demo).");
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium">Add a quick FAQ</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title — e.g. Pool hours" />
          <Input value={preview} onChange={(e) => setPreview(e.target.value)} placeholder="Answer guests should hear" />
        </div>
        <Button className="mt-3 bg-violet-600 hover:bg-violet-700" onClick={add}>
          <Plus className="mr-1.5 h-4 w-4" /> Add to knowledge
        </Button>
      </div>
      <div className="space-y-3">
        {demo.state.knowledge.map((k) => (
          <div key={k.id} className="flex items-start justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{k.title}</span>
                  <Badge variant="outline">{k.kind}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{k.preview}</p>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => {
              demo.removeKnowledge(k.id);
              toast.message("Removed (demo).");
            }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Demo Staff. */
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
          <Users className="mr-1.5 h-4 w-4" /> Add staff
        </Button>
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
                  <Button size="sm" variant="ghost" onClick={() => {
                    demo.removeStaff(s.id);
                    toast.message("Removed (demo).");
                  }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import DepartmentMenu from "@/talkstay/components/DepartmentMenu";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, X, MapPin } from "lucide-react";
import { listRooms, type Hotel, type Room } from "@/talkstay/lib/hotels";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";

interface StaffRow { id: string; user_id: string; name: string | null; email: string; department_key: string | null; room_id?: string | null; }

const DEFAULT_KEYS = ["housekeeping","laundry","kitchen","bar","maintenance","concierge","front_desk","duty_manager"];
const deptKeyFromName = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "").slice(0, 40) || `dept_${Date.now()}`;

interface Dept {
  id: string;
  key: string;
  display_name: string;
  is_active: boolean;
  notify_email: string | null;
  escalate_after_minutes: number;
}

export default function DepartmentsPanel({ hotel }: { hotel: Hotel }) {
  const [depts, setDepts] = useState<Dept[]>([]);
  const [roster, setRoster] = useState<StaffRow[]>([]);
  const [venues, setVenues] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDept, setNewDept] = useState("");
  const [adding, setAdding] = useState(false);
  const [escPhone, setEscPhone] = useState("");
  // Public QR areas double as the outlets staff can be assigned to.
  const [publicAreas, setPublicAreas] = useState<Room[]>([]);
  const [areaFor, setAreaFor] = useState<Record<string, string>>({});

  const refresh = async () => {
    setLoading(true);
    const [{ data, error }, staffRes, hotelRes, rooms] = await Promise.all([
      supabase.from("ts_departments")
        .select("id, key, display_name, is_active, notify_email, escalate_after_minutes")
        .eq("hotel_id", hotel.id).order("display_name"),
      supabase.functions.invoke("talkstay-staff", { body: { hotelId: hotel.id, action: "list" } }),
      supabase.from("ts_hotels").select("escalation_phone").eq("id", hotel.id).maybeSingle(),
      listRooms(hotel.id).catch(() => [] as Room[]),
    ]);
    if (error) toast.error(error.message);
    setDepts((data as Dept[]) ?? []);
    setRoster(((staffRes.data as any)?.staff as StaffRow[]) ?? []);
    setEscPhone((hotelRes.data as any)?.escalation_phone ?? "");
    // Two lists from one fetch, and they are not the same set:
    // `venues` are outlets wired to a department (menus and pricing hang off
    // these); `publicAreas` is every public QR area, which is what a staff
    // member can be assigned to cover — an area with no department linked yet
    // still needs someone on it.
    setVenues(rooms.filter((r) => !!r.is_public && !!r.department_key));
    setPublicAreas(rooms.filter((r) => !!r.is_public));
    setLoading(false);
  };

  const saveEscPhone = async (v: string) => {
    const val = v.trim() || null;
    const { error } = await supabase.from("ts_hotels").update({ escalation_phone: val }).eq("id", hotel.id);
    if (error) toast.error(error.message);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [hotel.id]);

  // Staff assigned to a department (for alerts/escalation).
  const assignedTo = (deptKey: string) => roster.filter((s) => s.department_key === deptKey);
  // Distinct people not yet on this department.
  const peopleFor = (deptKey: string) => {
    const on = new Set(assignedTo(deptKey).map((s) => s.user_id));
    const seen = new Set<string>();
    return roster.filter((s) => {
      if (on.has(s.user_id) || seen.has(s.user_id)) return false;
      seen.add(s.user_id); return true;
    });
  };

  const assign = async (deptKey: string, person: StaffRow, roomId?: string | null) => {
    const { error } = await supabase.from("ts_staff").insert({
      hotel_id: hotel.id, user_id: person.user_id, name: person.name,
      department_key: deptKey, role: "staff", status: "active",
      ...(roomId ? { room_id: roomId } : {}),
    });
    if (error) { toast.error(error.message); return; }
    refresh();
  };
  const unassign = async (staffRowId: string) => {
    const { error } = await supabase.from("ts_staff").delete().eq("id", staffRowId);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  const patch = (id: string, p: Partial<Dept>) =>
    setDepts((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const save = async (d: Dept, p: Partial<Dept>) => {
    patch(d.id, p);
    const { error } = await supabase.from("ts_departments").update(p).eq("id", d.id);
    if (error) { toast.error(error.message); refresh(); }
  };

  const addDept = async () => {
    const label = newDept.trim();
    if (!label) return;
    setAdding(true);
    const key = deptKeyFromName(label);
    const { error } = await supabase.from("ts_departments").insert({
      hotel_id: hotel.id, key, display_name: label, is_active: true,
    });
    if (error) {
      setAdding(false);
      toast.error(error.message);
      return;
    }
    // Seed keyword routing so guest asks like “spa massage” / “security” hit this team.
    const seedHints: Record<string, string[]> = {
      spa: ["spa", "massage", "facial", "treatment", "sauna", "wellness"],
      security: ["security", "lockout", "locked out", "suspicious", "theft", "stolen"],
      pool: ["pool", "swimming", "swim", "pool towel"],
      gym: ["gym", "fitness", "workout"],
      parking: ["parking", "valet", "car park"],
    };
    const keywords = [
      ...(seedHints[key] ?? []),
      label.toLowerCase(),
      key.replace(/_/g, " "),
    ].filter((k, i, arr) => k && arr.indexOf(k) === i);
    await supabase.from("ts_routing_rules").insert({
      hotel_id: hotel.id,
      department_key: key,
      keywords,
      is_active: true,
    });
    setAdding(false);
    setNewDept("");
    refresh();
    toast.success(`Added ${label} — guest requests for this team will route here.`);
  };

  const delDept = async (d: Dept) => {
    if (!confirm(`Remove ${d.display_name}?`)) return;
    const { error } = await supabase.from("ts_departments").delete().eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Requests are auto-routed to these teams. Add an alert email and an escalation time for each.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <form onSubmit={(e) => { e.preventDefault(); addDept(); }} className="flex items-center gap-2">
          <Input value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder="Add a department (e.g. Spa, Valet)" className="w-56" />
          <Button type="submit" size="sm" disabled={adding || !newDept.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </form>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Escalation call:</span>
          <Input
            type="tel"
            defaultValue={escPhone}
            placeholder="+44 7… (rings when overdue)"
            className="h-8 w-52"
            onBlur={(e) => { if (e.target.value.trim() !== escPhone) saveEscPhone(e.target.value); }}
          />
        </div>
      </div>

      <div className="divide-y rounded-2xl border">
        {depts.map((d) => (
          <div key={d.id} className="space-y-2 px-4 py-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="flex items-center gap-3">
                <Switch checked={d.is_active} onCheckedChange={(v) => save(d, { is_active: v })} />
                <Input
                  defaultValue={d.display_name}
                  className="h-8 w-40 font-medium"
                  onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== d.display_name) save(d, { display_name: v }); }}
                />
                {!DEFAULT_KEYS.includes(d.key) && (
                  <Button size="sm" variant="ghost" onClick={() => delDept(d)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="email"
                  defaultValue={d.notify_email ?? ""}
                  placeholder="alert email (optional)"
                  className="h-8 w-56"
                  onBlur={(e) => {
                    const v = e.target.value.trim() || null;
                    if (v !== (d.notify_email ?? null)) save(d, { notify_email: v });
                  }}
                />
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>escalate after</span>
                  <Input
                    type="number" min={1}
                    defaultValue={d.escalate_after_minutes}
                    className="h-8 w-16"
                    onBlur={(e) => {
                      const n = Math.max(1, parseInt(e.target.value || "5", 10));
                      if (n !== d.escalate_after_minutes) save(d, { escalate_after_minutes: n });
                    }}
                  />
                  <span>min</span>
                </div>
              </div>
            </div>

            {/* Assigned staff (alerts + escalation) */}
            <div className="flex flex-wrap items-center gap-2 pl-11">
              <span className="text-xs text-muted-foreground">Staff:</span>
              {assignedTo(d.key).map((s) => {
                const area = s.room_id ? publicAreas.find((a) => a.id === s.room_id) : null;
                return (
                  <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {s.name || s.email}
                    {area && (
                      <span className="rounded-full bg-sky-100 px-1.5 text-[10px] font-medium text-sky-900">
                        {area.room_number}
                      </span>
                    )}
                    <button onClick={() => unassign(s.id)} aria-label="remove"><X className="h-3 w-3 text-muted-foreground" /></button>
                  </span>
                );
              })}
              {/* Area is optional — leaving it blank means the whole department,
                  which is how every existing assignment already behaves. */}
              {publicAreas.length > 0 && (
                <Select
                  value={areaFor[d.key] ?? "__all__"}
                  onValueChange={(v) => setAreaFor((m) => ({ ...m, [d.key]: v }))}
                >
                  <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All areas</SelectItem>
                    {publicAreas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.room_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {peopleFor(d.key).length > 0 && (
                <Select value="" onValueChange={(uid) => {
                  const p = roster.find((r) => r.user_id === uid);
                  const picked = areaFor[d.key];
                  if (p) assign(d.key, p, picked && picked !== "__all__" ? picked : null);
                }}>
                  <SelectTrigger className="h-7 w-36 text-xs"><SelectValue placeholder="+ add staff" /></SelectTrigger>
                  <SelectContent>
                    {peopleFor(d.key).map((p) => <SelectItem key={p.user_id} value={p.user_id}>{p.name || p.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {roster.length === 0 && <span className="text-xs text-muted-foreground">— add people on the Staff tab first</span>}
            </div>

            {/* Linked Public QR venues (outlets under this department) */}
            <div className="flex flex-wrap items-center gap-2 pl-11">
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> Venues:
              </span>
              {venues.filter((v) => v.department_key === d.key).length === 0 ? (
                <span className="text-xs text-muted-foreground">
                  none yet — add under Rooms &amp; QR → Venues &amp; tables
                </span>
              ) : (
                venues.filter((v) => v.department_key === d.key).map((v) => (
                  <span
                    key={v.id}
                    className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs text-sky-900"
                  >
                    {formatRoomLabel(v.room_number)}
                  </span>
                ))
              )}
            </div>

            <DepartmentMenu hotelId={hotel.id} departmentKey={d.key} departmentName={d.display_name} />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Assigned staff receive this team's alerts. No email set? Alerts fall back to the property owner; complaints always also notify the owner.
      </p>
    </div>
  );
}

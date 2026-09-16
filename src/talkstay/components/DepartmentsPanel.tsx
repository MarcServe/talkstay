import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, X, MapPin, ChevronRight, Info, UtensilsCrossed, Lock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { listRooms, listCatalogItems, setCalloutDepartment, setOwnerUrgentCopy, type Hotel, type Room } from "@/talkstay/lib/hotels";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";

interface StaffRow { id: string; user_id: string; name: string | null; email: string; department_key: string | null; room_id?: string | null; venue_locked?: boolean | null; }

/** Small caps label that turns each stacked block in a team row into a named
 *  section instead of a run-on line. */
const ROW_LABEL = "text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground";

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [roster, setRoster] = useState<StaffRow[]>([]);
  const [venues, setVenues] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDept, setNewDept] = useState("");
  const [adding, setAdding] = useState(false);
  const [escPhone, setEscPhone] = useState("");
  /** Which team answers a guest who just asks for someone. "" = Front Desk. */
  const [calloutDept, setCalloutDept] = useState("");
  const [ownerCopy, setOwnerCopy] = useState(true);
  // Public QR areas double as the outlets staff can be assigned to.
  const [publicAreas, setPublicAreas] = useState<Room[]>([]);
  const [areaFor, setAreaFor] = useState<Record<string, string>>({});
  /** How many menu items each team has, so the link to Menus is informative
   *  rather than a bare "open". Null until it loads — never guess zero. */
  const [menuCounts, setMenuCounts] = useState<Record<string, number> | null>(null);
  const menuCount = (key: string) => (menuCounts ? (menuCounts[key] ?? 0) : null);

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
    listCatalogItems(hotel.id)
      .then((rows) => {
        const c: Record<string, number> = {};
        for (const r of rows) c[r.department_key] = (c[r.department_key] ?? 0) + 1;
        setMenuCounts(c);
      })
      .catch(() => setMenuCounts({}));
    if (error) toast.error(error.message);
    setDepts((data as Dept[]) ?? []);
    setRoster(((staffRes.data as any)?.staff as StaffRow[]) ?? []);
    setEscPhone((hotelRes.data as any)?.escalation_phone ?? "");
    setCalloutDept(String((hotel.branding as { callout_department?: string } | null)?.callout_department ?? ""));
    setOwnerCopy((hotel.branding as { owner_urgent_copy?: boolean } | null)?.owner_urgent_copy !== false);
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
  /** Assignment alone only prioritises alerts. The lock is what narrows what
   *  they can open, so it is a deliberate click rather than a side effect of
   *  putting someone on a venue. */
  const toggleVenueLock = async (row: StaffRow) => {
    const next = !row.venue_locked;
    setRoster((prev) => prev.map((r) => (r.id === row.id ? { ...r, venue_locked: next } : r)));
    const { error } = await supabase.from("ts_staff").update({ venue_locked: next }).eq("id", row.id);
    if (error) {
      setRoster((prev) => prev.map((r) => (r.id === row.id ? { ...r, venue_locked: !next } : r)));
      toast.error(error.message);
      return;
    }
    toast.success(next
      ? `${row.name || row.email} now only sees ${publicAreas.find((a) => a.id === row.room_id)?.room_number ?? "that area"}.`
      : `${row.name || row.email} can see the whole team's queue again.`);
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

      {/* Three property-wide settings used to sit in the same row as "add a
          department", so a one-off action and three set-once toggles read as
          one undifferentiated bar. They fold away together now. */}
      <button
        type="button"
        onClick={() => setSettingsOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground transition-colors hover:text-foreground"
        aria-expanded={settingsOpen}
      >
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${settingsOpen ? "rotate-90" : ""}`} />
        Alert settings
        {!settingsOpen && (
          <span className="font-normal normal-case tracking-normal text-muted-foreground/80">
            · callouts to {depts.find((d) => d.key === (calloutDept || "front_desk"))?.display_name ?? "Front Desk"}
            {ownerCopy ? " · copied on urgent" : ""}
            {escPhone ? " · escalation call set" : ""}
          </span>
        )}
      </button>

      {settingsOpen && (
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4">
        {/* Where a bare "please send someone" goes. A venue QR linked to a team
            still wins — this is the answer for rooms, and for venues nobody
            linked. */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Room callouts go to:</span>
          <Select
            value={calloutDept || "front_desk"}
            onValueChange={(v) => {
              setCalloutDept(v);
              setCalloutDepartment(hotel.id, hotel.branding as Record<string, unknown>, v)
                .then(() => toast.success("Saved"))
                .catch((e) => toast.error(e instanceof Error ? e.message : "Couldn't save"));
            }}
          >
            <SelectTrigger className="h-8 w-52 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {depts.filter((d) => d.is_active).map((d) => (
                <SelectItem key={d.key} value={d.key}>{d.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={ownerCopy}
            onCheckedChange={(v) => {
              setOwnerCopy(v);
              setOwnerUrgentCopy(hotel.id, hotel.branding as Record<string, unknown>, v)
                .then(() => toast.success(v ? "You'll be copied on urgent alerts" : "You'll no longer be copied"))
                .catch((e) => toast.error(e instanceof Error ? e.message : "Couldn't save"));
            }}
            aria-label="Copy me on urgent alerts"
          />
          <span className="text-xs text-muted-foreground">
            Copy me on urgent alerts
            <span className="ml-1 text-[11px] opacity-70">
              (you're always told if nobody else would be)
            </span>
          </span>
        </div>
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
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground">
          Teams <span className="font-normal normal-case tracking-normal">· {depts.filter((d) => d.is_active).length} active</span>
        </p>
        <form onSubmit={(e) => { e.preventDefault(); addDept(); }} className="flex items-center gap-2">
          <Input value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder="Add a department (e.g. Spa, Valet)" className="h-8 w-56" />
          <Button type="submit" size="sm" disabled={adding || !newDept.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </form>
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
                <span className={ROW_LABEL}>Alerts</span>
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
              <span className={ROW_LABEL}>Staff</span>
              {assignedTo(d.key).map((s) => {
                const area = s.room_id ? publicAreas.find((a) => a.id === s.room_id) : null;
                return (
                  <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {s.name || s.email}
                    {area && (
                      <button
                        type="button"
                        onClick={() => void toggleVenueLock(s)}
                        title={s.venue_locked
                          ? `${s.name || s.email} only sees ${area.room_number}. Click to give them the whole team's queue.`
                          : `${s.name || s.email} is alerted first for ${area.room_number} but sees the whole team. Click to limit them to ${area.room_number}.`}
                        className={`inline-flex items-center gap-1 rounded-full px-1.5 text-[10px] font-medium transition-colors ${
                          s.venue_locked
                            ? "bg-violet-600 text-white"
                            : "bg-sky-100 text-sky-900 hover:bg-sky-200 dark:bg-sky-400/15 dark:text-sky-200 dark:hover:bg-sky-400/25"
                        }`}
                      >
                        {s.venue_locked && <Lock className="h-2.5 w-2.5" />}
                        {area.room_number}
                      </button>
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
              <span className={`${ROW_LABEL} inline-flex items-center gap-1`}>
                <MapPin className="h-3 w-3" /> Venues
              </span>
              {venues.filter((v) => v.department_key === d.key).length === 0 ? (
                <span className="text-xs text-muted-foreground">
                  none yet — add under Rooms &amp; QR → Venues &amp; tables
                </span>
              ) : (
                venues.filter((v) => v.department_key === d.key).map((v) => (
                  <span
                    key={v.id}
                    className="inline-flex items-center gap-1 rounded-full border border-sky-200 dark:border-sky-400/30 bg-sky-50 dark:bg-sky-400/15 px-2 py-0.5 text-xs text-sky-900 dark:text-sky-200"
                  >
                    {formatRoomLabel(v.room_number)}
                  </span>
                ))
              )}
            </div>

            <div className="pl-11">
              <div className="mb-1 flex items-center gap-1.5">
                <span className={ROW_LABEL}>Guest menu</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={`Where the ${d.display_name} menu appears`}
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80 space-y-2 text-xs leading-relaxed">
                    <p className="text-sm font-medium">Where this menu appears</p>
                    <p className="text-muted-foreground">
                      Guests don't see a menu per team. Every team's items are pooled into
                      one menu and grouped under a heading — so {d.display_name} items show
                      as a {d.display_name} section alongside the others.
                    </p>
                    <p className="text-muted-foreground">
                      What decides whether an item shows is <span className="font-medium text-foreground">where
                      the guest is</span>, not which team it belongs to:
                    </p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li><span className="font-medium text-foreground">Rooms and public areas</span> — everyone sees it.</li>
                      <li><span className="font-medium text-foreground">Guest rooms only</span> — hidden from lobby and bar QRs.</li>
                      <li><span className="font-medium text-foreground">Public areas only</span> — hidden from in-room guests.</li>
                      <li><span className="font-medium text-foreground">Only a named venue</span> — just that QR.</li>
                    </ul>
                    <p className="text-muted-foreground">
                      An item pinned to a venue beats a shared item of the same name in
                      that venue, which is how you charge a different price there.
                    </p>
                  </PopoverContent>
                </Popover>
              </div>
              {/* One editor, not two. Menus owns the catalogue now; this points
                  at that team's slice of it rather than repeating the controls
                  and leaving two places that can disagree. */}
              <a
                href={`/app?tab=menus&dept=${encodeURIComponent(d.key)}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-violet-300 hover:text-foreground dark:hover:border-violet-400/40"
              >
                <UtensilsCrossed className="h-3.5 w-3.5" />
                {menuCount(d.key) === null
                  ? `Open ${d.display_name}'s menu`
                  : `${d.display_name}'s menu · ${menuCount(d.key)} item${menuCount(d.key) === 1 ? "" : "s"}`}
              </a>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Assigned staff receive this team's alerts. No email set? Alerts fall back to the property owner; complaints always also notify the owner.
      </p>
    </div>
  );
}

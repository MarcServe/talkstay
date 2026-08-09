import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { DEPARTMENTS, type Hotel } from "@/talkstay/lib/hotels";

interface StaffRow {
  id: string;
  email: string;
  name: string | null;
  department_key: string | null;
  role: string;
  status: string;
}

const ALL_DEPTS = "__all__";

export default function StaffPanel({ hotel }: { hotel: Hotel }) {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dept, setDept] = useState<string>(ALL_DEPTS);
  const [role, setRole] = useState("staff");
  const [busy, setBusy] = useState(false);

  const call = (body: Record<string, unknown>) =>
    supabase.functions.invoke("talkstay-staff", { body: { hotelId: hotel.id, ...body } });

  const load = async () => {
    setLoading(true);
    const { data, error } = await call({ action: "list" });
    if (error) toast.error(error.message);
    setStaff(((data as any)?.staff as StaffRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hotel.id]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await call({
        action: "invite",
        email: email.trim(),
        name: name.trim() || null,
        departmentKey: dept === ALL_DEPTS ? null : dept,
        role,
      });
      if (error) throw error;
      const res = data as any;
      if (res?.error) throw new Error(res.error);
      if (res?.invited) {
        toast.success(`Invite sent to ${res.email} — they'll set their own password.`);
      } else {
        toast.success(`${res.email} added to staff.`);
      }
      setEmail(""); setName("");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to invite");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: StaffRow) => {
    if (!confirm(`Remove ${row.email}?`)) return;
    const { error } = await call({ action: "remove", staffId: row.id });
    const res = error as any;
    if (res) { toast.error(res.message); return; }
    await load();
  };

  // Inline edits (name draft per row) + a saving indicator.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const update = async (row: StaffRow, patch: { name?: string; role?: string; departmentKey?: string | null }) => {
    setSavingId(row.id);
    try {
      const { data, error } = await call({ action: "update", staffId: row.id, ...patch });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      // Update the row locally so the UI is instant.
      setStaff((prev) => prev.map((s) => s.id === row.id ? {
        ...s,
        ...(patch.name !== undefined ? { name: patch.name || null } : {}),
        ...(patch.role !== undefined ? { role: patch.role } : {}),
        ...(patch.departmentKey !== undefined ? { department_key: patch.departmentKey } : {}),
      } : s));
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save");
      await load(); // resync on failure
    } finally {
      setSavingId(null);
    }
  };

  const saveName = (row: StaffRow) => {
    const next = (drafts[row.id] ?? row.name ?? "").trim();
    if (next === (row.name ?? "")) return;
    update(row, { name: next });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={invite} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs text-muted-foreground">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sarah" />
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
              {DEPARTMENTS.map((d) => <SelectItem key={d.key} value={d.key}>{d.display_name}</SelectItem>)}
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
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1 h-4 w-4" />}
          Add staff
        </Button>
      </form>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : staff.length === 0 ? (
        <p className="text-sm text-muted-foreground">No staff yet. Add someone above — they'll get an email invite and set their own password.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Email</th><th className="px-4 py-2">Department</th><th className="px-4 py-2">Role</th><th className="px-4 py-2"></th></tr>
            </thead>
            <tbody>
              {staff.map((s) => {
                const isOwner = s.role === "owner";
                return (
                <tr key={s.id} className="border-t align-middle">
                  <td className="px-4 py-2">
                    <Input
                      className="h-8 w-36"
                      value={drafts[s.id] ?? s.name ?? ""}
                      placeholder="Add name"
                      disabled={isOwner || savingId === s.id}
                      onChange={(e) => setDrafts((d) => ({ ...d, [s.id]: e.target.value }))}
                      onBlur={() => saveName(s)}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    />
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{s.email}</td>
                  <td className="px-4 py-2">
                    <Select
                      value={s.department_key ?? ALL_DEPTS}
                      disabled={isOwner || s.role === "manager" || savingId === s.id}
                      onValueChange={(v) => update(s, { departmentKey: v === ALL_DEPTS ? null : v })}
                    >
                      <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_DEPTS}>All departments</SelectItem>
                        {DEPARTMENTS.map((d) => <SelectItem key={d.key} value={d.key}>{d.display_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2">
                    {isOwner ? (
                      <span className="capitalize text-muted-foreground">Owner</span>
                    ) : (
                      <Select value={s.role} disabled={savingId === s.id} onValueChange={(v) => update(s, { role: v })}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {savingId === s.id ? (
                      <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
                    ) : isOwner ? null : (
                      <Button size="sm" variant="ghost" onClick={() => remove(s)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
        <p><strong className="text-foreground">Staff</strong> see only their department's live queue.</p>
        <p className="mt-1">
          <strong className="text-foreground">Manager</strong> is your sub-manager: full access to every
          department's queue and Insights, so they can coordinate the floor while you're away and you can
          check in whenever you like. Promote anyone (e.g. front desk) by switching their role to Manager —
          it takes effect the next time they open the app.
        </p>
      </div>
    </div>
  );
}

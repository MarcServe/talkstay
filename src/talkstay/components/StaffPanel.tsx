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
      if (res?.created && res?.tempPassword) {
        toast.success(`Account created for ${res.email}. Temp password: ${res.tempPassword}`, { duration: 12000 });
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
    if (error) { toast.error(error.message); return; }
    await load();
  };

  const deptLabel = (k: string | null) =>
    !k ? "All departments" : DEPARTMENTS.find((d) => d.key === k)?.display_name ?? k;

  return (
    <div className="space-y-6">
      <form onSubmit={invite} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs text-muted-foreground">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sarah" />
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">Staff email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@hotel.com" />
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
        <p className="text-sm text-muted-foreground">No staff yet. Add someone above — if they don't have an account, one is created and a temporary password is shown once.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Email</th><th className="px-4 py-2">Department</th><th className="px-4 py-2">Role</th><th className="px-4 py-2"></th></tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{s.name || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.email}</td>
                  <td className="px-4 py-2 text-muted-foreground">{deptLabel(s.department_key)}</td>
                  <td className="px-4 py-2 capitalize">{s.role}</td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => remove(s)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

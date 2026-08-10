import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Search, Shield } from "lucide-react";
import { adminApi } from "@/talkstay/admin/adminApi";

type UserRow = {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  created_at: string;
  is_platform_admin: boolean;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi<{ users: UserRow[] }>("list_users");
      setUsers(res.users);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((u) =>
      [u.email, u.first_name, u.last_name, u.company_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [users, q]);

  const toggleAdmin = async (u: UserRow) => {
    setBusyId(u.user_id);
    try {
      await adminApi("set_platform_admin", { userId: u.user_id, is_admin: !u.is_platform_admin });
      setUsers((prev) => prev.map((x) =>
        x.user_id === u.user_id ? { ...x, is_platform_admin: !u.is_platform_admin } : x,
      ));
      toast.success(u.is_platform_admin ? "Admin removed" : "Admin granted");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform accounts. Grant TalkStay admin to operators who should manage all hotels.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by email or name…" />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Company</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.user_id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {u.company_name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_platform_admin ? (
                      <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100">
                        <Shield className="mr-1 h-3 w-3" /> Admin
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">User</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === u.user_id}
                      onClick={() => void toggleAdmin(u)}
                    >
                      {u.is_platform_admin ? "Remove admin" : "Make admin"}
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

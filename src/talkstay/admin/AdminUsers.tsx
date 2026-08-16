import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ExternalLink, Loader2, Search, Shield } from "lucide-react";
import { adminApi } from "@/talkstay/admin/adminApi";

type UserLink = {
  product: "talkstay" | "talkweb";
  label: string;
  href: string;
  role?: string;
};

type UserRow = {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  website_url?: string | null;
  created_at: string;
  is_platform_admin: boolean;
  products?: string[];
  links?: UserLink[];
  talkstay?: { owned_hotels: number; staff_roles: number };
  talkweb?: { assistants: number };
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [productFilter, setProductFilter] = useState<"all" | "talkstay" | "talkweb" | "none" | "admin">("all");
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
    let list = users;
    if (productFilter === "admin") {
      list = list.filter((u) => u.is_platform_admin);
    } else if (productFilter !== "all") {
      list = list.filter((u) => (u.products ?? []).includes(productFilter));
    }
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((u) =>
      [u.email, u.first_name, u.last_name, u.company_name, ...(u.links ?? []).map((l) => l.label)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [users, q, productFilter]);

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

  // Deduplicate display links: one TalkStay dashboard per user max, keep property links
  const displayLinks = (u: UserRow) => {
    const links = u.links ?? [];
    const seen = new Set<string>();
    const out: UserLink[] = [];
    for (const l of links) {
      const key = `${l.product}:${l.href}:${l.label}`;
      if (seen.has(key)) continue;
      // Skip generic dashboard duplicates if we already have a property link
      if (l.role === "dashboard" && links.some((x) => x.product === "talkstay" && x.role === "owner")) {
        continue;
      }
      seen.add(key);
      out.push(l);
    }
    return out.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Shared auth DB across TalkStay and TalkWeb. Each row shows which product links the account is attached to.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by email, name, or property…" />
        </div>
        <Select value={productFilter} onValueChange={(v) => setProductFilter(v as typeof productFilter)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All products</SelectItem>
            <SelectItem value="talkstay">TalkStay</SelectItem>
            <SelectItem value="talkweb">TalkWeb</SelectItem>
            <SelectItem value="none">No attachment</SelectItem>
            <SelectItem value="admin">Platform admins</SelectItem>
          </SelectContent>
        </Select>
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
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Products</th>
                <th className="px-4 py-3 font-medium">Attached links</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const links = displayLinks(u);
                return (
                  <tr key={u.user_id} className="border-t align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                      {u.company_name && (
                        <div className="mt-0.5 text-xs text-muted-foreground">{u.company_name}</div>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(u.products ?? ["none"]).map((p) => (
                          <Badge
                            key={p}
                            variant="outline"
                            className={
                              p === "talkstay"
                                ? "border-violet-300 text-violet-800"
                                : p === "talkweb"
                                  ? "border-sky-300 text-sky-800"
                                  : "text-muted-foreground"
                            }
                          >
                            {p === "talkstay" ? "TalkStay" : p === "talkweb" ? "TalkWeb" : "None"}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {u.talkstay?.owned_hotels ? `${u.talkstay.owned_hotels} hotel${u.talkstay.owned_hotels === 1 ? "" : "s"}` : ""}
                        {u.talkstay?.owned_hotels && u.talkweb?.assistants ? " · " : ""}
                        {u.talkweb?.assistants ? `${u.talkweb.assistants} assistant${u.talkweb.assistants === 1 ? "" : "s"}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {links.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No property or assistant link</span>
                      ) : (
                        <ul className="space-y-1.5">
                          {links.map((l, i) => (
                            <li key={`${l.href}-${i}`}>
                              <a
                                href={l.href}
                                target="_blank"
                                rel="noreferrer"
                                className="group inline-flex max-w-full items-start gap-1.5 text-xs hover:text-violet-700"
                              >
                                <Badge
                                  variant="outline"
                                  className={`mt-0.5 shrink-0 text-[10px] ${
                                    l.product === "talkstay"
                                      ? "border-violet-200 text-violet-700"
                                      : "border-sky-200 text-sky-700"
                                  }`}
                                >
                                  {l.product === "talkstay" ? "talkstay.talkweb.io" : "talkweb.io"}
                                </Badge>
                                <span className="min-w-0 break-all font-medium group-hover:underline">
                                  {l.label}
                                </span>
                                <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-50" />
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
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
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No users match.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

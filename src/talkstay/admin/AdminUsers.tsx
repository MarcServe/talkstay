import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ExternalLink, Loader2, Search, Shield } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/talkstay/admin/adminApi";
import { AdminPager } from "@/talkstay/admin/AdminPager";
import { ADMIN_PAGE_SIZE, adminKeys } from "@/talkstay/admin/adminKeys";
import { useAdminUsers, type AdminUserLink, type AdminUserRow } from "@/talkstay/admin/useAdminQueries";

export default function AdminUsers() {
  const qc = useQueryClient();
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [productFilter, setProductFilter] = useState<"all" | "talkstay" | "talkweb" | "none" | "admin">("all");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Debounce search → server-side filter
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [qInput]);

  const { data, isLoading, isFetching, isError, error } = useAdminUsers(page, q, productFilter);

  useEffect(() => {
    if (isError) toast.error(error instanceof Error ? error.message : "Failed to load users");
  }, [isError, error]);

  const users = data?.users ?? [];
  const total = data?.total ?? 0;

  const toggleAdmin = async (u: AdminUserRow) => {
    setBusyId(u.user_id);
    try {
      await adminApi("set_platform_admin", { userId: u.user_id, is_admin: !u.is_platform_admin });
      await qc.invalidateQueries({ queryKey: adminKeys.all });
      toast.success(u.is_platform_admin ? "Admin removed" : "Admin granted");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const displayLinks = (u: AdminUserRow) => {
    const links = u.links ?? [];
    const seen = new Set<string>();
    const out: AdminUserLink[] = [];
    for (const l of links) {
      const key = `${l.product}:${l.href}:${l.label}`;
      if (seen.has(key)) continue;
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
          Shared auth DB across TalkStay and TalkWeb. Loaded in pages of {ADMIN_PAGE_SIZE} — search runs on the server.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Search email, name, or company…"
          />
        </div>
        <Select
          value={productFilter}
          onValueChange={(v) => {
            setProductFilter(v as typeof productFilter);
            setPage(1);
          }}
        >
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

      {isLoading && !data ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
        </div>
      ) : (
        <>
          <div className={`overflow-hidden rounded-2xl border ${isFetching ? "opacity-70" : ""}`}>
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
                {users.map((u) => {
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
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No users match.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <AdminPager
            page={page}
            pageSize={data?.pageSize ?? ADMIN_PAGE_SIZE}
            total={total}
            onPageChange={setPage}
            disabled={isFetching}
          />
        </>
      )}
    </div>
  );
}

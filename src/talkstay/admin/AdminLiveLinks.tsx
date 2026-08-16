import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Loader2, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/talkstay/admin/adminApi";
import { AdminPager } from "@/talkstay/admin/AdminPager";
import { ADMIN_PAGE_SIZE, adminKeys } from "@/talkstay/admin/adminKeys";
import { useAdminLiveLinks } from "@/talkstay/admin/useAdminQueries";

export default function AdminLiveLinks() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, isError, error } = useAdminLiveLinks(page);

  useEffect(() => {
    if (isError) toast.error(error instanceof Error ? error.message : "Failed to load links");
  }, [isError, error]);

  const links = data?.links ?? [];
  const total = data?.total ?? 0;

  const revoke = async (id: string) => {
    try {
      await adminApi("revoke_live_link", { tokenId: id });
      await qc.invalidateQueries({ queryKey: adminKeys.liveLinks(page, ADMIN_PAGE_SIZE) });
      toast.message("Link revoked");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live campaign links</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only share links across all properties. Paginated ({ADMIN_PAGE_SIZE}/page).
        </p>
      </div>

      {isLoading && !data ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <div className={`overflow-hidden rounded-2xl border ${isFetching ? "opacity-70" : ""}`}>
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Hotel</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Label</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Last seen</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {links.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">{l.hotel_name}</div>
                      <div className="max-w-[220px] truncate font-mono text-[11px] text-muted-foreground">{l.url}</div>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{l.label ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={l.is_active ? "border-emerald-300 text-emerald-700" : ""}>
                        {l.is_active ? "Active" : "Revoked"}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {l.last_seen_at ? new Date(l.last_seen_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" className="mr-1" onClick={async () => {
                        try { await navigator.clipboard.writeText(l.url); toast.success("Copied"); } catch { /* ignore */ }
                      }}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      {l.is_active && (
                        <Button size="sm" variant="ghost" onClick={() => void revoke(l.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {links.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No live links yet.</td>
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

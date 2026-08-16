import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/talkstay/admin/adminApi";
import { AdminPager } from "@/talkstay/admin/AdminPager";
import { ADMIN_PAGE_SIZE, adminKeys } from "@/talkstay/admin/adminKeys";
import { useAdminHotels, type AdminHotelRow } from "@/talkstay/admin/useAdminQueries";

export default function AdminHotels() {
  const qc = useQueryClient();
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [qInput]);

  const { data, isLoading, isFetching, isError, error } = useAdminHotels(page, q);

  useEffect(() => {
    if (isError) toast.error(error instanceof Error ? error.message : "Failed to load hotels");
  }, [isError, error]);

  const hotels = data?.hotels ?? [];
  const total = data?.total ?? 0;

  const toggle = async (h: AdminHotelRow) => {
    setBusyId(h.id);
    try {
      await adminApi("set_hotel_active", { hotelId: h.id, is_active: !h.is_active });
      await qc.invalidateQueries({ queryKey: adminKeys.all });
      toast.success(`${h.name} ${h.is_active ? "deactivated" : "activated"}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hotels</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every TalkStay property — paginated ({ADMIN_PAGE_SIZE}/page) with cached refreshes.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Search name or slug…"
        />
      </div>

      {isLoading && !data ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading hotels…
        </div>
      ) : (
        <>
          <div className={`overflow-hidden rounded-2xl border ${isFetching ? "opacity-70" : ""}`}>
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Property</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Owner</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {hotels.map((h) => (
                  <tr key={h.id} className="border-t">
                    <td className="px-4 py-3">
                      <Link to={`/admin/hotels/${h.id}`} className="font-medium hover:text-violet-700">
                        {h.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {h.slug}
                        {h.billing_mode ? ` · ${h.billing_mode}` : ""}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {h.owner?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={h.is_active ? "border-emerald-300 text-emerald-700" : "text-muted-foreground"}>
                        {h.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/admin/usage?hotel=${h.id}`}>Usage</Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === h.id}
                          onClick={() => void toggle(h)}
                        >
                          {h.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {hotels.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">No hotels found.</td>
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

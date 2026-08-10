import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Copy, Loader2, Trash2 } from "lucide-react";
import { adminApi } from "@/talkstay/admin/adminApi";

type Detail = {
  hotel: Record<string, any>;
  owner: { email: string | null; first_name: string | null; last_name: string | null; company_name: string | null } | null;
  rooms: { id: string; room_number: string; floor: string | null; occupancy_status?: string; is_active: boolean }[];
  staff: { id: string; name: string | null; email: string | null; department_key: string | null; role: string; status: string }[];
  liveLinks: { id: string; url: string; label: string | null; is_active: boolean; expires_at: string | null; last_seen_at: string | null }[];
  openRequests: number;
};

export default function AdminHotelDetail() {
  const { hotelId = "" } = useParams();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi<Detail>("hotel_detail", { hotelId });
      setData(res);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [hotelId]);

  const toggleActive = async () => {
    if (!data) return;
    setBusy(true);
    try {
      const next = !data.hotel.is_active;
      await adminApi("set_hotel_active", { hotelId, is_active: next });
      setData({ ...data, hotel: { ...data.hotel, is_active: next } });
      toast.success(next ? "Hotel activated" : "Hotel deactivated");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const revokeLink = async (tokenId: string) => {
    try {
      await adminApi("revoke_live_link", { tokenId });
      setData((d) => d ? {
        ...d,
        liveLinks: d.liveLinks.map((l) => (l.id === tokenId ? { ...l, is_active: false } : l)),
      } : d);
      toast.message("Live link revoked");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const disableStaff = async (staffId: string) => {
    try {
      await adminApi("disable_staff", { staffId });
      setData((d) => d ? {
        ...d,
        staff: d.staff.map((s) => (s.id === staffId ? { ...s, status: "disabled" } : s)),
      } : d);
      toast.message("Staff disabled");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading hotel…
      </div>
    );
  }

  const h = data.hotel;

  return (
    <div className="space-y-8">
      <div>
        <Link to="/admin/hotels" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All hotels
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{h.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {h.slug} · owner {data.owner?.email ?? "—"} · {data.openRequests} open requests
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={h.is_active ? "border-emerald-300 text-emerald-700" : ""}>
              {h.is_active ? "Active" : "Inactive"}
            </Badge>
            <Button variant="outline" disabled={busy} onClick={() => void toggleActive()}>
              {h.is_active ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Rooms" value={data.rooms.length} />
        <Stat label="Staff" value={data.staff.length} />
        <Stat label="Live links" value={data.liveLinks.filter((l) => l.is_active).length} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Rooms</h2>
        <div className="overflow-hidden rounded-2xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Room</th>
                <th className="px-4 py-2 font-medium">Floor</th>
                <th className="px-4 py-2 font-medium">Occupancy</th>
              </tr>
            </thead>
            <tbody>
              {data.rooms.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{r.room_number}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.floor ?? "—"}</td>
                  <td className="px-4 py-2 capitalize text-muted-foreground">{r.occupancy_status ?? "—"}</td>
                </tr>
              ))}
              {data.rooms.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">No rooms</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Staff</h2>
        <div className="overflow-hidden rounded-2xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data.staff.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{s.name ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.email ?? "—"}</td>
                  <td className="px-4 py-2 capitalize">{s.role}</td>
                  <td className="px-4 py-2">{s.status}</td>
                  <td className="px-4 py-2 text-right">
                    {s.status === "active" && (
                      <Button size="sm" variant="ghost" onClick={() => void disableStaff(s.id)}>
                        Disable
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Live campaign links</h2>
        <div className="space-y-2">
          {data.liveLinks.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm">
              <Badge variant="outline" className={l.is_active ? "border-emerald-300 text-emerald-700" : ""}>
                {l.is_active ? "Active" : "Revoked"}
              </Badge>
              <span className="min-w-0 flex-1 truncate font-mono text-xs">{l.url}</span>
              <Button size="sm" variant="outline" onClick={async () => {
                try { await navigator.clipboard.writeText(l.url); toast.success("Copied"); } catch { /* ignore */ }
              }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              {l.is_active && (
                <Button size="sm" variant="ghost" onClick={() => void revokeLink(l.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
          {data.liveLinks.length === 0 && (
            <p className="text-sm text-muted-foreground">No live view links for this hotel.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

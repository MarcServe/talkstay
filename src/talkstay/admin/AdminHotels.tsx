import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { adminApi } from "@/talkstay/admin/adminApi";

type HotelRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  owner: { email: string | null; first_name: string | null; last_name: string | null } | null;
};

export default function AdminHotels() {
  const [hotels, setHotels] = useState<HotelRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async (query = q) => {
    setLoading(true);
    try {
      const res = await adminApi<{ hotels: HotelRow[] }>("list_hotels", { q: query });
      setHotels(res.hotels);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(""); }, []);

  const toggle = async (h: HotelRow) => {
    setBusyId(h.id);
    try {
      await adminApi("set_hotel_active", { hotelId: h.id, is_active: !h.is_active });
      setHotels((prev) => prev.map((x) => (x.id === h.id ? { ...x, is_active: !h.is_active } : x)));
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
          Every TalkStay property. Activate, deactivate, or open details.
        </p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => { e.preventDefault(); void load(q); }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or slug…" />
        </div>
        <Button type="submit" variant="outline">Search</Button>
      </form>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading hotels…
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border">
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
                    <div className="text-xs text-muted-foreground">{h.slug}</div>
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
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === h.id}
                      onClick={() => void toggle(h)}
                    >
                      {h.is_active ? "Deactivate" : "Activate"}
                    </Button>
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
      )}
    </div>
  );
}

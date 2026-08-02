import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, QrCode, Loader2, ExternalLink } from "lucide-react";
import { addRoom, deleteRoom, getRoomToken, listRooms, setRoomOccupancy, type Hotel, type Room } from "@/talkstay/lib/hotels";
import { getPublicBaseUrl } from "@/config/environment";

function guestUrl(hotel: Hotel, room: Room, token: string): string {
  // Always the canonical production URL — a printed QR must resolve on a guest's
  // phone, never localhost/preview.
  return `${getPublicBaseUrl()}/h/${hotel.slug}/r/${room.id}?token=${token}`;
}

export default function RoomsPanel({ hotel }: { hotel: Hotel }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [num, setNum] = useState("");
  const [floor, setFloor] = useState("");
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<{ room: Room; url: string } | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setRooms(await listRooms(hotel.id));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [hotel.id]);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!num.trim()) return;
    setBusy(true);
    try {
      await addRoom(hotel.id, { room_number: num.trim(), floor: floor.trim() });
      setNum(""); setFloor("");
      await refresh();
      toast.success(`Room ${num.trim()} added with a QR code`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to add room");
    } finally {
      setBusy(false);
    }
  };

  const showQr = async (room: Room) => {
    try {
      const token = await getRoomToken(room.id);
      if (!token) { toast.error("No active token for this room"); return; }
      setQr({ room, url: guestUrl(hotel, room, token) });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load QR");
    }
  };

  const preview = async (room: Room) => {
    try {
      const token = await getRoomToken(room.id);
      if (!token) { toast.error("No active token for this room"); return; }
      window.open(guestUrl(hotel, room, token), "_blank", "noopener");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to open preview");
    }
  };

  const toggleOccupancy = async (room: Room) => {
    const next = room.occupancy_status === "vacant" ? "occupied" : "vacant";
    if (next === "vacant" && !confirm(`Check out Room ${room.room_number}? Any link the guest saved will stop working immediately.`)) return;
    try {
      await setRoomOccupancy(room.id, next);
      await refresh();
      toast.success(next === "vacant"
        ? `Room ${room.room_number} checked out — saved links disabled.`
        : `Room ${room.room_number} checked in — its QR is live again.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update room");
    }
  };

  const onDelete = async (room: Room) => {
    if (!confirm(`Delete room ${room.room_number}?`)) return;
    try {
      await deleteRoom(room.id);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete");
    }
  };

  const brandColor = hotel.branding?.primary_color || "#000000";
  const brandLogo = hotel.branding?.logo_url || undefined;

  return (
    <div className="space-y-6">
      <form onSubmit={onAdd} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Room number</label>
          <Input value={num} onChange={(e) => setNum(e.target.value)} placeholder="214" className="w-32" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Floor (optional)</label>
          <Input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="2" className="w-24" />
        </div>
        <Button type="submit" disabled={busy}>{busy ? "Adding…" : "Add room"}</Button>
      </form>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading rooms…</div>
      ) : rooms.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rooms yet. Add your first room above — a secure QR code is generated automatically.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Room</th>
                <th className="px-4 py-2">Floor</th>
                <th className="px-4 py-2">Stay</th>
                <th className="px-4 py-2 text-right">QR</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{r.room_number}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.floor || "—"}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleOccupancy(r)}
                      title={r.occupancy_status === "vacant"
                        ? "Vacant — the QR is disabled. Click to check a guest in."
                        : "Occupied — click to check out (disables saved links)."}
                      className={`rounded-full px-2 py-0.5 text-xs transition-colors ${
                        r.occupancy_status === "vacant"
                          ? "bg-muted text-muted-foreground hover:bg-muted/70"
                          : "bg-green-500/15 text-green-600 hover:bg-green-500/25"
                      }`}
                    >
                      {r.occupancy_status === "vacant" ? "Vacant · check in" : "Occupied · check out"}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => preview(r)} title="Preview this room's assistant">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => showQr(r)} title="Show QR code">
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onDelete(r)} title="Delete room">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {qr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setQr(null)}>
          <div className="w-full max-w-xs rounded-2xl bg-card p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 font-semibold">Room {qr.room.room_number}</h3>
            <p className="mb-4 text-xs text-muted-foreground">Print this and place it in the room.</p>
            <div className="flex justify-center rounded-xl bg-white p-4">
              <QRCodeCanvas
                value={qr.url} size={200} includeMargin level="H"
                fgColor={brandColor}
                imageSettings={brandLogo ? { src: brandLogo, height: 40, width: 40, excavate: true } : undefined}
              />
            </div>
            <p className="mt-3 break-all text-[10px] text-muted-foreground">{qr.url}</p>
            <Button className="mt-4 w-full" variant="outline" onClick={() => setQr(null)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}

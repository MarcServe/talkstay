import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, QrCode, Loader2, ExternalLink, RefreshCw, Copy, Mail } from "lucide-react";
import {
  addRoom, deleteRoom, getRoomToken, listRooms, setRoomOccupancy, setRequireCheckinCode,
  regenerateCheckinCode, sendCheckinCodeEmail, type Hotel, type Room,
} from "@/talkstay/lib/hotels";
import { getPublicBaseUrl } from "@/config/environment";

function guestUrl(hotel: Hotel, room: Room, token: string): string {
  // Always the canonical production URL — a printed QR must resolve on a guest's
  // phone, never localhost/preview.
  return `${getPublicBaseUrl()}/h/${hotel.slug}/r/${room.id}?token=${token}`;
}

export default function RoomsPanel({ hotel, onHotel }: { hotel: Hotel; onHotel?: (h: Hotel) => void }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [num, setNum] = useState("");
  const [floor, setFloor] = useState("");
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<{ room: Room; url: string } | null>(null);
  const [requireCode, setRequireCode] = useState(!!hotel.require_checkin_code);
  const [savingToggle, setSavingToggle] = useState(false);
  const [emailFor, setEmailFor] = useState<Room | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [emailSending, setEmailSending] = useState(false);

  const toggleRequireCode = async () => {
    const next = !requireCode;
    setSavingToggle(true);
    setRequireCode(next);
    try {
      await setRequireCheckinCode(hotel.id, next);
      onHotel?.({ ...hotel, require_checkin_code: next });
      await refresh(); // codes may have been backfilled onto occupied rooms
      toast.success(next
        ? "Check-in code now required for new devices."
        : "Check-in code turned off.");
    } catch (e: any) {
      setRequireCode(!next);
      toast.error(e?.message ?? "Couldn't update setting");
    } finally {
      setSavingToggle(false);
    }
  };

  const regenCode = async (room: Room) => {
    try {
      const code = await regenerateCheckinCode(room.id);
      setRooms((rs) => rs.map((r) => r.id === room.id ? { ...r, checkin_code: code } : r));
      toast.success(`New code for Room ${room.room_number}: ${code}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't regenerate code");
    }
  };

  const copyCode = async (room: Room) => {
    if (!room.checkin_code) return;
    try {
      await navigator.clipboard.writeText(room.checkin_code);
      toast.success(`Code ${room.checkin_code} copied`);
    } catch {
      toast.error("Couldn't copy — try selecting it manually");
    }
  };

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

  // For busy guests: staff types the guest's email (from the booking) and this
  // sends the code + a direct link to the room's assistant, with instructions —
  // no need to read the code out loud or wait for the guest to ask again.
  const sendCodeEmail = async () => {
    if (!emailFor) return;
    const email = emailInput.trim();
    if (!email || !email.includes("@")) { toast.error("Enter a valid email address"); return; }
    setEmailSending(true);
    try {
      await sendCheckinCodeEmail(emailFor.id, email);
      toast.success(`Code emailed to ${email}`);
      setEmailFor(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't send email");
    } finally {
      setEmailSending(false);
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

      <div className="flex items-start justify-between gap-4 rounded-xl border bg-muted/30 p-4">
        <div className="min-w-0">
          <div className="text-sm font-medium">Require a check-in code</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Extra anti-sharing security. A new device must enter the room's current code
            (read it out at check-in or print it on the key-card sleeve) before it can connect.
            Devices already connected this stay aren't affected.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={requireCode}
          disabled={savingToggle}
          onClick={toggleRequireCode}
          className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${requireCode ? "bg-primary" : "bg-muted-foreground/30"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${requireCode ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading rooms…</div>
      ) : rooms.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rooms yet. Add your first room above — a secure QR code is generated automatically.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Room</th>
                <th className="px-4 py-2">Floor</th>
                <th className="px-4 py-2">Stay</th>
                {requireCode && <th className="px-4 py-2">Check-in code</th>}
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
                  {requireCode && (
                    <td className="px-4 py-2">
                      {r.occupancy_status === "occupied" && r.checkin_code ? (
                        <div className="flex items-center gap-1">
                          <span className="rounded bg-muted px-2 py-0.5 font-mono text-sm tracking-widest">{r.checkin_code}</span>
                          <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => copyCode(r)} title="Copy code">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => regenCode(r)} title="Generate a new code">
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => { setEmailFor(r); setEmailInput(""); }} title="Email code to guest">
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-2">
                    {/* Explicit h-10 w-10 (not the default size=icon's h-9 w-9) — comfortably
                        above the ~44px touch-target guideline once padding/gap are counted;
                        these were previously size="sm" (32px) with only 4px gap, which was
                        too small/cramped to tap reliably on phones and iPads. */}
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" className="h-10 w-10" onClick={() => preview(r)} title="Preview this room's assistant">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" className="h-10 w-10" onClick={() => showQr(r)} title="Show QR code">
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-10 w-10" onClick={() => onDelete(r)} title="Delete room">
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
            {requireCode && qr.room.occupancy_status === "occupied" && qr.room.checkin_code && (
              <p className="mt-2 text-xs text-muted-foreground">
                Check-in code: <span className="font-mono tracking-widest text-foreground">{qr.room.checkin_code}</span>
                <br /><span className="text-[10px]">Give this to the guest — don't print it on the QR.</span>
              </p>
            )}
            <Button className="mt-4 w-full" variant="outline" onClick={() => setQr(null)}>Close</Button>
          </div>
        </div>
      )}

      {emailFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEmailFor(null)}>
          <div className="w-full max-w-xs rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 font-semibold">Email the code — Room {emailFor.room_number}</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Sends the check-in code, a direct link to open the room's assistant, and short instructions — handy for a busy guest who'd rather not wait.
            </p>
            <label className="mb-1 block text-xs text-muted-foreground">Guest's email</label>
            <Input
              autoFocus
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendCodeEmail(); }}
              placeholder="guest@example.com"
            />
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEmailFor(null)}>Cancel</Button>
              <Button className="flex-1" disabled={emailSending} onClick={sendCodeEmail}>
                {emailSending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

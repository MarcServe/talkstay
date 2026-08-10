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
import { OCCUPANCY_STYLE } from "@/talkstay/lib/statusStyles";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";

function guestUrl(hotel: Hotel, room: Room, token: string): string {
  // Always the canonical production URL — a printed QR must resolve on a guest's
  // phone, never localhost/preview.
  return `${getPublicBaseUrl()}/h/${hotel.slug}/r/${room.id}?token=${token}`;
}

export default function RoomsPanel({ hotel, onHotel }: { hotel: Hotel; onHotel?: (h: Hotel) => void }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  /** Prefetched guest tokens so Preview can be a real <a target="_blank"> —
   *  mobile Safari blocks window.open() after await / with noopener. */
  const [tokens, setTokens] = useState<Record<string, string>>({});
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
      toast.success(`New code for ${formatRoomLabel(room.room_number)}: ${code}`);
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
      const list = await listRooms(hotel.id);
      setRooms(list);
      const entries = await Promise.all(
        list.map(async (r) => {
          try {
            const token = await getRoomToken(r.id);
            return token ? ([r.id, token] as const) : null;
          } catch {
            return null;
          }
        }),
      );
      const map: Record<string, string> = {};
      for (const e of entries) if (e) map[e[0]] = e[1];
      setTokens(map);
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

  /** Fallback when a token wasn't prefetched — open blank WITHOUT noopener so
   *  we keep a Window handle (noopener makes window.open return null, which
   *  forces a post-await open that mobile Safari blocks). */
  const previewFallback = async (room: Room) => {
    const win = window.open("about:blank", "_blank");
    try {
      if (win) win.opener = null;
      const token = tokens[room.id] ?? await getRoomToken(room.id);
      if (!token) { win?.close(); toast.error("No active token for this room"); return; }
      const url = guestUrl(hotel, room, token);
      if (win) win.location.href = url;
      else {
        // Last resort: same-tab navigate so staff still reach the guest view.
        window.location.assign(url);
      }
    } catch (e: any) {
      win?.close();
      toast.error(e?.message ?? "Failed to open preview");
    }
  };

  const toggleOccupancy = async (room: Room) => {
    const next = room.occupancy_status === "vacant" ? "occupied" : "vacant";
    if (next === "vacant" && !confirm(`Check out ${formatRoomLabel(room.room_number)}? Any link the guest saved will stop working immediately.`)) return;
    try {
      await setRoomOccupancy(room.id, next);
      await refresh();
      toast.success(next === "vacant"
        ? `${formatRoomLabel(room.room_number)} checked out — saved links disabled.`
        : `${formatRoomLabel(room.room_number)} checked in — its QR is live again.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update room");
    }
  };

  const onDelete = async (room: Room) => {
    if (!confirm(`Delete ${formatRoomLabel(room.room_number)}?`)) return;
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
          <label className="mb-1 block text-xs text-muted-foreground">Name or number</label>
          <Input
            value={num}
            onChange={(e) => setNum(e.target.value)}
            placeholder="214 or Ocean Suite"
            className="w-44"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Floor / area (optional)</label>
          <Input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="2 or Garden" className="w-32" />
        </div>
        <Button type="submit" disabled={busy}>{busy ? "Adding…" : "Add unit"}</Button>
      </form>

      <div className="flex items-start justify-between gap-4 rounded-2xl border bg-muted/30 p-4">
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
        <p className="text-sm text-muted-foreground">No units yet. Add a room number or a name (e.g. Ocean Suite) — a secure QR code is generated automatically.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Name / number</th>
                <th className="px-4 py-2">Floor / area</th>
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
                      className={`rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${
                        OCCUPANCY_STYLE[r.occupancy_status] ?? OCCUPANCY_STYLE.vacant
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
                      {tokens[r.id] ? (
                        <Button size="icon" variant="ghost" className="h-10 w-10" asChild title="Preview this room's assistant">
                          <a
                            href={guestUrl(hotel, r, tokens[r.id])}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      ) : (
                        <Button
                          size="icon" variant="ghost" className="h-10 w-10"
                          onClick={() => previewFallback(r)}
                          title="Preview this room's assistant"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
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
            <h3 className="mb-1 font-semibold">{formatRoomLabel(qr.room.room_number)}</h3>
            <p className="mb-4 text-xs text-muted-foreground">Print this and place it in the room.</p>
            {/* Real <a> links (not window.open()) — a single tap opens them
                directly on mobile, no long-press-to-select needed. */}
            <a href={qr.url} target="_blank" rel="noopener noreferrer" className="flex justify-center rounded-xl bg-white p-4" title="Open this room's assistant">
              <QRCodeCanvas
                value={qr.url} size={200} includeMargin level="H"
                fgColor={brandColor}
                imageSettings={brandLogo ? { src: brandLogo, height: 40, width: 40, excavate: true } : undefined}
              />
            </a>
            <a href={qr.url} target="_blank" rel="noopener noreferrer" className="mt-3 block break-all text-[10px] text-primary underline">
              {qr.url}
            </a>
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
            <h3 className="mb-1 font-semibold">Email the code — {formatRoomLabel(emailFor.room_number)}</h3>
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

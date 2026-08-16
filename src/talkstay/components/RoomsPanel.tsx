import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Trash2, QrCode, Loader2, ExternalLink, RefreshCw, Copy, Mail, Plus,
  Search, LayoutGrid, List,
} from "lucide-react";
import {
  addRoom, deleteRoom, getRoomToken, listRooms, setRoomOccupancy, setRequireCheckinCode,
  regenerateCheckinCode, sendCheckinCodeEmail, setRoomPublicQr, setRoomRequireCheckinCode,
  roomRequiresCheckinCode, type Hotel, type Room,
} from "@/talkstay/lib/hotels";
import { OCCUPANCY_STYLE, formatMoney } from "@/talkstay/lib/statusStyles";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";
import { supabase } from "@/integrations/supabase/client";
import { guestStayUrl, type GuestStaySurface } from "@/talkstay/lib/guestUrls";
import GuestAccessTip from "@/talkstay/components/GuestAccessTip";

type RoomStatusFilter = "all" | "occupied" | "vacant" | "public";
type RoomsView = "card" | "list";
const ROOMS_VIEW_KEY = "talkstay-rooms-view";

function readRoomsView(): RoomsView {
  try {
    const v = localStorage.getItem(ROOMS_VIEW_KEY);
    return v === "list" ? "list" : "card";
  } catch {
    return "card";
  }
}

function guestUrl(hotel: Hotel, room: Room, token: string, surface: GuestStaySurface = "chat"): string {
  return guestStayUrl({
    hotelSlug: hotel.slug,
    roomId: room.id,
    token,
    surface,
  });
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
  const [qr, setQr] = useState<{ room: Room; token: string; surface: GuestStaySurface } | null>(null);
  const [requireCode, setRequireCode] = useState(!!hotel.require_checkin_code);
  const [savingToggle, setSavingToggle] = useState(false);
  const [emailFor, setEmailFor] = useState<Room | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RoomStatusFilter>("all");
  const [view, setView] = useState<RoomsView>(readRoomsView);

  const setRoomsView = (next: RoomsView) => {
    setView(next);
    try { localStorage.setItem(ROOMS_VIEW_KEY, next); } catch { /* ignore */ }
  };

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms.filter((r) => {
      if (q) {
        const hay = `${r.room_number} ${r.floor ?? ""} ${r.checkin_code ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter === "public") return !!r.is_public;
      if (statusFilter === "occupied") return !r.is_public && r.occupancy_status === "occupied";
      if (statusFilter === "vacant") return !r.is_public && r.occupancy_status !== "occupied";
      return true;
    });
  }, [rooms, search, statusFilter]);

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
      toast.success(`${formatRoomLabel(num.trim())} added with a QR code`);
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
      setQr({ room, token, surface: "chat" });
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
    if (next === "vacant") {
      let unpaidNote = "";
      try {
        const { data } = await supabase
          .from("ts_service_requests")
          .select("id, summary, price, currency, payment_status")
          .eq("room_id", room.id)
          .eq("is_chargeable", true)
          .eq("payment_status", "unpaid");
        const unpaid = data ?? [];
        if (unpaid.length) {
          const priced = unpaid.filter((r) => typeof r.price === "number" && Number(r.price) > 0);
          const total = priced.reduce((sum, r) => sum + Number(r.price), 0);
          const currency = unpaid.find((r) => r.currency)?.currency ?? "GBP";
          unpaidNote = priced.length
            ? `\n\n⚠ ${unpaid.length} unpaid chargeable item(s) · ${formatMoney(total, currency)} still owed.`
            : `\n\n⚠ ${unpaid.length} unpaid chargeable item(s) — open Operations to settle before checkout.`;
        }
      } catch { /* billing columns may not exist yet */ }
      if (!confirm(
        `Check out ${formatRoomLabel(room.room_number)}? Any link the guest saved will stop working immediately.${unpaidNote}`,
      )) return;
    }
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

  const togglePublic = async (room: Room) => {
    const next = !room.is_public;
    try {
      await setRoomPublicQr(room.id, next);
      setRooms((rs) => rs.map((r) =>
        r.id === room.id
          ? { ...r, is_public: next, require_checkin_code: next ? false : null }
          : r,
      ));
      toast.success(next
        ? `${formatRoomLabel(room.room_number)} is a public QR — no check-in code, always open.`
        : `${formatRoomLabel(room.room_number)} is a private unit again.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't update public QR setting");
    }
  };

  const toggleRoomCode = async (room: Room) => {
    // Cycle inherit → force on → force off → inherit when hotel default is on;
    // when hotel default is off: inherit ↔ force on.
    const current = room.require_checkin_code;
    let next: boolean | null;
    if (requireCode) {
      if (current == null) next = false; // public-style no code for this room only
      else if (current === false) next = true;
      else next = null;
    } else {
      if (current == null) next = true;
      else next = null;
    }
    try {
      await setRoomRequireCheckinCode(room.id, next);
      await refresh();
      toast.success(
        next == null
          ? `${formatRoomLabel(room.room_number)} follows the property default.`
          : next
            ? `${formatRoomLabel(room.room_number)} always requires a check-in code.`
            : `${formatRoomLabel(room.room_number)} never requires a check-in code.`,
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't update room code setting");
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
    <div className="space-y-5">
      <GuestAccessTip />
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
        <Button type="submit" disabled={busy} className="bg-violet-600 hover:bg-violet-700">
          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
          {busy ? "Adding…" : "Add unit"}
        </Button>
      </form>

      <div className="flex items-start justify-between gap-4 rounded-2xl border bg-muted/30 p-4">
        <div className="min-w-0">
          <div className="text-sm font-medium">Require a check-in code (default)</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Property default for private rooms. New devices must enter the room's code before connecting.
            Override per unit below — use <span className="font-medium text-foreground">Public QR</span> for
            lobby, bar, or shared spaces where anyone can scan freely.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={requireCode}
          disabled={savingToggle}
          onClick={toggleRequireCode}
          className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${requireCode ? "bg-violet-600" : "bg-muted-foreground/30"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${requireCode ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading rooms…</div>
      ) : rooms.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No units yet. Add a room number or a name (e.g. Ocean Suite) — a secure QR code is generated automatically.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, floor, or code…"
                className="h-9 pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RoomStatusFilter)}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All units</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="vacant">Vacant</SelectItem>
                <SelectItem value="public">Public QR</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex rounded-lg border p-0.5">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={`h-8 gap-1.5 px-2.5 ${view === "card" ? "bg-violet-100 text-violet-900 hover:bg-violet-100" : ""}`}
                onClick={() => setRoomsView("card")}
                aria-pressed={view === "card"}
                title="Card view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={`h-8 gap-1.5 px-2.5 ${view === "list" ? "bg-violet-100 text-violet-900 hover:bg-violet-100" : ""}`}
                onClick={() => setRoomsView("list")}
                aria-pressed={view === "list"}
                title="List view"
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">List</span>
              </Button>
            </div>
          </div>

          {filteredRooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No units match{search.trim() ? ` “${search.trim()}”` : ""}. Try another search or clear the filter.
            </p>
          ) : view === "list" ? (
            <div className="divide-y overflow-hidden rounded-2xl border bg-card">
              {filteredRooms.map((r) => {
                const occupied = r.occupancy_status === "occupied";
                const isPublic = !!r.is_public;
                const needsCode = roomRequiresCheckinCode(r, requireCode);
                const previewHref = tokens[r.id] ? guestUrl(hotel, r, tokens[r.id]) : null;
                const showCode = !isPublic && needsCode && occupied && !!r.checkin_code;
                return (
                  <div
                    key={r.id}
                    className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
                      isPublic ? "bg-sky-50/40" : ""
                    }`}
                  >
                    <div className="min-w-[110px] flex-1">
                      <div className="font-semibold tracking-tight">{formatRoomLabel(r.room_number)}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.floor ? r.floor : "No floor / area"}
                      </div>
                    </div>

                    {showCode ? (
                      <button
                        type="button"
                        onClick={() => copyCode(r)}
                        title="Copy check-in code"
                        className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/40 px-2 py-1 font-mono text-sm tracking-widest hover:border-violet-300 hover:bg-violet-50/60"
                      >
                        {r.checkin_code}
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    ) : (
                      <span className="w-[88px] shrink-0 text-center text-[10px] text-muted-foreground">
                        {isPublic ? "No code" : "—"}
                      </span>
                    )}

                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs">
                      <span className={isPublic ? "font-medium text-sky-800" : "text-muted-foreground"}>
                        Public QR
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isPublic}
                        aria-label={`Public QR for ${formatRoomLabel(r.room_number)}`}
                        onClick={() => togglePublic(r)}
                        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${isPublic ? "bg-sky-600" : "bg-muted-foreground/30"}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${isPublic ? "left-[18px]" : "left-0.5"}`} />
                      </button>
                    </label>

                    {isPublic ? (
                      <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-800">Public QR</Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className={`capitalize ${OCCUPANCY_STYLE[r.occupancy_status ?? "vacant"] ?? OCCUPANCY_STYLE.vacant}`}
                      >
                        {r.occupancy_status}
                      </Badge>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleRoomCode(r)}
                      disabled={isPublic}
                      title={isPublic ? "Public areas never require a check-in code" : "Tap to cycle code requirement"}
                      className={`rounded-lg border px-2 py-1.5 text-left text-[11px] leading-tight transition-colors ${
                        isPublic
                          ? "cursor-not-allowed border-dashed text-muted-foreground opacity-60"
                          : "hover:border-violet-300 hover:bg-violet-50/60"
                      }`}
                    >
                      {r.require_checkin_code == null
                        ? "Code: property default"
                        : r.require_checkin_code
                          ? "Code: always on"
                          : "Code: always off"}
                      {!isPublic && (
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">tap to change</span>
                      )}
                    </button>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button size="sm" variant="outline" className="h-8" onClick={() => showQr(r)}>
                        <QrCode className="mr-1 h-3.5 w-3.5" /> QR
                      </Button>
                      {previewHref ? (
                        <Button size="sm" variant="outline" className="h-8" asChild>
                          <a href={previewHref} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-1 h-3.5 w-3.5" /> Preview
                          </a>
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="h-8" onClick={() => previewFallback(r)}>
                          <ExternalLink className="mr-1 h-3.5 w-3.5" /> Preview
                        </Button>
                      )}
                      {!isPublic && (
                        <Button size="sm" variant="outline" className="h-8" onClick={() => toggleOccupancy(r)}>
                          {occupied ? "Check out" : "Check in"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(r)}
                        title="Delete room"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredRooms.map((r) => {
            const occupied = r.occupancy_status === "occupied";
            const isPublic = !!r.is_public;
            const needsCode = roomRequiresCheckinCode(r, requireCode);
            const previewHref = tokens[r.id] ? guestUrl(hotel, r, tokens[r.id]) : null;
            const codeOverrideLabel = r.require_checkin_code == null
              ? "Code: property default"
              : r.require_checkin_code
                ? "Code: always on"
                : "Code: always off";
            return (
              <div
                key={r.id}
                className={`rounded-2xl border bg-card p-4 shadow-sm ${
                  isPublic ? "border-sky-300/80 ring-1 ring-sky-500/10" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold tracking-tight">
                      {formatRoomLabel(r.room_number)}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {r.floor ? `${r.floor}` : "No floor / area"}
                      {needsCode && occupied && r.checkin_code
                        ? ` · code ${r.checkin_code}`
                        : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {isPublic ? (
                      <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-800">
                        Public QR
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className={`capitalize ${OCCUPANCY_STYLE[r.occupancy_status ?? "vacant"] ?? OCCUPANCY_STYLE.vacant}`}
                      >
                        {r.occupancy_status}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border bg-muted/30 px-2.5 py-2">
                  <div className="min-w-0">
                    <div className="text-xs font-medium">Public QR area</div>
                    <p className="text-[10px] leading-snug text-muted-foreground">
                      Lobby, bar, spa — no code, always open
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isPublic}
                    onClick={() => togglePublic(r)}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${isPublic ? "bg-sky-600" : "bg-muted-foreground/30"}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${isPublic ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                </div>

                {!isPublic && (
                  <button
                    type="button"
                    onClick={() => toggleRoomCode(r)}
                    className="mt-2 w-full rounded-lg border border-dashed px-2.5 py-1.5 text-left text-[11px] text-muted-foreground hover:border-violet-300 hover:bg-violet-50/50 hover:text-foreground"
                  >
                    {codeOverrideLabel}
                    <span className="text-muted-foreground/80"> · tap to change</span>
                  </button>
                )}

                {needsCode && occupied && r.checkin_code && (
                  <div className="mt-3 flex flex-wrap items-center gap-1 rounded-xl border bg-muted/40 px-2 py-1.5">
                    <span className="mr-1 font-mono text-sm tracking-widest">{r.checkin_code}</span>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyCode(r)} title="Copy code">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => regenCode(r)} title="Generate a new code">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => { setEmailFor(r); setEmailInput(""); }}
                      title="Email code to guest"
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => showQr(r)}>
                    <QrCode className="mr-1 h-3.5 w-3.5" /> QR
                  </Button>
                  {previewHref ? (
                    <Button size="sm" variant="outline" asChild>
                      <a href={previewHref} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1 h-3.5 w-3.5" /> Preview
                      </a>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => previewFallback(r)}>
                      <ExternalLink className="mr-1 h-3.5 w-3.5" /> Preview
                    </Button>
                  )}
                  {!isPublic && (
                    <Button size="sm" variant="outline" onClick={() => toggleOccupancy(r)}>
                      {occupied ? "Check out" : "Check in"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(r)}
                    title="Delete room"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
              })}
            </div>
          )}
        </>
      )}

      {qr && (() => {
        const url = guestUrl(hotel, qr.room, qr.token, qr.surface);
        const surfaceLabel =
          qr.surface === "checkin" ? "Check-in"
            : qr.surface === "checkout" ? "Checkout & balance"
              : "Room assistant";
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setQr(null)}>
          <div className="w-full max-w-xs rounded-2xl bg-card p-6 text-center shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 font-semibold">{formatRoomLabel(qr.room.room_number)}</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Print a QR for the assistant, check-in, or checkout folio (prices).
            </p>
            <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-muted/50 p-1">
              {([
                ["chat", "Ask"],
                ["checkin", "In"],
                ["checkout", "Out"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setQr({ ...qr, surface: key })}
                  className={`rounded-lg px-1.5 py-1.5 text-[11px] font-semibold transition ${
                    qr.surface === key ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mb-2 text-[11px] font-medium text-foreground">{surfaceLabel}</p>
            {/* Real <a> links (not window.open()) — a single tap opens them
                directly on mobile, no long-press-to-select needed. */}
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex justify-center rounded-xl bg-white p-4" title={surfaceLabel}>
              <QRCodeCanvas
                value={url} size={200} includeMargin level="H"
                fgColor={brandColor}
                imageSettings={brandLogo ? { src: brandLogo, height: 40, width: 40, excavate: true } : undefined}
              />
            </a>
            <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 block break-all text-[10px] text-primary underline">
              {url}
            </a>
            <Button
              className="mt-2 w-full"
              size="sm"
              variant="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success(`${surfaceLabel} link copied`);
                } catch {
                  toast.error("Couldn't copy link");
                }
              }}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy {surfaceLabel.toLowerCase()} link
            </Button>
            {roomRequiresCheckinCode(qr.room, requireCode) && qr.room.occupancy_status === "occupied" && qr.room.checkin_code && (
              <p className="mt-2 text-xs text-muted-foreground">
                Check-in code: <span className="font-mono tracking-widest text-foreground">{qr.room.checkin_code}</span>
                <br /><span className="text-[10px]">Give this to the guest — don't print it on the QR.</span>
              </p>
            )}
            {qr.room.is_public && (
              <p className="mt-2 text-xs text-sky-800">
                Public QR — visitors can scan without a check-in code.
              </p>
            )}
            <Button className="mt-4 w-full" variant="outline" onClick={() => setQr(null)}>Close</Button>
          </div>
        </div>
        );
      })()}

      {emailFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEmailFor(null)}>
          <div className="w-full max-w-xs rounded-2xl bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 font-semibold">Email the code — {formatRoomLabel(emailFor.room_number)}</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Sends the check-in code, a direct Room Assistant link, and short instructions.
              Guests can open that link from anywhere — not only by scanning the QR in the room.
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
              <Button className="flex-1 bg-violet-600 hover:bg-violet-700" disabled={emailSending} onClick={sendCodeEmail}>
                {emailSending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

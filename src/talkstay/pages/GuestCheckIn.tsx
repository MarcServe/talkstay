import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MessageCircle, DoorOpen, LogOut } from "lucide-react";
import NoIndexMeta from "@/talkstay/components/NoIndexMeta";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";
import {
  fetchContext,
  getSessionId,
  type GuestBranding,
} from "@/talkstay/lib/guest";
import { guestStayPath } from "@/talkstay/lib/guestUrls";

/**
 * Arrival landing for a room QR / emailed link.
 * Guests enter their check-in code (when required), then continue to the
 * assistant or jump ahead to the stay checkout folio.
 */
export default function GuestCheckIn() {
  const { hotelSlug = "", roomId = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const codeHint = params.get("code") || "";

  const sid = hotelSlug && roomId ? getSessionId(hotelSlug, roomId) : "";
  const [loading, setLoading] = useState(true);
  const [needCode, setNeedCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState(codeHint);
  const [invalid, setInvalid] = useState(false);
  const [checkedOut, setCheckedOut] = useState(false);
  const [roomFull, setRoomFull] = useState(false);
  const [hotelName, setHotelName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [branding, setBranding] = useState<GuestBranding | undefined>();
  const [ready, setReady] = useState(false);

  const brand = branding?.primary_color || "#0f766e";
  const chatHref = `${guestStayPath(hotelSlug, roomId, "chat")}?token=${encodeURIComponent(token)}`;
  const checkoutHref = `${guestStayPath(hotelSlug, roomId, "checkout")}?token=${encodeURIComponent(token)}`;

  const claim = (code?: string) => {
    if (!hotelSlug || !roomId || !token) {
      setInvalid(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchContext(hotelSlug, roomId, token, code, sid)
      .then((c) => {
        setHotelName(c.hotelName);
        setRoomNumber(c.roomNumber);
        setBranding(c.branding);
        setNeedCode(false);
        setCodeError(null);
        setCheckedOut(false);
        setRoomFull(false);
        setInvalid(false);
        setReady(true);
      })
      .catch((e) => {
        const msg = String(e?.message ?? e);
        if (typeof e?.hotelName === "string") setHotelName(e.hotelName);
        if (typeof e?.roomNumber === "string") setRoomNumber(e.roomNumber);
        if (msg.includes("checked_out")) {
          setCheckedOut(true);
          setNeedCode(false);
        } else if (msg.includes("room_full")) {
          setRoomFull(true);
        } else if (msg.includes("need_code")) {
          setNeedCode(true);
          setCodeError(null);
        } else if (msg.includes("bad_code")) {
          setNeedCode(true);
          setCodeError("That code didn't match. Please check with reception.");
        } else {
          setInvalid(true);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    claim(codeHint || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelSlug, roomId, token]);

  return (
    <>
      <NoIndexMeta />
      <div
        className="min-h-[100dvh] px-4 py-8"
        style={{
          background: `linear-gradient(165deg, ${brand}14 0%, #f8fafc 42%, #eef2ff 100%)`,
        }}
      >
        <div className="mx-auto w-full max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Check in</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {hotelName || "Welcome"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {roomNumber ? formatRoomLabel(roomNumber) : "Your room"}
            {" · "}Scan the QR or use the code from reception to start your stay.
          </p>

          <div className="mt-6 rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
            {loading ? (
              <div className="flex items-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking your room…
              </div>
            ) : invalid ? (
              <p className="text-sm text-slate-700">This QR link isn’t valid. Please ask reception for a fresh one.</p>
            ) : checkedOut ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-900">This stay has ended</p>
                <p className="text-xs text-slate-600">
                  When reception checks you in again, they’ll give you a new code for this QR.
                </p>
              </div>
            ) : roomFull ? (
              <p className="text-sm text-slate-700">
                This room already has the maximum number of guest devices. Ask reception for help.
              </p>
            ) : needCode ? (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  claim(codeInput.trim());
                }}
              >
                <p className="text-sm font-medium text-slate-900">Enter your check-in code</p>
                <p className="text-xs text-slate-600">
                  Reception gave you a short code with this room — it isn’t printed on the QR poster.
                </p>
                <Input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. R3K8NW"
                  className="h-11 tracking-[0.2em]"
                  autoCapitalize="characters"
                  autoCorrect="off"
                />
                {codeError && <p className="text-xs text-rose-700">{codeError}</p>}
                <Button type="submit" className="h-11 w-full text-white" style={{ backgroundColor: brand }}>
                  <DoorOpen className="mr-1.5 h-4 w-4" /> Check in
                </Button>
              </form>
            ) : ready ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-3">
                  <p className="text-sm font-semibold text-emerald-950">You’re checked in</p>
                  <p className="mt-0.5 text-xs text-emerald-900/80">
                    Ask the assistant for anything, or open checkout anytime to see what you owe.
                  </p>
                </div>
                <Button asChild className="h-11 w-full text-white" style={{ backgroundColor: brand }}>
                  <Link to={chatHref}>
                    <MessageCircle className="mr-1.5 h-4 w-4" /> Open room assistant
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 w-full">
                  <Link to={checkoutHref}>
                    <LogOut className="mr-1.5 h-4 w-4" /> View checkout & balance
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MessageCircle, DoorOpen, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import NoIndexMeta from "@/talkstay/components/NoIndexMeta";
import { GuestFolio } from "@/talkstay/components/GuestFolio";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";
import { folioPayCopy, orderLocationKind } from "@/talkstay/lib/locationOrders";
import {
  fetchContext,
  fetchMyRequests,
  getSessionId,
  requestPaymentNow,
  setPaymentTiming,
  type GuestBranding,
  type GuestPaymentTiming,
  type GuestRequest,
} from "@/talkstay/lib/guest";
import { guestStayPath } from "@/talkstay/lib/guestUrls";

/**
 * Guest checkout folio — itemized prices, total owed, Pay now / Charge to room (or Pay at counter for public areas).
 * Same room QR token as chat/check-in. Staff still end the stay in Rooms & QR.
 */
export default function GuestCheckOut() {
  const { hotelSlug = "", roomId = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const codeHint = params.get("code") || "";

  const sid = hotelSlug && roomId ? getSessionId(hotelSlug, roomId) : "";
  const [loading, setLoading] = useState(true);
  const [folioLoading, setFolioLoading] = useState(false);
  const [needCode, setNeedCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState(codeHint);
  const [invalid, setInvalid] = useState(false);
  const [checkedOut, setCheckedOut] = useState(false);
  const [hotelName, setHotelName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [branding, setBranding] = useState<GuestBranding | undefined>();
  const [ready, setReady] = useState(false);
  const [reqs, setReqs] = useState<GuestRequest[]>([]);
  const [paymentTiming, setPaymentTimingState] = useState<GuestPaymentTiming | null>(null);
  const [payBusy, setPayBusy] = useState(false);

  const brand = branding?.primary_color || "#0f766e";
  const chatHref = `${guestStayPath(hotelSlug, roomId, "chat")}?token=${encodeURIComponent(token)}`;
  const checkinHref = `${guestStayPath(hotelSlug, roomId, "checkin")}?token=${encodeURIComponent(token)}`;
  const payCopy = folioPayCopy(orderLocationKind(isPublic));

  const loadFolio = useCallback(async () => {
    if (!hotelSlug || !roomId || !token || !sid) return;
    setFolioLoading(true);
    try {
      const payload = await fetchMyRequests(hotelSlug, roomId, token, sid);
      setReqs(payload.requests);
      setPaymentTimingState(payload.paymentTiming);
    } catch {
      setReqs([]);
    } finally {
      setFolioLoading(false);
    }
  }, [hotelSlug, roomId, token, sid]);

  const claim = (code?: string) => {
    if (!hotelSlug || !roomId || !token) {
      setInvalid(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchContext(hotelSlug, roomId, token, code, sid)
      .then(async (c) => {
        setHotelName(c.hotelName);
        setRoomNumber(c.roomNumber);
        setIsPublic(!!c.isPublic);
        setBranding(c.branding);
        setNeedCode(false);
        setCodeError(null);
        setCheckedOut(false);
        setInvalid(false);
        setReady(true);
        await loadFolio();
      })
      .catch((e) => {
        const msg = String(e?.message ?? e);
        if (typeof e?.hotelName === "string") setHotelName(e.hotelName);
        if (typeof e?.roomNumber === "string") setRoomNumber(e.roomNumber);
        if (msg.includes("checked_out")) {
          setCheckedOut(true);
          setNeedCode(false);
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

  const payNow = async () => {
    setPayBusy(true);
    try {
      await requestPaymentNow({ hotelSlug, roomId, token, sessionId: sid });
      setPaymentTimingState("pay_now");
      toast.success(payCopy.payNowToast);
      await loadFolio();
    } catch (e: any) {
      const msg = String(e?.message ?? e?.code ?? "");
      toast.error(
        msg.includes("too_soon")
          ? "You've already asked — please wait a few minutes."
          : msg.includes("nothing_owed")
            ? "Nothing unpaid right now."
            : "Couldn't notify the team. Please try again.",
      );
    } finally {
      setPayBusy(false);
    }
  };

  const payAtCheckout = async () => {
    setPayBusy(true);
    try {
      await setPaymentTiming({ hotelSlug, roomId, token, sessionId: sid, timing: "at_checkout" });
      setPaymentTimingState("at_checkout");
      toast.success(payCopy.deferToast);
    } catch {
      toast.error("Couldn't save that preference. Please try again.");
    } finally {
      setPayBusy(false);
    }
  };

  return (
    <>
      <NoIndexMeta />
      <div
        className="min-h-[100dvh] px-4 py-8"
        style={{
          background: `linear-gradient(165deg, ${brand}12 0%, #fffbeb 38%, #f8fafc 100%)`,
        }}
      >
        <div className="mx-auto w-full max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800/70">
            {isPublic ? "Your order" : "Checkout"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {isPublic ? "Location balance" : "Your stay balance"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {hotelName || "Hotel"}
            {roomNumber ? ` · ${formatRoomLabel(roomNumber)}` : ""}
            {isPublic
              ? " — prices for orders at this area."
              : " — prices for room service and extras, ready before you leave."}
          </p>

          <div className="mt-6 space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 rounded-3xl border bg-white/90 px-4 py-8 text-muted-foreground shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Opening your folio…
              </div>
            ) : invalid ? (
              <div className="rounded-3xl border bg-white/90 p-5 text-sm shadow-sm">
                This QR link isn’t valid. Please ask reception for a fresh one.
              </div>
            ) : checkedOut ? (
              <div className="space-y-3 rounded-3xl border bg-white/90 p-5 shadow-sm">
                <p className="text-sm font-medium">This stay has ended</p>
                <p className="text-xs text-muted-foreground">
                  For a new stay, reception will check the room in and give you a code.
                </p>
                <Button asChild variant="outline" className="h-10 w-full">
                  <Link to={checkinHref}>
                    <DoorOpen className="mr-1.5 h-4 w-4" /> Go to check-in
                  </Link>
                </Button>
              </div>
            ) : needCode ? (
              <form
                className="space-y-3 rounded-3xl border bg-white/90 p-5 shadow-sm"
                onSubmit={(e) => {
                  e.preventDefault();
                  claim(codeInput.trim());
                }}
              >
                <p className="text-sm font-medium">Enter your check-in code to view your balance</p>
                <Input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. R3K8NW"
                  className="h-11 tracking-[0.2em]"
                  autoCapitalize="characters"
                />
                {codeError && <p className="text-xs text-rose-700">{codeError}</p>}
                <Button type="submit" className="h-11 w-full text-white" style={{ backgroundColor: brand }}>
                  Unlock checkout
                </Button>
              </form>
            ) : ready ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">Live from your requests this stay</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 text-xs"
                    disabled={folioLoading}
                    onClick={() => void loadFolio()}
                  >
                    {folioLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Refresh
                  </Button>
                </div>
                <GuestFolio
                  requests={reqs}
                  paymentTiming={paymentTiming}
                  payBusy={payBusy}
                  onPayNow={() => void payNow()}
                  onPayAtCheckout={() => void payAtCheckout()}
                  isPublic={isPublic}
                  variant="page"
                />
                <p className="text-[11px] leading-relaxed text-slate-500">
                  {isPublic
                    ? "Pay now asks someone to collect at this location. Pay at counter settles when you visit the desk — room charge isn’t available for walk-ins."
                    : "Front desk still completes checkout in Rooms & QR. Use Pay now if you’d like someone to collect in the room first."}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button asChild className="h-11 text-white" style={{ backgroundColor: brand }}>
                    <Link to={chatHref}>
                      <MessageCircle className="mr-1.5 h-4 w-4" /> {isPublic ? "Assistant" : "Room assistant"}
                    </Link>
                  </Button>
                  {!isPublic && (
                    <Button asChild variant="outline" className="h-11">
                      <Link to={checkinHref}>
                        <DoorOpen className="mr-1.5 h-4 w-4" /> Check-in page
                      </Link>
                    </Button>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}


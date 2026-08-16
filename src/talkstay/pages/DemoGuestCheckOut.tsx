import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DoorOpen, MessageCircle } from "lucide-react";
import NoIndexMeta from "@/talkstay/components/NoIndexMeta";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";
import { GuestFolio } from "@/talkstay/components/GuestFolio";
import { DemoProvider, useDemo } from "@/talkstay/demo/DemoContext";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";
import type { GuestRequest } from "@/talkstay/lib/guest";

const BRAND = "#4c2bb8";
const ROOM = "306";
const ROOM_ID = "demo-room-306";

function DemoCheckOutInner() {
  const demo = useDemo()!;
  const reqs = demo.state.requests
    .filter((r) => r.room_id === ROOM_ID || r.ts_rooms?.room_number === ROOM)
    .map((r) => ({
      id: r.id,
      department_key: r.department_key,
      summary: r.summary,
      status: r.status,
      is_complaint: r.is_complaint,
      created_at: r.created_at,
      is_chargeable: r.is_chargeable,
      price: r.price,
      currency: r.currency,
      payment_status: r.payment_status,
    })) satisfies GuestRequest[];

  return (
    <div
      className="min-h-[100dvh] px-4 py-8"
      style={{ background: `linear-gradient(165deg, ${BRAND}10 0%, #fffbeb 40%, #f8fafc 100%)` }}
    >
      <div className="mx-auto w-full max-w-md space-y-4">
        <TalkStayLogo className="h-7 w-auto" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800/70">Checkout · Demo</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Your stay balance</h1>
          <p className="mt-1 text-sm text-slate-600">
            {demo.hotel.name} · {formatRoomLabel(ROOM)} — itemized prices before you leave.
          </p>
        </div>

        <GuestFolio
          requests={reqs}
          paymentTiming={demo.state.paymentTiming}
          onPayNow={() => {
            demo.guestRequestPayment();
            toast.success("We've asked the team to come collect payment.");
          }}
          onPayAtCheckout={() => {
            demo.guestSetPaymentTiming("at_checkout");
            toast.success("We'll settle this at the desk on checkout.");
          }}
          isPublic={false}
          variant="page"
        />

        <p className="text-[11px] text-slate-500">
          In the live hotel, front desk still ends the stay in Rooms & QR after collecting.
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button asChild className="h-11 text-white" style={{ backgroundColor: BRAND }}>
            <Link to="/demo/guest">
              <MessageCircle className="mr-1.5 h-4 w-4" /> Room assistant
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11">
            <Link to="/demo/guest/checkin">
              <DoorOpen className="mr-1.5 h-4 w-4" /> Check-in page
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DemoGuestCheckOut() {
  return (
    <DemoProvider>
      <NoIndexMeta />
      <DemoCheckOutInner />
    </DemoProvider>
  );
}

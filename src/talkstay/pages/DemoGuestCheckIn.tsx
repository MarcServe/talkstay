import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DoorOpen, LogOut, MessageCircle } from "lucide-react";
import NoIndexMeta from "@/talkstay/components/NoIndexMeta";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";
import { DemoProvider, useDemo } from "@/talkstay/demo/DemoContext";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";

const BRAND = "#4c2bb8";
const ROOM = "306";

function DemoCheckInInner() {
  const demo = useDemo()!;
  const room = demo.state.rooms.find((r) => r.room_number === ROOM);

  return (
    <div
      className="min-h-[100dvh] px-4 py-8"
      style={{ background: `linear-gradient(165deg, ${BRAND}14 0%, #f8fafc 45%, #eef2ff 100%)` }}
    >
      <div className="mx-auto w-full max-w-md">
        <TalkStayLogo className="h-7 w-auto" />
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Check in · Demo</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{demo.hotel.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {formatRoomLabel(ROOM)}
          {room?.checkin_code ? ` · code ${room.checkin_code}` : ""}
        </p>

        <div className="mt-6 space-y-3 rounded-3xl border bg-white/90 p-5 shadow-sm">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-3">
            <p className="text-sm font-semibold text-emerald-950">You’re checked in (demo)</p>
            <p className="mt-0.5 text-xs text-emerald-900/80">
              Same flow as a live QR — continue to the assistant or open checkout to see prices.
            </p>
          </div>
          <Button asChild className="h-11 w-full text-white" style={{ backgroundColor: BRAND }}>
            <Link to="/demo/guest">
              <MessageCircle className="mr-1.5 h-4 w-4" /> Open room assistant
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full">
            <Link to="/demo/guest/checkout">
              <LogOut className="mr-1.5 h-4 w-4" /> View checkout & balance
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DemoGuestCheckIn() {
  return (
    <DemoProvider>
      <NoIndexMeta />
      <DemoCheckInInner />
    </DemoProvider>
  );
}

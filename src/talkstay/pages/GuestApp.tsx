import { useParams } from "react-router-dom";

// Guest PWA — opened by scanning a room QR code at /h/:hotelSlug/r/:roomId?token=…
// Full implementation (token validation, voice+text assistant, service requests,
// notification choice, local history, reviews) lands in Phase 3.
export default function GuestApp() {
  const { hotelSlug, roomId } = useParams();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-2xl font-semibold">How can we help?</h1>
      <p className="text-muted-foreground">
        Hotel <span className="font-mono">{hotelSlug}</span> · Room{" "}
        <span className="font-mono">{roomId}</span>
      </p>
      <p className="text-sm text-muted-foreground">Guest assistant coming in Phase 3.</p>
    </div>
  );
}

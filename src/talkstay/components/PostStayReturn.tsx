import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PostStayRetention = {
  hotelName?: string | null;
  bookingUrl?: string | null;
  returnOffer?: string | null;
  brandColor?: string | null;
};

function normalizeBookingUrl(raw?: string | null): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Thank-you + direct rebooking CTA for guests whose stay has ended.
 * Only renders the book button when the property configured a booking URL.
 */
export default function PostStayReturn({
  retention,
  compact,
}: {
  retention: PostStayRetention;
  /** Tighter layout for folio / check-in cards. */
  compact?: boolean;
}) {
  const bookingUrl = normalizeBookingUrl(retention.bookingUrl);
  if (!bookingUrl) return null;

  const brand = retention.brandColor || "#7c3aed";
  const hotel = retention.hotelName?.trim() || "us";
  const offer = retention.returnOffer?.trim() || null;

  return (
    <div
      className={`rounded-2xl border text-left ${
        compact ? "bg-white/90 p-4" : "bg-muted/30 p-5"
      }`}
      style={{ borderColor: `${brand}33` }}
    >
      <p className={`font-semibold tracking-tight ${compact ? "text-sm" : "text-base"}`}>
        We&apos;d love to welcome you back
      </p>
      <p className={`mt-1 text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
        Book your next stay directly with {hotel} — the smoothest way to return.
      </p>
      {offer && (
        <p
          className={`mt-2 rounded-xl px-3 py-2 text-xs leading-snug ${compact ? "" : "sm:text-sm"}`}
          style={{ backgroundColor: `${brand}12`, color: brand }}
        >
          {offer}
        </p>
      )}
      <Button
        asChild
        className={`mt-3 w-full text-white ${compact ? "h-10" : "h-11"}`}
        style={{ backgroundColor: brand }}
      >
        <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-1.5 h-4 w-4" />
          Book your next stay
        </a>
      </Button>
    </div>
  );
}

import { getPublicBaseUrl } from "@/config/environment";

/** Guest stay destinations for the same room token (QR / email / code). */
export type GuestStaySurface = "chat" | "checkin" | "checkout";

export function guestStayPath(
  hotelSlug: string,
  roomId: string,
  surface: GuestStaySurface = "chat",
): string {
  const base = `/h/${hotelSlug}/r/${roomId}`;
  if (surface === "checkin") return `${base}/checkin`;
  if (surface === "checkout") return `${base}/checkout`;
  return base;
}

export function guestStayUrl(args: {
  hotelSlug: string;
  roomId: string;
  token: string;
  surface?: GuestStaySurface;
  /** Optional check-in code hint for email deep-links (not printed on QR). */
  code?: string | null;
}): string {
  const path = guestStayPath(args.hotelSlug, args.roomId, args.surface ?? "chat");
  const q = new URLSearchParams();
  q.set("token", args.token);
  if (args.code) q.set("code", args.code);
  return `${getPublicBaseUrl()}${path}?${q.toString()}`;
}

export function demoGuestPath(surface: GuestStaySurface = "chat"): string {
  if (surface === "checkin") return "/demo/guest/checkin";
  if (surface === "checkout") return "/demo/guest/checkout";
  return "/demo/guest";
}

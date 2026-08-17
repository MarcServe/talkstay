/**
 * Format a stay unit for display.
 * Hotels often use numbers ("217"); short-stays / Airbnbs often use names
 * ("Ocean Suite", "The Loft"). Don't force "Room " onto a name.
 */
export function formatRoomLabel(
  raw: string | null | undefined,
  opts?: { fallback?: string },
): string {
  const name = String(raw ?? "").trim();
  if (!name) return opts?.fallback ?? "your room";

  // Host already included a unit word — keep their wording.
  if (/^(room|suite|unit|apt\.?|apartment|cabin|villa|cottage|studio|house|flat|chalet|bungalow)\b/i.test(name)) {
    return name;
  }

  // Classic room codes: 101, 12A, A12, 3B, #214, 2-14
  const compact = name.replace(/^#/, "").replace(/\s+/g, "");
  if (/^[A-Z]?\d{1,5}([A-Z]|-\d{1,3})?$/i.test(compact)) {
    return `Room ${name.replace(/^#\s*/, "")}`;
  }

  // Named unit — show exactly what the host entered.
  return name;
}

/** Staff-facing label: "Timothy · Room 401" when the guest shared a first name. */
export function guestStayLabel(
  guestFirstName: string | null | undefined,
  roomNumber: string | null | undefined,
  opts?: { fallback?: string; locator?: string | null },
): string {
  // In a public area the area name alone doesn't locate anyone — the bar has
  // twenty tables — so the guest's spot is appended when they've given one.
  const locator = String(opts?.locator ?? "").trim();
  const base = formatRoomLabel(roomNumber, opts);
  const room = locator ? `${base} · ${locator}` : base;
  const first = String(guestFirstName ?? "").trim();
  if (!first) return room;
  // Title-case lightly for display (Timothy, not TIMOTHY).
  const nice = first.charAt(0).toUpperCase() + first.slice(1);
  return `${nice} · ${room}`;
}

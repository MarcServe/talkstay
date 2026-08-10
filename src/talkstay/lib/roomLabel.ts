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

/** Format a stay unit for guest/staff copy — numbers get "Room ", names stay as-is. */
export function formatRoomLabel(
  raw: string | null | undefined,
  opts?: { fallback?: string },
): string {
  const name = String(raw ?? "").trim();
  if (!name) return opts?.fallback ?? "your room";

  if (/^(room|suite|unit|apt\.?|apartment|cabin|villa|cottage|studio|house|flat|chalet|bungalow)\b/i.test(name)) {
    return name;
  }

  const compact = name.replace(/^#/, "").replace(/\s+/g, "");
  if (/^[A-Z]?\d{1,5}([A-Z]|-\d{1,3})?$/i.test(compact)) {
    return `Room ${name.replace(/^#\s*/, "")}`;
  }

  return name;
}

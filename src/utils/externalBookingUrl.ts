/**
 * Build an external booking URL for an assistant configured with
 * `default_booking_method = 'external_link'`.
 *
 * For Calendly / Cal.com URLs we pre-fill name/email/date query params so the
 * visitor doesn't have to re-type details they've already shared in chat.
 * For any other URL (custom web form, CRM intake, etc.) we return it as-is.
 */
export interface ExternalBookingPrefill {
  userName?: string | null;
  userEmail?: string | null;
  preferredDate?: string | null;
}

export const buildExternalBookingUrl = (
  rawUrl: string,
  prefill: ExternalBookingPrefill = {}
): string => {
  const url = (rawUrl || '').trim();
  if (!url) return '';

  // Only pre-fill for known scheduling providers that support these query params.
  const isCalendly = url.includes('calendly.com');
  const isCalCom = url.includes('cal.com');
  if (!isCalendly && !isCalCom) return url;

  try {
    const u = new URL(url);
    if (prefill.userEmail) u.searchParams.set('email', prefill.userEmail);
    if (prefill.userName) u.searchParams.set('name', prefill.userName);
    if (prefill.preferredDate) u.searchParams.set('date', prefill.preferredDate);
    return u.toString();
  } catch {
    return url;
  }
};

/**
 * Format used to encode an external-booking CTA inside a single chat message
 * string so it can flow through the existing ConversationMemory message store
 * without schema changes. Matches the pattern already used by `📞 CALL_NOW:`.
 *
 *   🔗 BOOK_NOW:<url>|||<label>
 */
export const BOOK_NOW_PREFIX = '🔗 BOOK_NOW:';
export const BOOK_NOW_SEPARATOR = '|||';

export const encodeBookingLinkMessage = (url: string, label: string): string =>
  `${BOOK_NOW_PREFIX}${url}${BOOK_NOW_SEPARATOR}${label || 'Open booking form'}`;

export const parseBookingLinkMessage = (
  text: string
): { url: string; label: string } | null => {
  if (!text || !text.startsWith(BOOK_NOW_PREFIX)) return null;
  const payload = text.slice(BOOK_NOW_PREFIX.length);
  const [url, ...labelParts] = payload.split(BOOK_NOW_SEPARATOR);
  if (!url) return null;
  return {
    url: url.trim(),
    label: (labelParts.join(BOOK_NOW_SEPARATOR) || 'Open booking form').trim(),
  };
};

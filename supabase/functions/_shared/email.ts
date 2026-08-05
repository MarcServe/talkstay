// Shared modern email shell for every TalkStay notification (guest status
// updates, staff replies, staff alerts) — one consistent, branded look instead
// of each function hand-rolling its own plain HTML.

export function escapeHtml(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c] as string));
}

const isHexColor = (c?: string | null): c is string => !!c && /^#[0-9a-f]{6}$/i.test(c);

export interface EmailShellOptions {
  hotelName: string;
  logoUrl?: string | null;
  accentColor?: string | null;
  /** Bold line at the top of the card, e.g. "A message from the team". */
  heading: string;
  /** Pre-built inner HTML — build with escapeHtml() for any dynamic text. */
  bodyHtml: string;
  /** Small muted line under a divider at the bottom of the card. */
  footerNote?: string;
  /** Optional "Open dashboard" style button. */
  cta?: { label: string; url: string };
}

/** A branded card email: coloured header (logo + hotel name), white body,
 *  optional footer note and button. Table-based + inline styles for broad
 *  email-client compatibility (Gmail, Apple Mail, Outlook). */
export function renderEmail(opts: EmailShellOptions): string {
  const accent = isHexColor(opts.accentColor) ? opts.accentColor : "#7c3aed";
  const hotel = escapeHtml(opts.hotelName || "Your hotel");
  const logo = opts.logoUrl ? escapeHtml(opts.logoUrl) : null;

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f1f0f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f0f4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:${accent};padding:22px 28px;">
                ${logo ? `<img src="${logo}" alt="" width="36" height="36" style="border-radius:9px;display:block;margin-bottom:10px;object-fit:cover;" />` : ""}
                <div style="color:#ffffff;font-size:15px;font-weight:700;letter-spacing:-0.01em;">${hotel}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px;">
                <div style="font-size:17px;font-weight:700;color:#111827;margin:0 0 14px;">${escapeHtml(opts.heading)}</div>
                <div style="font-size:14px;line-height:1.6;color:#374151;">${opts.bodyHtml}</div>
                ${opts.cta ? `
                <div style="margin-top:20px;">
                  <a href="${escapeHtml(opts.cta.url)}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:8px;">${escapeHtml(opts.cta.label)} →</a>
                </div>` : ""}
              </td>
            </tr>
            ${opts.footerNote ? `
            <tr>
              <td style="padding:0 28px 24px;">
                <div style="font-size:12px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;">${escapeHtml(opts.footerNote)}</div>
              </td>
            </tr>` : ""}
          </table>
          <div style="font-size:11px;color:#9ca3af;margin-top:16px;">Powered by TalkStay</div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** A quoted message block — the common "here's what was said" body pattern. */
export function quoteBlock(text: string): string {
  return `<p style="margin:0;padding:14px 16px;background:#f9fafb;border-radius:10px;color:#111827;font-style:italic;">"${escapeHtml(text)}"</p>`;
}

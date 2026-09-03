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
  /** Paid branding tier: drop the "Powered by TalkStay" mark so the email
   *  reads as the property's own. */
  whiteLabel?: boolean;
  /** Centre the card's content (heading, body, button, footer note).
   *
   *  Defaults to left, which is what every transactional email here wants —
   *  a check-in code, an order summary or a reply is prose, and centred prose
   *  is harder to read the longer it runs. Marketing campaigns opt in: they're
   *  short, they lead with a centred image, and a left-aligned line under a
   *  centred picture reads as a mistake. Header bar is deliberately untouched
   *  either way, so branding stays identical across every email. */
  align?: "left" | "center";
}

/** Our own verified sender — always deliverable, used as the safety net. */
export const DEFAULT_FROM = "TalkStay <notifications@talkweb.io>";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Strip anything that could inject a second address into the From header. */
const safeName = (s: unknown) =>
  String(s ?? "").replace(/["\\<>,;:]/g, "").trim().slice(0, 60);

/** Read the paid white-label flag off a hotel's branding jsonb. */
export function isWhiteLabel(branding: unknown): boolean {
  return !!(branding as { white_label?: boolean } | null)?.white_label;
}

/** Per-property sending address, set in admin once their domain is verified
 *  in Resend. Ignored unless it parses as an email. */
export function brandedFromAddress(branding: unknown): string | null {
  const raw = (branding as { from_email?: string } | null)?.from_email;
  const clean = String(raw ?? "").trim().toLowerCase();
  return EMAIL_RE.test(clean) ? clean : null;
}

/** The From line for this property: their name, and their address when one is
 *  configured. Falls back to ours whenever nothing valid is set. */
export function emailFrom(hotelName: string, whiteLabel?: boolean, branding?: unknown): string {
  const name = safeName(hotelName);
  const addr = brandedFromAddress(branding);
  if (addr) return name ? `${name} <${addr}>` : addr;
  return whiteLabel && name ? `${name} <notifications@talkweb.io>` : DEFAULT_FROM;
}

/** Send through Resend, retrying once on our own sender if a property's custom
 *  address is rejected. A domain that was never verified (or got unverified)
 *  must not silently stop that property's notifications — the guest still gets
 *  the email, just from us. */
export async function sendViaResend(opts: {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
}): Promise<{ ok: boolean; usedFallback: boolean; error?: string }> {
  const key = (Deno.env.get("RESEND_API_KEY") || "").trim();
  if (!key || !opts.to || (Array.isArray(opts.to) && !opts.to.length)) {
    return { ok: false, usedFallback: false, error: "no api key or recipient" };
  }
  const post = async (from: string) => {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    return { ok: r.ok, detail: r.ok ? "" : await r.text().catch(() => "") };
  };

  try {
    const first = await post(opts.from);
    if (first.ok) return { ok: true, usedFallback: false };
    if (opts.from === DEFAULT_FROM) {
      return { ok: false, usedFallback: false, error: first.detail.slice(0, 300) };
    }
    console.error("resend rejected custom sender, retrying as TalkStay:", first.detail.slice(0, 300));
    const second = await post(DEFAULT_FROM);
    return { ok: second.ok, usedFallback: true, error: second.ok ? undefined : second.detail.slice(0, 300) };
  } catch (e) {
    return { ok: false, usedFallback: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** A branded card email: coloured header (logo + hotel name), white body,
 *  optional footer note and button. Table-based + inline styles for broad
 *  email-client compatibility (Gmail, Apple Mail, Outlook). */
export function renderEmail(opts: EmailShellOptions): string {
  const accent = isHexColor(opts.accentColor) ? opts.accentColor : "#7c3aed";
  const hotel = escapeHtml(opts.hotelName || "Your hotel");
  const logo = opts.logoUrl ? escapeHtml(opts.logoUrl) : null;
  const align = opts.align === "center" ? "center" : "left";

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
              <td style="padding:26px 28px;text-align:${align};">
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
              <td style="padding:0 28px 24px;text-align:${align};">
                <div style="font-size:12px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;">${escapeHtml(opts.footerNote)}</div>
              </td>
            </tr>` : ""}
          </table>
          ${opts.whiteLabel ? "" : `<div style="font-size:11px;color:#9ca3af;margin-top:16px;">Powered by TalkStay</div>`}
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

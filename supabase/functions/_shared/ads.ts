/**
 * ChatGPT Ads Conversions API — the server half of conversion measurement.
 *
 * The browser pixel reports the same conversions, so why both? Because the
 * pixel is the half that gets blocked: an ad blocker, Safari's ITP, or a
 * cleared cookie jar and the event never leaves the page. The server event
 * does not care. Both are sent under one id and OpenAI keeps whichever
 * arrives first, so the pair costs nothing and the pixel becomes the
 * optional one.
 *
 * Attribution is the catch. The API does NOT capture `oppref` the way the
 * pixel does — OpenAI's docs are explicit about it — so the click identifier
 * and browser reference have to be read from the first-party cookies in the
 * page and travel with the request. Without them a server event still
 * records, but matches no ad click, which is a worse failure than not
 * sending it: numbers that look fine and attribute to nothing.
 *
 * Inert until OPENAI_ADS_API_KEY is set as a function secret.
 */

const ENDPOINT = "https://bzr.openai.com/v1/events";

/** The data source these events belong to — the `pid` in Ads Manager. */
const PIXEL_ID = "Dhsy3hdFeDnqs1YL9ABhtW";

/** Minted in the browser and sent with the request that completes the
 *  conversion, so both halves report under the same identity. */
export interface AdsAttribution {
  eventId?: string;
  /** Click identifier the pixel stored from the landing URL. */
  oppref?: string;
  /** Browser reference from the pixel's __obref cookie. Sent unhashed. */
  obref?: string;
  sourceUrl?: string;
}

/** Lowercase 64-char hex, which is the only shape the API accepts. */
async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function readAdsAttribution(input: unknown): AdsAttribution {
  const a = (input ?? {}) as Record<string, unknown>;
  const s = (v: unknown, max: number) => {
    const out = String(v ?? "").trim().slice(0, max);
    return out || undefined;
  };
  return {
    eventId: s(a.eventId, 128),
    oppref: s(a.oppref, 512),
    obref: s(a.obref, 128),
    sourceUrl: s(a.sourceUrl, 1000),
  };
}

/**
 * Report one conversion. Never throws and never blocks anything that matters:
 * a measurement call must not be able to cost us the lead it is measuring.
 */
export async function sendAdsConversion(opts: {
  type: "lead_created" | "registration_completed";
  attribution: AdsAttribution;
  /** Raw address — hashed here, never sent in the clear. */
  email?: string;
  req?: Request;
}): Promise<void> {
  try {
    const apiKey = Deno.env.get("OPENAI_ADS_API_KEY");
    if (!apiKey) return;

    const { attribution: at } = opts;
    // source_url is required for web events, so fall back to the site root
    // rather than dropping an otherwise-good conversion.
    const sourceUrl = at.sourceUrl || "https://talkstay.talkweb.io/";

    const user: Record<string, unknown> = {};
    if (at.obref) user.obref = at.obref;
    if (opts.email) user.emails_sha256 = [await sha256Hex(opts.email.trim().toLowerCase())];
    if (opts.req) {
      // First hop only: x-forwarded-for is a list and the rest are proxies.
      const ip = (opts.req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
      if (ip) user.ip_address = ip;
      const ua = opts.req.headers.get("user-agent");
      if (ua) user.user_agent = ua;
    }

    const event: Record<string, unknown> = {
      // Must match the pixel's event_id for the two to deduplicate.
      id: at.eventId || `${opts.type}_${crypto.randomUUID()}`,
      type: opts.type,
      timestamp_ms: Date.now(),
      source_url: sourceUrl,
      action_source: "web",
      data: { type: "customer_action" },
    };
    if (at.oppref) event.oppref = at.oppref;
    if (Object.keys(user).length) event.user = user;

    const res = await fetch(`${ENDPOINT}?pid=${PIXEL_ID}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ validate_only: false, events: [event] }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      // Logged, not thrown — the lead is already saved and that is what counts.
      console.error("ads conversion rejected", res.status, (await res.text()).slice(0, 300));
    }
  } catch (err) {
    console.error("ads conversion failed", err instanceof Error ? err.message : err);
  }
}

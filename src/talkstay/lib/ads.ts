/**
 * ChatGPT Ads conversion measurement.
 *
 * The loader in index.html defines `window.oaiq` and queues calls, so these
 * helpers work from the first paint whether or not the SDK has finished
 * downloading. When no pixel id is configured — local dev, previews, a fork —
 * the loader returns early, `window.oaiq` is undefined, and every function
 * here is a no-op. That is why no call site needs a guard.
 *
 * Measurement must never be able to break a page, so every call is wrapped.
 */

type Oaiq = (...args: unknown[]) => void;

declare global {
  interface Window {
    oaiq?: Oaiq;
  }
}

/**
 * Only the marketing surface is measured.
 *
 * `/h/…` is a guest in their room and `/app/…` is a member of staff at work —
 * both are product, not ad traffic. Neither should be generating events for an
 * ad network, and the loader skips them entirely so nothing is even fetched.
 * Kept here as well so a client-side navigation into one of them goes quiet.
 */
export function isMarketingPath(pathname: string): boolean {
  return !/^\/(h|app)(\/|$)/.test(pathname);
}

function measure(event: string, data: Record<string, unknown>, options?: Record<string, unknown>) {
  const oaiq = typeof window !== "undefined" ? window.oaiq : undefined;
  if (!oaiq) return;
  try {
    if (options) oaiq("measure", event, data, options);
    else oaiq("measure", event, data);
  } catch {
    /* never let a measurement failure surface to a visitor */
  }
}

/** A marketing page came into view. Fired per route, including the first. */
export function adsPageViewed(pathname: string) {
  if (!isMarketingPath(pathname)) return;
  measure("page_viewed", {
    type: "contents",
    contents: [{ id: pathname, name: pathname, content_type: "page" }],
  });
}

/**
 * The identity a conversion is reported under, minted in the browser before
 * the request that completes it so the pixel and our server can both use it.
 *
 * `oppref` is the click identifier the pixel stored from the landing URL and
 * `obref` its browser reference. The Conversions API does not capture either
 * — unlike the pixel, it is told rather than reading them — so they have to
 * travel with the request or the server event matches no ad click.
 */
export interface AdsConversionRef {
  eventId: string;
  oppref?: string;
  obref?: string;
  sourceUrl?: string;
}

function cookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const hit = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!hit) return undefined;
  try {
    return decodeURIComponent(hit[1]) || undefined;
  } catch {
    return hit[1] || undefined;
  }
}

export function adsConversionRef(kind: string): AdsConversionRef {
  const unique =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return {
    eventId: `${kind}_${unique}`,
    oppref: cookie("__oppref"),
    obref: cookie("__obref"),
    sourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
  };
}

/**
 * Someone asked us to contact them — the demo-request form.
 * This is the conversion the campaign is actually buying.
 *
 * Reported from the server as well, under `ref.eventId`. OpenAI keeps the
 * first of the pair to arrive, so this call being blocked costs nothing.
 */
export function adsLeadCreated(ref: AdsConversionRef) {
  measure("lead_created", { type: "customer_action" }, { event_id: ref.eventId });
}

/** A property created an account. */
export function adsRegistrationCompleted() {
  measure("registration_completed", { type: "customer_action" });
}

/**
 * Someone opened an interactive demo. Not a lead, but the strongest
 * mid-funnel signal this site has — it separates a bounce from real interest,
 * which is the whole question when a campaign reports clicks and nothing else.
 */
export function adsDemoOpened(side: "guest" | "operations") {
  measure(
    "custom",
    { type: "custom" },
    { custom_event_name: side === "guest" ? "demo_guest_opened" : "demo_operations_opened" },
  );
}

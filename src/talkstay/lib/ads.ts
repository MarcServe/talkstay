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
 * Someone asked us to contact them — the demo-request form.
 * This is the conversion the campaign is actually buying.
 */
export function adsLeadCreated() {
  measure("lead_created", { type: "customer_action" });
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

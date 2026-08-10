/** Home-screen / PWA install helpers — used to gate iOS web-push. */

export type PlatformHint =
  | "ios_safari"
  | "ios_other"
  | "android_chrome"
  | "android_other"
  | "desktop_chromium"
  | "desktop_safari"
  | "desktop_firefox"
  | "unknown";

/** True when the page is running as an installed home-screen / standalone app. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    !!(navigator as Navigator & { standalone?: boolean }).standalone
  );
}

export function detectPlatform(): PlatformHint {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome|Chromium|Android/i.test(ua);
  const isCriOS = /CriOS/i.test(ua);
  const isChrome = /Chrome|Chromium|Edg/i.test(ua) && !/CriOS/i.test(ua);
  const isFirefox = /Firefox|FxiOS/i.test(ua);
  const isDesktop = !isIos && !isAndroid;

  if (isIos) return isSafari ? "ios_safari" : "ios_other";
  if (isAndroid) return isChrome || /SamsungBrowser/i.test(ua) ? "android_chrome" : "android_other";
  if (isDesktop && isChrome) return "desktop_chromium";
  if (isDesktop && isSafari) return "desktop_safari";
  if (isDesktop && isFirefox) return "desktop_firefox";
  if (isCriOS) return "ios_other";
  return "unknown";
}

export function isIosPlatform(platform: PlatformHint = detectPlatform()): boolean {
  return platform === "ios_safari" || platform === "ios_other";
}

/**
 * iOS Safari only exposes reliable Web Push / Notification permission after the
 * site is added to the Home Screen and opened from that icon (standalone).
 */
export function iosNeedsHomeScreenInstall(): boolean {
  return isIosPlatform() && !isStandalone();
}

export const IOS_ADD_HOME_SCREEN_HINT =
  "On iPhone and iPad, add TalkStay to your Home Screen first, then open it from the icon and turn on alerts.";

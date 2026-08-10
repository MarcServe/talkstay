import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Home, Share, MoreVertical, X, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { enablePush, pushSupported } from "@/talkstay/lib/push";
import {
  enableAlertSounds,
  notificationPermission,
  notificationsAvailable,
} from "@/talkstay/lib/alerts";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type PlatformHint =
  | "ios_safari"
  | "ios_other"
  | "android_chrome"
  | "android_other"
  | "desktop_chromium"
  | "desktop_safari"
  | "desktop_firefox"
  | "unknown";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    !!(navigator as Navigator & { standalone?: boolean }).standalone
  );
}

function detectPlatform(): PlatformHint {
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

type Step = { icon?: "share" | "menu" | "home"; text: string };

function homeScreenGuide(platform: PlatformHint, canPrompt: boolean): {
  title: string;
  steps: Step[];
  tip?: string;
} {
  if (canPrompt) {
    return {
      title: "Add TalkStay to your home screen",
      steps: [{ text: "Tap Add to home screen — your browser will ask you to confirm. No download." }],
    };
  }
  switch (platform) {
    case "ios_safari":
      return {
        title: "Add to your iPhone / iPad home screen",
        steps: [
          { icon: "share", text: "Tap the Share button at the bottom of Safari" },
          { icon: "home", text: "Scroll and tap Add to Home Screen" },
          { text: "Tap Add — TalkStay opens like an app, no App Store" },
        ],
      };
    case "ios_other":
      return {
        title: "Add to your iPhone / iPad home screen",
        steps: [
          { text: "Open this page in Safari (Chrome on iOS can’t add home screen icons reliably)" },
          { icon: "share", text: "Tap Share → Add to Home Screen" },
        ],
        tip: "Safari only — takes a few seconds, nothing to download.",
      };
    case "android_chrome":
      return {
        title: "Add to your Android home screen",
        steps: [
          { icon: "menu", text: "Tap the ⋮ menu in Chrome" },
          { icon: "home", text: "Tap Add to Home screen (or Add to phone)" },
          { text: "Confirm — shortcut only, no Play Store download" },
        ],
      };
    case "android_other":
      return {
        title: "Add to your Android home screen",
        steps: [
          { icon: "menu", text: "Open your browser menu" },
          { icon: "home", text: "Choose Add to Home screen / Add to phone" },
        ],
        tip: "Wording varies by browser — look for Home screen, not a store download.",
      };
    case "desktop_chromium":
      return {
        title: "Pin TalkStay to your desktop or dock",
        steps: [
          { text: "Click the icon in the address bar (monitor / +), or open the browser menu" },
          { icon: "home", text: "Choose Add to home screen / Create shortcut / Open as window" },
        ],
        tip: "Works in Chrome and Edge — opens in its own window, no installer.",
      };
    case "desktop_safari":
      return {
        title: "Keep TalkStay handy on Mac",
        steps: [
          { icon: "share", text: "File → Add to Dock (Safari 17+), or bookmark this page" },
          { text: "Or use Chrome/Edge for a one-click home-screen / app window shortcut" },
        ],
      };
    case "desktop_firefox":
      return {
        title: "Bookmark TalkStay for quick access",
        steps: [
          { text: "Bookmark this page, or pin the tab" },
          { text: "For a home-screen style shortcut, open TalkStay in Chrome or Edge" },
        ],
      };
    default:
      return {
        title: "Add TalkStay to your home screen",
        steps: [
          { icon: "menu", text: "Open your browser menu" },
          { icon: "home", text: "Choose Add to Home Screen (or Add to phone / Create shortcut)" },
        ],
        tip: "No download — just a shortcut to this page.",
      };
  }
}

function StepIcon({ kind }: { kind?: Step["icon"] }) {
  if (kind === "share") return <Share className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600" />;
  if (kind === "menu") return <MoreVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600" />;
  if (kind === "home") return <Home className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600" />;
  return <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />;
}

/**
 * After sign-in: enable alert sounds and offer Add to Home Screen.
 * Copy is device/browser-aware and avoids “install” / download friction.
 */
export default function InstallAppBanner({
  hotelId,
  variant = "staff",
}: {
  hotelId?: string;
  variant?: "staff" | "guest";
}) {
  const storageKey = `talkstay:setup-banner:${variant}:${hotelId || "guest"}`;
  const [hidden, setHidden] = useState(true);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [onHomeScreen, setOnHomeScreen] = useState(isStandalone());
  const [busy, setBusy] = useState(false);
  const [perm, setPerm] = useState(notificationPermission());
  const [showGuide, setShowGuide] = useState(false);
  const platform = useMemo(() => detectPlatform(), []);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(storageKey) === "dismissed"; } catch { /* ignore */ }

    const needsAlerts =
      notificationsAvailable() && Notification.permission !== "granted";
    const needsHome = !isStandalone();
    const show = needsAlerts || (needsHome && !dismissed);
    setHidden(!show);
    setPerm(notificationPermission());
    setOnHomeScreen(isStandalone());

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    const onAdded = () => {
      setOnHomeScreen(true);
      setDeferred(null);
      setShowGuide(false);
      toast.success("TalkStay is on your home screen.");
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onAdded);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onAdded);
    };
  }, [storageKey]);

  const dismiss = () => {
    try { localStorage.setItem(storageKey, "dismissed"); } catch { /* ignore */ }
    setHidden(true);
    setShowGuide(false);
  };

  const turnOnAlerts = async () => {
    setBusy(true);
    try {
      const { permission } = await enableAlertSounds();
      setPerm(permission);
      if (permission !== "granted") {
        toast.error(
          permission === "denied"
            ? "Notifications are blocked in this browser — enable them in site settings."
            : "Couldn't enable notifications on this device.",
        );
        return;
      }
      if (variant === "staff" && hotelId && pushSupported()) {
        await enablePush(hotelId);
      }
      toast.success("Alert sounds & notifications are on for this device.");
      if (onHomeScreen) dismiss();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't enable alerts.");
    } finally {
      setBusy(false);
    }
  };

  const addToHomeScreen = async () => {
    if (deferred) {
      setBusy(true);
      try {
        await deferred.prompt();
        const { outcome } = await deferred.userChoice;
        if (outcome === "accepted") {
          setOnHomeScreen(true);
          setShowGuide(false);
        }
        setDeferred(null);
      } catch {
        setShowGuide(true);
      } finally {
        setBusy(false);
      }
      return;
    }
    setShowGuide((v) => !v);
  };

  if (hidden) return null;

  const alertsOn = perm === "granted";
  const guide = homeScreenGuide(platform, !!deferred);
  const title =
    variant === "staff"
      ? "Get request alerts on this device"
      : "Get updates on this device";
  const blurb =
    variant === "staff"
      ? "Turn on the notification sound so you hear new guest requests — then add TalkStay to your home screen for one-tap access. No download."
      : "Allow notifications so you hear when the team replies — add TalkStay to your home screen for quick access. No download.";

  return (
    <div className="relative z-30 border-b border-violet-200 bg-gradient-to-r from-violet-50 via-white to-violet-50/80 px-3 py-3 text-violet-950 sm:px-4">
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-2 rounded-md p-1 text-violet-400 hover:bg-violet-100 hover:text-violet-700"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="pr-8">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-violet-800/85">{blurb}</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {!alertsOn && (
            <Button size="sm" disabled={busy} onClick={turnOnAlerts} className="bg-violet-700 hover:bg-violet-800">
              <Bell className="mr-1.5 h-3.5 w-3.5" />
              {busy ? "Enabling…" : "Turn on alert sounds"}
            </Button>
          )}
          {!onHomeScreen && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={addToHomeScreen}
              className="border-violet-300 bg-white"
              aria-expanded={showGuide}
            >
              <Smartphone className="mr-1.5 h-3.5 w-3.5" />
              {deferred ? "Add to home screen" : showGuide ? "Hide steps" : "How to add to home screen"}
            </Button>
          )}
          {alertsOn && onHomeScreen && (
            <Button size="sm" variant="ghost" onClick={dismiss}>Done</Button>
          )}
        </div>

        {showGuide && !onHomeScreen && (
          <div className="mt-3 max-w-lg rounded-xl border border-violet-200/90 bg-white/90 p-3 shadow-sm">
            <div className="flex items-start gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                <Home className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-violet-950">{guide.title}</p>
                <ol className="mt-2 space-y-2">
                  {guide.steps.map((step, i) => (
                    <li key={step.text} className="flex gap-2 text-xs leading-snug text-violet-900/90">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">
                        {i + 1}
                      </span>
                      <span className="flex gap-1.5 pt-0.5">
                        <StepIcon kind={step.icon} />
                        <span>{step.text}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                {guide.tip && (
                  <p className="mt-2 text-[11px] text-violet-700/75">{guide.tip}</p>
                )}
                {deferred && (
                  <Button
                    size="sm"
                    className="mt-3 bg-violet-700 hover:bg-violet-800"
                    disabled={busy}
                    onClick={addToHomeScreen}
                  >
                    <Smartphone className="mr-1.5 h-3.5 w-3.5" />
                    Add to home screen
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

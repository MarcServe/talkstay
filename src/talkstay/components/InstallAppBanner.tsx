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
import {
  detectPlatform,
  iosNeedsHomeScreenInstall,
  IOS_ADD_HOME_SCREEN_HINT,
  isStandalone,
  type PlatformHint,
} from "@/talkstay/lib/install";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
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
          { text: "Tap Add — then open TalkStay from the new icon to turn on alerts" },
        ],
        tip: "iPhone and iPad need TalkStay on the Home Screen before notifications can turn on.",
      };
    case "ios_other":
      return {
        title: "Add to your iPhone / iPad home screen",
        steps: [
          { text: "Open this page in Safari (Chrome on iOS can’t add home screen icons reliably)" },
          { icon: "share", text: "Tap Share → Add to Home Screen" },
          { text: "Open TalkStay from the Home Screen icon, then turn on alerts" },
        ],
        tip: "Safari only — notifications work after you open the Home Screen app.",
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
 * On iOS, Home Screen install must happen before notification permission works.
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
  const platform = useMemo(() => detectPlatform(), []);
  const needsIosInstall = iosNeedsHomeScreenInstall();
  // On iOS Safari tabs, show the A2HS steps up front — permission can't succeed yet.
  const [showGuide, setShowGuide] = useState(needsIosInstall);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(storageKey) === "dismissed"; } catch { /* ignore */ }

    const standalone = isStandalone();
    const needsAlerts =
      notificationsAvailable() && Notification.permission !== "granted";
    // On iOS Safari tabs Notification may be missing — still offer Home Screen setup.
    const needsHome = !standalone;
    const show = needsAlerts || (needsHome && !dismissed) || (iosNeedsHomeScreenInstall() && !dismissed);
    setHidden(!show);
    setPerm(notificationPermission());
    setOnHomeScreen(standalone);
    if (iosNeedsHomeScreenInstall() && !dismissed) setShowGuide(true);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    const onAdded = () => {
      setOnHomeScreen(true);
      setDeferred(null);
      setShowGuide(false);
      toast.success("TalkStay is on your home screen — open it from the icon to turn on alerts.");
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
    if (iosNeedsHomeScreenInstall()) {
      setShowGuide(true);
      toast.message(IOS_ADD_HOME_SCREEN_HINT);
      return;
    }
    setBusy(true);
    try {
      const { permission } = await enableAlertSounds();
      setPerm(permission);
      if (permission !== "granted") {
        toast.error(
          permission === "denied"
            ? "Notifications are blocked in this browser — enable them in site settings."
            : permission === "unsupported"
              ? IOS_ADD_HOME_SCREEN_HINT
              : "Couldn't enable notifications on this device.",
        );
        if (permission === "unsupported" || permission === "default") setShowGuide(true);
        return;
      }
      if (variant === "staff" && hotelId && pushSupported()) {
        await enablePush(hotelId);
      }
      toast.success("Alert sounds & notifications are on for this device.");
      if (onHomeScreen || isStandalone()) dismiss();
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
  const blurb = needsIosInstall
    ? "On iPhone and iPad: add TalkStay to your Home Screen, open it from the icon, then turn on alert sounds. No App Store download."
    : variant === "staff"
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
          {/* On iOS Safari tabs, prioritize Home Screen install before the alerts CTA. */}
          {needsIosInstall && !onHomeScreen && (
            <Button
              size="sm"
              disabled={busy}
              onClick={addToHomeScreen}
              className="bg-violet-700 hover:bg-violet-800"
              aria-expanded={showGuide}
            >
              <Smartphone className="mr-1.5 h-3.5 w-3.5" />
              {deferred ? "Add to home screen" : showGuide ? "Hide steps" : "Add to Home Screen"}
            </Button>
          )}
          {!alertsOn && (
            <Button
              size="sm"
              variant={needsIosInstall ? "outline" : "default"}
              disabled={busy}
              onClick={turnOnAlerts}
              className={needsIosInstall ? "border-violet-300 bg-white" : "bg-violet-700 hover:bg-violet-800"}
            >
              <Bell className="mr-1.5 h-3.5 w-3.5" />
              {busy ? "Enabling…" : "Turn on alert sounds"}
            </Button>
          )}
          {!needsIosInstall && !onHomeScreen && (
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
                {/* Installing to the Home Screen is a fiddly, Apple-specific
                    detour. Nobody should feel they've lost their alerts by
                    skipping it — email needs no setup and works on any phone. */}
                <p className="mt-2 rounded-lg bg-violet-100/70 px-2.5 py-1.5 text-[11px] leading-relaxed text-violet-900/85">
                  {variant === "staff"
                    ? "Rather not? You don't have to — alerts still reach you by email, and the dashboard updates live while it's open."
                    : "Rather not? You don't have to — just tick “Email me updates” instead. It works on any phone, no setup."}
                </p>
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

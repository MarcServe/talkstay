import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Download, X } from "lucide-react";
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

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    !!(navigator as any).standalone
  );
}

/**
 * Shown after staff sign-in: turn on alert sounds/notifications and add
 * TalkStay to the home screen. Browsers require a tap for both — we can't
 * force-install, but we surface it immediately on every new device/session
 * until accepted or dismissed.
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
  const [installed, setInstalled] = useState(isStandalone());
  const [busy, setBusy] = useState(false);
  const [perm, setPerm] = useState(notificationPermission());

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(storageKey) === "dismissed"; } catch { /* ignore */ }

    const needsAlerts =
      notificationsAvailable() && Notification.permission !== "granted";
    const needsInstall = !isStandalone();
    // Re-show when alerts still off (even if they dismissed before); otherwise
    // honour dismiss once alerts are granted.
    const show = needsAlerts || (needsInstall && !dismissed);
    setHidden(!show);
    setPerm(notificationPermission());
    setInstalled(isStandalone());

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      toast.success("TalkStay added to your home screen.");
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [storageKey]);

  const dismiss = () => {
    try { localStorage.setItem(storageKey, "dismissed"); } catch { /* ignore */ }
    setHidden(true);
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
      if (installed || !deferred) {
        // Still keep install tip if not installed; otherwise dismiss when done.
        if (installed) dismiss();
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't enable alerts.");
    } finally {
      setBusy(false);
    }
  };

  const install = async () => {
    if (!deferred) {
      toast.message(
        "To install: open your browser menu and choose “Add to Home Screen” / “Install app”.",
      );
      return;
    }
    setBusy(true);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
        setDeferred(null);
      }
      setDeferred(null);
    } catch {
      toast.error("Couldn't open the install prompt — use your browser’s Add to Home Screen.");
    } finally {
      setBusy(false);
    }
  };

  if (hidden) return null;

  const alertsOn = perm === "granted";
  const title =
    variant === "staff"
      ? "Get request alerts on this device"
      : "Get updates on this device";
  const blurb =
    variant === "staff"
      ? "Turn on the notification sound so you hear new guest requests — then add TalkStay to your home screen for one-tap access."
      : "Allow notifications so you hear when the team replies — and add TalkStay to your home screen if you like.";

  return (
    <div className="relative z-30 border-b border-violet-200 bg-violet-50 px-3 py-3 text-violet-950 sm:px-4">
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
        <p className="mt-0.5 text-xs text-violet-800/80">{blurb}</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {!alertsOn && (
            <Button size="sm" disabled={busy} onClick={turnOnAlerts} className="bg-violet-700 hover:bg-violet-800">
              <Bell className="mr-1.5 h-3.5 w-3.5" />
              {busy ? "Enabling…" : "Turn on alert sounds"}
            </Button>
          )}
          {!installed && (
            <Button size="sm" variant="outline" disabled={busy} onClick={install} className="border-violet-300 bg-white">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Add to home screen
            </Button>
          )}
          {alertsOn && installed && (
            <Button size="sm" variant="ghost" onClick={dismiss}>Done</Button>
          )}
        </div>
      </div>
    </div>
  );
}

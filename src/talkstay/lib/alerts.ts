import { playChime, primeChime, getAlertSoundId, type AlertSoundId } from "@/talkstay/lib/chime";

export type IncomingAlert = {
  title: string;
  body?: string;
  /** Dedupes stacked notifications for the same request/message. */
  tag?: string;
  url?: string;
  urgent?: boolean;
  /** When false, skip the WebAudio chime (OS notification only). Default true. */
  chime?: boolean;
  /** Override the saved alert sound for this alert only. */
  soundId?: AlertSoundId;
  /** When false, skip the browser/OS notification. Default true. */
  notify?: boolean;
};

/** Whether the browser can show notifications (API present; permission not denied). */
export function notificationsAvailable(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsAvailable()) return "unsupported";
  return Notification.permission;
}

/** Ask for notification permission (best from a user gesture). */
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsAvailable()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * Alert the user: in-app chime (when the tab can play audio) + browser/OS
 * notification (so the system notification sound plays, including when the
 * tab is in the background or the app is installed as a PWA).
 */
export async function alertIncoming(opts: IncomingAlert): Promise<void> {
  if (opts.chime !== false) {
    try {
      await playChime(opts.soundId ?? getAlertSoundId());
    } catch { /* ignore */ }
  }

  if (opts.notify === false) return;
  if (!notificationsAvailable()) return;
  if (Notification.permission !== "granted") return;

  const title = opts.title || "TalkStay";
  const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean; silent?: boolean } = {
    body: opts.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: opts.tag,
    renotify: true,
    silent: false,
    requireInteraction: !!opts.urgent,
    data: { url: opts.url || (typeof window !== "undefined" ? window.location.href : "/app") },
    vibrate: opts.urgent ? [200, 100, 200] : [120],
  };

  try {
    const reg = await navigator.serviceWorker?.getRegistration("/sw.js");
    if (reg?.showNotification) {
      await reg.showNotification(title, options);
      return;
    }
  } catch { /* fall through */ }

  try {
    new Notification(title, options);
  } catch { /* ignore */ }
}

/** Call from a button/tap so Safari unlocks audio + we can request permission. */
export async function enableAlertSounds(): Promise<{
  permission: NotificationPermission | "unsupported";
}> {
  primeChime();
  const permission = await requestNotificationPermission();
  // Confirm the unlock with the chosen chime so the user knows it worked.
  if (permission === "granted" || permission === "default") {
    try { await playChime(getAlertSoundId()); } catch { /* ignore */ }
  }
  return { permission };
}

// Re-export sound helpers so UI can import from one place.
export {
  ALERT_SOUNDS,
  getAlertSoundId,
  setAlertSoundId,
  previewAlertSound,
  type AlertSoundId,
  type AlertSoundOption,
} from "@/talkstay/lib/chime";

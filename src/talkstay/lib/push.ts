import { supabase } from "@/integrations/supabase/client";
import { iosNeedsHomeScreenInstall, IOS_ADD_HOME_SCREEN_HINT } from "@/talkstay/lib/install";

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export interface PushKeys { endpoint: string; p256dh: string; auth: string; }

/** Browser mechanics shared by staff and guest subscribe flows: request
 *  permission, register the SW, subscribe. Reused as-is if already
 *  subscribed (idempotent — safe to call again on an already-installed SW). */
async function subscribeBrowser(): Promise<PushSubscription> {
  // iOS only grants Web Push after Add to Home Screen + open from the icon.
  if (iosNeedsHomeScreenInstall()) throw new Error(IOS_ADD_HOME_SCREEN_HINT);

  if (!pushSupported()) {
    throw new Error("Push notifications aren't supported on this device/browser.");
  }

  if (typeof Notification === "undefined") {
    throw new Error(IOS_ADD_HOME_SCREEN_HINT);
  }

  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    throw new Error(
      perm === "denied"
        ? "Notification permission was not granted."
        : IOS_ADD_HOME_SCREEN_HINT,
    );
  }

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC!),
    });
  }
  return sub;
}

function toKeys(sub: PushSubscription): PushKeys {
  const j = sub.toJSON() as any;
  return { endpoint: j.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth };
}

/** Register the SW, subscribe to push, and store the subscription for this staff user. */
export async function enablePush(hotelId: string, departmentKey?: string | null): Promise<void> {
  const sub = await subscribeBrowser();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const keys = toKeys(sub);
  const { error } = await supabase.from("ts_push_subscriptions").upsert(
    {
      hotel_id: hotelId,
      user_id: user.id,
      department_key: departmentKey ?? null,
      endpoint: keys.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) throw error;
}

/** Same browser subscribe flow, without any TalkStay-account storage — the
 *  caller (e.g. a guest session) decides where the resulting keys go. */
export async function subscribeBrowserPush(): Promise<PushKeys> {
  return toKeys(await subscribeBrowser());
}

/** The current subscription's endpoint, if this browser has one — used to
 *  unsubscribe without re-requesting permission. Null if never subscribed. */
export async function currentPushEndpoint(): Promise<string | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  return sub?.endpoint ?? null;
}

/** Unsubscribe this browser from push entirely (used when a guest turns the
 *  device toggle off). Safe to call even if never subscribed. */
export async function unsubscribeBrowserPush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  await sub?.unsubscribe();
}

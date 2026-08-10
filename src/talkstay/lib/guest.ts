import { supabase } from "@/integrations/supabase/client";

export interface GuestRequest {
  id: string;
  department_key: string;
  summary: string;
  status: string;
  is_complaint: boolean;
  created_at?: string;
}

/** Organised guest-facing content (menus, guides) — rendered as cards, not markdown. */
export interface GuestCard {
  title?: string;
  sections?: { title: string; items: string[] }[];
  links?: { label: string; url: string }[];
  images?: { url: string; alt?: string }[];
}

export interface ChatMsg { role: "user" | "assistant"; content: string; cards?: GuestCard[]; }

/** Stable per-BROWSER device id — used to bind a device to the current stay so a
 *  previous guest's saved link can't be reused after the room is re-let. */
export function getDeviceId(): string {
  const key = "talkstay:device";
  let id = localStorage.getItem(key);
  if (!id) {
    id = (crypto?.randomUUID?.() ?? `dev_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`);
    localStorage.setItem(key, id);
  }
  return id;
}

const fn = (body: Record<string, unknown>) =>
  supabase.functions.invoke("talkstay-guest-chat", { body: { deviceId: getDeviceId(), ...body } });

/** supabase.functions.invoke() returns a GENERIC message on a non-2xx response
 *  ("Edge Function returned a non-2xx status code") — the real machine code
 *  (checked_out / room_full / need_code / bad_code / invalid_token) is in the
 *  response body. Pull it out so callers can branch on it. */
async function realError(error: any): Promise<Error> {
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return new Error(body.error);
  } catch { /* not JSON */ }
  return error instanceof Error ? error : new Error(String(error));
}

/** Stable per-room session id kept in localStorage (device history). */
export function getSessionId(hotelSlug: string, roomId: string): string {
  const key = `talkstay:sid:${hotelSlug}:${roomId}`;
  let sid = localStorage.getItem(key);
  if (!sid) {
    sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, sid);
  }
  return sid;
}

const histKey = (sid: string) => `talkstay:hist:${sid}`;
export function loadHistory(sid: string): ChatMsg[] {
  try { return JSON.parse(localStorage.getItem(histKey(sid)) || "[]"); } catch { return []; }
}
export function saveHistory(sid: string, msgs: ChatMsg[]) {
  localStorage.setItem(histKey(sid), JSON.stringify(msgs.slice(-40)));
}

const notifyKey = (sid: string) => `talkstay:notify:${sid}`;
export function getNotifyChoice(sid: string): string | null {
  return localStorage.getItem(notifyKey(sid));
}
export function setNotifyChoice(sid: string, choice: string) {
  localStorage.setItem(notifyKey(sid), choice);
}

// Remembers that this device already answered (or waved away) the pulse check,
// so a refresh doesn't ask the same guest twice.
const pulseKey = (sid: string) => `talkstay:pulse:${sid}`;
export function getPulseState(sid: string): string | null {
  return localStorage.getItem(pulseKey(sid));
}
export function setPulseState(sid: string, state: "done" | "dismissed") {
  localStorage.setItem(pulseKey(sid), state);
}

export interface GuestBranding {
  logo_url?: string | null;
  primary_color?: string | null;
  tagline?: string | null;
  // Full jsonb already flows through from the server — poster.bg_image_url
  // doubles as a faint background photo for the chat screen when set.
  poster?: { bg_image_url?: string | null } | null;
}

export async function fetchContext(hotelSlug: string, roomId: string, token: string, code?: string, sessionId?: string) {
  const { data, error } = await fn({ action: "context", hotelSlug, roomId, token, code, sessionId });
  if (error) throw await realError(error);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as {
    hotelName: string; roomNumber: string; language: string; greeting: string;
    departments: string[]; branding?: GuestBranding; assistantId?: string | null;
    pulseAsk?: boolean;
  };
}

export async function sendMessage(args: {
  hotelSlug: string; roomId: string; token: string; sessionId: string;
  message: string; history: ChatMsg[];
}) {
  const { data, error } = await fn({ action: "message", ...args });
  if (error) throw await realError(error);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { reply: string; requests: GuestRequest[]; language: string; cards?: GuestCard[] };
}

export interface StaffMessage { id: string; request_id: string; staff_label: string | null; content: string; created_at: string; }

/** Human staff replies to this session's requests, optionally only newer than `since`. */
export async function fetchStaffMessages(args: {
  hotelSlug: string; roomId: string; token: string; sessionId: string; since?: string;
}): Promise<StaffMessage[]> {
  const { data, error } = await fn({ action: "staff_messages", ...args });
  if (error) return [];
  return ((data as any)?.messages ?? []) as StaffMessage[];
}

export async function fetchMyRequests(hotelSlug: string, roomId: string, token: string, sessionId: string) {
  const { data, error } = await fn({ action: "my_requests", hotelSlug, roomId, token, sessionId });
  if (error) throw error;
  return ((data as any)?.requests ?? []) as GuestRequest[];
}

/** Store where this guest device wants email updates for their stay. */
export async function saveGuestContact(args: {
  hotelSlug: string; roomId: string; token: string; sessionId: string;
  channel: string; contact: string;
}) {
  const { data, error } = await fn({ action: "set_contact", ...args });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return true;
}

/** Turn on "notify me on this device" — subscribes the browser to push (may
 *  prompt for permission) and registers it for this stay. Throws a plain
 *  Error with a guest-readable message on any failure (unsupported browser,
 *  permission denied, etc.) — the caller decides how to show it. */
export async function enableDevicePush(args: {
  hotelSlug: string; roomId: string; token: string; sessionId: string;
}): Promise<void> {
  const { subscribeBrowserPush } = await import("@/talkstay/lib/push");
  const keys = await subscribeBrowserPush();
  const { data, error } = await fn({ action: "set_push", ...args, ...keys });
  if (error) throw await realError(error);
  if ((data as any)?.error) throw new Error((data as any).error);
}

/** Turn "notify me on this device" back off for this browser. Best-effort —
 *  never throws, since there's nothing useful the guest can do about a
 *  failed unsubscribe beyond what already happened (permission stays granted
 *  but the server-side subscription row, and the one that matters, is gone). */
export async function disableDevicePush(args: {
  hotelSlug: string; roomId: string; token: string; sessionId: string;
}): Promise<void> {
  try {
    const { currentPushEndpoint, unsubscribeBrowserPush } = await import("@/talkstay/lib/push");
    const endpoint = await currentPushEndpoint();
    if (endpoint) await fn({ action: "remove_push", ...args, endpoint });
    await unsubscribeBrowserPush();
  } catch { /* best-effort */ }
}

export async function submitReview(args: {
  hotelSlug: string; roomId: string; token: string; sessionId: string;
  requestId: string; rating: number; comment?: string;
}) {
  const { data, error } = await fn({ action: "review", ...args });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return true;
}

/** Guest closes the loop on a completed request: confirm it was done, or reopen it. */
export async function confirmRequest(args: {
  hotelSlug: string; roomId: string; token: string; sessionId: string; requestId: string;
}) {
  const { data, error } = await fn({ action: "confirm", ...args });
  if (error) throw await realError(error);
  if ((data as any)?.error) throw new Error((data as any).error);
  return true;
}

export async function reopenRequest(args: {
  hotelSlug: string; roomId: string; token: string; sessionId: string; requestId: string;
}) {
  const { data, error } = await fn({ action: "reopen", ...args });
  if (error) throw await realError(error);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { ok: true; status: string; mode?: string };
}

/** Ask again: reopen a cancelled ticket, or create a new one from a completed request.
 *  Optional `note` updates what they want (e.g. 2 bottles instead of 1). */
export async function repeatRequest(args: {
  hotelSlug: string; roomId: string; token: string; sessionId: string; requestId: string; note?: string;
}) {
  const { data, error } = await fn({ action: "repeat_request", ...args });
  if (error) throw await realError(error);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as {
    ok: true; mode: string; status: string;
    request?: { id: string; department_key: string; summary: string; status: string };
  };
}

/** Guest cancels an open request — staff are notified. */
export async function cancelRequest(args: {
  hotelSlug: string; roomId: string; token: string; sessionId: string; requestId: string;
}) {
  const { data, error } = await fn({ action: "cancel", ...args });
  if (error) throw await realError(error);
  if ((data as any)?.error) throw new Error((data as any).error);
  return true;
}

/** Guest nudges the team ("I'm still waiting") — alerts staff, rate-limited. */
export async function nudgeRequest(args: {
  hotelSlug: string; roomId: string; token: string; sessionId: string; requestId: string; note?: string;
}) {
  const { data, error } = await fn({ action: "nudge", ...args });
  if (error) throw await realError(error);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { ok: true; action: string };
}

/** Guest changes what they asked for and alerts the team. */
export async function updateRequest(args: {
  hotelSlug: string; roomId: string; token: string; sessionId: string; requestId: string; note: string;
}) {
  const { data, error } = await fn({ action: "update_request", ...args });
  if (error) throw await realError(error);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { ok: true; action: string; summary: string };
}

/** Mid-stay pulse check. `notifiedManager` is true when the answer was negative
 *  enough that a manager was alerted — the guest is told so explicitly, because
 *  "someone is coming" is the whole reason to speak up during the stay. */
export async function submitPulse(args: {
  hotelSlug: string; roomId: string; token: string; sessionId: string;
  rating?: number | null; text?: string;
}) {
  const { data, error } = await fn({ action: "pulse", ...args });
  if (error) throw await realError(error);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { reply: string; notifiedManager: boolean };
}

export const STATUS_LABEL: Record<string, string> = {
  new: "Request received",
  accepted: "Being prepared",
  in_progress: "Being prepared",
  on_the_way: "On the way",
  completed: "Completed",
  guest_confirmed: "Confirmed",
  reopened: "Reopened",
  escalated: "Escalated to manager",
  cancelled: "Cancelled",
};

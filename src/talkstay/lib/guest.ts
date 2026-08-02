import { supabase } from "@/integrations/supabase/client";

export interface GuestRequest {
  id: string;
  department_key: string;
  summary: string;
  status: string;
  is_complaint: boolean;
  created_at?: string;
}

export interface ChatMsg { role: "user" | "assistant"; content: string; }

const fn = (body: Record<string, unknown>) =>
  supabase.functions.invoke("talkstay-guest-chat", { body });

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

export interface GuestBranding { logo_url?: string | null; primary_color?: string | null; tagline?: string | null; }

export async function fetchContext(hotelSlug: string, roomId: string, token: string) {
  const { data, error } = await fn({ action: "context", hotelSlug, roomId, token });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as {
    hotelName: string; roomNumber: string; language: string; greeting: string;
    departments: string[]; branding?: GuestBranding; assistantId?: string | null;
  };
}

export async function sendMessage(args: {
  hotelSlug: string; roomId: string; token: string; sessionId: string;
  message: string; history: ChatMsg[];
}) {
  const { data, error } = await fn({ action: "message", ...args });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { reply: string; requests: GuestRequest[]; language: string };
}

export async function fetchMyRequests(hotelSlug: string, roomId: string, token: string, sessionId: string) {
  const { data, error } = await fn({ action: "my_requests", hotelSlug, roomId, token, sessionId });
  if (error) throw error;
  return ((data as any)?.requests ?? []) as GuestRequest[];
}

/** Store where this guest device wants updates (email/whatsapp) for their stay. */
export async function saveGuestContact(args: {
  hotelSlug: string; roomId: string; token: string; sessionId: string;
  channel: string; contact: string;
}) {
  const { data, error } = await fn({ action: "set_contact", ...args });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return true;
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

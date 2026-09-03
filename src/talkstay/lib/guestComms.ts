import { supabase } from "@/integrations/supabase/client";

/** Uploads a campaign hero image to the shared "logos" bucket and returns its
 *  public URL. Same bucket and path shape department menu scans already use —
 *  it already has a public read policy, so nothing new to configure. */
export async function uploadCampaignImage(hotelId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `talkstay/${hotelId}/campaign-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("logos").getPublicUrl(path);
  return data.publicUrl;
}

async function invokeComms(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("talkstay-guest-comms", { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) {
        const j = await ctx.json();
        if (j?.error) msg = j.error;
      }
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as Record<string, unknown>;
}

export type GuestContact = {
  email: string;
  firstName: string | null;
  roomLabel: string | null;
  lastSeenAt: string | null;
  source: "guest_opt_in" | "checkin_email";
  marketingOk: boolean;
};

export type GuestCampaign = {
  id: string;
  subject: string;
  body_text: string;
  cta_label: string | null;
  cta_url: string | null;
  image_url: string | null;
  recipient_count: number;
  sent_count: number;
  created_at: string;
};

export async function listGuestContacts(hotelId: string): Promise<{
  contacts: GuestContact[];
  eligibleCount: number;
  totalCount: number;
}> {
  const data = await invokeComms({ action: "list_contacts", hotelId });
  return {
    contacts: (data.contacts ?? []) as GuestContact[],
    eligibleCount: Number(data.eligibleCount ?? 0),
    totalCount: Number(data.totalCount ?? 0),
  };
}

export type CampaignRecipient = { email: string; status: "sent" | "skipped" | "failed" };

/** Who a past campaign actually went to, and how each one fared. */
export async function listCampaignRecipients(
  hotelId: string, campaignId: string,
): Promise<CampaignRecipient[]> {
  const data = await invokeComms({ action: "campaign_recipients", hotelId, campaignId });
  return (data.recipients ?? []) as CampaignRecipient[];
}

export async function listGuestCampaigns(hotelId: string): Promise<GuestCampaign[]> {
  const data = await invokeComms({ action: "list_campaigns", hotelId });
  return (data.campaigns ?? []) as GuestCampaign[];
}

export async function sendGuestCampaign(args: {
  hotelId: string;
  subject: string;
  bodyText: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
  emails?: string[];
}): Promise<{ sent: number; attempted: number; campaignId: string }> {
  const data = await invokeComms({
    action: "send_campaign",
    hotelId: args.hotelId,
    subject: args.subject,
    bodyText: args.bodyText,
    ctaLabel: args.ctaLabel || null,
    ctaUrl: args.ctaUrl || null,
    imageUrl: args.imageUrl || null,
    emails: args.emails,
  });
  return {
    sent: Number(data.sent ?? 0),
    attempted: Number(data.attempted ?? 0),
    campaignId: String(data.campaignId ?? ""),
  };
}

export async function staffUnsubscribeGuest(hotelId: string, email: string): Promise<void> {
  await invokeComms({ action: "staff_unsubscribe", hotelId, email });
}

export async function staffResubscribeGuest(hotelId: string, email: string): Promise<void> {
  await invokeComms({ action: "staff_resubscribe", hotelId, email });
}

/** Public unsubscribe helpers (anon). */
export async function previewUnsubscribe(args: {
  hotelId: string; email: string; token: string;
}): Promise<{ hotelName: string; email: string; already: boolean }> {
  const { data, error } = await supabase.functions.invoke("talkstay-guest-comms", {
    body: { action: "unsubscribe_preview", ...args },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return {
    hotelName: String((data as { hotelName?: string }).hotelName ?? "Property"),
    email: String((data as { email?: string }).email ?? args.email),
    already: !!(data as { already?: boolean }).already,
  };
}

export async function confirmUnsubscribe(args: {
  hotelId: string; email: string; token: string;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke("talkstay-guest-comms", {
    body: { action: "unsubscribe", ...args },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
}

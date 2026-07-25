import { supabase } from "@/integrations/supabase/client";

interface TrackLinkClickParams {
  assistantId: string;
  sessionId?: string;
  clickedUrl: string;
  linkLabel?: string;
  source: 'voice_navigation' | 'text_navigation' | 'whatsapp_redirect' | 'phone_redirect';
  referrerUrl?: string;
  // Optional contact attribution for analytics follow-up
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  leadId?: string | null;
}

/**
 * Fire-and-forget link click tracking.
 * Extracts UTM params from the clicked URL and logs to link_clicks table,
 * including any known contact info so you can follow up with the clicker.
 */
export const trackLinkClick = ({
  assistantId,
  sessionId,
  clickedUrl,
  linkLabel,
  source,
  referrerUrl,
  contactName,
  contactEmail,
  contactPhone,
  leadId,
}: TrackLinkClickParams) => {
  try {
    let utmSource: string | null = null;
    let utmMedium: string | null = null;
    let utmCampaign: string | null = null;

    try {
      const url = new URL(clickedUrl);
      utmSource = url.searchParams.get('utm_source');
      utmMedium = url.searchParams.get('utm_medium');
      utmCampaign = url.searchParams.get('utm_campaign');
    } catch {
      // URL parsing failed — still log the click
    }

    const clean = (v?: string | null) => {
      if (!v) return null;
      const s = String(v).trim();
      return s.length > 0 ? s : null;
    };

    (async () => {
      try {
        await supabase
          .from('link_clicks')
          .insert({
            assistant_id: assistantId,
            session_id: sessionId || null,
            clicked_url: clickedUrl,
            link_label: linkLabel || null,
            source,
            utm_source: utmSource,
            utm_medium: utmMedium,
            utm_campaign: utmCampaign,
            referrer_url: referrerUrl || (typeof window !== 'undefined' ? window.location.href : null),
            contact_name: clean(contactName),
            contact_email: clean(contactEmail),
            contact_phone: clean(contactPhone),
            lead_id: leadId || null,
          } as any);
        console.log('📊 Link click tracked:', clickedUrl);
      } catch (err) {
        console.warn('📊 Link click tracking failed:', err);
      }
    })();
  } catch (err) {
    console.warn('📊 Link click tracking error:', err);
  }
};

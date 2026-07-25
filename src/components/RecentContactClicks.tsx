import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Phone, MessageCircle, Mail, User } from "lucide-react";

interface ClickRow {
  id: string;
  created_at: string;
  source: string;
  clicked_url: string | null;
  link_label: string | null;
  session_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

interface Props {
  assistantId: string;
  /** Time range like "7d", "30d", "90d". */
  timeRange?: string;
}

const rangeToDays = (r?: string) => {
  if (!r) return 30;
  const m = /^(\d+)d$/.exec(r);
  return m ? parseInt(m[1], 10) : 30;
};

export const RecentContactClicks = ({ assistantId, timeRange }: Props) => {
  const [rows, setRows] = useState<ClickRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assistantId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - rangeToDays(timeRange) * 86400000).toISOString();
      const { data } = await (supabase as any)
        .from("link_clicks")
        .select("id,created_at,source,clicked_url,link_label,session_id,contact_name,contact_email,contact_phone")
        .eq("assistant_id", assistantId)
        .in("source", ["whatsapp_redirect", "phone_redirect"])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!cancelled) {
        setRows((data || []) as ClickRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [assistantId, timeRange]);

  const whatsapp = rows.filter((r) => r.source === "whatsapp_redirect");
  const phone = rows.filter((r) => r.source === "phone_redirect");

  const renderTable = (data: ClickRow[], emptyText: string) => {
    if (loading) {
      return <p className="text-sm text-muted-foreground py-4">Loading…</p>;
    }
    if (data.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-4">{emptyText}</p>;
    }
    return (
      <div className="space-y-2">
        {data.map((r) => {
          const hasContact = r.contact_name || r.contact_email || r.contact_phone;
          return (
            <div key={r.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 border rounded-md">
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="text-sm font-medium flex items-center gap-2">
                  {hasContact ? (
                    <>
                      <User className="w-3.5 h-3.5 text-primary" />
                      <span>{r.contact_name || "Unknown name"}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Anonymous visitor</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                  {r.contact_email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <a href={`mailto:${r.contact_email}`} className="hover:underline">
                        {r.contact_email}
                      </a>
                    </span>
                  )}
                  {r.contact_phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <a href={`tel:${r.contact_phone}`} className="hover:underline">
                        {r.contact_phone}
                      </a>
                    </span>
                  )}
                  {r.session_id && !hasContact && (
                    <span className="font-mono">session {r.session_id.slice(0, 14)}…</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-start md:items-end gap-1 shrink-0">
                <Badge variant="secondary" className="text-xs">
                  {format(new Date(r.created_at), "PPp")}
                </Badge>
                {r.clicked_url && (
                  <a
                    href={r.clicked_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline truncate max-w-[260px]"
                  >
                    {r.link_label || r.clicked_url}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Recent WhatsApp Requests
          </CardTitle>
          <CardDescription>
            Who tapped the WhatsApp button — contact details are captured when the AI collected them in the conversation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderTable(whatsapp, "No WhatsApp clicks in this period.")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Recent Phone Call Clicks
          </CardTitle>
          <CardDescription>
            Who tapped to call. Tap the email/phone to follow up directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderTable(phone, "No phone-call clicks in this period.")}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecentContactClicks;

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Mail, ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { EmailListInput } from "./EmailListInput";

export type NotificationChannelKey =
  | "booking_notification_emails"
  | "inquiry_notification_emails"
  | "quick_help_notification_emails"
  | "voice_form_notification_emails"
  | "lead_notification_emails"
  | "review_notification_emails"
  | "whatsapp_forward_notification_emails"
  | "summary_notification_emails"
  | "analytics_notification_emails"
  | "lifecycle_notification_emails"
  | "limit_alert_notification_emails"
  | "concierge_notification_emails"
  | "demo_request_notification_emails"
  | "support_notification_emails"
  | "api_alert_notification_emails";

export type NotificationRouting = Record<NotificationChannelKey, string[]>;

interface ChannelDef {
  key: NotificationChannelKey;
  label: string;
  description: string;
  placeholder: string;
}

interface GroupDef {
  title: string;
  channels: ChannelDef[];
}

export const NOTIFICATION_GROUPS: GroupDef[] = [
  {
    title: "Customer-facing",
    channels: [
      { key: "booking_notification_emails", label: "Bookings", description: "Confirmations, reschedules, cancellations, manual time-slot bookings.", placeholder: "customerservice@yourbusiness.com" },
      { key: "inquiry_notification_emails", label: "Customer inquiries", description: "Project / sales inquiries from chat and scheduled follow-ups.", placeholder: "sales@yourbusiness.com" },
      { key: "quick_help_notification_emails", label: "Quick-help requests", description: "When a visitor asks to talk to a human.", placeholder: "support@yourbusiness.com" },
      { key: "voice_form_notification_emails", label: "Voice form submissions", description: "When someone completes a voice form.", placeholder: "leads@yourbusiness.com" },
      { key: "lead_notification_emails", label: "Lead capture", description: "New contact details captured by the assistant.", placeholder: "leads@yourbusiness.com" },
      { key: "review_notification_emails", label: "Reviews & feedback", description: "Customer ratings and feedback from the widget.", placeholder: "feedback@yourbusiness.com" },
      { key: "whatsapp_forward_notification_emails", label: "WhatsApp forwarded chats", description: "Auto-forwarded WhatsApp conversation summaries.", placeholder: "whatsapp@yourbusiness.com" },
    ],
  },
  {
    title: "Insights",
    channels: [
      { key: "summary_notification_emails", label: "Conversation summaries & transcripts", description: "AI-generated summaries of meaningful conversations.", placeholder: "analytics@yourbusiness.com" },
      { key: "analytics_notification_emails", label: "Analytics & usage reports", description: "Weekly / monthly performance reports.", placeholder: "analytics@yourbusiness.com" },
    ],
  },
  {
    title: "Operations",
    channels: [
      { key: "lifecycle_notification_emails", label: "Lifecycle alerts", description: "Deployment ready, crawl complete, welcome emails.", placeholder: "ops@yourbusiness.com" },
      { key: "limit_alert_notification_emails", label: "Usage limits & trial alerts", description: "Conversation limits reached, trial expiring soon.", placeholder: "billing@yourbusiness.com" },
      { key: "concierge_notification_emails", label: "Concierge install requests", description: "When someone requests installation help.", placeholder: "ops@yourbusiness.com" },
      { key: "demo_request_notification_emails", label: "Demo / contact requests", description: "Demo requests submitted from your site.", placeholder: "sales@yourbusiness.com" },
      { key: "support_notification_emails", label: "Support & pricing requests", description: "Support tickets and project pricing requests.", placeholder: "support@yourbusiness.com" },
      { key: "api_alert_notification_emails", label: "API usage & error alerts", description: "API key spikes, rate limits, error bursts.", placeholder: "engineering@yourbusiness.com" },
    ],
  },
];

export const ALL_NOTIFICATION_CHANNELS: NotificationChannelKey[] = NOTIFICATION_GROUPS.flatMap(
  (g) => g.channels.map((c) => c.key)
);

export function emptyRouting(): NotificationRouting {
  const out = {} as NotificationRouting;
  for (const k of ALL_NOTIFICATION_CHANNELS) out[k] = [];
  return out;
}

export function routingFromAssistant(assistant: any): NotificationRouting {
  const out = emptyRouting();
  if (!assistant) return out;
  for (const k of ALL_NOTIFICATION_CHANNELS) {
    const v = assistant[k];
    if (Array.isArray(v) && v.length > 0) out[k] = (v as string[]).filter(Boolean);
    else out[k] = [];
  }
  return out;
}

interface Props {
  value: NotificationRouting;
  onChange: (next: NotificationRouting) => void;
  showCard?: boolean;
  defaultEmail?: string;
  onDefaultEmailChange?: (email: string) => void;
}

export const NotificationRoutingCard: React.FC<Props> = ({
  value,
  onChange,
  showCard = true,
  defaultEmail = "",
  onDefaultEmailChange,
}) => {
  const setChannel = (key: NotificationChannelKey, list: string[]) => {
    onChange({ ...value, [key]: list });
  };

  const totalCustomised = ALL_NOTIFICATION_CHANNELS.reduce(
    (sum, k) => sum + ((value[k] || []).length > 0 ? 1 : 0),
    0
  );

  const body = (
    <div className="space-y-4">
      {/* Default fallback email */}
      {onDefaultEmailChange && (
        <div className="space-y-1.5 p-3 rounded-md border bg-muted/30">
          <Label htmlFor="default_notification_email" className="text-sm font-medium">
            Default notification email
          </Label>
          <Input
            id="default_notification_email"
            type="email"
            value={defaultEmail}
            onChange={(e) => onDefaultEmailChange(e.target.value)}
            placeholder="you@yourbusiness.com"
          />
          <p className="text-xs text-muted-foreground">
            All notifications go here unless you customise a specific channel below.
          </p>
        </div>
      )}

      {/* Per-channel customisation (collapsed by default) */}
      <Accordion type="single" collapsible className="border rounded-md">
        <AccordionItem value="customise" className="border-b-0">
          <AccordionTrigger className="px-3 py-2.5 hover:no-underline text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Customise per-channel routing</span>
              <Badge variant="secondary" className="text-[10px] font-normal">
                {totalCustomised > 0 ? `${totalCustomised} customised` : "Optional"}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3">
            <div className="space-y-4">
              {NOTIFICATION_GROUPS.map((group) => (
                <div key={group.title} className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {group.title}
                  </h4>
                  <Accordion type="multiple" className="border rounded-md divide-y">
                    {group.channels.map((ch) => {
                      const list = value[ch.key] || [];
                      const customised = list.length > 0;
                      return (
                        <AccordionItem key={ch.key} value={ch.key} className="border-b-0">
                          <AccordionTrigger className="px-3 py-2 hover:no-underline text-sm">
                            <div className="flex items-center justify-between w-full pr-2">
                              <span className="text-left">{ch.label}</span>
                              <Badge
                                variant={customised ? "default" : "outline"}
                                className="text-[10px] font-normal ml-2"
                              >
                                {customised
                                  ? `${list.length} ${list.length === 1 ? "address" : "addresses"}`
                                  : "Default"}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-3 pb-3 space-y-1.5">
                            <EmailListInput
                              id={ch.key}
                              value={list}
                              onChange={(next) => setChannel(ch.key, next)}
                              placeholder={ch.placeholder}
                            />
                            <p className="text-xs text-muted-foreground">{ch.description}</p>
                            {!customised && defaultEmail && (
                              <p className="text-[11px] text-muted-foreground italic">
                                Currently using default: {defaultEmail}
                              </p>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <p className="text-xs text-muted-foreground">
        Channels left empty automatically use your default email above.
      </p>
    </div>
  );

  if (!showCard) return body;

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <CardTitle>Notification Routing</CardTitle>
        </div>
        <CardDescription>
          Set one default email for all notifications, then optionally route specific categories to different inboxes.
        </CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
};

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Save, Info, MessageSquare, MessageCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  NotificationRoutingCard,
  routingFromAssistant,
  emptyRouting,
  ALL_NOTIFICATION_CHANNELS,
  type NotificationRouting,
} from './NotificationRoutingCard';

interface NotificationSettingsProps {
  selectedAssistant: any;
  assistantId: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  selectedAssistant,
  assistantId,
}) => {
  const [routing, setRouting] = useState<NotificationRouting>(() =>
    selectedAssistant ? routingFromAssistant(selectedAssistant) : emptyRouting()
  );
  const [transcriptNotificationsEnabled, setTranscriptNotificationsEnabled] = useState(
    selectedAssistant?.transcript_notifications_enabled || false
  );
  const [whatsappForwardingEnabled, setWhatsappForwardingEnabled] = useState(
    selectedAssistant?.whatsapp_forwarding_enabled || false
  );
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedAssistant) {
      setRouting(routingFromAssistant(selectedAssistant));
      setTranscriptNotificationsEnabled(selectedAssistant.transcript_notifications_enabled || false);
      setWhatsappForwardingEnabled(selectedAssistant.whatsapp_forwarding_enabled || false);
    }
  }, [selectedAssistant]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleaned: Record<string, string[]> = {};
      for (const k of ALL_NOTIFICATION_CHANNELS) {
        cleaned[k] = (routing[k] || []).map((e) => e.trim()).filter(Boolean);
      }
      const bookingList = cleaned.booking_notification_emails;

      const { error } = await supabase
        .from('assistants')
        .update({
          ...cleaned,
          // Keep legacy single column in sync with first booking entry
          booking_notification_email: bookingList[0] || null,
          transcript_notifications_enabled: transcriptNotificationsEnabled,
          whatsapp_forwarding_enabled: whatsappForwardingEnabled,
        } as any)
        .eq('id', assistantId);

      if (error) throw error;

      toast({
        title: 'Notification settings updated',
        description: 'Your notification preferences have been saved successfully.',
      });
    } catch (error: any) {
      console.error('Error updating notification settings:', error);
      toast({
        title: 'Error updating settings',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const whatsappNumber = selectedAssistant?.whatsapp_number;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-500" />
            Notification & Forwarding Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              Route each notification type to the right people — bookings to customer service, analytics to your data team, support requests to support, and so on. Each list falls back to your account email when empty.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                <div>
                  <Label htmlFor="transcript-notifications" className="text-base font-medium">
                    Email Conversation Summaries
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive AI-generated summaries of visitor conversations via email.
                  </p>
                </div>
              </div>
              <Switch
                id="transcript-notifications"
                checked={transcriptNotificationsEnabled}
                onCheckedChange={setTranscriptNotificationsEnabled}
              />
            </div>

            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-3">
                <MessageCircle className="w-5 h-5 text-green-500" />
                <div>
                  <Label htmlFor="whatsapp-forwarding" className="text-base font-medium">
                    WhatsApp Conversation Forwarding
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {whatsappNumber
                      ? `Include a WhatsApp deep link in email summaries for quick replies (${whatsappNumber})`
                      : 'Set a WhatsApp number in your assistant settings first'}
                  </p>
                </div>
              </div>
              <Switch
                id="whatsapp-forwarding"
                checked={whatsappForwardingEnabled}
                onCheckedChange={setWhatsappForwardingEnabled}
                disabled={!whatsappNumber}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <NotificationRoutingCard value={routing} onChange={setRouting} showCard />

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {saving ? 'Saving...' : 'Save Notification Settings'}
      </Button>
    </div>
  );
};

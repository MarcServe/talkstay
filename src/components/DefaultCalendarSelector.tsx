import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, ExternalLink, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DefaultCalendarSelectorProps {
  selectedAssistant: any;
  assistantId: string;
}

export const DefaultCalendarSelector: React.FC<DefaultCalendarSelectorProps> = ({
  selectedAssistant,
  assistantId
}) => {
  const [defaultBookingMethod, setDefaultBookingMethod] = useState<string>('manual_timeslots');
  const [externalSchedulingUrl, setExternalSchedulingUrl] = useState<string>('');
  const [externalLinkLabel, setExternalLinkLabel] = useState<string>('');
  const [externalLinkAutoOpen, setExternalLinkAutoOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedAssistant?.default_booking_method) {
      setDefaultBookingMethod(selectedAssistant.default_booking_method);
    }
    if (selectedAssistant?.external_scheduling_url) {
      setExternalSchedulingUrl(selectedAssistant.external_scheduling_url);
    }
    if (typeof selectedAssistant?.external_link_label === 'string') {
      setExternalLinkLabel(selectedAssistant.external_link_label);
    }
    if (typeof selectedAssistant?.external_link_auto_open === 'boolean') {
      setExternalLinkAutoOpen(selectedAssistant.external_link_auto_open);
    }
  }, [selectedAssistant]);

  const handleSaveDefault = async () => {
    if (!assistantId) return;

    if (defaultBookingMethod === 'external_link' && !externalSchedulingUrl.trim()) {
      toast.error('Please enter an external scheduling URL');
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
        default_booking_method: defaultBookingMethod,
        external_scheduling_url: defaultBookingMethod === 'external_link' ? externalSchedulingUrl : null,
        external_link_label: defaultBookingMethod === 'external_link' ? (externalLinkLabel.trim() || null) : null,
        external_link_auto_open: defaultBookingMethod === 'external_link' ? externalLinkAutoOpen : false,
      };

      const { data, error } = await supabase
        .from('assistants')
        .update(updateData)
        .eq('id', assistantId)
        .select()
        .single();

      if (error) throw error;

      toast.success('Appointment booking system updated successfully');
    } catch (error: any) {
      console.error('Error updating booking method:', error);
      toast.error('Failed to update booking system');
    } finally {
      setLoading(false);
    }
  };

  const getBookingMethodInfo = (method: string) => {
    switch (method) {
      case 'manual_timeslots':
        return {
          label: 'Manual Calendar',
          description: 'Use internal time slots you create and manage',
          icon: <Clock className="h-4 w-4" />,
          available: true,
        };
      case 'external_link':
        return {
          label: 'External Scheduling Link',
          description: 'Use Calendly, Cal.com, or other scheduling page',
          icon: <ExternalLink className="h-4 w-4" />,
          available: true,
        };
      case 'google_calendar':
        return {
          label: 'Google Calendar Sync',
          description: 'Auto-sync with your Google Calendar',
          icon: <Calendar className="h-4 w-4" />,
          available: selectedAssistant?.google_calendar_connected,
        };
      case 'outlook_calendar':
        return {
          label: 'Outlook Calendar Sync',
          description: 'Auto-sync with your Outlook Calendar',
          icon: <Calendar className="h-4 w-4" />,
          available: selectedAssistant?.outlook_calendar_connected,
        };
      default:
        return {
          label: 'Manual Calendar',
          description: 'Use internal time slots',
          icon: <Clock className="h-4 w-4" />,
          available: true,
        };
    }
  };

  const allMethods = ['manual_timeslots', 'external_link', 'google_calendar', 'outlook_calendar'];

  if (!selectedAssistant) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Appointment Booking System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please select an assistant to configure the booking system.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Appointment Booking System
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Choose how customers will book appointments with you
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <Select value={defaultBookingMethod} onValueChange={setDefaultBookingMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allMethods.map((method) => {
                const info = getBookingMethodInfo(method);
                return (
                  <SelectItem key={method} value={method} disabled={!info.available}>
                    <div className="flex items-center gap-2">
                      {info.icon}
                      <div>
                        <div className="font-medium">{info.label}</div>
                        <div className="text-xs text-muted-foreground">{info.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {defaultBookingMethod === 'external_link' && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium">External Scheduling URL</label>
                <Input
                  type="url"
                  value={externalSchedulingUrl}
                  onChange={(e) => setExternalSchedulingUrl(e.target.value)}
                  placeholder="https://calendly.com/your-link, https://cal.com/your-link, or your own form URL"
                />
                <p className="text-xs text-muted-foreground">
                  Use a Calendly / Cal.com link, or any web form on your own site. Visitors will be shown a button in chat that opens this URL in a new tab.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Button label (optional)</label>
                <Input
                  type="text"
                  value={externalLinkLabel}
                  onChange={(e) => setExternalLinkLabel(e.target.value)}
                  placeholder="Open booking form"
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">
                  Shown on the in-chat button. Defaults to "Open booking form" if left empty.
                </p>
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Auto-open in a new tab</p>
                  <p className="text-xs text-muted-foreground">
                    When the visitor asks to book, also try to open the link automatically. Some browsers may block this — the button always works.
                  </p>
                </div>
                <Switch
                  checked={externalLinkAutoOpen}
                  onCheckedChange={setExternalLinkAutoOpen}
                />
              </div>
            </div>
          )}

          {!getBookingMethodInfo(defaultBookingMethod).available && defaultBookingMethod !== 'external_link' && (
            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
              This calendar integration needs to be connected. Use the Calendar Integrations tab below to set it up.
            </p>
          )}
        </div>

        <div className="pt-3 border-t">
          <Button 
            onClick={handleSaveDefault} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Saving...' : 'Save Booking System'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
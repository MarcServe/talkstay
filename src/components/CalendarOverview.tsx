import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle, AlertCircle, Clock, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CalendarStatus {
  google_calendar_connected: boolean;
  google_calendar_enabled: boolean;
  outlook_calendar_connected: boolean;
  outlook_calendar_enabled: boolean;
  apple_calendar_enabled: boolean;
  calendly_connected: boolean;
}

interface CalendarOverviewProps {
  selectedAssistant: { id: string; business_name: string } | null;
  onConfigureCalendar: (type: 'google' | 'outlook' | 'apple') => void;
}

export const CalendarOverview = ({ selectedAssistant, onConfigureCalendar }: CalendarOverviewProps) => {
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({
    google_calendar_connected: false,
    google_calendar_enabled: false,
    outlook_calendar_connected: false,
    outlook_calendar_enabled: false,
    apple_calendar_enabled: false,
    calendly_connected: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedAssistant) {
      fetchCalendarStatus();
    }
  }, [selectedAssistant]);

  const fetchCalendarStatus = async () => {
    if (!selectedAssistant) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assistants')
        .select(`
          google_calendar_connected,
          google_calendar_enabled,
          outlook_calendar_connected,
          outlook_calendar_enabled,
          apple_calendar_enabled,
          calendly_connected
        `)
        .eq('id', selectedAssistant.id)
        .single();

      if (error) throw error;

      setCalendarStatus({
        google_calendar_connected: data.google_calendar_connected || false,
        google_calendar_enabled: data.google_calendar_enabled || false,
        outlook_calendar_connected: data.outlook_calendar_connected || false,
        outlook_calendar_enabled: data.outlook_calendar_enabled || false,
        apple_calendar_enabled: data.apple_calendar_enabled || false,
        calendly_connected: data.calendly_connected || false
      });
    } catch (error) {
      console.error('Error fetching calendar status:', error);
      toast.error('Failed to load calendar status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (connected: boolean, enabled: boolean) => {
    if (connected && enabled) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
    } else if (enabled) {
      return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />Configured</Badge>;
    } else {
      return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Not Setup</Badge>;
    }
  };

  const calendarIntegrations = [
    {
      name: "Google Calendar",
      description: "Sync with Google Calendar for seamless scheduling",
      icon: "📅",
      type: "google" as const,
      connected: calendarStatus.google_calendar_connected,
      enabled: calendarStatus.google_calendar_enabled
    },
    {
      name: "Outlook Calendar",
      description: "Integrate with Microsoft Outlook and Office 365",
      icon: "🗓️",
      type: "outlook" as const,
      connected: calendarStatus.outlook_calendar_connected,
      enabled: calendarStatus.outlook_calendar_enabled
    },
    {
      name: "Apple Calendar",
      description: "Connect with iCloud Calendar via CalDAV",
      icon: "🍎",
      type: "apple" as const,
      connected: false,
      enabled: calendarStatus.apple_calendar_enabled
    }
  ];

  if (!selectedAssistant) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Overview
          </CardTitle>
          <CardDescription>
            Please select an assistant to view calendar integrations
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Integrations Overview
          </CardTitle>
          <CardDescription>
            Manage all your calendar connections for {selectedAssistant.business_name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {calendarIntegrations.map((integration) => (
              <Card key={integration.type} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{integration.icon}</span>
                      <CardTitle className="text-base">{integration.name}</CardTitle>
                    </div>
                    {getStatusBadge(integration.connected, integration.enabled)}
                  </div>
                  <CardDescription className="text-sm">
                    {integration.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onConfigureCalendar(integration.type)}
                    className="w-full"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {integration.enabled ? 'Configure' : 'Set Up'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Setup Section */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Setup Guide</CardTitle>
          <CardDescription>
            Follow these steps to get your calendar integrations up and running
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                1
              </div>
              <div>
                <h4 className="font-medium">Choose Your Calendar Provider</h4>
                <p className="text-sm text-muted-foreground">
                  Select Google Calendar, Outlook, or Apple Calendar based on your preferences
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                2
              </div>
              <div>
                <h4 className="font-medium">Configure Authentication</h4>
                <p className="text-sm text-muted-foreground">
                  Set up OAuth credentials or API keys for secure calendar access
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                3
              </div>
              <div>
                <h4 className="font-medium">Test & Enable</h4>
                <p className="text-sm text-muted-foreground">
                  Verify the connection works and enable the integration for booking
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendly Integration Status */}
      {calendarStatus.calendly_connected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Calendly Integration
            </CardTitle>
            <CardDescription>
              Your Calendly integration is active and working
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar, CalendarCheck, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CalendarIntegrationBadgeProps {
  assistantId: string;
}

export const CalendarIntegrationBadge = ({ assistantId }: CalendarIntegrationBadgeProps) => {
  const { user } = useAuth();
  const [integrationStatus, setIntegrationStatus] = useState<{
    calendly: boolean;
    googleCalendar: boolean;
    loading: boolean;
  }>({ calendly: false, googleCalendar: false, loading: true });

  useEffect(() => {
    const checkIntegrations = async () => {
      if (!user || !assistantId) return;

      try {
        // Check assistant's calendar integrations
        const { data: assistant } = await supabase
          .from('assistants')
          .select('calendly_link, google_calendar_email, calendly_api_token')
          .eq('id', assistantId)
          .single();

        // Check user's global calendar settings
        const { data: config } = await supabase
          .from('configs')
          .select('calendly_api_token, google_calendar_refresh_token')
          .eq('user_id', user.id)
          .single();

        setIntegrationStatus({
          calendly: !!(assistant?.calendly_link || assistant?.calendly_api_token || config?.calendly_api_token),
          googleCalendar: !!(assistant?.google_calendar_email || config?.google_calendar_refresh_token),
          loading: false
        });
      } catch (error) {
        console.error('Error checking calendar integrations:', error);
        setIntegrationStatus(prev => ({ ...prev, loading: false }));
      }
    };

    checkIntegrations();

    // Listen for integration updates
    const handleIntegrationUpdate = () => {
      checkIntegrations();
    };

    window.addEventListener('calendarIntegrationUpdate', handleIntegrationUpdate);
    return () => window.removeEventListener('calendarIntegrationUpdate', handleIntegrationUpdate);
  }, [user, assistantId]);

  if (integrationStatus.loading) {
    return (
      <Badge variant="outline" className="gap-1">
        <Calendar className="w-3 h-3 animate-pulse" />
        Checking...
      </Badge>
    );
  }

  const { calendly, googleCalendar } = integrationStatus;
  const totalIntegrations = Number(calendly) + Number(googleCalendar);

  if (totalIntegrations === 0) {
    return (
      <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400">
        <AlertCircle className="w-3 h-3" />
        No Calendar
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1 text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400">
      <CalendarCheck className="w-3 h-3" />
      {calendly && googleCalendar ? 'Both Connected' : 
       calendly ? 'Calendly' : 'Google Calendar'}
    </Badge>
  );
};
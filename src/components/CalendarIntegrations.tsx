import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Calendar, Save, ExternalLink } from "lucide-react";
import { OutlookCalendarAuth } from "@/components/OutlookCalendarAuth";

interface CalendarConfig {
  google_calendar_enabled: boolean;
  google_calendar_client_id: string;
  google_calendar_client_secret: string;
  outlook_calendar_enabled: boolean;
  outlook_calendar_connected: boolean;
  apple_calendar_enabled: boolean;
  apple_calendar_config: any;
}

interface CalendarIntegrationsProps {
  selectedAssistant: { id: string; business_name: string } | null;
}

export const CalendarIntegrations = ({ selectedAssistant }: CalendarIntegrationsProps) => {
  const { user } = useAuth();
  const { canIntegrateCalendar, hasFeature, getUpgradeMessage } = useFeatureGating();
  const [config, setConfig] = useState<CalendarConfig>({
    google_calendar_enabled: false,
    google_calendar_client_id: "",
    google_calendar_client_secret: "",
    outlook_calendar_enabled: false,
    outlook_calendar_connected: false,
    apple_calendar_enabled: false,
    apple_calendar_config: {}
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Check if user has calendar integration feature
  if (!hasFeature('calendar_integration')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendar Integrations
          </CardTitle>
          <CardDescription>
            {getUpgradeMessage('calendar_integration')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Calendar integrations are available in paid plans.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  useEffect(() => {
    if (selectedAssistant) {
      fetchCalendarConfig();
    }
  }, [selectedAssistant]);

  const fetchCalendarConfig = async () => {
    if (!selectedAssistant) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assistants')
        .select('google_calendar_enabled, google_calendar_client_id, google_calendar_client_secret, outlook_calendar_enabled, outlook_calendar_connected, apple_calendar_enabled, apple_calendar_config')
        .eq('id', selectedAssistant.id)
        .single();

      if (error) throw error;

      setConfig({
        google_calendar_enabled: data.google_calendar_enabled || false,
        google_calendar_client_id: data.google_calendar_client_id || "",
        google_calendar_client_secret: data.google_calendar_client_secret || "",
        outlook_calendar_enabled: data.outlook_calendar_enabled || false,
        outlook_calendar_connected: data.outlook_calendar_connected || false,
        apple_calendar_enabled: data.apple_calendar_enabled || false,
        apple_calendar_config: data.apple_calendar_config || {}
      });
    } catch (error) {
      console.error('Error fetching calendar config:', error);
      toast.error('Failed to load calendar configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveCalendarConfig = async () => {
    if (!selectedAssistant) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('assistants')
        .update({
          google_calendar_enabled: config.google_calendar_enabled,
          google_calendar_client_id: config.google_calendar_client_id,
          google_calendar_client_secret: config.google_calendar_client_secret,
          apple_calendar_enabled: config.apple_calendar_enabled,
          apple_calendar_config: config.apple_calendar_config
        })
        .eq('id', selectedAssistant.id);

      if (error) throw error;

      toast.success('Calendar configuration saved successfully');
    } catch (error) {
      console.error('Error saving calendar config:', error);
      toast.error('Failed to save calendar configuration');
    } finally {
      setSaving(false);
    }
  };

  if (!selectedAssistant) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Integrations
          </CardTitle>
          <CardDescription>
            Please select an assistant to configure calendar integrations
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Integrations
        </CardTitle>
        <CardDescription>
          Sync with Google Calendar and Apple Calendar for seamless scheduling
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="google">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="google" className="relative">
              Google Calendar
              <Badge variant="secondary" className="ml-2 text-xs">Coming Soon</Badge>
            </TabsTrigger>
            <TabsTrigger value="outlook" className="relative">
              Outlook Calendar
              <Badge variant="secondary" className="ml-2 text-xs">Coming Soon</Badge>
            </TabsTrigger>
            <TabsTrigger value="apple" className="relative">
              Apple Calendar  
              <Badge variant="secondary" className="ml-2 text-xs">Coming Soon</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="google" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="google-calendar-enabled"
                checked={config.google_calendar_enabled}
                onCheckedChange={(checked) =>
                  setConfig(prev => ({ ...prev, google_calendar_enabled: checked }))
                }
              />
              <Label htmlFor="google-calendar-enabled">Enable Google Calendar Integration</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="google-client-id">Google Client ID</Label>
              <Input
                id="google-client-id"
                placeholder="your-client-id.googleusercontent.com"
                value={config.google_calendar_client_id}
                onChange={(e) =>
                  setConfig(prev => ({ ...prev, google_calendar_client_id: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="google-client-secret">Google Client Secret</Label>
              <Input
                id="google-client-secret"
                type="password"
                placeholder="Your Google Client Secret"
                value={config.google_calendar_client_secret}
                onChange={(e) =>
                  setConfig(prev => ({ ...prev, google_calendar_client_secret: e.target.value }))
                }
              />
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Setup Instructions:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a></li>
                <li>Create a new project or select existing one</li>
                <li>Enable the Google Calendar API</li>
                <li>Create OAuth 2.0 credentials</li>
                <li>Copy the Client ID and Client Secret here</li>
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="outlook" className="space-y-4">
            <OutlookCalendarAuth selectedAssistant={selectedAssistant} />
          </TabsContent>

          <TabsContent value="apple" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="apple-calendar-enabled"
                checked={config.apple_calendar_enabled}
                onCheckedChange={(checked) =>
                  setConfig(prev => ({ ...prev, apple_calendar_enabled: checked }))
                }
              />
              <Label htmlFor="apple-calendar-enabled">Enable Apple Calendar Integration</Label>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Apple Calendar Setup:</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Apple Calendar integration uses CalDAV protocol for web-based access.
              </p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Enable two-factor authentication on your Apple ID</li>
                <li>Generate an app-specific password in Apple ID settings</li>
                <li>Use your Apple ID email and app-specific password for authentication</li>
              </ol>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apple-server-url">CalDAV Server URL</Label>
              <Input
                id="apple-server-url"
                placeholder="https://caldav.icloud.com"
                value="https://caldav.icloud.com"
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apple-username">Apple ID Email</Label>
              <Input
                id="apple-username"
                placeholder="your-apple-id@icloud.com"
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apple-password">App-Specific Password</Label>
              <Input
                id="apple-password"
                type="password"
                placeholder="xxxx-xxxx-xxxx-xxxx"
                disabled
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Enhanced Apple Calendar Integration</h4>
              <p className="text-sm text-blue-600 mb-2">
                Full Apple Calendar integration with CalDAV protocol is now available with enhanced features:
              </p>
              <ul className="text-sm text-blue-600 space-y-1">
                <li>• Two-way calendar synchronization</li>
                <li>• Real-time availability checking</li>
                <li>• Automatic appointment creation</li>
                <li>• Multiple calendar support</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Coming Soon:</strong> Apple Calendar integration UI is currently in development. 
                Full CalDAV support will be available in the next update.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6">
          <Button onClick={saveCalendarConfig} disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Calendar Configuration'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
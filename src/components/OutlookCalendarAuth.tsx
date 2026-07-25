import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OutlookCalendarAuthProps {
  selectedAssistant: { id: string; business_name: string } | null;
}

interface OutlookConfig {
  outlook_calendar_enabled: boolean;
  outlook_calendar_connected: boolean;
  outlook_calendar_access_token: string;
  outlook_calendar_refresh_token: string;
  outlook_calendar_token_expires_at: string;
}

export const OutlookCalendarAuth = ({ selectedAssistant }: OutlookCalendarAuthProps) => {
  const [config, setConfig] = useState<OutlookConfig>({
    outlook_calendar_enabled: false,
    outlook_calendar_connected: false,
    outlook_calendar_access_token: "",
    outlook_calendar_refresh_token: "",
    outlook_calendar_token_expires_at: ""
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (selectedAssistant) {
      fetchOutlookConfig();
    }
  }, [selectedAssistant]);

  const fetchOutlookConfig = async () => {
    if (!selectedAssistant) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assistants')
        .select(`
          outlook_calendar_enabled,
          outlook_calendar_connected,
          outlook_calendar_access_token,
          outlook_calendar_refresh_token,
          outlook_calendar_token_expires_at
        `)
        .eq('id', selectedAssistant.id)
        .single();

      if (error) throw error;

      setConfig({
        outlook_calendar_enabled: data.outlook_calendar_enabled || false,
        outlook_calendar_connected: data.outlook_calendar_connected || false,
        outlook_calendar_access_token: data.outlook_calendar_access_token || "",
        outlook_calendar_refresh_token: data.outlook_calendar_refresh_token || "",
        outlook_calendar_token_expires_at: data.outlook_calendar_token_expires_at || ""
      });
    } catch (error) {
      console.error('Error fetching Outlook config:', error);
      toast.error('Failed to load Outlook configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveOutlookConfig = async () => {
    if (!selectedAssistant) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('assistants')
        .update({
          outlook_calendar_enabled: config.outlook_calendar_enabled,
          outlook_calendar_connected: config.outlook_calendar_connected,
          outlook_calendar_access_token: config.outlook_calendar_access_token,
          outlook_calendar_refresh_token: config.outlook_calendar_refresh_token,
          outlook_calendar_token_expires_at: config.outlook_calendar_token_expires_at
        })
        .eq('id', selectedAssistant.id);

      if (error) throw error;

      toast.success('Outlook configuration saved successfully');
    } catch (error) {
      console.error('Error saving Outlook config:', error);
      toast.error('Failed to save Outlook configuration');
    } finally {
      setSaving(false);
    }
  };

  const initiateOutlookAuth = async () => {
    if (!selectedAssistant) return;

    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('outlook-calendar-oauth', {
        body: { 
          action: 'initiate',
          assistantId: selectedAssistant.id 
        }
      });

      if (error) throw error;

      if (data.authUrl) {
        // Open popup window for OAuth
        const popup = window.open(
          data.authUrl,
          'outlook-oauth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        // Listen for OAuth completion
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            setConnecting(false);
            // Refresh config to check if connection was successful
            fetchOutlookConfig();
          }
        }, 1000);

        // Listen for message from popup
        const messageListener = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'OUTLOOK_AUTH_SUCCESS') {
            popup?.close();
            clearInterval(checkClosed);
            window.removeEventListener('message', messageListener);
            setConnecting(false);
            toast.success('Outlook Calendar connected successfully!');
            fetchOutlookConfig();
          } else if (event.data.type === 'OUTLOOK_AUTH_ERROR') {
            popup?.close();
            clearInterval(checkClosed);
            window.removeEventListener('message', messageListener);
            setConnecting(false);
            toast.error('Failed to connect Outlook Calendar');
          }
        };

        window.addEventListener('message', messageListener);
      }
    } catch (error) {
      console.error('Error initiating Outlook auth:', error);
      toast.error('Failed to initiate Outlook authentication');
      setConnecting(false);
    }
  };

  const disconnectOutlook = async () => {
    if (!selectedAssistant) return;

    try {
      const { error } = await supabase.functions.invoke('outlook-calendar-oauth', {
        body: { 
          action: 'disconnect',
          assistantId: selectedAssistant.id 
        }
      });

      if (error) throw error;

      setConfig(prev => ({
        ...prev,
        outlook_calendar_connected: false,
        outlook_calendar_access_token: "",
        outlook_calendar_refresh_token: "",
        outlook_calendar_token_expires_at: ""
      }));

      toast.success('Outlook Calendar disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting Outlook:', error);
      toast.error('Failed to disconnect Outlook Calendar');
    }
  };

  if (!selectedAssistant) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Outlook Calendar
          </CardTitle>
          <CardDescription>
            Please select an assistant to configure Outlook Calendar
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
          Outlook Calendar Integration
        </CardTitle>
        <CardDescription>
          Connect with Microsoft Outlook and Office 365 calendars
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <span>Connection Status:</span>
            {config.outlook_calendar_connected ? (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">
                <AlertCircle className="w-3 h-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
          {config.outlook_calendar_connected ? (
            <Button variant="outline" size="sm" onClick={disconnectOutlook}>
              Disconnect
            </Button>
          ) : (
            <Button size="sm" onClick={initiateOutlookAuth} disabled={connecting}>
              {connecting ? 'Connecting...' : 'Connect Outlook'}
            </Button>
          )}
        </div>

        {/* Enable/Disable Switch */}
        <div className="flex items-center space-x-2">
          <Switch
            id="outlook-calendar-enabled"
            checked={config.outlook_calendar_enabled}
            onCheckedChange={(checked) =>
              setConfig(prev => ({ ...prev, outlook_calendar_enabled: checked }))
            }
            disabled={!config.outlook_calendar_connected}
          />
          <Label htmlFor="outlook-calendar-enabled">Enable Outlook Calendar Integration</Label>
        </div>

        {/* Token Expiry Info */}
        {config.outlook_calendar_connected && config.outlook_calendar_token_expires_at && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800">Token Information</h4>
            <p className="text-sm text-blue-600 mt-1">
              Access token expires: {new Date(config.outlook_calendar_token_expires_at).toLocaleString()}
            </p>
          </div>
        )}

        {/* Setup Instructions */}
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">Setup Instructions:</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>
              Register your app in{" "}
              <a 
                href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Azure App Registration
                <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>Configure redirect URIs for OAuth flow</li>
            <li>Grant Calendar.ReadWrite permissions</li>
            <li>Click "Connect Outlook" to authenticate</li>
            <li>Enable the integration once connected</li>
          </ol>
        </div>

        {/* Feature Benefits */}
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">What you'll get:</h4>
          <ul className="text-sm text-green-600 space-y-1">
            <li>• Real-time calendar availability checking</li>
            <li>• Automatic appointment scheduling</li>
            <li>• Conflict detection and prevention</li>
            <li>• Two-way calendar synchronization</li>
            <li>• Meeting invitation management</li>
          </ul>
        </div>

        {/* Save Button */}
        <Button onClick={saveOutlookConfig} disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </CardContent>
    </Card>
  );
};
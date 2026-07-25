import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Mail,
  Unlink
} from 'lucide-react';

interface GoogleCalendarAuthProps {
  assistantId: string;
}

export const GoogleCalendarAuth: React.FC<GoogleCalendarAuthProps> = ({ assistantId }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [permission, setPermission] = useState<'read' | 'readwrite'>('readwrite');
  const { toast } = useToast();

  useEffect(() => {
    checkConnectionStatus();
  }, [assistantId]);

  const checkConnectionStatus = async () => {
    try {
      const { data: assistant, error } = await supabase
        .from('assistants')
        .select('google_calendar_connected')
        .eq('id', assistantId)
        .single();

      if (error) throw error;

      setIsConnected(assistant?.google_calendar_connected || false);
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  };

  const handleGoogleConnect = async () => {
    setLoading(true);
    try {
      // Get user's current session
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      setUserEmail(user.email || '');

      // Initiate real Google OAuth flow
      const { data, error } = await supabase.functions.invoke('google-calendar-oauth', {
        body: {
          assistantId,
          action: 'initiate',
          permission,
        }
      });

      if (error) throw error;

      if (data.success && data.authUrl) {
        // Open OAuth URL in a new window
        const authWindow = window.open(
          data.authUrl,
          'google-calendar-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        // Listen for the OAuth callback
        const messageHandler = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'GOOGLE_CALENDAR_SUCCESS') {
            setIsConnected(true);
            authWindow?.close();
            window.removeEventListener('message', messageHandler);
            
            // Notify dashboard to refresh assistant data
            window.dispatchEvent(new CustomEvent('assistant-integration-updated', {
              detail: { assistantId, provider: 'google' }
            }));
            
            toast({
              title: "Google Calendar Connected!",
              description: "Your calendar has been successfully connected for availability sync.",
            });
          } else if (event.data.type === 'GOOGLE_CALENDAR_ERROR') {
            authWindow?.close();
            window.removeEventListener('message', messageHandler);
            throw new Error(event.data.error || 'OAuth failed');
          }
        };

        window.addEventListener('message', messageHandler);

        // Handle window closed manually
        const checkClosed = setInterval(() => {
          if (authWindow?.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
            setLoading(false);
          }
        }, 1000);
      }

    } catch (error: any) {
      console.error('Error connecting Google Calendar:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect Google Calendar. Please try again.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('assistants')
        .update({
          google_calendar_connected: false,
          google_calendar_access_token: null,
          google_calendar_refresh_token: null,
          google_calendar_token_expires_at: null
        })
        .eq('id', assistantId);

      if (error) throw error;

      setIsConnected(false);
      setUserEmail('');
      
      toast({
        title: "Google Calendar Disconnected",
        description: "Your calendar has been disconnected successfully.",
      });

      // Notify dashboard to refresh assistant data
      window.dispatchEvent(new CustomEvent('assistant-integration-updated', {
        detail: { assistantId, provider: 'google' }
      }));

    } catch (error: any) {
      console.error('Error disconnecting Google Calendar:', error);
      toast({
        title: "Disconnection Failed",
        description: error.message || "Failed to disconnect Google Calendar. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertDescription>
          Connect your Google Calendar to automatically sync your availability and prevent double bookings.
          Your assistant will check your calendar before confirming appointments.
        </AlertDescription>
      </Alert>

      {!isConnected ? (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="w-12 h-12 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-blue-500" />
            </div>
            <CardTitle>Connect Google Calendar</CardTitle>
            <p className="text-muted-foreground">
              Sync your calendar for real-time availability
            </p>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                ✓ Automatic availability sync<br/>
                ✓ Prevent double bookings<br/>
                ✓ One-click setup with Gmail
              </p>
            </div>

            <div className="text-left space-y-2">
              <h4 className="font-medium">Permission level</h4>
              <RadioGroup
                value={permission}
                onValueChange={(val) => setPermission(val as 'read' | 'readwrite')}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <div className="flex items-start gap-2 rounded-md border p-3">
                  <RadioGroupItem value="read" id="perm-read" />
                  <Label htmlFor="perm-read" className="cursor-pointer">
                    <div className="font-medium">Availability only</div>
                    <div className="text-xs text-muted-foreground">Read busy/free time to avoid conflicts</div>
                  </Label>
                </div>
                <div className="flex items-start gap-2 rounded-md border p-3">
                  <RadioGroupItem value="readwrite" id="perm-rw" />
                  <Label htmlFor="perm-rw" className="cursor-pointer">
                    <div className="font-medium">Availability + Create events</div>
                    <div className="text-xs text-muted-foreground">Also add bookings to your calendar</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <Button 
              onClick={handleGoogleConnect}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Connect with Gmail
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground">
              You'll be redirected to Google to authorize the selected permissions. By connecting, you agree to our
              <a className="underline ml-1" href="/privacy-policy" target="_blank" rel="noreferrer">Privacy Policy</a> and
              <a className="underline ml-1" href="/terms-of-service" target="_blank" rel="noreferrer">Terms</a>.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Google Calendar Connected
              <Badge variant="default" className="ml-auto">
                Active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {userEmail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                Connected as: {userEmail}
              </div>
            )}
            
            <div className="space-y-2">
              <h4 className="font-medium">Active Features:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  Real-time availability sync
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  Automatic conflict prevention
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  Calendar event creation
                </li>
              </ul>
            </div>

            <Button 
              variant="outline"
              onClick={handleDisconnect}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <Unlink className="w-4 h-4 mr-2" />
                  Disconnect Google Calendar
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CalendlyEvent {
  uri: string;
  name: string;
  active: boolean;
  booking_url: string;
  duration: number;
}

interface CalendlyIntegrationProps {
  assistantId?: string;
}

export const CalendlyIntegration: React.FC<CalendlyIntegrationProps> = ({ assistantId }) => {
  const { user } = useAuth();
  const [calendlyToken, setCalendlyToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [eventTypes, setEventTypes] = useState<CalendlyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [eventTypesError, setEventTypesError] = useState<string | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [assistant, setAssistant] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadCalendlyConfig();
      if (assistantId) {
        loadAssistantConfig();
      }
    }
  }, [user, assistantId]);

  const loadCalendlyConfig = async () => {
    try {
      // Prefer assistant-scoped token
      if (assistantId) {
        const { data: aData, error: aErr } = await supabase
          .from('assistants')
          .select('calendly_api_token, calendly_event_type_uri, calendly_event_type_name')
          .eq('id', assistantId)
          .single();
        if (aErr) throw aErr;
        if (aData?.calendly_api_token) {
          setIsConnected(true);
          setConnectionError(null);
          await loadEventTypes();
          return;
        } else {
          setIsConnected(false);
          setConnectionError(null);
        }
      }

      // Only use user-level token when no assistant is specified (backward compatibility)
      if (!assistantId) {
        const { data, error } = await supabase
          .from('configs')
          .select('calendly_api_token')
          .eq('user_id', user?.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data?.calendly_api_token) {
          setIsConnected(true);
          setConnectionError(null);
        }
      }
    } catch (error: any) {
      console.error('Error loading Calendly config:', error);
    }
  };

  const loadAssistantConfig = async () => {
    if (!assistantId) return;

    try {
      const { data, error } = await supabase
        .from('assistants')
        .select('calendly_event_type_uri, calendly_event_type_name')
        .eq('id', assistantId)
        .single();

      if (error) throw error;

      if (data) {
        setAssistant(data);
        setSelectedEventType(data.calendly_event_type_uri || '');
      }
    } catch (error: any) {
      console.error('Error loading assistant config:', error);
    }
  };

  const loadEventTypes = async () => {
    if (!isConnected || !assistantId) return;

    setIsLoading(true);
    setEventTypesError(null);
    try {
      const { data, error } = await supabase.functions.invoke('calendly-integration', {
        body: {
          assistantId: assistantId,
          action: 'get_event_types'
        }
      });

      if (error) throw error;

      if (data.success && data.event_types) {
        setEventTypes(data.event_types);
      }
    } catch (error: any) {
      console.error('Error loading event types:', error);
      setEventTypesError('Could not load Calendly event types. You can retry with the Test button.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveCalendlyToken = async () => {
    if (!calendlyToken || !user) return;

    setIsLoading(true);
    try {
      if (assistantId) {
        const { error } = await supabase
          .from('assistants')
          .update({ 
            calendly_api_token: calendlyToken,
            calendly_connected: true
          })
          .eq('id', assistantId);
        if (error) throw error;
      } else {
        // Backward-compat: store at user-level if no assistantId
        const { data: existingConfig } = await supabase
          .from('configs')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (existingConfig) {
          const { error } = await supabase
            .from('configs')
            .update({ calendly_api_token: calendlyToken })
            .eq('user_id', user.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('configs')
            .insert({ user_id: user.id, calendly_api_token: calendlyToken });
          if (error) throw error;
        }
      }

      setIsConnected(true);
      setConnectionError(null);
      setCalendlyToken('');
      if (assistantId) {
        await loadEventTypes();
      }
      toast.success('Calendly API token saved successfully');

      // Notify dashboard to refresh integration status
      window.dispatchEvent(new CustomEvent('assistant-integration-updated', {
        detail: { assistantId, provider: 'calendly' }
      }));
    } catch (error: any) {
      console.error('Error saving Calendly token:', error);
      toast.error('Failed to save Calendly token');
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    if (!assistantId) return;

    setIsTestingConnection(true);
    setConnectionError(null);
    try {
      const { data, error } = await supabase.functions.invoke('calendly-integration', {
        body: {
          assistantId: assistantId,
          action: 'get_event_types'
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Calendly API connection is working correctly');
        setEventTypes(data.event_types || []);
      } else {
        throw new Error(data.error || 'Connection failed');
      }
    } catch (error: any) {
      console.error('Error testing connection:', error);
      setConnectionError(error.message);
      toast.error('Connection failed. Please verify your token.');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const saveEventTypeSelection = async (eventTypeUri: string, eventTypeName: string) => {
    if (!assistantId) return;

    try {
      const { error } = await supabase
        .from('assistants')
        .update({
          calendly_event_type_uri: eventTypeUri,
          calendly_event_type_name: eventTypeName
        })
        .eq('id', assistantId);

      if (error) throw error;

      setSelectedEventType(eventTypeUri);
      toast.success('Default event type saved for this assistant');
    } catch (error: any) {
      console.error('Error saving event type selection:', error);
      toast.error('Failed to save event type selection');
    }
  };

  const disconnectCalendly = async () => {
    if (!user) return;

    try {
      if (assistantId) {
        const { error } = await supabase
          .from('assistants')
          .update({ calendly_api_token: null, calendly_connected: false })
          .eq('id', assistantId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('configs')
          .update({ calendly_api_token: null })
          .eq('user_id', user.id);
        if (error) throw error;
      }

      setCalendlyToken('');
      setIsConnected(false);
      setEventTypes([]);
      setConnectionError(null);
      
      toast.success('Calendly disconnected successfully');
      
      // Notify dashboard to refresh integration status
      window.dispatchEvent(new CustomEvent('assistant-integration-updated', {
        detail: { assistantId, provider: 'calendly' }
      }));
    } catch (error: any) {
      console.error('Error disconnecting Calendly:', error);
      toast.error('Failed to disconnect Calendly');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Calendly Integration
            {isConnected && <Badge variant="default">Connected</Badge>}
          </CardTitle>
          <CardDescription>
            Connect your Calendly account to enable advanced booking features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Get your Calendly API token from{' '}
                  <a
                    href="https://calendly.com/integrations/api_webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Calendly's API settings <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="calendly-token">Calendly API Token</Label>
                <Input
                  id="calendly-token"
                  type="password"
                  placeholder="Enter your Calendly API token"
                  value={calendlyToken}
                  onChange={(e) => setCalendlyToken(e.target.value)}
                />
              </div>

              {connectionError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{connectionError}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={saveCalendlyToken}
                  disabled={!calendlyToken || isLoading}
                  className="flex-1"
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isLoading ? 'Connecting...' : 'Connect Calendly'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={testConnection}
                  disabled={isTestingConnection || !assistantId}
                >
                  {isTestingConnection && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isTestingConnection ? 'Testing...' : 'Test'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900 dark:text-green-100">
                    Calendly Connected
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectCalendly}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Disconnect
                </Button>
              </div>

              {assistantId && isLoading && (
                <div className="flex items-center gap-2 p-4 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading event types...
                </div>
              )}

              {assistantId && eventTypesError && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{eventTypesError}</AlertDescription>
                </Alert>
              )}

              {eventTypes.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium">Available Event Types:</h4>
                  
                  {assistantId && (
                    <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                      <Label>Default Event Type for this Assistant</Label>
                      <Select 
                        value={selectedEventType} 
                        onValueChange={(value) => {
                          const eventType = eventTypes.find(e => e.uri === value);
                          if (eventType) {
                            saveEventTypeSelection(value, eventType.name);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select default event type" />
                        </SelectTrigger>
                        <SelectContent>
                          {eventTypes.filter(e => e.active).map((eventType) => (
                            <SelectItem key={eventType.uri} value={eventType.uri}>
                              {eventType.name} ({eventType.duration} min)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {assistant?.calendly_event_type_name && (
                        <div className="text-sm text-muted-foreground">
                          Current default: {assistant.calendly_event_type_name}
                        </div>
                      )}
                    </div>
                  )}

                  {eventTypes.map((eventType) => (
                    <div key={eventType.uri} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium flex items-center gap-2">
                          {eventType.name}
                          {selectedEventType === eventType.uri && (
                            <Badge variant="default" className="text-xs">Default</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Duration: {eventType.duration} minutes
                        </div>
                        <Badge variant={eventType.active ? "default" : "secondary"}>
                          {eventType.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(eventType.booking_url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Book
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
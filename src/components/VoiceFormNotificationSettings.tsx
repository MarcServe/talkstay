import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, Webhook, MessageSquare, Send, Plus, X, Info } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface NotificationSettings {
  email?: {
    enabled: boolean;
    recipients: string[];
    sendOnSubmit: boolean;
    includeTranscript: boolean;
  };
  webhook?: {
    enabled: boolean;
    url: string;
    method: string;
    headers: Record<string, string>;
    includeTranscript: boolean;
  };
  slack?: {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
    mentionUsers: string[];
  };
  discord?: {
    enabled: boolean;
    webhookUrl: string;
    mentionRoles: string[];
  };
  realtime?: {
    enabled: boolean;
    browserNotifications: boolean;
  };
}

interface VoiceFormNotificationSettingsProps {
  formId: string;
  currentSettings: NotificationSettings;
  onUpdate: () => void;
}

export const VoiceFormNotificationSettings: React.FC<VoiceFormNotificationSettingsProps> = ({
  formId,
  currentSettings,
  onUpdate
}) => {
  const [settings, setSettings] = useState<NotificationSettings>(currentSettings);
  const [saving, setSaving] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('voice_forms')
        .update({ notification_settings: settings })
        .eq('id', formId);

      if (error) throw error;

      toast.success('Notification settings saved!');
      onUpdate();
    } catch (error: any) {
      console.error('Error saving notification settings:', error);
      toast.error('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const addRecipient = () => {
    if (!newRecipient.trim()) return;
    if (!settings.email?.recipients) {
      setSettings({
        ...settings,
        email: { ...settings.email, recipients: [newRecipient], enabled: true, sendOnSubmit: true, includeTranscript: true }
      });
    } else {
      setSettings({
        ...settings,
        email: {
          ...settings.email,
          recipients: [...settings.email.recipients, newRecipient]
        }
      });
    }
    setNewRecipient('');
  };

  const removeRecipient = (index: number) => {
    if (!settings.email?.recipients) return;
    const newRecipients = settings.email.recipients.filter((_, i) => i !== index);
    setSettings({
      ...settings,
      email: { ...settings.email, recipients: newRecipients }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          <div>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>
              Configure real-time alerts for new form submissions
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="email" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="email" className="flex items-center gap-1">
              <Mail className="w-4 h-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="webhook" className="flex items-center gap-1">
              <Webhook className="w-4 h-4" />
              Webhook
            </TabsTrigger>
            <TabsTrigger value="slack" className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              Slack
            </TabsTrigger>
            <TabsTrigger value="discord" className="flex items-center gap-1">
              <Send className="w-4 h-4" />
              Discord
            </TabsTrigger>
            <TabsTrigger value="realtime" className="flex items-center gap-1">
              <Bell className="w-4 h-4" />
              Browser
            </TabsTrigger>
          </TabsList>

          {/* Email Notifications */}
          <TabsContent value="email" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="email-enabled">Enable Email Notifications</Label>
                {settings.email?.enabled && <Badge variant="default">Active</Badge>}
              </div>
              <Switch
                id="email-enabled"
                checked={settings.email?.enabled || false}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    email: { ...settings.email, enabled: checked, recipients: settings.email?.recipients || [], sendOnSubmit: true, includeTranscript: true }
                  })
                }
              />
            </div>

            {settings.email?.enabled && (
              <>
                <div className="space-y-2">
                  <Label>Email Recipients</Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={newRecipient}
                      onChange={(e) => setNewRecipient(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                    />
                    <Button onClick={addRecipient} size="icon">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {settings.email?.recipients?.map((email, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {email}
                        <button onClick={() => removeRecipient(index)} className="ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="email-transcript">Include Conversation Transcript</Label>
                  <Switch
                    id="email-transcript"
                    checked={settings.email?.includeTranscript || false}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        email: { ...settings.email, includeTranscript: checked }
                      })
                    }
                  />
                </div>
              </>
            )}
          </TabsContent>

          {/* Webhook Notifications */}
          <TabsContent value="webhook" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="webhook-enabled">Enable Webhook</Label>
                {settings.webhook?.enabled && <Badge variant="default">Active</Badge>}
              </div>
              <Switch
                id="webhook-enabled"
                checked={settings.webhook?.enabled || false}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    webhook: { ...settings.webhook, enabled: checked, url: settings.webhook?.url || '', method: 'POST', headers: {}, includeTranscript: false }
                  })
                }
              />
            </div>

            {settings.webhook?.enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    type="url"
                    placeholder="https://your-api.com/webhook"
                    value={settings.webhook?.url || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        webhook: { ...settings.webhook, url: e.target.value }
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="webhook-transcript">Include Conversation Transcript</Label>
                  <Switch
                    id="webhook-transcript"
                    checked={settings.webhook?.includeTranscript || false}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        webhook: { ...settings.webhook, includeTranscript: checked }
                      })
                    }
                  />
                </div>

                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    Webhook will receive POST requests with form submission data
                  </AlertDescription>
                </Alert>
              </>
            )}
          </TabsContent>

          {/* Slack Notifications */}
          <TabsContent value="slack" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="slack-enabled">Enable Slack Notifications</Label>
                {settings.slack?.enabled && <Badge variant="default">Active</Badge>}
              </div>
              <Switch
                id="slack-enabled"
                checked={settings.slack?.enabled || false}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    slack: { ...settings.slack, enabled: checked, webhookUrl: settings.slack?.webhookUrl || '', channel: '', mentionUsers: [] }
                  })
                }
              />
            </div>

            {settings.slack?.enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="slack-url">Slack Webhook URL</Label>
                  <Input
                    id="slack-url"
                    type="url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={settings.slack?.webhookUrl || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        slack: { ...settings.slack, webhookUrl: e.target.value }
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slack-channel">Channel (optional)</Label>
                  <Input
                    id="slack-channel"
                    placeholder="#general"
                    value={settings.slack?.channel || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        slack: { ...settings.slack, channel: e.target.value }
                      })
                    }
                  />
                </div>

                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    Create a webhook at{' '}
                    <a
                      href="https://api.slack.com/messaging/webhooks"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Slack API
                    </a>
                  </AlertDescription>
                </Alert>
              </>
            )}
          </TabsContent>

          {/* Discord Notifications */}
          <TabsContent value="discord" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="discord-enabled">Enable Discord Notifications</Label>
                {settings.discord?.enabled && <Badge variant="default">Active</Badge>}
              </div>
              <Switch
                id="discord-enabled"
                checked={settings.discord?.enabled || false}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    discord: { ...settings.discord, enabled: checked, webhookUrl: settings.discord?.webhookUrl || '', mentionRoles: [] }
                  })
                }
              />
            </div>

            {settings.discord?.enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="discord-url">Discord Webhook URL</Label>
                  <Input
                    id="discord-url"
                    type="url"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={settings.discord?.webhookUrl || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        discord: { ...settings.discord, webhookUrl: e.target.value }
                      })
                    }
                  />
                </div>

                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    Create a webhook in Discord Server Settings → Integrations → Webhooks
                  </AlertDescription>
                </Alert>
              </>
            )}
          </TabsContent>

          {/* Real-time Browser Notifications */}
          <TabsContent value="realtime" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="realtime-enabled">Enable Real-time Updates</Label>
                {settings.realtime?.enabled && <Badge variant="default">Active</Badge>}
              </div>
              <Switch
                id="realtime-enabled"
                checked={settings.realtime?.enabled !== false}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    realtime: { ...settings.realtime, enabled: checked, browserNotifications: settings.realtime?.browserNotifications !== false }
                  })
                }
              />
            </div>

            {settings.realtime?.enabled && (
              <div className="flex items-center justify-between">
                <Label htmlFor="browser-notifications">Browser Notifications</Label>
                <Switch
                  id="browser-notifications"
                  checked={settings.realtime?.browserNotifications !== false}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      realtime: { ...settings.realtime, browserNotifications: checked }
                    })
                  }
                />
              </div>
            )}

            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                Real-time updates will appear in your dashboard when new forms are submitted
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

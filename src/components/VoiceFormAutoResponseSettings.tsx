import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Save, Loader2 } from 'lucide-react';

interface AutoResponseConfig {
  enabled: boolean;
  subject: string;
  message: string;
  includeTranscript: boolean;
}

interface VoiceFormAutoResponseSettingsProps {
  formId: string;
  onSave?: () => void;
}

export const VoiceFormAutoResponseSettings: React.FC<VoiceFormAutoResponseSettingsProps> = ({
  formId,
  onSave
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AutoResponseConfig>({
    enabled: true,
    subject: 'Thank you for your submission!',
    message: 'We have received your information and will get back to you shortly. One of our team members will contact you soon.',
    includeTranscript: false
  });

  useEffect(() => {
    loadConfig();
  }, [formId]);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('voice_forms')
        .select('auto_response_config')
        .eq('id', formId)
        .single();

      if (error) throw error;

      if (data?.auto_response_config) {
        setConfig({
          enabled: data.auto_response_config.enabled ?? true,
          subject: data.auto_response_config.subject || 'Thank you for your submission!',
          message: data.auto_response_config.message || 'We have received your information and will get back to you shortly.',
          includeTranscript: data.auto_response_config.includeTranscript ?? false
        });
      }
    } catch (error) {
      console.error('Error loading auto-response config:', error);
      toast.error('Failed to load auto-response settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('voice_forms')
        .update({
          auto_response_config: config,
          updated_at: new Date().toISOString()
        })
        .eq('id', formId);

      if (error) throw error;

      toast.success('Auto-response settings saved successfully');
      onSave?.();
    } catch (error) {
      console.error('Error saving auto-response config:', error);
      toast.error('Failed to save auto-response settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <CardTitle>Auto-Response Email</CardTitle>
        </div>
        <CardDescription>
          Automatically send a confirmation email to users after they submit the form
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-response-enabled">Enable Auto-Response</Label>
            <p className="text-sm text-muted-foreground">
              Send confirmation emails to users automatically
            </p>
          </div>
          <Switch
            id="auto-response-enabled"
            checked={config.enabled}
            onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
          />
        </div>

        {config.enabled && (
          <>
            {/* Subject Line */}
            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                value={config.subject}
                onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                placeholder="Thank you for your submission!"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                {config.subject.length}/100 characters
              </p>
            </div>

            {/* Message Body */}
            <div className="space-y-2">
              <Label htmlFor="message">Email Message</Label>
              <Textarea
                id="message"
                value={config.message}
                onChange={(e) => setConfig({ ...config, message: e.target.value })}
                placeholder="We have received your information and will get back to you shortly."
                rows={6}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {config.message.length}/500 characters
              </p>
            </div>

            {/* Include Transcript Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="include-transcript">Include Conversation Transcript</Label>
                <p className="text-sm text-muted-foreground">
                  Attach the full conversation transcript to the email
                </p>
              </div>
              <Switch
                id="include-transcript"
                checked={config.includeTranscript}
                onCheckedChange={(includeTranscript) => 
                  setConfig({ ...config, includeTranscript })
                }
              />
            </div>

            {/* Preview */}
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <p className="text-sm font-medium">Email Preview</p>
              <div className="space-y-1 text-sm">
                <p><strong>Subject:</strong> {config.subject}</p>
                <p><strong>Message:</strong></p>
                <p className="whitespace-pre-wrap text-muted-foreground">{config.message}</p>
                {config.includeTranscript && (
                  <p className="text-xs text-muted-foreground italic mt-2">
                    + Conversation transcript will be included
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={saving || !config.enabled || !config.subject || !config.message}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Auto-Response Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

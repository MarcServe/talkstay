import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Webhook, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

interface WebhookConfig {
  enabled: boolean;
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  includeTranscript: boolean;
}

interface VoiceFormWebhookConfigProps {
  config: WebhookConfig;
  onChange: (config: WebhookConfig) => void;
}

export const VoiceFormWebhookConfig: React.FC<VoiceFormWebhookConfigProps> = ({
  config,
  onChange,
}) => {
  const updateConfig = (updates: Partial<WebhookConfig>) => {
    onChange({ ...config, ...updates });
  };

  const handleHeadersChange = (value: string) => {
    try {
      const parsed = value ? JSON.parse(value) : {};
      updateConfig({ headers: parsed });
    } catch (e) {
      // Invalid JSON, don't update
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          <CardTitle>Webhook Integration</CardTitle>
        </div>
        <CardDescription>
          Send form submissions to external services like Zapier, Make, Slack, or custom endpoints
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="webhook-enabled">Enable Webhook</Label>
            <p className="text-sm text-muted-foreground">
              Trigger a webhook when forms are submitted
            </p>
          </div>
          <Switch
            id="webhook-enabled"
            checked={config.enabled}
            onCheckedChange={(enabled) => updateConfig({ enabled })}
          />
        </div>

        {config.enabled && (
          <>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                The webhook will receive a POST request with the form submission data, including
                collected fields, timestamps, and optionally the conversation transcript.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL*</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                value={config.url}
                onChange={(e) => updateConfig({ url: e.target.value })}
                required={config.enabled}
              />
              <p className="text-xs text-muted-foreground">
                The endpoint that will receive form submissions
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-method">HTTP Method</Label>
              <Select
                value={config.method}
                onValueChange={(method: 'POST' | 'PUT') => updateConfig({ method })}
              >
                <SelectTrigger id="webhook-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-headers">Custom Headers (JSON)</Label>
              <Textarea
                id="webhook-headers"
                placeholder='{"Authorization": "Bearer token", "X-Custom": "value"}'
                value={config.headers ? JSON.stringify(config.headers, null, 2) : ''}
                onChange={(e) => handleHeadersChange(e.target.value)}
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Optional headers to include with webhook requests (e.g., authentication tokens)
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="include-transcript">Include Conversation Transcript</Label>
                <p className="text-sm text-muted-foreground">
                  Send full conversation history with the webhook
                </p>
              </div>
              <Switch
                id="include-transcript"
                checked={config.includeTranscript}
                onCheckedChange={(includeTranscript) => updateConfig({ includeTranscript })}
              />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Webhook Payload Example:</strong>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
{`{
  "formId": "uuid",
  "formName": "Contact Form",
  "submissionId": "uuid",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "completionTime": 45,
  "transcript": [...] // if enabled
}`}
                </pre>
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
};

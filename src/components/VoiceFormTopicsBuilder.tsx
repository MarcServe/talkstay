import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, GripVertical, ArrowLeft, Building2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { VoiceFormTemplateSelector } from './VoiceFormTemplateSelector';
import { VoiceFormTemplate } from '@/types/voiceForm';
import { VoiceFormWebhookConfig } from './VoiceFormWebhookConfig';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MAX_TOTAL_FIELDS = 10;

interface Topic {
  id: string;
  name: string;
  aiInstruction: string;
  dataPoints: string[];
  required: boolean;
}

interface VoiceFormTopicsBuilderProps {
  userId: string;
  existingForm?: any;
  defaultAssistantId?: string;
  onSaved: () => void;
  onCancel: () => void;
}

export const VoiceFormTopicsBuilder: React.FC<VoiceFormTopicsBuilderProps> = ({
  userId,
  existingForm,
  defaultAssistantId,
  onSaved,
  onCancel,
}) => {
  const [showTemplateSelector, setShowTemplateSelector] = useState(!existingForm);
  const [assistants, setAssistants] = useState<any[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState(defaultAssistantId || '');
  const [businessName, setBusinessName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [description, setDescription] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [topics, setTopics] = useState<Topic[]>([
    {
      id: 'contact_info',
      name: 'Contact Information',
      aiInstruction: 'Get their name, email, and phone naturally in conversation',
      dataPoints: ['name', 'email', 'phone'],
      required: true,
    },
  ]);
  const [webhookConfig, setWebhookConfig] = useState({
    enabled: false,
    url: '',
    method: 'POST' as 'POST' | 'PUT',
    headers: {} as Record<string, string> | undefined,
    includeTranscript: false,
  });
  const [autoResponse, setAutoResponse] = useState({
    enabled: false,
    subject: 'Thank you for your submission',
    message: 'We have received your information and will get back to you soon.',
    includeTranscript: true,
  });
  const [newDataPoint, setNewDataPoint] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleTemplateSelect = (template: VoiceFormTemplate) => {
    setFormName(template.name);
    setDescription(template.description);
    
    // Convert template fields to topics format
    const convertedTopics: Topic[] = [{
      id: 'template_topic',
      name: `${template.name} Fields`,
      aiInstruction: `Collect information for ${template.name.toLowerCase()}`,
      dataPoints: template.fields.map(f => f.name),
      required: true
    }];
    
    setTopics(convertedTopics);
    setShowTemplateSelector(false);
  };

  const handleStartBlank = () => {
    setShowTemplateSelector(false);
  };

  // Load user's assistants
  useEffect(() => {
    const loadAssistants = async () => {
      const { data, error } = await supabase
        .from('assistants')
        .select('id, business_name, website_url, booking_notification_email')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading assistants:', error);
        return;
      }

      setAssistants(data || []);
    };

    loadAssistants();
  }, [userId]);

  // Handle assistant selection
  useEffect(() => {
    if (selectedAssistantId && selectedAssistantId !== 'new') {
      const assistant = assistants.find(a => a.id === selectedAssistantId);
      if (assistant) {
        setBusinessName(assistant.business_name || '');
        setWebsiteUrl(assistant.website_url || '');
        setNotificationEmail(assistant.booking_notification_email || '');
      }
    } else if (selectedAssistantId === 'new') {
      setBusinessName('');
      setWebsiteUrl('');
    }
  }, [selectedAssistantId, assistants]);

  // Load existing form data if editing
  useEffect(() => {
    if (existingForm) {
      setSelectedAssistantId(existingForm.assistant_id || '');
      setBusinessName(existingForm.business_name || '');
      setWebsiteUrl(existingForm.website_url || '');
      setFormName(existingForm.form_name || '');
      setFormSlug(existingForm.form_slug || '');
      setDescription(existingForm.description || '');
      setNotificationEmail(existingForm.notification_email || '');
      setTopics(existingForm.topics || []);
      
      if (existingForm.webhook_config) {
        setWebhookConfig({
          enabled: existingForm.webhook_config.enabled || false,
          url: existingForm.webhook_config.url || '',
          method: existingForm.webhook_config.method || 'POST',
          headers: existingForm.webhook_config.headers || {},
          includeTranscript: existingForm.webhook_config.includeTranscript || false,
        });
      }
      
      if (existingForm.auto_response_config) {
        setAutoResponse({
          enabled: existingForm.auto_response_config.enabled || false,
          subject: existingForm.auto_response_config.subject || 'Thank you for your submission',
          message: existingForm.auto_response_config.message || 'We have received your information and will get back to you soon.',
          includeTranscript: existingForm.auto_response_config.includeTranscript !== false,
        });
      }
    }
  }, [existingForm]);

  // Auto-generate slug from form name with unique suffix
  useEffect(() => {
    if (!existingForm && formName) {
      const baseSlug = formName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const uniqueSuffix = Date.now().toString(36).slice(-4);
      setFormSlug(`${baseSlug}-${uniqueSuffix}`);
    }
  }, [formName, existingForm]);

  const addTopic = () => {
    const newTopic: Topic = {
      id: `topic_${Date.now()}`,
      name: 'New Topic',
      aiInstruction: '',
      dataPoints: [],
      required: false,
    };
    setTopics([...topics, newTopic]);
  };

  const updateTopic = (topicId: string, updates: Partial<Topic>) => {
    setTopics(
      topics.map((topic) =>
        topic.id === topicId ? { ...topic, ...updates } : topic
      )
    );
  };

  const removeTopic = (topicId: string) => {
    setTopics(topics.filter((topic) => topic.id !== topicId));
  };

  const addDataPointToTopic = (topicId: string, dataPoint: string) => {
    if (!dataPoint.trim()) return;

    // Count total data points across all topics
    const totalDataPoints = topics.reduce((count, t) => count + t.dataPoints.length, 0);
    
    if (totalDataPoints >= MAX_TOTAL_FIELDS) {
      toast({
        title: 'Maximum fields reached',
        description: `Voice forms are limited to ${MAX_TOTAL_FIELDS} total fields for optimal conversation flow.`,
        variant: 'destructive',
      });
      return;
    }

    const topic = topics.find((t) => t.id === topicId);
    if (!topic) return;

    if (topic.dataPoints.includes(dataPoint)) {
      toast({
        title: 'Already exists',
        description: 'This data point already exists in this topic',
        variant: 'destructive',
      });
      return;
    }

    updateTopic(topicId, {
      dataPoints: [...topic.dataPoints, dataPoint],
    });
  };

  const removeDataPoint = (topicId: string, dataPoint: string) => {
    const topic = topics.find((t) => t.id === topicId);
    if (!topic) return;

    updateTopic(topicId, {
      dataPoints: topic.dataPoints.filter((dp) => dp !== dataPoint),
    });
  };

  const validateForm = (): boolean => {
    if (!formName.trim()) {
      toast({
        title: 'Form name required',
        description: 'Please enter a form name',
        variant: 'destructive',
      });
      return false;
    }

    if (!formSlug.trim()) {
      toast({
        title: 'Form slug required',
        description: 'Please enter a form slug',
        variant: 'destructive',
      });
      return false;
    }

    if (!notificationEmail.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter a notification email',
        variant: 'destructive',
      });
      return false;
    }

    if (topics.length === 0) {
      toast({
        title: 'Topics required',
        description: 'Please add at least one topic',
        variant: 'destructive',
      });
      return false;
    }

    // Validate total field count
    const totalDataPoints = topics.reduce((count, t) => count + t.dataPoints.length, 0);
    if (totalDataPoints > MAX_TOTAL_FIELDS) {
      toast({
        title: 'Too many fields',
        description: `Voice forms are limited to ${MAX_TOTAL_FIELDS} total fields. You currently have ${totalDataPoints}.`,
        variant: 'destructive',
      });
      return false;
    }

    // Validate webhook config if enabled
    if (webhookConfig.enabled && !webhookConfig.url.trim()) {
      toast({
        title: 'Webhook URL required',
        description: 'Please enter a webhook URL or disable webhook integration',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const formData = {
        user_id: userId,
        assistant_id: selectedAssistantId && selectedAssistantId !== 'new' ? selectedAssistantId : null,
        business_name: businessName,
        website_url: websiteUrl,
        form_name: formName,
        form_slug: formSlug,
        description: description || null,
        topics: topics,
        notification_email: notificationEmail,
        webhook_config: webhookConfig.enabled ? webhookConfig : null,
        auto_response_config: autoResponse.enabled ? autoResponse : null,
        is_active: true,
      };

      if (existingForm) {
        // Update existing form
        const { error } = await supabase
          .from('voice_forms')
          .update(formData)
          .eq('id', existingForm.id);

        if (error) throw error;

        toast({
          title: 'Form updated',
          description: 'Voice form has been updated successfully',
        });
      } else {
        // Create new form
        const { error } = await supabase
          .from('voice_forms')
          .insert(formData);

        if (error) throw error;

        toast({
          title: 'Form created',
          description: 'Voice form has been created successfully',
        });
      }

      onSaved();
    } catch (error: any) {
      console.error('Error saving form:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save form',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Show template selector for new forms
  if (showTemplateSelector) {
    return (
      <div className="space-y-4">
        <Button onClick={onCancel} variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <VoiceFormTemplateSelector
          onSelectTemplate={handleTemplateSelect}
          onStartBlank={handleStartBlank}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!existingForm && (
        <Button onClick={() => setShowTemplateSelector(true)} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Templates
        </Button>
      )}
      {/* Assistant Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Link to Business
          </CardTitle>
          <CardDescription>
            Connect this form to an existing assistant or create for a new business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assistant-select">Select Assistant</Label>
            <Select value={selectedAssistantId} onValueChange={setSelectedAssistantId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an assistant or create new business" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Create for New Business</SelectItem>
                {assistants.map((assistant) => (
                  <SelectItem key={assistant.id} value={assistant.id}>
                    {assistant.business_name} - {assistant.website_url}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAssistantId === 'new' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="business-name">Business Name *</Label>
                <Input
                  id="business-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your Business Name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website-url">Website URL *</Label>
                <Input
                  id="website-url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://yourbusiness.com"
                />
              </div>
            </>
          )}

          {selectedAssistantId && selectedAssistantId !== 'new' && (
            <div className="bg-muted p-3 rounded-lg space-y-1">
              <p className="text-sm font-medium">Selected Business:</p>
              <p className="text-sm text-muted-foreground">{businessName}</p>
              <p className="text-xs text-muted-foreground">{websiteUrl}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Form Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="form-name">Form Name *</Label>
            <Input
              id="form-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Contact Form, Project Inquiry, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="form-slug">Form URL Slug *</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/form/</span>
              <Input
                id="form-slug"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder="contact-us"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This will be your form URL: {window.location.origin}/form/{formSlug || 'your-slug'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this form collects"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notification-email">Notification Email *</Label>
            <Input
              id="notification-email"
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder="you@business.com"
            />
            <p className="text-xs text-muted-foreground">
              Form submissions will be sent to this email
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Topics Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Conversation Topics</CardTitle>
              <CardDescription>
                Define what information to collect through natural conversation
                <span className="block text-xs mt-1">
                  {topics.reduce((count, t) => count + t.dataPoints.length, 0)}/{MAX_TOTAL_FIELDS} fields used
                </span>
              </CardDescription>
            </div>
            <Button onClick={addTopic} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Topic
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {topics.map((topic, index) => (
            <Card key={topic.id}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1">
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2">
                        <Input
                          value={topic.name}
                          onChange={(e) =>
                            updateTopic(topic.id, { name: e.target.value })
                          }
                          placeholder="Topic name"
                          className="font-medium"
                        />
                        <Switch
                          checked={topic.required}
                          onCheckedChange={(checked) =>
                            updateTopic(topic.id, { required: checked })
                          }
                        />
                        <Label className="text-sm whitespace-nowrap">Required</Label>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">AI Instruction</Label>
                        <Textarea
                          value={topic.aiInstruction}
                          onChange={(e) =>
                            updateTopic(topic.id, { aiInstruction: e.target.value })
                          }
                          placeholder="How should the AI ask about this topic?"
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Data Points to Extract</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="e.g., budget, timeline, projectType"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addDataPointToTopic(topic.id, e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                              addDataPointToTopic(topic.id, input.value);
                              input.value = '';
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {topic.dataPoints.map((dp) => (
                            <Badge key={dp} variant="secondary">
                              {dp}
                              <button
                                onClick={() => removeDataPoint(topic.id, dp)}
                                className="ml-2 hover:text-destructive"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTopic(topic.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {topics.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No topics yet. Add your first topic to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook Integration */}
      <VoiceFormWebhookConfig 
        config={{
          enabled: webhookConfig.enabled,
          url: webhookConfig.url,
          method: webhookConfig.method,
          headers: webhookConfig.headers,
          includeTranscript: webhookConfig.includeTranscript,
        }}
        onChange={(config) => setWebhookConfig({
          enabled: config.enabled,
          url: config.url,
          method: config.method,
          headers: config.headers,
          includeTranscript: config.includeTranscript,
        })}
      />

      {/* Auto-Response Email */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Auto-Response Email</CardTitle>
              <CardDescription>
                Send automatic confirmation emails to form submitters
              </CardDescription>
            </div>
            <Switch
              checked={autoResponse.enabled}
              onCheckedChange={(checked) =>
                setAutoResponse({ ...autoResponse, enabled: checked })
              }
            />
          </div>
        </CardHeader>
        {autoResponse.enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="auto-response-subject">Email Subject</Label>
              <Input
                id="auto-response-subject"
                value={autoResponse.subject}
                onChange={(e) =>
                  setAutoResponse({ ...autoResponse, subject: e.target.value })
                }
                placeholder="Thank you for your submission"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="auto-response-message">Email Message</Label>
              <Textarea
                id="auto-response-message"
                value={autoResponse.message}
                onChange={(e) =>
                  setAutoResponse({ ...autoResponse, message: e.target.value })
                }
                placeholder="Thank you for reaching out. We've received your information and will get back to you soon."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                This message will be sent to the email address provided by the submitter
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="include-transcript"
                checked={autoResponse.includeTranscript}
                onCheckedChange={(checked) =>
                  setAutoResponse({ ...autoResponse, includeTranscript: checked })
                }
              />
              <Label htmlFor="include-transcript" className="cursor-pointer">
                Include conversation transcript in email
              </Label>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : existingForm ? 'Update Form' : 'Create Form'}
        </Button>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, GripVertical, Eye, Save, X } from 'lucide-react';
import { VoiceForm, VoiceFormField, VoiceFormFieldType } from '@/types/voiceForm';
import { VoiceFormModal } from './VoiceFormModal';
import { VoiceFormConditionalBuilder } from './VoiceFormConditionalBuilder';
import { VoiceFormDependencyGraph } from './VoiceFormDependencyGraph';
import { VoiceFormAutoResponseSettings } from './VoiceFormAutoResponseSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Mail } from 'lucide-react';

const MAX_TOTAL_FIELDS = 10;

interface VoiceFormBuilderProps {
  assistantId: string;
  formId?: string;
  templateData?: Partial<VoiceForm>;
  onSave?: (formId: string) => void;
  onCancel?: () => void;
}

export const VoiceFormBuilder: React.FC<VoiceFormBuilderProps> = ({
  assistantId,
  formId,
  templateData,
  onSave,
  onCancel
}) => {
  const [form, setForm] = useState<VoiceForm>(() => {
    if (templateData) {
      return {
        ...templateData,
        id: templateData.id || formId || crypto.randomUUID(),
        assistantId: templateData.assistantId || assistantId,
        name: templateData.name || '',
        description: templateData.description || '',
        fields: templateData.fields || [],
        settings: templateData.settings || {
          conversationStyle: 'friendly',
          confirmEachField: false,
          allowCorrections: true,
          maxRetries: 3,
          language: 'en-US',
          enableVoiceInput: true,
          enableManualFallback: true,
          showProgress: true
        },
        actions: templateData.actions || {
          onComplete: 'database',
          successMessage: 'Thank you! Your information has been submitted.',
          emailRecipients: []
        },
        isActive: templateData.isActive ?? true,
        createdAt: templateData.createdAt || new Date().toISOString(),
        updatedAt: templateData.updatedAt || new Date().toISOString()
      } as VoiceForm;
    }
    
    return {
      id: formId || crypto.randomUUID(),
      assistantId,
      name: '',
      description: '',
      fields: [],
      settings: {
        conversationStyle: 'friendly',
        confirmEachField: false,
        allowCorrections: true,
        maxRetries: 3,
        language: 'en-US',
        enableVoiceInput: true,
        enableManualFallback: true,
        showProgress: true
      },
      actions: {
        onComplete: 'database',
        successMessage: 'Thank you! Your information has been submitted.',
        emailRecipients: []
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (formId) {
      loadForm();
    }
  }, [formId]);

  const loadForm = async () => {
    try {
      const { data, error } = await supabase
        .from('voice_forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (error) throw error;
      if (data) {
        setForm({
          ...data,
          fields: data.fields || [],
          settings: data.settings || form.settings,
          actions: data.actions || form.actions,
          brandingLogoUrl: data.branding_logo_url,
          brandingRedirectUrl: data.branding_redirect_url,
          theme: (data as any).theme || 'auto'
        });
      }
    } catch (error) {
      console.error('Error loading form:', error);
      toast.error('Failed to load form');
    }
  };

  const handleSaveForm = async () => {
    if (!form.name.trim()) {
      toast.error('Please enter a form name');
      return;
    }

    if (form.fields.length === 0) {
      toast.error('Please add at least one field');
      return;
    }

    if (form.fields.length > MAX_TOTAL_FIELDS) {
      toast.error(`Maximum ${MAX_TOTAL_FIELDS} fields allowed for voice forms`);
      return;
    }

    setIsSaving(true);

    try {
      // Ensure notification_settings has default email settings if not configured
      const notificationSettings = form.notificationSettings || {
        email: {
          enabled: true,
          recipients: form.actions?.emailRecipients || [],
          sendOnSubmit: true,
          includeTranscript: true
        }
      };

      const formData = {
        id: form.id,
        assistant_id: assistantId,
        name: form.name,
        description: form.description,
        fields: form.fields,
        settings: form.settings,
        actions: form.actions,
        notification_settings: notificationSettings,
        is_active: form.isActive,
        branding_logo_url: form.brandingLogoUrl || null,
        branding_redirect_url: form.brandingRedirectUrl || null,
        theme: form.theme || 'auto',
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('voice_forms')
        .upsert(formData);

      if (error) throw error;

      toast.success('Form saved successfully!');
      onSave?.(form.id);
    } catch (error) {
      console.error('Error saving form:', error);
      toast.error('Failed to save form');
    } finally {
      setIsSaving(false);
    }
  };

  const addField = () => {
    if (form.fields.length >= MAX_TOTAL_FIELDS) {
      toast.error(`Maximum ${MAX_TOTAL_FIELDS} fields allowed for voice forms`, {
        description: 'Voice forms are optimized for up to 10 fields to ensure best conversation flow.'
      });
      return;
    }

    const newField: VoiceFormField = {
      id: crypto.randomUUID(),
      name: `field_${form.fields.length + 1}`,
      label: 'New Field',
      type: 'text',
      required: true,
      voicePrompts: {
        initial: "What would you like to enter?",
        confirmation: "Got it, {value}. Is that correct?",
        retry: "Sorry, I didn't catch that. Could you repeat?",
        help: "Please provide your answer."
      },
      privacyLevel: 'public',
      placeholder: ''
    };

    setForm(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
    setSelectedFieldIndex(form.fields.length);
  };

  const removeField = (index: number) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }));
    setSelectedFieldIndex(null);
  };

  const updateField = (index: number, updates: Partial<VoiceFormField>) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.map((field, i) =>
        i === index ? { ...field, ...updates } : field
      )
    }));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= form.fields.length) return;

    const newFields = [...form.fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    setForm(prev => ({ ...prev, fields: newFields }));
    setSelectedFieldIndex(newIndex);
  };

  const selectedField = selectedFieldIndex !== null ? form.fields[selectedFieldIndex] : null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Voice Form Builder</h2>
            <p className="text-sm text-muted-foreground">
              Create conversational forms for data collection
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsPreviewOpen(true)}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button onClick={handleSaveForm} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Form'}
            </Button>
            {onCancel && (
              <Button variant="ghost" onClick={onCancel}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Form Settings */}
        <div className="w-80 border-r bg-muted/10">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="form-name">Form Name *</Label>
                  <Input
                    id="form-name"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Contact Form"
                  />
                </div>

                <div>
                  <Label htmlFor="form-description">Description</Label>
                  <Textarea
                    id="form-description"
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your form..."
                    rows={3}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">Branding</h3>
                <p className="text-sm text-muted-foreground">
                  Customize the logo and link at the bottom of your voice form
                </p>
                
                <div>
                  <Label htmlFor="branding-logo">Logo URL</Label>
                  <Input
                    id="branding-logo"
                    type="url"
                    value={form.brandingLogoUrl || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, brandingLogoUrl: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to use default TalkWeb logo
                  </p>
                </div>

                <div>
                  <Label htmlFor="branding-link">Redirect URL</Label>
                  <Input
                    id="branding-link"
                    type="url"
                    value={form.brandingRedirectUrl || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, brandingRedirectUrl: e.target.value }))}
                    placeholder="https://example.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    URL to open when logo is clicked
                  </p>
                </div>

                <div>
                  <Label htmlFor="form-theme">Theme</Label>
                  <Select
                    value={form.theme || 'auto'}
                    onValueChange={(value: 'light' | 'dark' | 'auto') =>
                      setForm(prev => ({ ...prev, theme: value }))
                    }
                  >
                    <SelectTrigger id="form-theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (follow visitor's system)</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Controls how the standalone and embedded form renders. An <code>?theme=</code> URL parameter on the embed overrides this.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">Settings</h3>
                
                <div>
                  <Label htmlFor="conv-style">Conversation Style</Label>
                  <Select
                    value={form.settings.conversationStyle}
                    onValueChange={(value: any) =>
                      setForm(prev => ({
                        ...prev,
                        settings: { ...prev.settings, conversationStyle: value }
                      }))
                    }
                  >
                    <SelectTrigger id="conv-style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="voice-input">Enable Voice Input</Label>
                  <Switch
                    id="voice-input"
                    checked={form.settings.enableVoiceInput}
                    onCheckedChange={(checked) =>
                      setForm(prev => ({
                        ...prev,
                        settings: { ...prev.settings, enableVoiceInput: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="manual-fallback">Manual Input Fallback</Label>
                  <Switch
                    id="manual-fallback"
                    checked={form.settings.enableManualFallback}
                    onCheckedChange={(checked) =>
                      setForm(prev => ({
                        ...prev,
                        settings: { ...prev.settings, enableManualFallback: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-progress">Show Progress</Label>
                  <Switch
                    id="show-progress"
                    checked={form.settings.showProgress}
                    onCheckedChange={(checked) =>
                      setForm(prev => ({
                        ...prev,
                        settings: { ...prev.settings, showProgress: checked }
                      }))
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">Actions</h3>
                
                <div>
                  <Label htmlFor="success-msg">Success Message</Label>
                  <Textarea
                    id="success-msg"
                    value={form.actions.successMessage}
                    onChange={(e) =>
                      setForm(prev => ({
                        ...prev,
                        actions: { ...prev.actions, successMessage: e.target.value }
                      }))
                    }
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="action-type">On Complete</Label>
                  <Select
                    value={form.actions.onComplete}
                    onValueChange={(value: any) =>
                      setForm(prev => ({
                        ...prev,
                        actions: { ...prev.actions, onComplete: value }
                      }))
                    }
                  >
                    <SelectTrigger id="action-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="database">Save to Database</SelectItem>
                      <SelectItem value="email">Send Email</SelectItem>
                      <SelectItem value="webhook">Call Webhook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Email Notifications Section */}
              <div className="space-y-4">
                <h3 className="font-semibold">Email Notifications</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Mail className="mr-2 h-4 w-4" />
                      Configure Auto-Response Email
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Auto-Response Email Settings</DialogTitle>
                    </DialogHeader>
                    {form.id && (
                      <VoiceFormAutoResponseSettings 
                        formId={form.id}
                        onSave={() => {
                          toast.success('Email settings saved');
                        }}
                      />
                    )}
                  </DialogContent>
                </Dialog>
                <p className="text-xs text-muted-foreground">
                  Customize the confirmation email sent to users after form submission
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Center Panel - Field List */}
        <div className="w-96 border-r">
          <div className="p-4 border-b bg-background space-y-2">
            <Button onClick={addField} className="w-full" disabled={form.fields.length >= MAX_TOTAL_FIELDS}>
              <Plus className="mr-2 h-4 w-4" />
              Add Field
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              {form.fields.length}/{MAX_TOTAL_FIELDS} fields
            </p>
          </div>
          <ScrollArea className="h-[calc(100%-73px)]">
            <div className="p-4 space-y-2">
              {form.fields.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No fields yet.</p>
                  <p className="text-sm">Click "Add Field" to get started.</p>
                </div>
              ) : (
                form.fields.map((field, index) => (
                  <Card
                    key={field.id}
                    className={`cursor-pointer transition-colors ${
                      selectedFieldIndex === index ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedFieldIndex(index)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        <div className="mt-1">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">{field.label}</p>
                            {field.required && (
                              <Badge variant="secondary" className="text-xs">Required</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {field.type} • {field.privacyLevel}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeField(index);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            
            {form.fields.length > 0 && (
              <div className="p-4 pt-2">
                <VoiceFormDependencyGraph fields={form.fields} />
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel - Field Configuration */}
        <div className="flex-1">
          <ScrollArea className="h-full">
            {selectedField ? (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Field Configuration</h3>
                  
                  <Tabs defaultValue="basic">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="basic">Basic</TabsTrigger>
                      <TabsTrigger value="voice">Voice Prompts</TabsTrigger>
                      <TabsTrigger value="validation">Validation</TabsTrigger>
                      <TabsTrigger value="conditional">Conditional</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="space-y-4 mt-4">
                      <div>
                        <Label>Field Label *</Label>
                        <Input
                          value={selectedField.label}
                          onChange={(e) =>
                            updateField(selectedFieldIndex!, { label: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <Label>Field Name (ID)</Label>
                        <Input
                          value={selectedField.name}
                          onChange={(e) =>
                            updateField(selectedFieldIndex!, { name: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <Label>Field Type</Label>
                        <Select
                          value={selectedField.type}
                          onValueChange={(value: VoiceFormFieldType) =>
                            updateField(selectedFieldIndex!, { type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="time">Time</SelectItem>
                            <SelectItem value="select">Select</SelectItem>
                            <SelectItem value="textarea">Textarea</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Placeholder</Label>
                        <Input
                          value={selectedField.placeholder || ''}
                          onChange={(e) =>
                            updateField(selectedFieldIndex!, { placeholder: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <Label>Privacy Level</Label>
                        <Select
                          value={selectedField.privacyLevel}
                          onValueChange={(value: any) =>
                            updateField(selectedFieldIndex!, { privacyLevel: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="sensitive">Sensitive</SelectItem>
                            <SelectItem value="private">Private (Manual Only)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>Required Field</Label>
                        <Switch
                          checked={selectedField.required}
                          onCheckedChange={(checked) =>
                            updateField(selectedFieldIndex!, { required: checked })
                          }
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="voice" className="space-y-4 mt-4">
                      <div>
                        <Label>Initial Prompt</Label>
                        <Textarea
                          value={selectedField.voicePrompts.initial}
                          onChange={(e) =>
                            updateField(selectedFieldIndex!, {
                              voicePrompts: {
                                ...selectedField.voicePrompts,
                                initial: e.target.value
                              }
                            })
                          }
                          rows={2}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          First prompt when collecting this field
                        </p>
                      </div>

                      <div>
                        <Label>Confirmation Prompt</Label>
                        <Textarea
                          value={selectedField.voicePrompts.confirmation}
                          onChange={(e) =>
                            updateField(selectedFieldIndex!, {
                              voicePrompts: {
                                ...selectedField.voicePrompts,
                                confirmation: e.target.value
                              }
                            })
                          }
                          rows={2}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Use {'{value}'} to include the captured value
                        </p>
                      </div>

                      <div>
                        <Label>Retry Prompt</Label>
                        <Textarea
                          value={selectedField.voicePrompts.retry}
                          onChange={(e) =>
                            updateField(selectedFieldIndex!, {
                              voicePrompts: {
                                ...selectedField.voicePrompts,
                                retry: e.target.value
                              }
                            })
                          }
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label>Help Prompt</Label>
                        <Textarea
                          value={selectedField.voicePrompts.help}
                          onChange={(e) =>
                            updateField(selectedFieldIndex!, {
                              voicePrompts: {
                                ...selectedField.voicePrompts,
                                help: e.target.value
                              }
                            })
                          }
                          rows={2}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="validation" className="space-y-4 mt-4">
                      {(selectedField.type === 'select' || selectedField.type === 'multiselect') && (
                        <div>
                          <Label>Options (one per line)</Label>
                          <Textarea
                            value={selectedField.validation?.options?.join('\n') || ''}
                            onChange={(e) =>
                              updateField(selectedFieldIndex!, {
                                validation: {
                                  ...selectedField.validation,
                                  options: e.target.value.split('\n').filter(o => o.trim())
                                }
                              })
                            }
                            rows={5}
                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                          />
                        </div>
                      )}

                      {selectedField.type === 'number' && (
                        <>
                          <div>
                            <Label>Minimum Value</Label>
                            <Input
                              type="number"
                              value={selectedField.validation?.min || ''}
                              onChange={(e) =>
                                updateField(selectedFieldIndex!, {
                                  validation: {
                                    ...selectedField.validation,
                                    min: parseInt(e.target.value) || undefined
                                  }
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>Maximum Value</Label>
                            <Input
                              type="number"
                              value={selectedField.validation?.max || ''}
                              onChange={(e) =>
                                updateField(selectedFieldIndex!, {
                                  validation: {
                                    ...selectedField.validation,
                                    max: parseInt(e.target.value) || undefined
                                  }
                                })
                              }
                            />
                          </div>
                        </>
                      )}

                      {(selectedField.type === 'text' || selectedField.type === 'textarea') && (
                        <>
                          <div>
                            <Label>Min Length</Label>
                            <Input
                              type="number"
                              value={selectedField.validation?.min || ''}
                              onChange={(e) =>
                                updateField(selectedFieldIndex!, {
                                  validation: {
                                    ...selectedField.validation,
                                    min: parseInt(e.target.value) || undefined
                                  }
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>Max Length</Label>
                            <Input
                              type="number"
                              value={selectedField.validation?.max || ''}
                              onChange={(e) =>
                                updateField(selectedFieldIndex!, {
                                  validation: {
                                    ...selectedField.validation,
                                    max: parseInt(e.target.value) || undefined
                                  }
                                })
                              }
                            />
                          </div>
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="conditional" className="space-y-4 mt-4">
                      <VoiceFormConditionalBuilder
                        field={selectedField}
                        allFields={form.fields}
                        onRulesChange={(rules) =>
                          updateField(selectedFieldIndex!, { conditionalRules: rules })
                        }
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <p>Select a field to configure</p>
                  <p className="text-sm">or add a new field to get started</p>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Preview Modal */}
      <VoiceFormModal
        form={form}
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        onSubmit={async (data) => {
          console.log('Preview submission:', data);
          toast.success('Preview: Form would be submitted with this data');
        }}
      />
    </div>
  );
};

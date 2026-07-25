import React, { useState, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Phone, MessageSquare, ShieldAlert, Settings, Globe, ChevronDown, CheckCircle2, AlertCircle, Mail } from "lucide-react";

import { EmailListInput } from "./EmailListInput";
import {
  NotificationRoutingCard,
  routingFromAssistant,
  emptyRouting,
  ALL_NOTIFICATION_CHANNELS,
  type NotificationRouting,
} from "./NotificationRoutingCard";
import { DepartmentRoutingPanel } from "./DepartmentRoutingPanel";
import { DraftPromptControls } from "./DraftPromptControls";

export interface KnowledgeEntry {
  id: string;
  content: string;
  addedAt: string;
}

interface Assistant {
  id: string;
  business_name: string;
  website_url: string;
  voice_type: string;
  tone: string;
  description?: string;
  system_prompt?: string;
  language: string;
  booking_notification_email?: string;
  booking_notification_emails?: string[];
  pinecone_assistant_id?: string;
  scraped_content?: { allPages?: unknown[]; manualEntries?: KnowledgeEntry[] };
}

interface AssistantEditFormProps {
  assistantId: string;
  onUpdate?: () => void;
}

export const AssistantEditForm = ({ assistantId, onUpdate }: AssistantEditFormProps) => {
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    business_name: "",
    website_url: "",
    voice_type: "female",
    tone: "friendly",
    description: "",
    system_prompt: "",
    extra_instructions: "",
    language: "english",
    booking_notification_email: "",
    business_phone: "",
    whatsapp_number: "",
    whatsapp_enabled: false,
    fallback_phone: "",
    fallback_email: "",
    fallback_contact_name: "",
  });
  const [notificationEmails, setNotificationEmails] = useState<string[]>([]);
  const [routing, setRouting] = useState<NotificationRouting>(emptyRouting());
  const [knowledgeCount, setKnowledgeCount] = useState<number | null>(null);
  const [liveExtraInstructions, setLiveExtraInstructions] = useState<string>("");
  const [draftExtraInstructions, setDraftExtraInstructions] = useState<string | null>(null);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<string | null>(null);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);

  useEffect(() => {
    fetchAssistant();
  }, [assistantId]);

  const fetchAssistant = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('id', assistantId)
        .single();

      if (error) throw error;

      setAssistant(data);
      const dAny = data as any;
      const liveExtra = dAny.extra_instructions || "";
      const draftExtra = dAny.draft_extra_instructions ?? null;
      setLiveExtraInstructions(liveExtra);
      setDraftExtraInstructions(draftExtra);
      setDraftUpdatedAt(dAny.draft_updated_at ?? null);
      setPreviewSlug(dAny.preview_slug ?? null);
      setFormData({
        business_name: data.business_name || "",
        website_url: data.website_url || "",
        voice_type: data.voice_type || "female",
        tone: data.tone || "friendly",
        description: data.description || "",
        system_prompt: data.system_prompt || "",
        // Show draft when present, else live
        extra_instructions: draftExtra !== null ? draftExtra : liveExtra,
        language: data.language || "english",
        booking_notification_email: data.booking_notification_email || "",
        business_phone: data.business_phone || "",
        whatsapp_number: data.whatsapp_number || "",
        whatsapp_enabled: data.whatsapp_enabled || false,
        fallback_phone: data.fallback_phone || "",
        fallback_email: data.fallback_email || "",
        fallback_contact_name: data.fallback_contact_name || "",
      });
      const existingList = Array.isArray((data as any).booking_notification_emails)
        ? ((data as any).booking_notification_emails as string[]).filter(Boolean)
        : [];
      const fallback = data.booking_notification_email ? [data.booking_notification_email] : [];
      setNotificationEmails(existingList.length > 0 ? existingList : fallback);
      setRouting(routingFromAssistant(data));

      // Knowledge base count for setup health
      try {
        const { count } = await supabase
          .from('knowledge_vectors')
          .select('id', { count: 'exact', head: true })
          .eq('assistant_id', assistantId);
        setKnowledgeCount(count ?? 0);
      } catch {
        setKnowledgeCount(null);
      }

    } catch (error) {
      console.error('Error fetching assistant:', error);
      toast.error('Failed to load assistant details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const cleanedRouting: Record<string, string[]> = {};
      for (const k of ALL_NOTIFICATION_CHANNELS) {
        cleanedRouting[k] = (routing[k] || []).map((e) => e.trim()).filter(Boolean);
      }
      const bookingList = cleanedRouting.booking_notification_emails;
      const { system_prompt: _omitGeneratedPrompt, extra_instructions: editedExtra, ...editable } = formData;
      const extraChanged = (editedExtra || "") !== (liveExtraInstructions || "");
      const payload: any = {
        ...editable,
        ...cleanedRouting,
        booking_notification_email: formData.booking_notification_email || bookingList[0] || null,
      };
      // Route extra_instructions edits to DRAFT (not live) so visitors aren't affected
      // until the user explicitly publishes.
      if (extraChanged) {
        payload.draft_extra_instructions = editedExtra || "";
        payload.draft_updated_at = new Date().toISOString();
        const { data: userResp } = await supabase.auth.getUser();
        if (userResp?.user?.id) payload.draft_updated_by = userResp.user.id;
      }
      const { error } = await supabase
        .from('assistants')
        .update(payload)
        .eq('id', assistantId);

      if (error) throw error;

      toast.success('Assistant updated successfully!');
      onUpdate?.();
      fetchAssistant();
    } catch (error: any) {
      console.error('Error updating assistant:', error);
      const msg = error?.message || error?.details || 'Unknown error';
      toast.error(`Failed to update assistant: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">Loading assistant details...</div>
        </CardContent>
      </Card>
    );
  }

  if (!assistant) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">Assistant not found</div>
        </CardContent>
      </Card>
    );
  }

  const a: any = assistant;
  const checks = [
    { ok: !!formData.business_name && !!formData.website_url, label: 'Business name & website set' },
    { ok: !!formData.booking_notification_email || (routing.booking_notification_emails || []).length > 0, label: formData.booking_notification_email ? `Default notification email set (${formData.booking_notification_email})` : ((routing.booking_notification_emails || []).length > 0 ? `Booking recipients (${routing.booking_notification_emails.length}) configured` : 'Set a default notification email or add booking recipients') },
    { ok: (knowledgeCount ?? 0) > 0, label: knowledgeCount === null ? 'Knowledge base status unknown' : (knowledgeCount > 0 ? `Knowledge base populated (${knowledgeCount} entries)` : 'Knowledge base is empty — add content or scrape your site') },
    { ok: !!a?.calendly_link || !!a?.google_calendar_enabled || !!a?.outlook_calendar_enabled || !!a?.external_scheduling_url, label: 'Booking method connected (Calendly / Google / Outlook / external)' },
    { ok: !formData.whatsapp_enabled || !!formData.whatsapp_number, label: formData.whatsapp_enabled ? 'WhatsApp number set' : 'WhatsApp not enabled (optional)' },
  ];
  const allGood = checks.every((c) => c.ok);

  return (
    <div className="space-y-6">
      {/* Setup Health */}
      <Card className={`border-l-4 ${allGood ? 'border-l-green-500' : 'border-l-amber-500'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {allGood ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-amber-600" />}
            <CardTitle className="text-base">Setup Health</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Quick check of common configuration items. Fix the items below to make sure your assistant works as expected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-sm">
            {checks.map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                {c.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                )}
                <span className={c.ok ? 'text-muted-foreground' : 'text-foreground'}>{c.label}</span>
              </li>
            ))}
            {formData.extra_instructions.length > 4000 && (
              <li className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <span>Extra instructions are quite long ({formData.extra_instructions.length.toLocaleString()} chars). Consider moving factual content to the Knowledge Base.</span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* Section 1: Basic Information */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Basic Information</CardTitle>
          </div>
          <CardDescription>
            Update your assistant's core settings. For booking integrations (Calendly, WhatsApp, Time Slots), visit the Booking tab.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_name">Business Name *</Label>
                <Input
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) => handleInputChange('business_name', e.target.value)}
                  placeholder="Your Business Name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website_url">Website URL *</Label>
                <Input
                  id="website_url"
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => handleInputChange('website_url', e.target.value)}
                  placeholder="https://your-website.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice_type">Voice Type (locked)</Label>
                <Select value={formData.voice_type} disabled>
                  <SelectTrigger id="voice_type" className="bg-muted/50 cursor-not-allowed">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ballad">Ballad (UK)</SelectItem>
                    <SelectItem value="alloy">Alloy (Neutral)</SelectItem>
                    <SelectItem value="echo">Echo (Male - US)</SelectItem>
                    <SelectItem value="onyx">Onyx (Deep)</SelectItem>
                    <SelectItem value="nova">Nova (Female)</SelectItem>
                    <SelectItem value="shimmer">Shimmer (Soft)</SelectItem>
                    <SelectItem value="coral">Coral (Warm & Enthusiastic)</SelectItem>
                    <SelectItem value="sage">Sage (Calm & Professional)</SelectItem>
                    <SelectItem value="ash">Ash (Conversational)</SelectItem>
                    <SelectItem value="verse">Verse (Narrative)</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Locked to prevent affecting the assistant&apos;s voice. Set when the assistant was created.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Select value={formData.tone} onValueChange={(value) => handleInputChange('tone', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={formData.language} onValueChange={(value) => handleInputChange('language', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="spanish">Spanish</SelectItem>
                    <SelectItem value="french">French</SelectItem>
                    <SelectItem value="german">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-4">
                <NotificationRoutingCard
                  value={routing}
                  onChange={setRouting}
                  showCard
                  defaultEmail={formData.booking_notification_email}
                  onDefaultEmailChange={(email) => handleInputChange('booking_notification_email', email)}
                />
                <DepartmentRoutingPanel
                  assistantId={assistantId}
                  bookingRecipients={routing.booking_notification_emails || []}
                  onAddRecipient={(email) => {
                    const current = routing.booking_notification_emails || [];
                    if (current.some((e) => e.toLowerCase() === email.toLowerCase())) return;
                    setRouting({ ...routing, booking_notification_emails: [...current, email] });
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of your business or assistant..."
                rows={3}
              />
            </div>

            {/* Section 2: Business Contact Information */}
            <Card className="border-l-4 border-l-ai-blue">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-ai-blue" />
                  <CardTitle className="text-base">Business Contact Information</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Contact details users interact with during normal operations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_phone">Business Phone</Label>
                    <Input
                      id="business_phone"
                      type="tel"
                      value={formData.business_phone}
                      onChange={(e) => handleInputChange('business_phone', e.target.value)}
                      placeholder="+44 1234 567890"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp_number" className="flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      WhatsApp Number
                    </Label>
                    <Input
                      id="whatsapp_number"
                      type="tel"
                      value={formData.whatsapp_number}
                      onChange={(e) => handleInputChange('whatsapp_number', e.target.value)}
                      placeholder="+44 7700 900000"
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="checkbox"
                        id="whatsapp_enabled"
                        checked={formData.whatsapp_enabled}
                        onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_enabled: e.target.checked }))}
                        className="rounded border-input"
                      />
                      <Label htmlFor="whatsapp_enabled" className="text-xs text-muted-foreground cursor-pointer">
                        Enable WhatsApp integration
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Emergency / Subscription Fallback */}
            <Collapsible defaultOpen={false}>
              <Card className="border-l-4 border-l-destructive">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4 text-destructive" />
                          <CardTitle className="text-base">Emergency Contact / Subscription Fallback</CardTitle>
                        </div>
                        <CardDescription className="text-xs mt-1 text-left">
                          Used as fallback when subscription limits are reached.
                        </CardDescription>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fallback_contact_name">Contact Name</Label>
                        <Input
                          id="fallback_contact_name"
                          value={formData.fallback_contact_name}
                          onChange={(e) => handleInputChange('fallback_contact_name', e.target.value)}
                          placeholder="John Smith"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fallback_phone">Fallback Phone</Label>
                        <Input
                          id="fallback_phone"
                          type="tel"
                          value={formData.fallback_phone}
                          onChange={(e) => handleInputChange('fallback_phone', e.target.value)}
                          placeholder="+44 7700 900000"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fallback_email">Fallback Email</Label>
                        <Input
                          id="fallback_email"
                          type="email"
                          value={formData.fallback_email}
                          onChange={(e) => handleInputChange('fallback_email', e.target.value)}
                          placeholder="fallback@yourbusiness.com"
                        />
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Section 4: System Prompt */}
            <Collapsible defaultOpen={false}>
              <Card className="border-l-4 border-l-ai-cyan">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-ai-cyan" />
                        <CardTitle className="text-base">System Prompt Configuration</CardTitle>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-muted/30 rounded-lg border">
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Base Instructions (Protected)</h4>
                      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded border-l-4 border-primary/20 max-h-60 overflow-y-auto">
                        {formData.business_name?.toLowerCase().includes('paysease') || formData.business_name?.toLowerCase().includes('payease') ? (
                          <div className="whitespace-pre-wrap">{`You are a professional voice assistant for PAYEASE.
Website: ${formData.website_url || 'https://payease.bizboosters.co.uk'}
Language: Communicate primarily in english
Page title: secure-wallet-flow-app

Website content overview: 17572102394 /lovable-uploads/b48a97e3-89a3-4580-a1b0-b1e51275344e.png

CONVERSATION RULES:
- NEVER use the same greeting twice - vary your responses naturally
- Remember context from previous messages in the conversation
- Be contextually aware of what the user just said
- Respond naturally without repeating standard phrases
- Keep responses conversational and engaging
- Communicate primarily in english, but be helpful if users speak other languages

Your role:
- Help users navigate the website and find information
- Answer questions about PAYEASE services and offerings  
- Assist with booking appointments 
- Provide a welcoming, professional experience with a ${formData.voice_type} voice

When users mention navigation (like "go to pricing" or "show me contact"), respond with JSON: {"navigate": "/page-url"}
For booking requests, guide them to the appropriate booking method.`}</div>
                        ) : (
                          <div className="whitespace-pre-wrap">{`You are a professional ${formData.tone} voice assistant for ${formData.business_name || '[Business Name]'}.
Website: ${formData.website_url || '[Website URL]'}
Language: Communicate primarily in ${formData.language}

CONVERSATION RULES:
- NEVER use the same greeting twice - vary your responses naturally
- Remember context from previous messages in the conversation
- Be contextually aware of what the user just said
- Respond naturally without repeating standard phrases
- Keep responses conversational and engaging
- Communicate primarily in ${formData.language}, but be helpful if users speak other languages

Your role:
- Help users navigate the website and find information
- Answer questions about ${formData.business_name || '[Business Name]'} services and offerings  
- Assist with booking appointments 
- Provide a welcoming, professional experience with a ${formData.voice_type} voice

When users mention navigation (like "go to pricing" or "show me contact"), respond with JSON: {"navigate": "/page-url"}
For booking requests, guide them to the appropriate booking method.`}</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-full h-px bg-gradient-to-r from-border via-primary/20 to-border"></div>
                        <span className="text-xs font-medium text-primary px-2 bg-background whitespace-nowrap">Extra System Prompt Instruction</span>
                        <div className="w-full h-px bg-gradient-to-r from-border via-primary/20 to-border"></div>
                      </div>
                      <DraftPromptControls
                        assistantId={assistantId}
                        liveExtraInstructions={liveExtraInstructions}
                        draftExtraInstructions={draftExtraInstructions}
                        draftUpdatedAt={draftUpdatedAt}
                        previewSlug={previewSlug}
                        onPublished={() => fetchAssistant()}
                        onDiscarded={() => fetchAssistant()}
                      />
                      <p className="text-xs text-muted-foreground mb-2">
                        Edits here save as a <strong>draft</strong> — visitors keep seeing the live version until you click <strong>Publish</strong>. Use <strong>Test draft</strong> on the banner above to try changes privately first.
                      </p>
                      <Textarea
                        id="extra_instructions"
                        value={formData.extra_instructions}
                        onChange={(e) => handleInputChange('extra_instructions', e.target.value)}
                        placeholder={`e.g. Always greet visitors warmly and use their first name when given.\nRecommend the Premium plan for business customers.\nIf asked about refunds, direct users to email support@example.com.\nNever discuss competitor pricing or share internal pricing details.`}
                        rows={6}
                        className="resize-y font-mono text-xs"
                      />
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[11px] text-muted-foreground">
                          Type your custom rules here and click <strong>Save Changes</strong>. Re-scrapes will not overwrite this field.
                        </p>
                        <p className={`text-[11px] tabular-nums ${formData.extra_instructions.length > 4000 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                          {formData.extra_instructions.length.toLocaleString()} characters
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>


            {/* Document upload moved to the Knowledge Base page for better organisation. */}

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} size="lg">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

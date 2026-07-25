import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { MessageCircle, Save, Loader2, Sparkles, ArrowRightLeft, Bot, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WhatsAppConfig {
  whatsapp_number: string;
  whatsapp_enabled: boolean;
  whatsapp_message_template: string;
}

interface WhatsAppIntegrationProps {
  selectedAssistant: { id: string; business_name: string } | null;
}

export const WhatsAppIntegration = ({ selectedAssistant }: WhatsAppIntegrationProps) => {
  const { user } = useAuth();
  const { hasFeature, getUpgradeMessage } = useFeatureGating();
  const [config, setConfig] = useState<WhatsAppConfig>({
    whatsapp_number: "",
    whatsapp_enabled: false,
    whatsapp_message_template: "Hi! I'd like to get in touch regarding your services."
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [routingStatus, setRoutingStatus] = useState<{
    connected: boolean;
    ownedByThisAssistant: boolean;
    ownerAssistantId?: string;
  }>({ connected: false, ownedByThisAssistant: false });

  // Dedicated number (Pro+) state
  const hasDedicated = hasFeature('whatsapp_dedicated_number');
  const [dedicatedChannel, setDedicatedChannel] = useState<any>(null);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [requestCountry, setRequestCountry] = useState("GB");
  const [requestNotes, setRequestNotes] = useState("");
  const [requestingNumber, setRequestingNumber] = useState(false);

  const loadDedicated = async () => {
    if (!selectedAssistant) return;
    const { data: ch } = await supabase
      .from('whatsapp_channels')
      .select('*')
      .eq('assistant_id', selectedAssistant.id)
      .eq('owned_by_platform', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setDedicatedChannel(ch || null);
    if (!ch) {
      const { data: req } = await supabase
        .from('whatsapp_number_requests')
        .select('*')
        .eq('assistant_id', selectedAssistant.id)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setPendingRequest(req || null);
    } else {
      setPendingRequest(null);
    }
  };

  const submitNumberRequest = async () => {
    if (!selectedAssistant || !user) return;
    setRequestingNumber(true);
    try {
      const { error } = await supabase
        .from('whatsapp_number_requests')
        .insert({
          user_id: user.id,
          assistant_id: selectedAssistant.id,
          requested_country: requestCountry,
          notes: requestNotes || null,
          status: 'pending',
        });
      if (error) throw error;
      toast.success('Request submitted. Our team will provision your number within 1 business day.');
      setRequestNotes("");
      await loadDedicated();
      // Fire-and-forget admin notification
      supabase.functions.invoke('send-notification', {
        body: {
          type: 'whatsapp_number_request',
          to: 'michaelorji5111@gmail.com',
          subject: 'New WhatsApp number request',
          message: `Assistant ${selectedAssistant.business_name} requested a ${requestCountry} number.`,
        },
      }).catch(() => {});
    } catch (err: any) {
      toast.error('Failed to submit request: ' + (err?.message || String(err)));
    } finally {
      setRequestingNumber(false);
    }
  };

  useEffect(() => {
    if (selectedAssistant && hasDedicated) loadDedicated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssistant?.id, hasDedicated]);

  // Always call useEffect - move to top before any conditional returns
  useEffect(() => {
    console.log('WhatsApp useEffect triggered', { 
      selectedAssistant: selectedAssistant?.id, 
      hasFeature: hasFeature('whatsapp_integration') 
    });
    
    if (selectedAssistant && hasFeature('whatsapp_integration')) {
      console.log('Calling fetchWhatsAppConfig for assistant:', selectedAssistant.id);
      const timeoutId = setTimeout(() => {
        fetchWhatsAppConfig();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedAssistant?.id, hasFeature('whatsapp_integration')]);

  // Check if user has WhatsApp integration feature - AFTER all hooks are called
  if (!hasFeature('whatsapp_integration')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            WhatsApp Integration
          </CardTitle>
          <CardDescription>
            {getUpgradeMessage('whatsapp_integration')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">WhatsApp integration is available in paid plans.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const fetchWhatsAppConfig = async () => {
    if (!selectedAssistant) {
      console.log('fetchWhatsAppConfig: No assistant selected');
      return;
    }

    console.log('fetchWhatsAppConfig: Fetching for assistant', selectedAssistant.id);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assistants')
        .select('whatsapp_number, whatsapp_enabled, whatsapp_message_template')
        .eq('id', selectedAssistant.id)
        .single();

      console.log('fetchWhatsAppConfig: Response', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      const newConfig = {
        whatsapp_number: data.whatsapp_number || "",
        whatsapp_enabled: data.whatsapp_enabled || false,
        whatsapp_message_template: data.whatsapp_message_template || "Hi! I'd like to get in touch regarding your services."
      };
      
      console.log('fetchWhatsAppConfig: Setting config to', newConfig);
      setConfig(newConfig);
      await refreshRoutingStatus(newConfig.whatsapp_number);
    } catch (error) {
      console.error('Error fetching WhatsApp config:', error);
      // Only show error toast if it's an actual error, not just null values
      if (error && typeof error === 'object' && 'message' in error) {
        toast.error('Failed to load WhatsApp configuration');
      }
    } finally {
      // Ensure loading is always cleared
      setTimeout(() => setLoading(false), 100);
    }
  };

  // Normalize a phone string into Twilio canonical format: whatsapp:+E164
  const normalizeWhatsAppNumber = (raw: string): string | null => {
    if (!raw) return null;
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return null;
    return `whatsapp:+${digits}`;
  };

  const refreshRoutingStatus = async (rawNumber: string) => {
    if (!selectedAssistant) {
      setRoutingStatus({ connected: false, ownedByThisAssistant: false });
      return;
    }
    const canonical = normalizeWhatsAppNumber(rawNumber);
    if (!canonical) {
      setRoutingStatus({ connected: false, ownedByThisAssistant: false });
      return;
    }
    const { data, error } = await supabase
      .from('whatsapp_channels')
      .select('assistant_id, is_active')
      .eq('twilio_number', canonical)
      .maybeSingle();
    if (error || !data) {
      setRoutingStatus({ connected: false, ownedByThisAssistant: false });
      return;
    }
    setRoutingStatus({
      connected: !!data.is_active,
      ownedByThisAssistant: data.assistant_id === selectedAssistant.id,
      ownerAssistantId: data.assistant_id,
    });
  };

  const syncChannelRow = async (twilioNumber: string | null, isActive: boolean) => {
    if (!selectedAssistant || !user) return;
    if (!twilioNumber) return;

    // Reassign this twilio_number to the selected assistant (twilio_number is unique).
    const { error } = await supabase
      .from('whatsapp_channels')
      .upsert(
        {
          assistant_id: selectedAssistant.id,
          user_id: user.id,
          twilio_number: twilioNumber,
          display_name: selectedAssistant.business_name,
          is_active: isActive,
        },
        { onConflict: 'twilio_number' }
      );

    if (error) {
      console.error('Error syncing whatsapp_channels:', error);
      throw error;
    }
  };

  const saveWhatsAppConfig = async () => {
    if (!selectedAssistant) {
      toast.error('No assistant selected');
      return;
    }

    const trimmed = config.whatsapp_number.trim();
    const canonical = normalizeWhatsAppNumber(trimmed);
    if (trimmed && !canonical) {
      toast.error('Enter a valid phone number with country code (8–15 digits).');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('assistants')
        .update({
          whatsapp_number: trimmed,
          whatsapp_enabled: config.whatsapp_enabled,
          whatsapp_message_template: config.whatsapp_message_template
        })
        .eq('id', selectedAssistant.id)
        .select('whatsapp_number, whatsapp_enabled, whatsapp_message_template')
        .single();

      if (error) throw error;

      // Sync the routing table so inbound messages can resolve to this assistant.
      if (canonical) {
        await syncChannelRow(canonical, config.whatsapp_enabled);
      }

      // Update local state with saved data
      if (data) {
        setConfig({
          whatsapp_number: data.whatsapp_number || "",
          whatsapp_enabled: data.whatsapp_enabled || false,
          whatsapp_message_template: data.whatsapp_message_template || "Hi! I'd like to get in touch regarding your services."
        });
      }

      await refreshRoutingStatus(trimmed);

      toast.success(
        canonical
          ? 'WhatsApp configuration saved and connected for inbound routing'
          : 'WhatsApp configuration saved'
      );
    } catch (error) {
      console.error('Error saving WhatsApp config:', error);
      toast.error('Failed to save WhatsApp configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleChange = async (checked: boolean) => {
    console.log('Toggle clicked, new value:', checked);
    console.log('Selected assistant:', selectedAssistant?.id);
    
    if (!selectedAssistant) {
      console.error('No assistant selected');
      toast.error('No assistant selected');
      return;
    }

    // Update local state immediately for better UX
    setConfig(prev => ({ ...prev, whatsapp_enabled: checked }));

    try {
      console.log('Updating database...');
      const { error } = await supabase
        .from('assistants')
        .update({ whatsapp_enabled: checked })
        .eq('id', selectedAssistant.id);

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }

      // Mirror the active state into whatsapp_channels for the saved number.
      const canonical = normalizeWhatsAppNumber(config.whatsapp_number);
      if (canonical) {
        try {
          await syncChannelRow(canonical, checked);
        } catch (e) {
          console.error('Channel sync failed on toggle:', e);
        }
      }

      await refreshRoutingStatus(config.whatsapp_number);

      console.log('Database updated successfully');
      toast.success(checked ? 'WhatsApp integration enabled' : 'WhatsApp integration disabled');
    } catch (error) {
      console.error('Error toggling WhatsApp:', error);
      toast.error('Failed to update WhatsApp status');
      // Revert on error
      setConfig(prev => ({ ...prev, whatsapp_enabled: !checked }));
    }
  };

  const testWhatsAppRedirect = async () => {
    if (!selectedAssistant) return;
    
    console.log('Testing WhatsApp redirect for assistant:', selectedAssistant.id);
    setTesting(true);
    
    try {
      console.log('Invoking whatsapp-redirect function...');
      const { data, error } = await supabase.functions.invoke('whatsapp-redirect', {
        body: {
          assistantId: selectedAssistant.id,
          userMessage: 'Test message from dashboard'
        }
      });
      
      console.log('WhatsApp redirect response:', { data, error });
      
      if (error) {
        console.error('Function invocation error:', error);
        throw error;
      }
      
      if (data?.success && data?.whatsapp_url) {
        console.log('Opening WhatsApp URL:', data.whatsapp_url);
        toast.success('Opening WhatsApp chat in a new tab');
        window.open(data.whatsapp_url, '_blank', 'noopener,noreferrer');
      } else {
        console.error('Invalid response data:', data);
        toast.error(data?.error || 'Failed to generate WhatsApp link');
      }
    } catch (err) {
      console.error('WhatsApp test failed:', err);
      toast.error('WhatsApp test failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setTesting(false);
    }
  };

  if (!selectedAssistant) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            WhatsApp Integration
          </CardTitle>
          <CardDescription>
            Please select an assistant to configure WhatsApp integration
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          WhatsApp Integration
        </CardTitle>
        <CardDescription>
          Choose how WhatsApp works for your business — handoff to a human, or let AI handle replies on your number.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode comparison banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowRightLeft className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-sm">Live Transfer</h4>
              <Badge variant="outline" className="ml-auto text-[10px]">Mode A</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              The AI hands the customer off to a real person on <span className="font-medium">your existing</span> WhatsApp number. Best when you want humans replying.
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Bot className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-sm">AI Assistant on WhatsApp</h4>
              <Badge variant="secondary" className="ml-auto text-[10px]">Mode B · Pro</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Customers message a <span className="font-medium">dedicated</span> WhatsApp Business number and the AI replies automatically — 24/7, no human needed.
            </p>
          </div>
        </div>

        {hasDedicated && (
          <div className="rounded-lg border bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-sm">Mode B — AI Assistant on a Dedicated WhatsApp Number</h4>
              <Badge variant="secondary" className="ml-auto">Pro</Badge>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Customers WhatsApp this dedicated number and the AI assistant replies automatically. No human handoff needed.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {dedicatedChannel ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Your dedicated number</div>
                    <div className="font-mono text-base font-semibold">
                      {dedicatedChannel.twilio_number?.replace(/^whatsapp:/, '') || '—'}
                    </div>
                  </div>
                  <Badge variant={dedicatedChannel.provisioning_status === 'active' ? 'default' : 'outline'}>
                    {dedicatedChannel.provisioning_status === 'active' && '✓ Live'}
                    {dedicatedChannel.provisioning_status === 'provisioning' && 'Awaiting WhatsApp approval'}
                    {dedicatedChannel.provisioning_status === 'failed' && 'Failed'}
                    {dedicatedChannel.provisioning_status === 'released' && 'Released'}
                    {!['active','provisioning','failed','released'].includes(dedicatedChannel.provisioning_status) && dedicatedChannel.provisioning_status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {dedicatedChannel.provisioning_status === 'active'
                    ? 'Customers can WhatsApp this number directly. Replies are handled by your AI assistant.'
                    : dedicatedChannel.provisioning_status === 'provisioning'
                    ? 'Number purchased. WhatsApp Business approval typically takes 1–3 business days.'
                    : 'Contact support if this status does not change.'}
                </p>
              </div>
            ) : pendingRequest ? (
              <div className="space-y-1">
                <Badge variant="outline">Request pending</Badge>
                <p className="text-xs text-muted-foreground">
                  Requested {pendingRequest.requested_country} number on {new Date(pendingRequest.created_at).toLocaleDateString()}.
                  Our team will provision and email you within 1 business day.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Get your own dedicated WhatsApp Business number. £15/mo per number, billed alongside your plan.
                  Customers message your number — your AI assistant replies automatically.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Country</Label>
                    <Select value={requestCountry} onValueChange={setRequestCountry}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GB">United Kingdom (+44)</SelectItem>
                        <SelectItem value="US">United States (+1)</SelectItem>
                        <SelectItem value="CA">Canada (+1)</SelectItem>
                        <SelectItem value="AU">Australia (+61)</SelectItem>
                        <SelectItem value="IE">Ireland (+353)</SelectItem>
                        <SelectItem value="DE">Germany (+49)</SelectItem>
                        <SelectItem value="FR">France (+33)</SelectItem>
                        <SelectItem value="ES">Spain (+34)</SelectItem>
                        <SelectItem value="NL">Netherlands (+31)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Notes (optional)</Label>
                    <Input
                      placeholder="Preferred area code, etc."
                      value={requestNotes}
                      onChange={(e) => setRequestNotes(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={submitNumberRequest} disabled={requestingNumber} size="sm">
                  {requestingNumber ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Request Dedicated Number
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-sm">Mode A — Live Transfer to Your WhatsApp</h4>
            <Badge variant="outline" className="ml-auto text-[10px]">Handoff</Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  When the AI decides the customer needs a human, it opens a WhatsApp chat to the number below — your team replies manually.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="whatsapp-enabled"
              checked={config.whatsapp_enabled}
              onCheckedChange={handleToggleChange}
              disabled={loading}
            />
            <Label htmlFor="whatsapp-enabled" className="cursor-pointer">Enable Live Transfer</Label>
          </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp-number">WhatsApp Business Number</Label>
          <Input
            id="whatsapp-number"
            placeholder="+1234567890"
            value={config.whatsapp_number}
            onChange={(e) =>
              setConfig(prev => ({ ...prev, whatsapp_number: e.target.value }))
            }
          />
          <p className="text-sm text-muted-foreground">
            Include country code (e.g., +1 for US, +44 for UK). Saving connects this number to inbound message routing for this assistant.
          </p>
          {config.whatsapp_number && (
            <div
              className={`text-xs rounded-md px-3 py-2 border ${
                routingStatus.connected && routingStatus.ownedByThisAssistant
                  ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300'
                  : routingStatus.ownedByThisAssistant
                  ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-300'
                  : routingStatus.ownerAssistantId
                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-300'
                  : 'bg-muted border-border text-muted-foreground'
              }`}
            >
              {routingStatus.connected && routingStatus.ownedByThisAssistant && (
                <>✓ Connected for inbound routing on this assistant.</>
              )}
              {!routingStatus.connected && routingStatus.ownedByThisAssistant && (
                <>● Number is assigned to this assistant but inbound routing is disabled. Toggle WhatsApp on, then save.</>
              )}
              {routingStatus.ownerAssistantId && !routingStatus.ownedByThisAssistant && (
                <>⚠ This number is currently routed to a different assistant. Saving here will reassign it to this assistant.</>
              )}
              {!routingStatus.ownerAssistantId && (
                <>● Not yet connected for inbound routing. Click Save to connect this number.</>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="message-template">Default Message Template</Label>
          <Textarea
            id="message-template"
            placeholder="Hi! I'd like to get in touch regarding your services."
            value={config.whatsapp_message_template}
            onChange={(e) =>
              setConfig(prev => ({ ...prev, whatsapp_message_template: e.target.value }))
            }
            rows={3}
          />
          <p className="text-sm text-muted-foreground">
            This message will be pre-filled when customers are redirected to WhatsApp
          </p>
        </div>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2 text-sm">How these modes work together</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <span className="font-medium">Live Transfer (A):</span> AI hands off to a human on your existing number when the customer needs personal help.</li>
            <li>• <span className="font-medium">AI on WhatsApp (B):</span> AI replies automatically on a dedicated number — no human required, runs 24/7.</li>
            <li>• You can use either, both, or neither. If WhatsApp is fully off, the AI uses email / phone / callback channels instead.</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button onClick={saveWhatsAppConfig} disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save WhatsApp Configuration'}
          </Button>
          <Button variant="outline" onClick={testWhatsAppRedirect} disabled={testing || !config.whatsapp_enabled || !config.whatsapp_number} className="w-full">
            {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {testing ? 'Testing...' : 'Test WhatsApp Redirect'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
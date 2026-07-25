import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { FeatureGate } from "@/components/FeatureGate";
import { 
  Mic, 
  Globe, 
  Settings, 
  Copy, 
  ExternalLink, 
  Trash2,
  Calendar,
  User,
  Clock,
  BookOpen,
  
  QrCode,
  AlertTriangle,
  AlertCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { EmbedCodePreview } from "./EmbedCodePreview";
import { WebsitePreview } from "./WebsitePreview";
import { TimeSlotManager } from "./TimeSlotManager";
import { CalendarIntegrationBadge } from "./CalendarIntegrationBadge";

import { BatchRescrapeManager } from "./BatchRescrapeManager";
import KnowledgeSearchDiagnostics from "./KnowledgeSearchDiagnostics";
import { generatePreviewUrl } from "@/utils/previewUrlUtils";
import { AssistantQRCode } from "./AssistantQRCode";
import { AssistantTrialTimer } from "./AssistantTrialTimer";
import { AssistantTrialBanner } from "./AssistantTrialBanner";
import { useAssistantTrial } from "@/hooks/useAssistantTrial";
import { useSubscription } from "@/hooks/useSubscription";


interface Assistant {
  id: string;
  business_name: string;
  website_url: string;
  voice_type: string;
  tone: string;
  calendly_link?: string;
  description?: string;
  scraped_content?: any;
  embed_code: string;
  preview_url: string;
  created_at: string;
  updated_at: string;
  is_trial?: boolean;
  trial_expires_at?: string;
}

// Helper function to calculate trial status
const getTrialStatus = (assistant: Assistant) => {
  if (!assistant.is_trial || !assistant.trial_expires_at) {
    return { isTrialAssistant: false, daysRemaining: 0, isExpired: false, isExpiringSoon: false };
  }
  
  const expiresAt = new Date(assistant.trial_expires_at);
  const now = new Date();
  const diffTime = expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return {
    isTrialAssistant: true,
    daysRemaining,
    isExpired: daysRemaining <= 0,
    isExpiringSoon: daysRemaining > 0 && daysRemaining <= 3
  };
};

interface AssistantDashboardProps {
  selectedAssistantId?: string | null;
}

export const AssistantDashboard = ({ selectedAssistantId }: AssistantDashboardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { canUseFirecrawl, canIntegrateCalendar, hasFeature } = useFeatureGating();
  const { subscription } = useSubscription();
  const isPaidSubscriber = !!subscription?.subscribed;

  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);


  useEffect(() => {
    if (selectedAssistantId) {
      setLoading(true);
      fetchAssistant();
      
      // Set up real-time updates for the specific assistant
      const channel = supabase
        .channel('assistant-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'assistants',
            filter: `id=eq.${selectedAssistantId}`
          },
          (payload) => {
            console.log('Real-time update:', payload);
            if (payload.eventType === 'DELETE') {
              setAssistant(null);
            } else if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              setAssistant(payload.new as Assistant);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setAssistant(null);
      setLoading(false);
    }
  }, [user, selectedAssistantId]);

  const fetchAssistant = async () => {
    if (!selectedAssistantId) return;
    
    try {
      console.log('Fetching assistant with ID:', selectedAssistantId, 'User:', user?.email || 'no user');
      
      let data, error;
      
      if (user) {
        // Authenticated user - try to get full assistant data
        const result = await supabase
          .from('assistants')
          .select('*')
          .eq('id', selectedAssistantId)
          .maybeSingle();
        
        data = result.data;
        error = result.error;
      } else {
        // Unauthenticated user - try to get public assistant data
        const result = await supabase
          .from('assistants')
          .select('id, business_name, website_url, voice_type, tone, calendly_link, description, embed_code, preview_url, created_at, updated_at, is_trial, trial_expires_at, scraped_content')
          .eq('id', selectedAssistantId)
          .maybeSingle();
        
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error fetching assistant:', error);
        throw error;
      }
      
      if (!data) {
        console.log('No assistant found or access denied');
        setAssistant(null);
        return;
      }
      
      console.log('Successfully loaded assistant:', data.business_name);
      setAssistant(data);
    } catch (error) {
      console.error('Error fetching assistant:', error);
      setAssistant(null);
      toast({
        title: "Error",
        description: "Failed to load the selected assistant. Please check if you have access to this assistant.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const deleteAssistant = async (id: string, businessName: string) => {
    try {
      const { error } = await supabase
        .from('assistants')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: `Assistant for ${businessName} has been deleted.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete assistant.",
        variant: "destructive",
      });
    }
  };


  // Allow both authenticated and unauthenticated access for trial assistants
  // Remove the user check as we now support public access

  if (loading) {
    return (
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-48 bg-muted rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Assistant Overview</h2>
              <p className="text-muted-foreground">
                Manage and deploy your selected AI-powered assistant
              </p>
            </div>
          </div>

          {!selectedAssistantId ? (
            <Card className="bg-glass border-glass backdrop-blur-md p-12 text-center">
              <Mic className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No assistant selected</h3>
              <p className="text-muted-foreground mb-6">
                Please select an assistant from the dropdown above to view its details
              </p>
            </Card>
          ) : !assistant ? (
            <Card className="bg-glass border-glass backdrop-blur-md p-12 text-center">
              <Mic className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Assistant not found</h3>
              <p className="text-muted-foreground mb-6">
                The selected assistant could not be found or you don't have access to it.
                {!user && " Try logging in if this is your assistant."}
              </p>
              {!user && (
                <Button onClick={() => window.location.href = '/auth'} variant="outline">
                  Sign In
                </Button>
              )}
            </Card>
          ) : (
            (() => {
              const trialStatus = getTrialStatus(assistant);
              return (
            <Card className="bg-glass border-glass backdrop-blur-md p-6">
              {/* 24-Hour Free Trial Banner — hidden for paid subscribers and admin-activated assistants */}
              {!isPaidSubscriber && assistant.is_trial !== false && (
                <AssistantTrialBanner 
                  createdAt={assistant.created_at}
                  businessName={assistant.business_name}
                  is_trial={assistant.is_trial}
                  trial_expires_at={assistant.trial_expires_at}
                  className="mb-4"
                />
              )}

              
              {/* Legacy Trial Expiration Alert Banner (for is_trial flag) */}
              {trialStatus.isTrialAssistant && (trialStatus.isExpired || trialStatus.isExpiringSoon) && (
                <div className={`mb-4 p-4 rounded-lg border ${
                  trialStatus.isExpired 
                    ? 'bg-destructive/10 border-destructive/30' 
                    : 'bg-warning/10 border-warning/30'
                }`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {trialStatus.isExpired ? (
                        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                      )}
                      <div>
                        <p className={`font-semibold ${trialStatus.isExpired ? 'text-destructive' : 'text-warning'}`}>
                          {trialStatus.isExpired 
                            ? 'Trial Expired' 
                            : `Trial expires in ${trialStatus.daysRemaining} day${trialStatus.daysRemaining === 1 ? '' : 's'}`
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {trialStatus.isExpired 
                            ? 'This assistant is no longer active. Contact support to reactivate.' 
                            : 'Book a demo to keep your assistant running without interruption.'
                          }
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => window.open('https://calendar.app.google/cbkE71koNXVDvW2V8', '_blank')}
                      variant={trialStatus.isExpired ? 'destructive' : 'default'}
                    >
                      Book Demo
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <Mic className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-semibold">{assistant.business_name}</h3>
                      {/* 24-Hour Trial Timer */}
                      <AssistantTrialTimer createdAt={assistant.created_at} variant="badge" is_trial={assistant.is_trial} trial_expires_at={assistant.trial_expires_at} />
                      
                      {trialStatus.isTrialAssistant && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            trialStatus.isExpired 
                              ? 'bg-destructive/10 text-destructive border-destructive/30' 
                              : trialStatus.isExpiringSoon 
                                ? 'bg-warning/10 text-warning border-warning/30'
                                : 'bg-primary/10 text-primary border-primary/30'
                          }`}
                        >
                          {trialStatus.isExpired 
                            ? 'Subscription Expired' 
                            : `Plan: ${trialStatus.daysRemaining}d left`
                          }
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground flex items-center gap-1 text-sm">
                      <Globe className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{assistant.website_url}</span>
                    </p>
                  </div>
                </div>
                
                {/* Mobile-optimized badges and buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <CalendarIntegrationBadge assistantId={assistant.id} />
                    <Badge variant="outline" className="gap-1 flex-shrink-0">
                      <User className="w-3 h-3" />
                      {assistant.voice_type}
                    </Badge>
                    <Badge variant="outline" className="flex-shrink-0">{assistant.tone}</Badge>
                  </div>
                  
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowQRCode(true)}
                      className="gap-1 flex-1 sm:flex-initial"
                    >
                      <QrCode className="w-4 h-4" />
                      <span className="hidden sm:inline">QR Code</span>
                      <span className="sm:hidden">QR</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAssistant(assistant.id, assistant.business_name)}
                      className="flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {assistant.description && (
                <p className="text-sm text-muted-foreground mb-4">
                  {assistant.description}
                </p>
              )}

              <EmbedCodePreview 
                embedCode={assistant.embed_code || `<script data-assistant="${assistant.id}" data-base-url="${window.location.origin}" src="${window.location.origin}/widget.js"></script>`}
                previewUrl={assistant.preview_url || generatePreviewUrl(assistant.id)}
                businessName={assistant.business_name}
                assistantId={assistant.id}
                previewSlug={(assistant as any).preview_slug}
              />

              {/* Installation Guide Link */}
              <div className="mt-4 p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">Need help installing?</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('/installation-guide', '_blank')}
                    className="gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Installation Guide
                  </Button>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex items-center justify-between text-sm text-muted-foreground">
               <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Created {formatDistanceToNow(new Date(assistant.created_at), { addSuffix: true })}
                  </span>
                  {assistant.calendly_link && (
                    <Badge variant="secondary" className="flex items-center gap-1 text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400">
                      <Calendar className="w-3 h-3" />
                      Calendly Connected
                    </Badge>
                  )}
                </div>
                {assistant.scraped_content && (
                  <Badge variant="secondary" className="text-xs">
                    {assistant.scraped_content.allPages?.length || assistant.scraped_content.pages?.length || assistant.scraped_content.navigation?.length || 0} pages analyzed
                  </Badge>
                )}
              </div>
            </Card>
              );
            })()
          )}

          {/* Assistant Management Modal */}
          {selectedAssistant && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-background rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">
                      {selectedAssistant.business_name} - Management
                    </h2>
                    <Button 
                      variant="ghost" 
                      onClick={() => setSelectedAssistant(null)}
                    >
                      ✕
                    </Button>
                  </div>
                  
                  <Tabs defaultValue="preview" className="w-full">
                    <TabsList className="grid w-full grid-cols-6">
                      <TabsTrigger value="preview">Website Preview</TabsTrigger>
                      <TabsTrigger value="availability">Availability Management</TabsTrigger>
                      <TabsTrigger value="namespace-manager">Namespace Manager</TabsTrigger>
                      <TabsTrigger value="validation">Integration Security</TabsTrigger>
                      <TabsTrigger value="diagnostics">Search Diagnostics</TabsTrigger>
                      <TabsTrigger value="batch-rescrape">Bulk Upgrade</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="preview" className="mt-6">
                      <WebsitePreview assistant={selectedAssistant} />
                    </TabsContent>
                    
                    <TabsContent value="availability" className="mt-6">
                      <TimeSlotManager assistantId={selectedAssistant.id} />
                    </TabsContent>

                    <TabsContent value="diagnostics" className="mt-6">
                      <KnowledgeSearchDiagnostics assistantId={selectedAssistant.id} />
                    </TabsContent>

                    <TabsContent value="batch-rescrape" className="mt-6">
                      <BatchRescrapeManager />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {assistant && (
        <AssistantQRCode
          open={showQRCode}
          onOpenChange={setShowQRCode}
          assistantName={assistant.business_name}
          assistantId={assistant.id}
          previewUrl={assistant.preview_url || undefined}
        />
      )}
    </section>
  );
};

const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <label className={className}>{children}</label>
);
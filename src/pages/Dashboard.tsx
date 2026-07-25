import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon, CheckCircle, UserCircle, Key, BarChart3 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
// Removed: import { DatePicker } from "@/components/date-picker";
// Lazy load large components for better performance
const ReviewsDashboard = React.lazy(() => import('@/components/ReviewsDashboard'));
const WhiteLabelSettings = React.lazy(() => import("@/components/WhiteLabelSettings"));
const AssistantDashboard = React.lazy(() => import("@/components/AssistantDashboard").then(m => ({ default: m.AssistantDashboard })));
const BookingManagement = React.lazy(() => import("@/components/BookingManagement").then(m => ({ default: m.BookingManagement })));
const UnifiedAnalyticsDashboard = React.lazy(() => import("@/components/UnifiedAnalyticsDashboard").then(m => ({ default: m.UnifiedAnalyticsDashboard })));
const ConsolidatedAnalytics = React.lazy(() => import("@/components/ConsolidatedAnalytics").then(m => ({ default: m.ConsolidatedAnalytics })));
const WidgetDocumentation = React.lazy(() => import("@/components/WidgetDocumentation").then(m => ({ default: m.WidgetDocumentation })));
const VoiceFormsManager = React.lazy(() => import("@/components/VoiceFormsManager").then(m => ({ default: m.VoiceFormsManager })));
const WhatsAppChannelManager = React.lazy(() => import("@/components/WhatsAppChannelManager").then(m => ({ default: m.WhatsAppChannelManager })));
const EmailInbox = React.lazy(() => import("@/components/EmailInbox"));
const AssistantEditForm = React.lazy(() => import("@/components/AssistantEditForm").then(m => ({ default: m.AssistantEditForm })));
const ServicesCatalogManager = React.lazy(() => import("@/components/ServicesCatalogManager").then(m => ({ default: m.ServicesCatalogManager })));
const ProjectInquiriesManager = React.lazy(() => import("@/components/ProjectInquiriesManager").then(m => ({ default: m.ProjectInquiriesManager })));
const ConsultationBookingsManager = React.lazy(() => import("@/components/ConsultationBookingsManager").then(m => ({ default: m.ConsultationBookingsManager })));
const FollowUpSettings = React.lazy(() => import("@/components/FollowUpSettings").then(m => ({ default: m.FollowUpSettings })));
const ContentRefreshManager = React.lazy(() => import("@/components/ContentRefreshManager").then(m => ({ default: m.ContentRefreshManager })));

const CrawlStatusBanner = React.lazy(() => import("@/components/CrawlStatusBanner").then(m => ({ default: m.CrawlStatusBanner })));
const DocumentUploadSection = React.lazy(() => import("@/components/DocumentUploadSection").then(m => ({ default: m.DocumentUploadSection })));
const MeetingLinksSettings = React.lazy(() => import("@/components/MeetingLinksSettings").then(m => ({ default: m.MeetingLinksSettings })));
const KnowledgeBasePage = React.lazy(() => import("@/components/KnowledgeBasePage").then(m => ({ default: m.KnowledgeBasePage })));
const WorkspaceMembersManager = React.lazy(() => import("@/components/WorkspaceMembersManager").then(m => ({ default: m.WorkspaceMembersManager })));
const KnowledgeChangeLog = React.lazy(() => import("@/components/KnowledgeChangeLog").then(m => ({ default: m.KnowledgeChangeLog })));
const WorkspaceWebhooksManager = React.lazy(() => import("@/components/WorkspaceWebhooksManager").then(m => ({ default: m.WorkspaceWebhooksManager })));
const OwnerKnowledgeAlertsCard = React.lazy(() => import("@/components/OwnerKnowledgeAlertsCard").then(m => ({ default: m.OwnerKnowledgeAlertsCard })));
const DigestSettings = React.lazy(() => import("@/components/DigestSettings").then(m => ({ default: m.DigestSettings })));
import { SlackIntegrationSettings } from "@/components/SlackIntegrationSettings";
const DepartmentsManager = React.lazy(() => import("@/components/DepartmentsManager").then(m => ({ default: m.DepartmentsManager })));
const PromptVersionHistory = React.lazy(() => import("@/components/PromptVersionHistory"));
const WorkspaceAuditLog = React.lazy(() => import("@/components/WorkspaceAuditLog"));
// AdvancedAnalyticsDashboard now rendered inside ConsolidatedAnalytics tabs

// Keep non-lazy for frequently used small components
import { UsageTracker } from "@/components/UsageTracker";
import { ProfileForm } from "@/components/ProfileForm";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { APIKeyManagement } from "@/components/APIKeyManagement";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { FeatureGate } from "@/components/FeatureGate";
import { FeatureUsageCard } from "@/components/FeatureUsageCard";
import { useNavigate, useSearchParams, Navigate, Link } from "react-router-dom";
const talkwebLogo = "/images/talkweb-logo.webp";
import { useSubscription } from "@/hooks/useSubscription";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { useFeatureMiddleware } from "@/hooks/useFeatureMiddleware";
const formSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters."
  })
});
const Dashboard = () => {
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>(null);
  const [assistants, setAssistants] = useState<any[]>([]);
  const [ownedAssistants, setOwnedAssistants] = useState<any[]>([]);
  const {
    toast
  } = useToast();
  const {
    user,
    loading: authLoading,
    signOut
  } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialView = searchParams.get('view') || searchParams.get('tab') || 'overview';
  const [activeView, setActiveView] = useState<string>(initialView);
  const {
    subscription,
    loading: subLoading
  } = useSubscription();
  const {
    hasFeature,
    canCreateAssistant,
    currentTier,
    planInfo
  } = useFeatureGating();
  const {
    navigateWithFeatureCheck
  } = useFeatureMiddleware();
  const handleViewChange = (value: string) => {
    setActiveView(value);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value === 'overview') {
        newParams.delete('view');
      } else {
        newParams.set('view', value);
      }
      return newParams;
    });
  };
  useEffect(() => {
    const fetchAssistants = async () => {
      try {
        if (authLoading) return;
        if (!user) return;
        console.log("Dashboard: fetching assistants for", user.email, user.id);
        const [ownedRes, memberRes] = await Promise.all([
          supabase.from('assistants').select('id, business_name, booking_notification_email, transcript_notifications_enabled, website_url').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('workspace_members').select('assistant_id, role, status').eq('user_id', user.id).eq('status', 'active'),
        ]);
        if (ownedRes.error) {
          console.error("Dashboard: error fetching owned assistants:", ownedRes.error);
        }
        if (memberRes.error) {
          console.error("Dashboard: error fetching workspace memberships:", memberRes.error);
        }
        let merged = ownedRes.data || [];
        const memberIds = (memberRes.data || []).map((m: any) => m.assistant_id).filter(Boolean);
        console.log("Dashboard: owned=", merged.length, "memberships=", memberIds.length, memberIds);
        const missingIds = memberIds.filter((id: string) => !merged.some((a: any) => a.id === id));
        if (missingIds.length) {
          const { data: shared, error: sharedErr } = await supabase
            .from('assistants')
            .select('id, business_name, booking_notification_email, transcript_notifications_enabled, website_url')
            .in('id', missingIds);
          if (sharedErr) console.error("Dashboard: error fetching shared assistants:", sharedErr);
          if (shared && shared.length) merged = [...merged, ...shared];
          else console.warn("Dashboard: no shared assistants returned for ids", missingIds);
        }
        console.log("Dashboard: final assistants list:", merged);
        setAssistants(merged);
        setOwnedAssistants(ownedRes.data || []);
        if (merged.length > 0) {
          setSelectedAssistantId((prev) => {
            if (prev && merged.some((a: any) => a.id === prev)) return prev;
            return merged[0].id;
          });
        }
      } catch (error: any) {
        console.error("Could not fetch assistants:", error);
        toast({
          title: "Error fetching assistants",
          description: error?.message || "Failed to load assistants. Please try again.",
          variant: "destructive"
        });
      }
    };
    fetchAssistants();
  }, [user, authLoading, toast]);
  useEffect(() => {
    const view = searchParams.get('view') || searchParams.get('tab') || 'overview';
    setActiveView(view);
  }, [searchParams]);

  // SEO: basic title, description, and canonical tag for the dashboard
  useEffect(() => {
    document.title = "AI Assistant Dashboard | TalkWeb";
    const desc = "Manage your AI assistants: analytics, booking, knowledge, branding, and more.";
    let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (metaDesc) {
      metaDesc.content = desc;
    } else {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      metaDesc.content = desc;
      document.head.appendChild(metaDesc);
    }
    const canonicalHref = window.location.origin + '/dashboard';
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (link) {
      link.href = canonicalHref;
    } else {
      link = document.createElement('link');
      link.rel = 'canonical';
      link.href = canonicalHref;
      document.head.appendChild(link);
    }
  }, []);
  const selectedAssistant = assistants.find(a => a.id === selectedAssistantId) || null;
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: ""
    }
  });
  function onSubmit(values: z.infer<typeof formSchema>) {
    toast({
      title: "You submitted the following values:",
      description: <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(values, null, 2)}</code>
        </pre>
    });
  }
  if (authLoading) {
    return <div className="container mx-auto py-10">
        <Card>
          <CardContent>Loading...</CardContent>
        </Card>
      </div>;
  }
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <DashboardSidebar 
          selectedAssistantId={selectedAssistantId || undefined}
          activeView={activeView}
          onViewChange={handleViewChange}
        />
        
        <main className="flex-1">
          <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
            {/* Desktop: Sidebar Toggle Button (always visible) */}
            <div className="hidden md:block fixed top-5 left-4 z-50">
              <SidebarTrigger />
            </div>
            {/* PWA Install Button */}
            <div className="fixed bottom-24 right-4 z-[60]">
              <PWAInstallButton />
            </div>

            <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8 pl-12 md:pl-0">
              <div className="flex items-center gap-4 flex-1">
                <Link to="/" className="hover:opacity-80 transition-opacity">
                  <img src={talkwebLogo} alt="TalkWeb Logo" className="h-8 w-auto" />
                </Link>
                <div className="flex-1">
                  <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
                  {user?.email && <p className="text-sm text-muted-foreground mt-1">
                      {user.email}
                    </p>}
                </div>
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                {!subLoading && <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-2">
                    <Badge variant="outline" className="text-xs md:text-sm w-fit">
                      Plan: {subscription?.subscribed ? subscription.subscription_tier || 'Premium' : 'Free'}
                    </Badge>
                    {subscription?.subscribed && subscription.subscription_end && <span className="text-xs md:text-sm text-muted-foreground">
                        Renews {format(new Date(subscription.subscription_end), 'MMM d, yyyy', {
                    locale: enUS
                  })}
                      </span>}
                  </div>}
                {user && <ProfileDropdown onProfileClick={() => handleViewChange('profile')} onSignOut={() => {
                signOut();
                navigate('/auth');
              }} />}
              </div>
            </header>
            
            <Card className="ml-0 md:ml-0" variant="modern">
              <CardHeader>
                <CardTitle className="ai-gradient-text">Select an Assistant</CardTitle>
                <CardDescription>
                  Choose an assistant to manage from the dropdown below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedAssistantId || undefined} onValueChange={v => setSelectedAssistantId(v)}>
                  <SelectTrigger className="w-full md:w-[280px]">
                    <SelectValue placeholder="Select an assistant" />
                  </SelectTrigger>
                  <SelectContent>
                    {assistants.map(assistant => <SelectItem key={assistant.id} value={assistant.id}>
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate">{assistant.business_name}</span>
                        </div>
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <div className="mt-8">
              {/* Overview */}
              {activeView === 'overview' && (
                <div>
                  {(() => {
                    const isTeamMemberOnly = ownedAssistants.length === 0 && assistants.length > 0;
                    if (isTeamMemberOnly) {
                      return (
                        <Card className="mb-6" variant="modern">
                          <CardContent className="py-6">
                            <h3 className="text-base font-medium">You're a team member</h3>
                            <p className="text-sm text-muted-foreground">
                              You've been invited to a shared workspace. Access and billing for these assistants are managed by the workspace owner — no upgrade needed on your account.
                            </p>
                          </CardContent>
                        </Card>
                      );
                    }
                    return (
                      <>
                        {!subLoading && !subscription?.subscribed && <Card className="mb-6" variant="aiGlow">
                            <CardContent className="py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div>
                                <h3 className="text-base font-medium">Start your subscription</h3>
                                <p className="text-sm text-muted-foreground">Subscribe to create and save assistants without limits.</p>
                              </div>
                              <Button onClick={() => navigate('/pricing')} variant="aiAccent">Choose a Plan</Button>
                            </CardContent>
                          </Card>}
                        
                        <div className="grid grid-cols-1 gap-4 mb-6">
                          <FeatureUsageCard feature="create_assistant" currentUsage={ownedAssistants.length} title="Assistants Created" description={`${ownedAssistants.length} of ${planInfo.limits.assistants === -1 ? '∞' : planInfo.limits.assistants} assistants`} />
                        </div>
                      </>
                    );
                  })()}
                  <React.Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
                    <AssistantDashboard selectedAssistantId={selectedAssistantId} />
                  </React.Suspense>
                </div>
              )}

              {/* General Settings */}
              {activeView === 'settings' && (
                <div className="space-y-6">
                  <Card variant="modern">
                    <CardHeader className="ai-section-header">
                      <CardTitle className="ai-gradient-text">General Settings</CardTitle>
                      <CardDescription>
                        Manage your account and application preferences
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Account Information</h3>
                        <div className="rounded-lg border p-4 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Email</span>
                            <span className="text-sm font-medium">{user?.email}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Plan</span>
                            <Badge variant="outline">
                              {subscription?.subscribed ? subscription.subscription_tier || 'Premium' : 'Free'}
                            </Badge>
                          </div>
                          {subscription?.subscribed && subscription?.subscription_end && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Renews</span>
                              <span className="text-sm font-medium">
                                {format(new Date(subscription.subscription_end), "MMM dd, yyyy")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Quick Actions</h3>
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewChange('profile')}
                          >
                            <UserCircle className="h-4 w-4 mr-2" />
                            Edit Profile
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewChange('api-keys')}
                          >
                            <Key className="h-4 w-4 mr-2" />
                            API Keys
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate('/pricing')}
                          >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View Plans
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Resources</h3>
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            asChild
                          >
                            <a href="/help-center" target="_blank" rel="noopener noreferrer">
                              Help Center
                            </a>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            asChild
                          >
                            <a href="/developers" target="_blank" rel="noopener noreferrer">
                              Documentation
                            </a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Profile */}
              {activeView === 'profile' && (
                <ProfileForm />
              )}

              {/* Reviews */}
              {activeView === 'reviews' && (
                selectedAssistantId ? (
                  <div className="ai-card-container space-y-6">
                    <React.Suspense fallback={<div className="p-4 text-center">Loading reviews...</div>}>
                      <ReviewsDashboard assistantId={selectedAssistantId} />
                    </React.Suspense>
                  </div>
                ) : (
                  <Card variant="modern">
                    <CardContent className="text-center py-8">
                      Please select an assistant to view reviews.
                    </CardContent>
                  </Card>
                )
              )}

              {/* Branding */}
              {activeView === 'branding' && (
                <FeatureGate feature="custom_branding">
                  {selectedAssistantId ? (
                    <div className="ai-card-container space-y-6">
                      <React.Suspense fallback={<div className="p-4 text-center">Loading branding...</div>}>
                        <WhiteLabelSettings assistantId={selectedAssistantId} />
                      </React.Suspense>
                    </div>
                  ) : (
                    <Card variant="modern">
                      <CardContent className="text-center py-8">
                        Please select an assistant to manage branding.
                      </CardContent>
                    </Card>
                  )}
                </FeatureGate>
              )}

              {/* Analytics - Consolidated view (Overview + Trends & Topics tabs) */}
              {(activeView === 'analytics' || activeView === 'advanced-analytics') && (
                <React.Suspense fallback={<div className="p-8 text-center">Loading analytics...</div>}>
                  <ConsolidatedAnalytics 
                    assistantId={selectedAssistantId} 
                    userId={user?.id} 
                  />
                </React.Suspense>
              )}

              {/* Bookings */}
              {(activeView === 'bookings' || activeView === 'consultation') && (
                selectedAssistantId ? (
                  <React.Suspense fallback={<div className="p-8 text-center">Loading bookings...</div>}>
                    <BookingManagement selectedAssistant={selectedAssistant} assistantId={selectedAssistantId} />
                  </React.Suspense>
                ) : (
                  <Card variant="modern">
                    <CardContent className="text-center py-8">
                      Please select an assistant to manage bookings.
                    </CardContent>
                  </Card>
                )
              )}

              {/* Services & Pricing */}
              {activeView === 'services' && (
                selectedAssistantId ? (
                  <React.Suspense fallback={<div className="p-8 text-center">Loading services...</div>}>
                    <ServicesCatalogManager assistantId={selectedAssistantId} />
                  </React.Suspense>
                ) : (
                  <Card variant="modern">
                    <CardContent className="text-center py-8">
                      Please select an assistant to manage services & pricing.
                    </CardContent>
                  </Card>
                )
              )}

              {/* Content Management */}
              {activeView === 'content' && (
                selectedAssistantId ? (
                  <div className="space-y-6">
                    <React.Suspense fallback={null}>
                      <CrawlStatusBanner
                        assistantId={selectedAssistantId}
                        onReindex={async () => {
                          const { data, error } = await supabase.functions.invoke('reindex-knowledge', {
                            body: { assistantId: selectedAssistantId }
                          });
                          if (error) throw error;
                          if (!data?.success) throw new Error(data?.error || 'Reindex failed');
                        }}
                      />
                    </React.Suspense>
                    <React.Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
                      <DocumentUploadSection
                        assistantId={selectedAssistantId}
                        websiteUrl={assistants?.find(a => a.id === selectedAssistantId)?.website_url || ''}
                        onUploadComplete={() => {
                          // Optionally refresh content status
                        }}
                      />
                    </React.Suspense>
                    <React.Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
                      <ContentRefreshManager assistantId={selectedAssistantId} />
                    </React.Suspense>
                  </div>
                ) : (
                  <Card variant="modern">
                    <CardContent className="text-center py-8">
                      Please select an assistant to manage content.
                    </CardContent>
                  </Card>
                )
              )}

              {/* WhatsApp Channel */}
              {activeView === 'whatsapp' && (
                user ? (
                  selectedAssistantId ? (
                    <React.Suspense fallback={<div className="p-8 text-center">Loading WhatsApp…</div>}>
                      <WhatsAppChannelManager userId={user.id} assistantId={selectedAssistantId} />
                    </React.Suspense>
                  ) : (
                    <Card variant="modern">
                      <CardContent className="text-center py-8">
                        Please select an assistant to manage WhatsApp.
                      </CardContent>
                    </Card>
                  )
                ) : null
              )}

              {/* Email Inbox */}
              {activeView === 'email-inbox' && (
                selectedAssistantId ? (
                  <React.Suspense fallback={<div className="p-8 text-center">Loading email inbox…</div>}>
                    <EmailInbox assistantId={selectedAssistantId} />
                  </React.Suspense>
                ) : (
                  <Card variant="modern">
                    <CardContent className="text-center py-8">
                      Please select an assistant to manage email replies.
                    </CardContent>
                  </Card>
                )
              )}

              {/* Team & Roles */}
              {activeView === 'team' && (
                selectedAssistantId ? (
                  <React.Suspense fallback={<div className="p-8 text-center">Loading team…</div>}>
                    <div className="space-y-6">
                      <WorkspaceMembersManager assistantId={selectedAssistantId} />
                      <OwnerKnowledgeAlertsCard assistantId={selectedAssistantId} />
                      <WorkspaceWebhooksManager assistantId={selectedAssistantId} />
                      <KnowledgeChangeLog assistantId={selectedAssistantId} />
                      <DigestSettings assistantId={selectedAssistantId} />
                      <SlackIntegrationSettings />
                    </div>
                  </React.Suspense>
                ) : (
                  <Card>
                    <CardContent className="text-center py-8">
                      Select an assistant to manage its team.
                    </CardContent>
                  </Card>
                )
              )}

              {/* Departments */}
              {activeView === 'departments' && (
                selectedAssistantId ? (
                  <React.Suspense fallback={<div className="p-8 text-center">Loading departments…</div>}>
                    <DepartmentsManager assistantId={selectedAssistantId} />
                  </React.Suspense>
                ) : (
                  <Card>
                    <CardContent className="text-center py-8">
                      Select an assistant to manage its departments.
                    </CardContent>
                  </Card>
                )
              )}

              {/* Prompt history */}
              {activeView === 'prompt-history' && (
                selectedAssistantId ? (
                  <React.Suspense fallback={<div className="p-8 text-center">Loading history…</div>}>
                    <PromptVersionHistory assistantId={selectedAssistantId} />
                  </React.Suspense>
                ) : (
                  <Card><CardContent className="text-center py-8">Select an assistant first.</CardContent></Card>
                )
              )}

              {/* Audit log */}
              {activeView === 'audit-log' && (
                selectedAssistantId ? (
                  <React.Suspense fallback={<div className="p-8 text-center">Loading audit log…</div>}>
                    <WorkspaceAuditLog assistantId={selectedAssistantId} />
                  </React.Suspense>
                ) : (
                  <Card><CardContent className="text-center py-8">Select an assistant first.</CardContent></Card>
                )
              )}

              {/* Advanced analytics now lives inside the Analytics tab (Trends & Topics) */}


              {/* Voice Forms */}
              {activeView === 'voice-forms' && (
                user ? (
                  selectedAssistantId ? (
                    <React.Suspense fallback={<div className="p-8 text-center">Loading voice forms...</div>}>
                      <VoiceFormsManager userId={user.id} assistantId={selectedAssistantId} />
                    </React.Suspense>
                  ) : (
                    <Card variant="modern">
                      <CardContent className="text-center py-8">
                        Please select an assistant to view voice forms.
                      </CardContent>
                    </Card>
                  )
                ) : (
                  <Card variant="modern">
                    <CardContent className="text-center py-8">
                      Loading...
                    </CardContent>
                  </Card>
                )
              )}

              {/* Documentation */}
              {activeView === 'documentation' && (
                selectedAssistantId ? (
                  <React.Suspense fallback={<div className="p-8 text-center">Loading documentation...</div>}>
                    <WidgetDocumentation assistantId={selectedAssistantId} />
                  </React.Suspense>
                ) : (
                  <Card variant="modern">
                    <CardContent className="text-center py-8">
                      Select an assistant to see tailored installation docs or use the Overview tab.
                    </CardContent>
                  </Card>
                )
              )}

              {/* Create Assistant */}
              {activeView === 'create-assistant' && (
                <FeatureGate feature="create_assistant" currentUsage={ownedAssistants.length} fallback={<Card>
                      <CardHeader>
                        <CardTitle>Create a New Assistant</CardTitle>
                        <CardDescription>Launch the guided builder to set up a new voice assistant.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button onClick={() => canCreateAssistant(ownedAssistants.length) ? navigateWithFeatureCheck('/create-assistant?from=dashboard') : null} disabled={!canCreateAssistant(ownedAssistants.length)}>
                          Start Assistant Builder
                        </Button>
                      </CardContent>
                    </Card>}>
                  <Card>
                    <CardHeader>
                      <CardTitle>Create a New Assistant</CardTitle>
                      <CardDescription>Launch the guided builder to set up a new voice assistant.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button onClick={() => navigateWithFeatureCheck('/create-assistant?from=dashboard')}>
                        Start Assistant Builder
                      </Button>
                    </CardContent>
                  </Card>
                </FeatureGate>
              )}

              {/* Edit Assistant */}
              {activeView === 'edit-assistant' && (
                selectedAssistantId ? (
                  <React.Suspense fallback={<div className="p-8 text-center">Loading assistant editor...</div>}>
                    <AssistantEditForm assistantId={selectedAssistantId} onUpdate={() => {
                    const fetchAssistants = async () => {
                      const { data } = await supabase.from('assistants').select('*').order('created_at', {
                        ascending: false
                      });
                      if (data) setAssistants(data);
                    };
                    fetchAssistants();
                  }} />
                  </React.Suspense>
                ) : (
                  <Card>
                    <CardContent className="text-center py-8">
                      Please select an assistant to edit.
                    </CardContent>
                  </Card>
                )
              )}

              {/* API Keys */}
              {activeView === 'api-keys' && (
                <FeatureGate feature="api_access">
                  <APIKeyManagement />
                </FeatureGate>
              )}

              {/* Knowledge Base */}
              {activeView === 'knowledge-base' && (
                selectedAssistantId ? (
                  <React.Suspense fallback={<div className="p-8 text-center">Loading knowledge base...</div>}>
                    <KnowledgeBasePage assistantId={selectedAssistantId} />
                  </React.Suspense>
                ) : (
                  <Card variant="modern">
                    <CardContent className="text-center py-8">
                      Please select an assistant to manage the knowledge base.
                    </CardContent>
                  </Card>
                )
              )}

              {/* Meeting Links */}
              {activeView === 'meeting-links' && (
                <FeatureGate feature="calendar_integration">
                {selectedAssistantId ? (
                  <Card variant="modern">
                    <CardHeader className="ai-section-header">
                      <CardTitle className="ai-gradient-text">Meeting Links</CardTitle>
                      <CardDescription>
                        Configure your video meeting platform links for bookings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <React.Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
                        <MeetingLinksSettings assistantId={selectedAssistantId} />
                      </React.Suspense>
                    </CardContent>
                  </Card>
                ) : (
                  <Card variant="modern">
                    <CardContent className="text-center py-8">
                      Please select an assistant to configure meeting links.
                    </CardContent>
                  </Card>
                )
                }
                </FeatureGate>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};
export default Dashboard;
export { Dashboard };
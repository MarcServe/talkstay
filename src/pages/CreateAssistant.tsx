import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { FeatureGate } from '@/components/FeatureGate';
import { AssistantBuilder } from '@/components/AssistantBuilder';
import { TrialAssistantUpgradeNotice } from '@/components/TrialAssistantUpgradeNotice';
import { KnowledgeBaseBuilder } from '@/components/KnowledgeBaseBuilder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Bot, 
  Settings,
  ArrowLeft,
  User,
  Crown,
  Eye,
  Copy,
  Lock,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const CreateAssistant = () => {
  const { user } = useAuth();
  const { subscription, loading: subscriptionLoading, createCheckout } = useSubscription();
  const { canCreateAssistant, hasFeature } = useFeatureGating();
  const { toast } = useToast();
  const [assistantCreated, setAssistantCreated] = useState(false);
  const [searchParams] = useSearchParams();
  
  // Check if accessed from dashboard (simplified mode)
  const fromDashboard = searchParams.get('from') === 'dashboard';

  const handlePreview = () => {
    toast({
      title: "Preview Mode",
      description: "Test your assistant in the preview window. You can interact with it to see how it works!",
    });
  };

  const handleCopyCode = () => {
    if (!user || !subscription.subscribed) {
      toast({
        title: "Premium Feature",
        description: "Subscribe to copy your assistant's embed code, save your work, and get Calendly integration.",
        variant: "destructive"
      });
      return;
    }
    
    const embedCode = `<script src="https://yoursite.com/widget.js" data-assistant-id="123"></script>`;
    navigator.clipboard.writeText(embedCode);
    toast({
      title: "Code Copied!",
      description: "The embed code has been copied to your clipboard.",
    });
  };

  const handleSubscribe = async () => {
    try {
      await createCheckout('professional');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start subscription process. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Simplified Dashboard View
  if (fromDashboard) {
    return (
      <div className="min-h-screen bg-background">
        {/* Simplified Header */}
        <header className="border-b border-border/10 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-semibold">Create New Assistant</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content with Tabs */}
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Card className="border-border/20 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Settings className="w-5 h-5 text-primary" />
                Assistant Configuration
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Create a voice assistant from your website or uploaded documents
              </p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="auto-scrape" className="w-full">
                <TabsList className="grid w-full grid-cols-2 p-1">
                  <TabsTrigger 
                    value="auto-scrape" 
                    className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-700 dark:data-[state=active]:text-cyan-300 data-[state=active]:border-b-2 data-[state=active]:border-cyan-500"
                  >
                    Auto-Scrape Website
                  </TabsTrigger>
                  <TabsTrigger 
                    value="upload-knowledge"
                    className="bg-primary/10 text-primary/70 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary"
                  >
                    Upload Knowledge Base
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="auto-scrape" className="mt-6">
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Enter your website URL and we'll automatically extract content to create your voice assistant.
                    </div>
                    <AssistantBuilder onAssistantCreated={() => setAssistantCreated(true)} />
                  </div>
                </TabsContent>
                
                <TabsContent value="upload-knowledge" className="mt-6">
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Upload a knowledge base file (JSON, PDF, DOCX, or TXT) to create your voice assistant.
                    </div>
                    <KnowledgeBaseBuilder 
                      onAssistantCreated={() => setAssistantCreated(true)}
                      showTrialNotice={false}
                    />
                  </div>
                </TabsContent>
              </Tabs>
              
              {assistantCreated && (
                <div className="mt-6 space-y-4">
                  {(!user || !subscription.subscribed) && <TrialAssistantUpgradeNotice />}
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-primary">Assistant Created!</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Your assistant is ready. You can now customize it further from the dashboard.
                    </p>
                    <Link to="/dashboard">
                      <Button variant="default" size="sm">
                        Go to Dashboard
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Full Create Assistant View (for homepage visitors)
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border/5 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="ghost" size="sm" className="flex-shrink-0">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Back to Home</span>
                  <span className="sm:hidden">Back</span>
                </Button>
              </Link>
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold truncate">Create Assistant</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {user ? (subscription.subscribed ? 'Full Features Available' : 'Preview Mode - Subscribe for Full Access') : 'Free Trial - Test Before You Buy'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {user ? (
                subscription.subscribed ? (
                  <Link to="/dashboard">
                    <Button variant="outline" size="sm" className="whitespace-nowrap">
                      <Crown className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Dashboard</span>
                      <span className="sm:hidden">Panel</span>
                    </Button>
                  </Link>
                ) : (
                  <Button variant="hero" size="sm" onClick={handleSubscribe} disabled={subscriptionLoading} className="whitespace-nowrap">
                    <Crown className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">{subscriptionLoading ? 'Loading...' : 'Subscribe $19/month'}</span>
                    <span className="sm:hidden">{subscriptionLoading ? 'Loading...' : 'Subscribe'}</span>
                  </Button>
                )
              ) : (
                <Link to="/auth">
                  <Button variant="hero" size="sm" className="whitespace-nowrap">
                    <User className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Sign In for More</span>
                    <span className="sm:hidden">Sign In</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Status Banner */}
        {!user && (
          <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-primary">Free Trial Mode</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Test our assistant builder for free! You can create, preview, test the voice interface, and view analytics. 
              <Link to="/auth" className="text-primary hover:underline ml-1">Sign up</Link> to save your work and get the embed code.
            </p>
          </div>
        )}

        {user && !subscription.subscribed && (
          <div className="mb-6 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-amber-600">Preview Mode</h3>
                  <p className="text-sm text-muted-foreground">
                    You can test the full assistant experience and view analytics. Subscribe to save, get embed code and Calendly integration.
                  </p>
                </div>
              </div>
              <Button variant="hero" onClick={handleSubscribe} disabled={subscriptionLoading}>
                Subscribe Now
              </Button>
            </div>
          </div>
        )}

        {user && subscription.subscribed && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-600">Premium Access Active</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Full access unlocked! Create, save, and get embed codes for your assistants.
            </p>
          </div>
        )}

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Create Voice Assistant</h2>
              <p className="text-muted-foreground text-sm">
                Build a voice assistant for your website
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handlePreview}>
                <Eye className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Preview & Test</span>
                <span className="sm:hidden">Preview</span>
              </Button>
              
              <Button 
                variant={user && subscription.subscribed ? "default" : "ghost"} 
                size="sm"
                onClick={handleCopyCode}
                disabled={!user || !subscription.subscribed}
              >
                {user && subscription.subscribed ? (
                  <>
                    <Copy className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Copy Embed Code</span>
                    <span className="sm:hidden">Copy</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Copy Code (Locked)</span>
                    <span className="sm:hidden">Locked</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <Card className="bg-glass border-glass backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Assistant Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="auto-scrape" className="w-full">
                <TabsList className="grid w-full grid-cols-2 p-1">
                  <TabsTrigger 
                    value="auto-scrape" 
                    className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-700 dark:data-[state=active]:text-cyan-300 data-[state=active]:border-b-2 data-[state=active]:border-cyan-500"
                  >
                    Auto-Scrape Website
                  </TabsTrigger>
                  <TabsTrigger 
                    value="upload-knowledge"
                    className="bg-primary/10 text-primary/70 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary"
                  >
                    Upload Knowledge Base
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="auto-scrape" className="mt-6">
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Enter your website URL and we'll automatically extract content and structure to create your voice assistant.
                    </div>
                    <AssistantBuilder onAssistantCreated={() => setAssistantCreated(true)} />
                  </div>
                </TabsContent>
                
                <TabsContent value="upload-knowledge" className="mt-6">
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Upload a JSON knowledge base file (from SiteSucker, custom crawlers, etc.) to create your voice assistant with pre-extracted content.
                    </div>
                    <KnowledgeBaseBuilder 
                      onAssistantCreated={() => setAssistantCreated(true)}
                      showTrialNotice={!user}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Instructions Section - Only show for subscribed users */}
          {user && subscription.subscribed && assistantCreated && (
            <Card className="bg-gradient-to-r from-green-500/5 to-emerald-500/5 border-green-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  Setup Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">1. Copy the Embed Code</h4>
                  <p className="text-sm text-muted-foreground">Click "Copy Embed Code" to get your assistant's code.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">2. Add to Your Website</h4>
                  <p className="text-sm text-muted-foreground">Paste the code before the closing &lt;/body&gt; tag of your website.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">3. Configure Settings</h4>
                  <p className="text-sm text-muted-foreground">Customize your assistant's appearance and behavior in the dashboard.</p>
                </div>
                <Link to="/dashboard">
                  <Button variant="outline" className="w-full">
                    Go to Full Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
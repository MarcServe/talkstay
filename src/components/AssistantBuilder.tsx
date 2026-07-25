import { useState, useEffect } from "react";
import { TrialAssistantUpgradeNotice } from "@/components/TrialAssistantUpgradeNotice";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Mic, Settings, Sparkles, Zap, LogIn, Languages, Copy, Save, Eye, BarChart3, Calendar, FormInput, Shield, RotateCcw, QrCode, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { WebsitePreview } from "./WebsitePreview";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { TimeSlotManager } from "./TimeSlotManager";
import KnowledgeBasePreview from "./KnowledgeBasePreview";
import { CalendarSetupPrompt } from "./CalendarSetupPrompt";
import { PlatformDetection } from "./PlatformDetection";
import { InstallationGuide } from "./InstallationGuide";
import { Switch } from "@/components/ui/switch";
import { getCurrentConfig } from "@/config/environment";
import { generatePreviewUrl } from "@/utils/previewUrlUtils";
import { AssistantQRCode } from "./AssistantQRCode";
interface AssistantConfig {
  businessName: string;
  websiteUrl: string;
  voiceType: string;
  tone: string;
  language: string;
  purpose: string;
  calendlyLink: string;
  description: string;
  enterpriseMode: boolean;
  scrapingMethod: 'light' | 'firecrawl' | 'crawl4ai';
  
}
interface PlatformDetectionResult {
  platform: string;
  confidence: number;
  technologyStack: any;
  cached: boolean;
}
interface AssistantBuilderProps {
  onAssistantCreated?: () => void;
  showTrialNotice?: boolean;
}

const normalizeHrefForSite = (href: string | undefined | null, baseUrl: string): string | null => {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.toLowerCase().startsWith('javascript:')) {
    return null;
  }

  try {
    const base = new URL(baseUrl);
    if (trimmed.startsWith('http')) {
      const target = new URL(trimmed);
      if (target.hostname !== base.hostname) {
        return target.href;
      }
      const path = target.pathname || '/';
      return path + (target.search || '');
    }

    if (trimmed.startsWith('/')) {
      return trimmed === '' ? '/' : trimmed;
    }

    return `/${trimmed.replace(/^\/*/, '')}`;
  } catch {
    return trimmed;
  }
};

const extractNavigationItems = (scrapedData: any, baseUrl: string): Array<{ text: string; href: string }> => {
  const rawNavigation =
    Array.isArray(scrapedData?.navigation)
      ? scrapedData.navigation
      : Array.isArray(scrapedData?.navigation?.pages)
        ? scrapedData.navigation.pages
        : Array.isArray(scrapedData?.links?.internal)
          ? scrapedData.links.internal
          : [];

  const items: Array<{ text: string; href: string }> = [];
  const seen = new Set<string>();

  rawNavigation.forEach((item: any, index: number) => {
    const text =
      (item?.text ??
        item?.label ??
        item?.title ??
        item?.name ??
        (typeof item === 'string' ? item : '')).toString().trim();

    const hrefCandidate =
      (typeof item?.href === 'string' && item.href) ||
      (typeof item?.url === 'string' && item.url) ||
      '';

    const normalizedHref = normalizeHrefForSite(hrefCandidate, baseUrl);

    if (!text || !normalizedHref) {
      return;
    }

    const dedupeKey = `${text.toLowerCase()}|${normalizedHref}`;
    if (seen.has(dedupeKey)) {
      return;
    }

    seen.add(dedupeKey);
    items.push({ text, href: normalizedHref });
  });

  return items;
};

const buildNavLinkMap = (navigationItems: Array<{ text: string; href: string }>): Record<string, string> => {
  const keywordMapping: Array<{ key: string; match: RegExp }> = [
    { key: 'home', match: /\bhome\b/ },
    { key: 'about', match: /\babout\b/ },
    { key: 'contact', match: /\bcontact\b/ },
    { key: 'pricing', match: /\bpricing|plans?\b/ },
    { key: 'services', match: /\bservices?\b/ },
    { key: 'team', match: /\bteam|staff|people\b/ },
    { key: 'blog', match: /\bblog|news\b/ },
    { key: 'faq', match: /\bfaq|questions\b/ }
  ];

  const navLinks: Record<string, string> = {};

  navigationItems.forEach((item, index) => {
    const label = item.text.toLowerCase();
    let key = '';

    const keywordEntry = keywordMapping.find(mapping => mapping.match.test(label));
    if (keywordEntry) {
      key = keywordEntry.key;
    } else {
      key = label
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .split(' ')
        .slice(0, 3)
        .join('_');
    }

    if (!key) {
      key = `link_${index + 1}`;
    }

    if (!navLinks[key]) {
      navLinks[key] = item.href;
    }
  });

  return navLinks;
};

export const AssistantBuilder = ({
  onAssistantCreated,
  showTrialNotice = false
}: AssistantBuilderProps = {}) => {
  const {
    toast
  } = useToast();
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const { canCreateAssistant, getUpgradeMessage, currentTier, loading: featureLoading } = useFeatureGating();
  const [isLoading, setIsLoading] = useState(false);
  const [createdAssistant, setCreatedAssistant] = useState<any>(null);
  const [platformDetection, setPlatformDetection] = useState<PlatformDetectionResult | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [assistantCount, setAssistantCount] = useState(0);
  const [config, setConfig] = useState<AssistantConfig>({
    businessName: "",
    websiteUrl: "",
    voiceType: "ballad",
    tone: "friendly",
    language: "english",
    purpose: "general_assistant",
    calendlyLink: "",
    description: "",
    enterpriseMode: false,
    scrapingMethod: 'crawl4ai'
  });

  // Fetch user's assistant count
  useEffect(() => {
    const fetchAssistantCount = async () => {
      if (user) {
        const { count } = await supabase
          .from('assistants')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);
        setAssistantCount(count || 0);
      }
    };
    fetchAssistantCount();
  }, [user]);

  // Check if user can create assistant (authenticated users only)
  const canCreate = !user || canCreateAssistant(assistantCount);

  // Local storage keys for trial persistence
  const TRIAL_CONFIG_KEY = 'voice_assistant_trial_config';
  const TRIAL_ASSISTANT_KEY = 'voice_assistant_trial_assistant';

  // Load saved trial data on mount (only for non-authenticated users)
  useEffect(() => {
    if (!user) {
      try {
        // Load saved config
        const savedConfig = localStorage.getItem(TRIAL_CONFIG_KEY);
        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig);
          setConfig(parsedConfig);
        }

        // Load saved assistant
        const savedAssistant = localStorage.getItem(TRIAL_ASSISTANT_KEY);
        if (savedAssistant) {
          const parsedAssistant = JSON.parse(savedAssistant);
          // Check if trial assistant is still valid (not expired)
          if (parsedAssistant.trial_expires_at && new Date(parsedAssistant.trial_expires_at) > new Date()) {
            setCreatedAssistant(parsedAssistant);
          } else {
            // Clear expired trial data
            localStorage.removeItem(TRIAL_ASSISTANT_KEY);
            localStorage.removeItem(TRIAL_CONFIG_KEY);
          }
        }
      } catch (error) {
        console.error('Failed to load trial data from localStorage:', error);
        // Clear corrupted data
        localStorage.removeItem(TRIAL_ASSISTANT_KEY);
        localStorage.removeItem(TRIAL_CONFIG_KEY);
      }
    }
  }, [user]);

  // Save config to localStorage for trial users
  useEffect(() => {
    if (!user && (config.businessName || config.websiteUrl)) {
      try {
        localStorage.setItem(TRIAL_CONFIG_KEY, JSON.stringify(config));
      } catch (error) {
        console.error('Failed to save config to localStorage:', error);
      }
    }
  }, [config, user]);
  const handlePlatformDetection = (result: PlatformDetectionResult) => {
    setPlatformDetection(result);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Block creation for lapsed users
    if (user && !canCreate) {
      toast({
        title: "Subscription Required",
        description: getUpgradeMessage('create_assistant'),
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      let scrapedData: any = null;
      let systemPrompt = '';
      let navigationItems: Array<{ text: string; href: string }> = [];
      if (config.enterpriseMode) {
        // Enterprise Mode: Skip scraping, create minimal assistant
        toast({
          title: "Creating Enterprise Assistant...",
          description: "Setting up for Bespoke integration..."
        });
        if (config.websiteUrl) {
          // Only do minimal navigation scrape to preserve navigation features
          const navResponse = await supabase.functions.invoke('minimal-navigation-scraper', {
            body: {
              url: config.websiteUrl
            }
          });
          if (navResponse.data?.success) {
            scrapedData = {
              title: navResponse.data.title,
              description: `Enterprise assistant for ${config.businessName}`,
              content: [`Enterprise knowledge base for ${config.businessName}`],
              navigation: navResponse.data.navigationData?.mainMenu || []
            };
            navigationItems = extractNavigationItems(scrapedData, config.websiteUrl);
          }
        }

        // Create minimal system prompt for enterprise mode
        systemPrompt = `You are a ${config.tone} enterprise voice assistant for ${config.businessName}.
        Language: Communicate primarily in ${config.language}
        
        CONVERSATION RULES:
        - NEVER use the same greeting twice - vary your responses naturally
        - Remember context from previous messages in the conversation
        - Be contextually aware of what the user just said
        - Respond naturally without repeating standard phrases
        - Keep responses conversational and engaging
        - Communicate primarily in ${config.language}, but be helpful if users speak other languages
        
        Your role:
        - Provide expert information from the enterprise knowledge base
        - Help users with business inquiries and navigation
        - Assist with booking appointments ${config.calendlyLink ? `using: ${config.calendlyLink}` : ''}
        - Provide a professional, ${config.tone} experience with a ${config.voiceType} voice
        
        ${config.description ? `Additional context: ${config.description}` : ''}
        
        When users mention navigation, respond with JSON: {"navigate": "/page-url"}
        For booking requests, guide them to the appropriate booking method.`;
      } else {
        // Standard Mode: Full website scraping
        toast({
          title: "Processing...",
          description: "Analyzing your website content..."
        });
        let scrapeResponse;
        if (config.scrapingMethod === 'crawl4ai') {
          scrapeResponse = await supabase.functions.invoke('crawl4ai-scraper', {
            body: {
              url: config.websiteUrl,
              mode: 'full'
            }
          });
        } else {
          // Default to existing light scraper with fallback
          try {
            scrapeResponse = await supabase.functions.invoke('scrape-website', {
              body: {
                url: config.websiteUrl
              }
            });
          } catch (fallbackError) {
            console.log('Light scraper failed, attempting crawl4ai fallback:', fallbackError);
            // Try crawl4ai as fallback if light scraper fails
            scrapeResponse = await supabase.functions.invoke('crawl4ai-scraper', {
              body: {
                url: config.websiteUrl,
                mode: 'full'
              }
            });
          }
        }
        // Enhanced error handling for Edge Function failures
        console.log('Scrape response:', scrapeResponse);
        
        if (scrapeResponse.error || !scrapeResponse.data?.success) {
          // Check if this is an Edge Function execution error
          if (scrapeResponse.error && scrapeResponse.error.message === 'Failed to send a request to the Edge Function') {
            toast({
              title: "Service temporarily unavailable",
              description: "Our website analysis service is temporarily unavailable. Please try again in a few minutes.",
              variant: "destructive"
            });
            throw new Error('Website analysis service is temporarily unavailable. Please try again in a few minutes.');
          }
          
          const errorMsg = scrapeResponse.data?.error || scrapeResponse.data?.details || (scrapeResponse.error as any)?.message || 'Failed to analyze website';
          const em = (errorMsg || '').toString();
          const emLower = em.toLowerCase();

          // Specific TLS/SSL cert issues
          if (/(ssl|tls|certificate|notvalidforname|invalid peer certificate|handshake)/i.test(em)) {
            throw new Error('Website SSL/HTTPS appears misconfigured. Try the https://www version of your URL or a different page. We attempt a fallback crawler, but if it still fails, please fix the certificate.');
          }
          // Preview/404
          if (emLower.includes('404') || config.websiteUrl.includes('lovable')) {
            throw new Error('Website not accessible. Please use a live, publicly accessible website URL (not preview/development URLs).');
          }
          // Timeouts / heavy sites
          if (emLower.includes('timeout') || emLower.includes('cpu time limit')) {
            throw new Error('Website is too complex or has heavy security. For custom AI integration services for complex websites, contact us at contact@bizboosters.co.uk');
          }
          // Network / blocking
          if (emLower.includes('failed to fetch') || emLower.includes('network') || emLower.includes('blocking automated access')) {
            throw new Error('Network error or website blocking access. If this persists, try the www version or contact contact@bizboosters.co.uk for help with secure sites.');
          }
          throw new Error(errorMsg);
        }
        if (!scrapeResponse.data?.data) {
          throw new Error('Website returned empty data. The site may have security measures preventing analysis or be too heavy. For custom integration services, contact contact@bizboosters.co.uk');
        }
        scrapedData = scrapeResponse.data?.data;

        let navigationItems = extractNavigationItems(scrapedData, config.websiteUrl);

        // Generate enhanced system prompt based on scraped content
        navigationItems = extractNavigationItems(scrapedData, config.websiteUrl);
        const navigationContext = navigationItems.length > 0 ? `Available navigation: ${navigationItems.map(nav => nav.text).join(', ')}` : '';
        const contentContext = scrapedData?.content?.length > 0 ? `Website content overview: ${scrapedData.content.slice(0, 2).join(' ')}` : '';
        systemPrompt = `You are a ${config.tone} voice assistant for ${config.businessName}.
        Website: ${config.websiteUrl}
        Language: Communicate primarily in ${config.language}
        ${scrapedData?.title ? `Page title: ${scrapedData.title}` : ''}
        ${scrapedData?.description ? `Description: ${scrapedData.description}` : ''}
        ${navigationContext}
        ${contentContext}
        
        CONVERSATION RULES:
        - NEVER use the same greeting twice - vary your responses naturally
        - Remember context from previous messages in the conversation
        - Be contextually aware of what the user just said
        - Respond naturally without repeating standard phrases
        - Keep responses conversational and engaging
        - Communicate primarily in ${config.language}, but be helpful if users speak other languages
        
        Your role:
        - Help users navigate the website and find information
        - Answer questions about ${config.businessName} services and offerings  
        - Assist with booking appointments ${config.calendlyLink ? `using: ${config.calendlyLink}` : ''}
        - Provide a welcoming, ${config.tone} experience with a ${config.voiceType} voice
        
        ${config.description ? `Additional context: ${config.description}` : ''}
        
        When users mention navigation (like "go to pricing" or "show me contact"), respond with JSON: {"navigate": "/page-url"}
        For booking requests, guide them to the appropriate booking method.`;
      }

      // Create assistant record with all data
      const assistantId = crypto.randomUUID();
      const envConfig = getCurrentConfig();
      const embedCode = `<script>
(function() {
  const script = document.createElement('script');
  script.src = '${envConfig.widgetUrl}';
  script.setAttribute('data-assistant', '${assistantId}');
  script.setAttribute('data-base-url', '${envConfig.baseUrl}');
  document.head.appendChild(script);
})();
</script>`;
      const previewUrl = generatePreviewUrl(assistantId, envConfig.baseUrl);
      toast({
        title: "Saving...",
        description: "Creating your voice assistant..."
      });

      // Create assistant record - always save to database (with trial status for non-authenticated users)
      const trialExpiresAt = new Date();
      trialExpiresAt.setHours(trialExpiresAt.getHours() + (7 * 24)); // 7 days from now

      // Generate slug from business name with conflict resolution
      const { generateSlugFromName } = await import('@/utils/previewUrlUtils');
      const baseSlug = generateSlugFromName(config.businessName);
      let preview_slug: string | null = baseSlug || null;

      // Check if slug already exists and append random suffix if needed
      if (preview_slug) {
        const { data: existingSlugs } = await supabase
          .from('assistants')
          .select('preview_slug')
          .eq('preview_slug', preview_slug)
          .limit(1);
        if (existingSlugs && existingSlugs.length > 0) {
          const suffix = Math.random().toString(36).substring(2, 6);
          preview_slug = `${baseSlug}-${suffix}`;
        }
      }

      const assistantData = {
        id: assistantId,
        user_id: user?.id || null,
        business_name: config.businessName,
        website_url: config.websiteUrl,
        voice_type: config.voiceType,
        voice_accent: config.voiceType,
        tone: config.tone,
        language: config.language,
        purpose: config.purpose,
        calendly_link: config.calendlyLink || null,
        description: config.description || null,
        scraped_content: scrapedData,
        navigation_map: navigationItems,
        nav_links: buildNavLinkMap(navigationItems),
        system_prompt: systemPrompt,
        embed_code: embedCode,
        preview_url: previewUrl,
        preview_slug: preview_slug,
        is_trial: !user,
        trial_expires_at: !user ? trialExpiresAt.toISOString() : null,
      };
      const {
        data,
        error
      } = await supabase.from('assistants').insert(assistantData).select().single();
      if (error) throw error;

      // Store the created assistant for preview
      setCreatedAssistant(data);

      // Index scraped content into knowledge_vectors immediately so RAG works from day one
      if (scrapedData) {
        try {
          console.log('Indexing initial scrape into knowledge vectors...');
          
          // Convert scrapedData into pages array for knowledge-upsert
          const pagesToIndex: Array<{url: string; title: string; content: string}> = [];

          // Extract from allPages if present
          if (scrapedData?.allPages && Array.isArray(scrapedData.allPages)) {
            for (const page of scrapedData.allPages) {
              const content = page.content || page.paragraphs?.join('\n\n') || '';
              if (content.trim().length > 20) {
                pagesToIndex.push({
                  url: page.url || config.websiteUrl,
                  title: page.title || config.businessName,
                  content
                });
              }
            }
          }

          // Fallback: use top-level content arrays
          if (pagesToIndex.length === 0 && scrapedData?.content && Array.isArray(scrapedData.content)) {
            pagesToIndex.push({
              url: config.websiteUrl,
              title: scrapedData.title || config.businessName,
              content: scrapedData.content.join('\n\n')
            });
          }

          // Fallback: use description/title as minimal context
          if (pagesToIndex.length === 0 && (scrapedData?.title || scrapedData?.description)) {
            pagesToIndex.push({
              url: config.websiteUrl,
              title: scrapedData.title || config.businessName,
              content: [scrapedData.title, scrapedData.description].filter(Boolean).join('\n\n')
            });
          }

          if (pagesToIndex.length > 0) {
            await supabase.functions.invoke('knowledge-upsert', {
              body: {
                assistantId: data.id,
                pages: pagesToIndex,
                replace: true,
              }
            });
            console.log(`Initial knowledge vector indexing complete: ${pagesToIndex.length} pages indexed`);
          } else {
            console.log('No scraped content to index into vectors');
          }
        } catch (indexError) {
          console.error('Failed to index initial content into vectors:', indexError);
          // Non-blocking: assistant still works, vectors can be built later via Firecrawl
        }
      }

      // Save assistant to localStorage for trial users
      if (!user) {
        try {
          localStorage.setItem(TRIAL_ASSISTANT_KEY, JSON.stringify(data));
        } catch (error) {
          console.error('Failed to save assistant to localStorage:', error);
        }
      } else {
        // Clear trial data for authenticated users
        localStorage.removeItem(TRIAL_ASSISTANT_KEY);
        localStorage.removeItem(TRIAL_CONFIG_KEY);
      }
      toast({
        title: user ? "🎉 Assistant Created Successfully!" : "🎉 Assistant Preview Ready!",
        description: user ? `Your voice assistant for ${config.businessName} is ready to deploy.` : `Test your assistant fully before subscribing!`
      });

      // Call the callback if provided
      onAssistantCreated?.();

      // Send welcome email only for authenticated users
      if (user) {
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              type: 'welcome',
              to: user.email,
              assistantData: {
                business_name: config.businessName,
                website_url: config.websiteUrl,
                voice_type: config.voiceType,
                tone: config.tone,
                language: config.language,
                calendly_link: config.calendlyLink,
                preview_url: previewUrl
              }
            }
          });
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
        }
      }
    } catch (error) {
      console.error('Error creating assistant:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create assistant. Please try again.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };
  const handleSaveAssistant = async () => {
    if (!user) {
      toast({
        title: "Sign up to save",
        description: "Please sign up to permanently save your assistant and get the embed code.",
      });
      setTimeout(() => navigate('/auth?next=/create-assistant'), 1500);
      return;
    }
    toast({
      title: "Assistant saved!",
      description: "Redirecting to your dashboard...",
    });
    setTimeout(() => navigate('/dashboard'), 1000);
  };
  const handleCopyEmbedCode = () => {
    if (!user) {
      toast({
        title: "Sign up required",
        description: "Please sign up to get the embed code for your assistant.",
      });
      setTimeout(() => navigate('/auth?next=/create-assistant'), 1500);
      return;
    }
    navigate('/dashboard');
  };
  const normalizeUrl = (url: string): string => {
    if (!url) return url;

    // Remove any whitespace
    url = url.trim();

    // If it doesn't start with http:// or https://, add https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Remove trailing slash
    url = url.replace(/\/$/, '');
    return url;
  };
  const updateConfig = (field: keyof AssistantConfig, value: string | boolean) => {
    // Normalize URL if it's the websiteUrl field
    const normalizedValue = field === 'websiteUrl' && typeof value === 'string' ? normalizeUrl(value) : value;
    setConfig(prev => ({
      ...prev,
      [field]: normalizedValue
    }));
  };
  const clearTrialData = () => {
    localStorage.removeItem(TRIAL_ASSISTANT_KEY);
    localStorage.removeItem(TRIAL_CONFIG_KEY);
    setCreatedAssistant(null);
    setConfig({
      businessName: "",
      websiteUrl: "",
      voiceType: "ballad",
      tone: "friendly",
      language: "english",
      purpose: "general_assistant",
      calendlyLink: "",
      description: "",
      enterpriseMode: false,
      scrapingMethod: 'crawl4ai'
    });
    toast({
      title: "Assistant cleared",
      description: "You can now create a new assistant"
    });
  };
  return <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              Build Your{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Voice Assistant
              </span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Enter your website details and we'll create a personalized AI assistant
            </p>
          </div>


          <Card className="bg-glass border-glass backdrop-blur-md p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Business Name */}
                <div className="space-y-2">
                  <Label htmlFor="businessName" className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Business Name *
                  </Label>
                  <Input id="businessName" value={config.businessName} onChange={e => updateConfig('businessName', e.target.value)} placeholder="Acme Corp" required />
                </div>

                {/* Website URL */}
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl" className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    Website URL *
                  </Label>
                  <Input id="websiteUrl" type="url" value={config.websiteUrl} onChange={e => updateConfig('websiteUrl', e.target.value)} placeholder="https://example.com" required />
                  {config.websiteUrl && <PlatformDetection websiteUrl={config.websiteUrl} onDetectionComplete={handlePlatformDetection} />}
                </div>

                {/* Voice Type */}
                <div className="space-y-2">
                  <Label htmlFor="voiceType" className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-primary" />
                    Voice Type *
                  </Label>
                  <Select value={config.voiceType} onValueChange={value => updateConfig('voiceType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select voice type" />
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
                    </SelectContent>
                  </Select>
                </div>

                {/* Purpose */}
                <div className="space-y-2">
                  <Label htmlFor="purpose" className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Assistant Purpose *
                  </Label>
                  <Select value={config.purpose} onValueChange={value => updateConfig('purpose', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general_assistant">General Assistant</SelectItem>
                      <SelectItem value="sales_lead_generation">Sales & Lead Generation</SelectItem>
                      <SelectItem value="customer_support">Customer Support</SelectItem>
                      <SelectItem value="marketing_promotion">Marketing & Promotion</SelectItem>
                      <SelectItem value="appointment_booking">Appointment Booking</SelectItem>
                      <SelectItem value="product_information">Product Information</SelectItem>
                      <SelectItem value="technical_support">Technical Support</SelectItem>
                      <SelectItem value="event_management">Event Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tone */}
                <div className="space-y-2">
                  <Label htmlFor="tone" className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-primary" />
                    Tone *
                  </Label>
                  <Select value={config.tone} onValueChange={value => updateConfig('tone', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="empathetic">Empathetic</SelectItem>
                      <SelectItem value="playful">Playful</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <Label htmlFor="language" className="flex items-center gap-2">
                    <Languages className="w-4 h-4 text-primary" />
                    Language *
                  </Label>
                  <Select value={config.language} onValueChange={value => updateConfig('language', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent className="bg-black dark:bg-gray-800 z-50">
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="spanish">Spanish</SelectItem>
                      <SelectItem value="french">French</SelectItem>
                      <SelectItem value="german">German</SelectItem>
                      <SelectItem value="italian">Italian</SelectItem>
                      <SelectItem value="portuguese">Portuguese</SelectItem>
                      <SelectItem value="russian">Russian</SelectItem>
                      <SelectItem value="chinese">Chinese (Mandarin)</SelectItem>
                      <SelectItem value="japanese">Japanese</SelectItem>
                      <SelectItem value="korean">Korean</SelectItem>
                      <SelectItem value="arabic">Arabic</SelectItem>
                      <SelectItem value="hindi">Hindi</SelectItem>
                      <SelectItem value="dutch">Dutch</SelectItem>
                      <SelectItem value="polish">Polish</SelectItem>
                      <SelectItem value="turkish">Turkish</SelectItem>
                      <SelectItem value="swedish">Swedish</SelectItem>
                      <SelectItem value="danish">Danish</SelectItem>
                      <SelectItem value="norwegian">Norwegian</SelectItem>
                      <SelectItem value="finnish">Finnish</SelectItem>
                      <SelectItem value="czech">Czech</SelectItem>
                      <SelectItem value="hungarian">Hungarian</SelectItem>
                      <SelectItem value="romanian">Romanian</SelectItem>
                      <SelectItem value="greek">Greek</SelectItem>
                      <SelectItem value="hebrew">Hebrew</SelectItem>
                      <SelectItem value="thai">Thai</SelectItem>
                      <SelectItem value="vietnamese">Vietnamese</SelectItem>
                      <SelectItem value="indonesian">Indonesian</SelectItem>
                      <SelectItem value="malay">Malay</SelectItem>
                      <SelectItem value="ukrainian">Ukrainian</SelectItem>
                      <SelectItem value="bulgarian">Bulgarian</SelectItem>
                      <SelectItem value="croatian">Croatian</SelectItem>
                      <SelectItem value="slovak">Slovak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Calendly Link */}
              <div className="space-y-2">
                <Label htmlFor="calendlyLink" className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Calendly Link (Optional)
                </Label>
                <Input id="calendlyLink" type="url" value={config.calendlyLink} onChange={e => updateConfig('calendlyLink', e.target.value)} placeholder="https://calendly.com/yourname" />
              </div>

              {/* Business Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Business Description (Optional)
                </Label>
                <Textarea id="description" value={config.description} onChange={e => updateConfig('description', e.target.value)} placeholder="Describe your business, services, and what makes you unique..." rows={4} />
              </div>

              {/* Enterprise Mode and Advanced Options */}
              

              <Button type="submit" variant="hero" size="xl" className="w-full gap-3" disabled={isLoading}>
                {isLoading ? <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {config.enterpriseMode ? 'Creating Enterprise Assistant...' : 'Processing Website...'}
                  </> : <>
                    {config.enterpriseMode ? <Shield className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                    {config.enterpriseMode ? 'Create Enterprise Assistant' : 'Create Voice Assistant'}
                  </>}
              </Button>
            </form>
          </Card>

          {/* Show created assistant preview */}
          {createdAssistant && <div className="mt-12">
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold mb-4">
                  🎉 Your Assistant is{" "}
                  <span className="bg-gradient-primary bg-clip-text text-transparent">
                    Ready!
                  </span>
                </h3>
                <p className="text-lg text-muted-foreground mb-6">
                  Test your voice assistant below. Experience all the features before subscribing!
                </p>
                
                {/* Quick Setup QR Code Card - Prominent for non-techy users */}
                <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20 mb-8 max-w-md mx-auto">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <QrCode className="w-8 h-8 text-primary" />
                      </div>
                      <div className="text-left flex-1">
                        <h4 className="font-semibold text-lg">Quick Setup</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          No coding needed! Get a QR code to share with customers instantly.
                        </p>
                        <Button 
                          onClick={() => setShowQRCode(true)} 
                          size="sm"
                          className="bg-primary hover:bg-primary/90"
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          Get QR Code
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Trial/Unsubscribed upgrade notice */}
                {!user && <TrialAssistantUpgradeNotice />}
                
                {/* Action buttons */}
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  <Button variant="outline" onClick={handleSaveAssistant}>
                    <Save className="w-4 h-4 mr-2" />
                    {user ? 'Save Assistant' : 'Sign Up to Save'}
                  </Button>
                  
                  <Button variant="outline" onClick={handleCopyEmbedCode}>
                    <Copy className="w-4 h-4 mr-2" />
                    {user ? 'Copy Embed Code' : 'Subscribe for Embed Code'}
                  </Button>
                  
                  <Button variant="destructive" size="sm" onClick={clearTrialData}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Clear Assistant
                  </Button>
                </div>
              </div>
              
              {/* Dashboard with all features */}
              <Card className="bg-glass border-glass backdrop-blur-md">
                <Tabs defaultValue="preview" className="w-full">
                  <TabsList className="flex w-full overflow-x-auto no-scrollbar gap-1 md:grid md:grid-cols-5 mb-6">
                    <TabsTrigger value="preview" className="flex items-center gap-2 min-w-max text-xs md:text-sm">
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Preview</span>
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="flex items-center gap-2 min-w-max text-xs md:text-sm">
                      <BarChart3 className="w-4 h-4" />
                      <span className="hidden sm:inline">Analytics</span>
                    </TabsTrigger>
                    <TabsTrigger value="schedule" className="flex items-center gap-2 min-w-max text-xs md:text-sm" onClick={() => {
                  if (!user) {
                    toast({
                      title: "Premium Feature",
                      description: "Time slot management requires a subscription.",
                      variant: "destructive"
                    });
                    return false;
                  }
                }}>
                      <Calendar className="w-4 h-4" />
                      <span className="hidden sm:inline">Schedule</span>
                    </TabsTrigger>
                    <TabsTrigger value="forms" className="flex items-center gap-2 min-w-max text-xs md:text-sm" onClick={() => {
                  if (!user) {
                    toast({
                      title: "Premium Feature",
                      description: "Voice forms require a subscription.",
                      variant: "destructive"
                    });
                    return false;
                  }
                }}>
                      <FormInput className="w-4 h-4" />
                      <span className="hidden sm:inline">Forms</span>
                    </TabsTrigger>
                    <TabsTrigger value="install" className="flex items-center gap-2 min-w-max text-xs md:text-sm">
                      <Settings className="w-4 h-4" />
                      <span className="hidden sm:inline">Install</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="preview" className="space-y-6">
                    <div className="text-center mb-4">
                      <h4 className="text-lg font-semibold mb-2">Interactive Voice Assistant</h4>
                      <p className="text-muted-foreground">
                        Test your assistant's voice interaction and website navigation
                      </p>
                    </div>
                    <WebsitePreview assistant={createdAssistant} />
                  </TabsContent>

                  <TabsContent value="analytics" className="space-y-6">
                    <div className="text-center mb-4">
                      <h4 className="text-lg font-semibold mb-2">Performance Analytics</h4>
                      <p className="text-muted-foreground">
                        Track conversations and user interactions (sample data shown)
                      </p>
                    </div>
                    <AnalyticsDashboard assistantId={createdAssistant.id} />
                  </TabsContent>

                  <TabsContent value="schedule" className="space-y-6">
                    <div className="text-center mb-4">
                      <h4 className="text-lg font-semibold mb-2">📅 Schedule Management</h4>
                      <p className="text-muted-foreground">
                        Manage appointment availability for your assistant
                      </p>
                    </div>
                    {user ? <TimeSlotManager assistantId={createdAssistant.id} /> : <div className="p-8 text-center border-2 border-dashed border-muted rounded-lg">
                        <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-semibold text-lg mb-2">Premium Feature</h3>
                        <p className="text-muted-foreground mb-4">
                          Subscribe to manage time slots and appointment scheduling
                        </p>
                        <Link to="/pricing" target="_top">
                          <Button>View Pricing</Button>
                        </Link>
                      </div>}
                  </TabsContent>

                  <TabsContent value="forms" className="space-y-6">
                    <div className="text-center mb-4">
                      <h4 className="text-lg font-semibold mb-2">🎤 Voice Form Filling</h4>
                      <p className="text-muted-foreground">
                        Enable voice-powered form completion for accessibility
                      </p>
                    </div>
                    {user ? <div className="p-8 text-center">
                        <FormInput className="w-12 h-12 mx-auto text-primary mb-4" />
                        <h3 className="font-semibold text-lg mb-2">Voice Forms Ready</h3>
                        <p className="text-muted-foreground">
                          Your assistant can help users fill forms using voice commands
                        </p>
                      </div> : <div className="p-8 text-center border-2 border-dashed border-muted rounded-lg">
                        <FormInput className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-semibold text-lg mb-2">Premium Feature</h3>
                        <p className="text-muted-foreground mb-4">
                          Subscribe to enable voice-powered form filling capabilities
                        </p>
                        <Link to="/pricing" target="_top">
                          <Button>View Pricing</Button>
                        </Link>
                      </div>}
                  </TabsContent>

                  <TabsContent value="install" className="space-y-6">
                    <div className="text-center mb-4">
                      <h4 className="text-lg font-semibold mb-2">🔧 Installation Guide</h4>
                      <p className="text-muted-foreground">
                        Step-by-step instructions to add your assistant to your website
                      </p>
                    </div>
                    {platformDetection && createdAssistant?.embed_code ? <InstallationGuide platform={platformDetection.platform} confidence={platformDetection.confidence} embedCode={createdAssistant.embed_code} businessName={createdAssistant.business_name} /> : <div className="p-8 text-center border-2 border-dashed border-muted rounded-lg">
                        <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-semibold text-lg mb-2">Installation Guide</h3>
                        <p className="text-muted-foreground">
                          Platform detection and installation guide will appear here once your website is analyzed.
                        </p>
                      </div>}
                  </TabsContent>
                </Tabs>
              </Card>
              
              {/* Calendar Integration Prompt for authenticated users */}
              {user && <div className="mt-8">
                  <CalendarSetupPrompt assistantId={createdAssistant.id} />
                </div>}

              {/* Trial notice for non-authenticated users */}
              {!user && <div className="mt-8 p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg">
                  <h4 className="font-semibold text-amber-600 mb-2">🚀 Ready to Subscribe?</h4>
                  <p className="text-muted-foreground mb-4">
                    You've experienced how powerful your voice assistant can be! Subscribe to save your assistant, 
                    get the embed code, and deploy it on your website.
                  </p>
                  <div className="flex gap-4">
                    <Link to="/auth">
                      <Button variant="outline">
                        <LogIn className="w-4 h-4 mr-2" />
                        Sign Up
                      </Button>
                    </Link>
                    <Link to="/pricing" target="_top">
                      <Button>View Pricing</Button>
                    </Link>
                  </div>
                </div>}
            </div>}

          {/* Feature preview - only show for non-authenticated users when no assistant is created */}
          {!user && !createdAssistant && <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-2 bg-glass border border-glass rounded-lg px-4 py-2 backdrop-blur-md">
                <Mic className="w-4 h-4 text-primary" />
                <span className="text-sm">WCAG Compliant</span>
              </div>
              <div className="flex items-center gap-2 bg-glass border border-glass rounded-lg px-4 py-2 backdrop-blur-md">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm">5-Minute Setup</span>
              </div>
              <div className="flex items-center gap-2 bg-glass border border-glass rounded-lg px-4 py-2 backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm">No Code Required</span>
              </div>
            </div>}
        </div>
      </div>

      {createdAssistant && (
        <AssistantQRCode
          open={showQRCode}
          onOpenChange={setShowQRCode}
          assistantName={createdAssistant.business_name}
          assistantId={createdAssistant.id}
          previewUrl={createdAssistant.preview_url}
        />
      )}
    </section>;
};

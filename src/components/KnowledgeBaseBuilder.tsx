import React, { useState, useCallback, useEffect } from 'react';
import { TrialAssistantUpgradeNotice } from '@/components/TrialAssistantUpgradeNotice';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Eye, BarChart3, Calendar, FormInput, LogIn, Copy, Code, Link as LinkIcon, ExternalLink, QrCode, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { Link, useNavigate } from 'react-router-dom';
import { AssistantQRCode } from './AssistantQRCode';
import { validateKnowledgeBaseJson, processKnowledgeBase, generateSystemPromptFromKnowledgeBase } from '@/utils/knowledgeBaseProcessor';
import { WebsitePreview } from './WebsitePreview';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { TimeSlotManager } from './TimeSlotManager';
import { getCurrentConfig } from '@/config/environment';
import { generatePreviewUrl } from '@/utils/previewUrlUtils';
import { parseClientPDF, shouldUseClientParsing, type PDFParseProgress } from '@/utils/clientPDFParser';
interface AssistantConfig {
  businessName: string;
  websiteUrl: string;
  voice: string;
  tone: string;
  language: string;
  calendlyLink: string;
  description: string;
  documentType: string;
  customDocumentType: string;
}

const documentTypes = [
  { value: 'resume', label: 'Resume / CV', description: 'Personal career profile, skills, and experience' },
  { value: 'contract', label: 'Contract / Agreement', description: 'Legal or business agreements' },
  { value: 'faq', label: 'FAQ / Help Docs', description: 'Frequently asked questions and answers' },
  { value: 'policy', label: 'Policy Document', description: 'Terms, privacy policies, or guidelines' },
  { value: 'product_catalog', label: 'Product Catalog', description: 'Product listings and specifications' },
  { value: 'company_profile', label: 'Company Profile', description: 'About us, team, and company info' },
  { value: 'training_manual', label: 'Training Manual', description: 'Educational or onboarding materials' },
  { value: 'portfolio', label: 'Portfolio / Case Studies', description: 'Work samples or project showcases' },
  { value: 'other', label: 'Other', description: 'Custom document type' }
];
interface KnowledgeBaseBuilderProps {
  onAssistantCreated?: (assistantData: any) => void;
  showTrialNotice?: boolean;
}
export function KnowledgeBaseBuilder({
  onAssistantCreated,
  showTrialNotice = false
}: KnowledgeBaseBuilderProps) {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const { canCreateAssistant, getUpgradeMessage, currentTier, loading: featureLoading } = useFeatureGating();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [jsonData, setJsonData] = useState<any>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [createdAssistant, setCreatedAssistant] = useState<any>(null);
  const [replaceIndex, setReplaceIndex] = useState(false);
  const [parseProgress, setParseProgress] = useState<PDFParseProgress | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [assistantCount, setAssistantCount] = useState(0);
  const [config, setConfig] = useState<AssistantConfig>({
    businessName: '',
    websiteUrl: '',
    voice: 'ballad',
    tone: 'professional',
    language: 'english',
    calendlyLink: '',
    description: '',
    documentType: '',
    customDocumentType: ''
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
  const updateConfig = useCallback((field: keyof AssistantConfig, value: string) => {
    // Normalize URL if it's the websiteUrl field
    const normalizedValue = field === 'websiteUrl' ? normalizeUrl(value) : value;
    setConfig(prev => ({
      ...prev,
      [field]: normalizedValue
    }));
  }, []);
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedExtensions = ['.json', '.pdf', '.docx', '.txt', '.md', '.csv', '.xlsx', '.pptx', '.rtf'];
    const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExt)) {
      setValidationError('Please upload a supported file: PDF, DOCX, TXT, JSON, CSV, XLSX, PPTX, or RTF');
      return;
    }

    setUploadedFile(file);
    setValidationError(null);

    // Handle JSON files locally
    if (fileExt === '.json') {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          if (!validateKnowledgeBaseJson(parsed)) {
            setValidationError('Invalid knowledge base format. Expected one of: a map keyed by URL, an array of pages with url+content, an object with pages[], or an object with allPages[].');
            setJsonData(null);
            return;
          }
          setJsonData(parsed);
          setValidationError(null);

          // Auto-extract website URL if possible
          if (!config.websiteUrl) {
            let candidate = '';
            try {
              if (parsed?.allPages?.[0]?.url) candidate = parsed.allPages[0].url;
              else if (parsed?.pages?.[0]?.url) candidate = parsed.pages[0].url;
              else if (Array.isArray(parsed) && parsed[0]?.url) candidate = parsed[0].url;
              else {
                const keys = !Array.isArray(parsed) ? Object.keys(parsed) : [];
                const firstKey = keys[0];
                if (firstKey) candidate = firstKey.startsWith('http') ? firstKey : `https://${firstKey}`;
              }
              if (candidate) {
                const u = new URL(candidate);
                const origin = `${u.protocol}//${u.hostname.replace(/^www\./, '')}`;
                updateConfig('websiteUrl', origin);
              }
            } catch {
              // Could not infer URL
            }
          }
          toast.success('Knowledge base uploaded and validated successfully!');
        } catch (error) {
          setValidationError('Invalid JSON file. Please check the file format.');
          setJsonData(null);
        }
      };
      reader.readAsText(file);
      return;
    }

    // Handle PDF files - use client-side parsing for large files
    if (fileExt === '.pdf') {
      setIsLoading(true);
      setParseProgress(null);
      
      try {
        // Check if we should use client-side parsing (for large PDFs)
        if (shouldUseClientParsing(file)) {
          console.log('Using client-side PDF parsing for large file');
          toast.info('Large PDF detected - parsing locally for better reliability...');
          
          const result = await parseClientPDF(file, file.name, (progress) => {
            setParseProgress(progress);
          });
          
          setJsonData(result);
          setValidationError(null);
          setParseProgress(null);
          toast.success(`PDF parsed successfully! ${result.metadata.pageCount} pages, ${Math.round(result.totalCharacters / 1000)}K characters`);
        } else {
          // Small PDFs - use server-side parsing
          const formData = new FormData();
          formData.append('file', file);

          const { data, error } = await supabase.functions.invoke('parse-document', {
            body: formData,
          });

          if (error) throw error;

          if (!data?.pages || data.pages.length === 0) {
            throw new Error(data?.error || 'No content extracted from document');
          }

          setJsonData(data);
          setValidationError(null);
          toast.success('PDF parsed successfully!');
        }
      } catch (error: any) {
        console.error('Error parsing PDF:', error);
        setValidationError(error.message || 'Failed to parse PDF. Please try a different file.');
        setJsonData(null);
      } finally {
        setIsLoading(false);
        setParseProgress(null);
      }
      return;
    }

    // Handle other document types via edge function (DOCX, TXT, etc.)
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('parse-document', {
        body: formData,
      });

      if (error) throw error;

      // Edge function returns { pages: [...], metadata: {...} }
      if (!data?.pages || data.pages.length === 0) {
        throw new Error(data?.error || 'No content extracted from document');
      }

      // Use the parsed pages directly as knowledge base
      setJsonData(data);
      setValidationError(null);
      toast.success(`${fileExt.toUpperCase().slice(1)} file parsed successfully!`);
    } catch (error: any) {
      console.error('Error parsing document:', error);
      setValidationError(error.message || 'Failed to parse document. Please try a JSON file instead.');
      setJsonData(null);
    } finally {
      setIsLoading(false);
    }
  }, [config.websiteUrl, updateConfig]);
  const handleSubmit = async () => {
    // Block creation for lapsed users
    if (user && !canCreate) {
      toast.error(getUpgradeMessage('create_assistant'));
      return;
    }
    
    if (!jsonData) {
      toast.error('Please upload a knowledge base file first');
      return;
    }
    if (!config.businessName) {
      toast.error('Please fill in knowledge base name');
      return;
    }
    setIsLoading(true);
    try {
      // Process the knowledge base
      const processedKB = processKnowledgeBase(jsonData, config.websiteUrl);

      // Generate system prompt with document type context
      const systemPrompt = generateSystemPromptFromKnowledgeBase(processedKB, {
        ...config,
        documentType: config.documentType,
        customDocumentType: config.customDocumentType
      });

      // Create assistant record
      const assistantData = {
        business_name: config.businessName,
        website_url: config.websiteUrl,
        voice_type: config.voice,
        voice_accent: config.voice,
        tone: config.tone,
        language: config.language,
        calendly_link: config.calendlyLink || null,
        description: config.description || null,
        scraped_content: processedKB as any,
        system_prompt: systemPrompt,
        user_id: user ? user.id : null,
        is_trial: !user,
        trial_expires_at: !user ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
        preview_slug: (await import('@/utils/previewUrlUtils')).generateSlugFromName(config.businessName) || null,
      };
      const {
        data,
        error
      } = await supabase.from('assistants').insert(assistantData).select().single();
      if (error) throw error;

      // Generate and persist embed code + preview URL for dashboard
      const envConfig = getCurrentConfig();
      const embedCode = `<script \n  data-assistant="${data.id}" \n  data-base-url="${envConfig.baseUrl}"\n  src="${envConfig.widgetUrl}">\n</script>`;
      const previewUrl = generatePreviewUrl(data.id, envConfig.baseUrl);
      const {
        data: updated,
        error: updateError
      } = await supabase.from('assistants').update({
        embed_code: embedCode,
        preview_url: previewUrl
      }).eq('id', data.id).select().single();
      if (updateError) {
        console.warn('Failed updating embed/preview fields, continuing:', updateError);
      }
      const finalAssistant = updated || data;

      // Upsert knowledge vectors to pgvector for semantic search
      const processedPages = processedKB.allPages || [];
      if (processedPages.length > 0) {
        console.log(`Upserting ${processedPages.length} pages to knowledge vectors...`);
        const syntheticDomain = config.websiteUrl || `document://${config.businessName.replace(/\s+/g, '-').toLowerCase()}`;
        
        const { error: upsertError } = await supabase.functions.invoke('knowledge-upsert', {
          body: {
            assistantId: data.id,
            pages: processedPages.map((p: any) => ({
              url: p.url || syntheticDomain,
              title: p.title || config.businessName,
              content: p.content || p.text || ''
            })),
            websiteUrl: syntheticDomain,
            replace: true
          }
        });
        
        if (upsertError) {
          console.warn('Knowledge upsert warning (continuing anyway):', upsertError);
        } else {
          console.log('✅ Knowledge vectors upserted successfully');
        }
      }

      setCreatedAssistant(finalAssistant);

      // Save to localStorage for trial users
      if (!user) {
        localStorage.setItem('trialAssistant', JSON.stringify(data));
      }
      toast.success('Voice assistant created successfully from knowledge base!');
      onAssistantCreated?.(data);
    } catch (error: any) {
      console.error('Error creating assistant:', error);
      const msg = error?.message || error?.error_description || error?.hint || 'Failed to create assistant. Please try again.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const allowedExtensions = ['.json', '.pdf', '.docx', '.txt', '.md', '.csv', '.xlsx', '.pptx', '.rtf'];
      const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (allowedExtensions.includes(fileExt)) {
        const fakeEvent = {
          target: {
            files: [file]
          }
        } as any;
        handleFileUpload(fakeEvent);
      } else {
        setValidationError('Please upload a supported file: PDF, DOCX, TXT, JSON, CSV, XLSX, PPTX, or RTF');
      }
    }
  }, [handleFileUpload]);
  if (createdAssistant) {
    return <div className="space-y-8">
        {/* Success Header */}
        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <CheckCircle className="h-5 w-5" />
              {user ? "🎉 Assistant Created Successfully!" : "🎉 Assistant Preview Ready!"}
            </CardTitle>
            <CardDescription>
              {user ? `Your voice assistant for ${createdAssistant.business_name} is ready to deploy.` : "Test your assistant fully before subscribing!"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Assistant Details:</h3>
              <p><strong>Business:</strong> {createdAssistant.business_name}</p>
              <p><strong>Website:</strong> {createdAssistant.website_url}</p>
              <p><strong>Voice:</strong> {createdAssistant.voice_type}</p>
              <p><strong>Knowledge Base:</strong> {Object.keys(jsonData).length} pages processed</p>
            </div>
            
            {/* Save / Sign Up Button */}
            <div className="mt-4">
              {user ? (
                <Button onClick={() => navigate('/dashboard')} className="w-full">
                  Go to Dashboard
                </Button>
              ) : (
                <Button onClick={() => navigate('/auth?next=/create-assistant')} variant="default" className="w-full">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign Up to Save Your Assistant
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trial/Unsubscribed upgrade notice */}
        {!user && <TrialAssistantUpgradeNotice />}

        {/* Quick Setup QR Code Card - Prominent for non-techy users */}
        <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20 max-w-md mx-auto">
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

        {/* QR Code Modal */}
        <AssistantQRCode
          assistantId={createdAssistant.id}
          assistantName={createdAssistant.business_name}
          open={showQRCode}
          onOpenChange={setShowQRCode}
        />

        {/* Preview Tabs */}
        <Card className="bg-glass border-glass backdrop-blur-md">
          <CardHeader className="text-center">
            <CardTitle>Test Your Voice Assistant</CardTitle>
            <CardDescription>
              Experience all features and see how your assistant works
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="schedule" className="flex items-center gap-2" onClick={() => {
                if (!user) {
                  toast.error("Premium Feature: Schedule management requires a subscription.");
                  return false;
                }
              }}>
                  <Calendar className="w-4 h-4" />
                  Schedule
                </TabsTrigger>
                <TabsTrigger value="forms" className="flex items-center gap-2" onClick={() => {
                if (!user) {
                  toast.error("Premium Feature: Voice forms require a subscription.");
                  return false;
                }
              }}>
                  <FormInput className="w-4 h-4" />
                  Voice Forms
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="space-y-6">
                <div className="text-center mb-4">
                  <h4 className="text-lg font-semibold mb-2">Interactive Voice Assistant</h4>
                  <p className="text-muted-foreground">
                    {createdAssistant.website_url 
                      ? "Test your assistant's voice interaction and website navigation"
                      : "Converse with your knowledge base using voice or text"}
                  </p>
                </div>
                {createdAssistant.website_url ? (
                  <WebsitePreview assistant={createdAssistant} />
                ) : (
                  <Card className="overflow-hidden">
                    {/* Share controls for document-only knowledge base */}
                    <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/50">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Share This Assistant</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            const shareUrl = `${window.location.origin}/preview/${createdAssistant.id}?mode=widget-only`;
                            navigator.clipboard.writeText(shareUrl);
                            toast.success('Share link copied!');
                          }}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Link
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            const embedCode = createdAssistant.embed_code || `<script data-assistant="${createdAssistant.id}" src="${window.location.origin}/widget.js"></script>`;
                            navigator.clipboard.writeText(embedCode);
                            toast.success('Embed code copied!');
                          }}
                        >
                          <Code className="w-4 h-4 mr-2" />
                          Embed Code
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            const shareUrl = `${window.location.origin}/preview/${createdAssistant.id}?mode=widget-only`;
                            window.open(shareUrl, '_blank');
                          }}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open
                        </Button>
                      </div>
                    </div>
                    
                    {/* Widget iframe */}
                    <div className="h-[600px]">
                      <iframe 
                        src={`/preview/${createdAssistant.id}?mode=widget-only`}
                        className="w-full h-full border-none"
                        title="Voice Assistant Widget"
                      />
                    </div>
                  </Card>
                )}
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
            </Tabs>
          </CardContent>
        </Card>
        
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
      </div>;
  }
  return <div className="space-y-6">
      {showTrialNotice && <Alert className="border-primary/20 bg-primary/5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Trial Mode:</strong> Upload your knowledge base to create a 7-day trial assistant. 
            Sign up for full features and permanent assistants.
          </AlertDescription>
        </Alert>}


      <Card>
        <CardHeader>
          <CardTitle>Upload Knowledge Base</CardTitle>
          <CardDescription className="space-y-2">
            <p>Upload a document to create your voice assistant.</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">PDF</span>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">DOCX</span>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">TXT</span>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">JSON</span>
              <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">CSV</span>
              <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">XLSX</span>
              <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">PPTX</span>
              <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">RTF</span>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Zone */}
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer" onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => document.getElementById('json-upload')?.click()}>
            <input id="json-upload" type="file" accept=".json,.pdf,.docx,.txt,.md,.csv,.xlsx,.pptx,.rtf" onChange={handleFileUpload} className="hidden" />
            
            {uploadedFile ? <div className="space-y-2">
                <FileText className="h-12 w-12 text-primary mx-auto" />
                <p className="text-sm font-medium">{uploadedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {isLoading 
                    ? (parseProgress ? parseProgress.status : 'Parsing document...') 
                    : jsonData ? 'Valid knowledge base format detected' : 'Processing...'}
                </p>
                {isLoading && parseProgress && (
                  <div className="max-w-xs mx-auto space-y-1">
                    <Progress value={parseProgress.percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Page {parseProgress.currentPage} of {parseProgress.totalPages}
                    </p>
                  </div>
                )}
                {isLoading && !parseProgress && <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />}
              </div> : <div className="space-y-2">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium">Drop your document here</p>
                <p className="text-xs text-muted-foreground">Supports PDF (up to 50MB), DOCX, TXT, JSON, CSV, XLSX, PPTX, RTF</p>
              </div>}
          </div>

          {validationError && <Alert className="border-destructive/20 bg-destructive/5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>}

          {jsonData && <Alert className="border-green-500/20 bg-green-500/5">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Knowledge base validated! Found {Object.keys(jsonData).length} pages ready for processing.
              </AlertDescription>
            </Alert>}

          {/* Document Type Selector - appears after successful upload */}
          {jsonData && (
            <div className="border-l-4 border-primary/50 bg-primary/5 rounded-r-lg p-4 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <h4 className="font-medium text-sm">Document Type</h4>
                  <p className="text-xs text-muted-foreground">Help the AI understand your document context for better responses</p>
                </div>
              </div>
              
              <Select value={config.documentType} onValueChange={value => updateConfig('documentType', value)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select document type..." />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {documentTypes.map(docType => (
                    <SelectItem key={docType.value} value={docType.value}>
                      <div className="flex flex-col">
                        <span>{docType.label}</span>
                        <span className="text-xs text-muted-foreground">{docType.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {config.documentType === 'other' && (
                <div className="space-y-2">
                  <Label htmlFor="customDocumentType">Describe your document type</Label>
                  <Input 
                    id="customDocumentType"
                    value={config.customDocumentType}
                    onChange={e => updateConfig('customDocumentType', e.target.value)}
                    placeholder="e.g., Product manual, Research paper, Meeting notes..."
                    className="bg-background"
                  />
                </div>
              )}
            </div>
          )}

          {/* Configuration Form */}
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Knowledge Base Name *</Label>
                <Input id="businessName" value={config.businessName} onChange={e => updateConfig('businessName', e.target.value)} placeholder="Your Business Name" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="websiteUrl">Website URL (optional)</Label>
                <Input id="websiteUrl" value={config.websiteUrl} onChange={e => updateConfig('websiteUrl', e.target.value)} placeholder="https://yourwebsite.com" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="voice">Voice Type</Label>
                <Select value={config.voice} onValueChange={value => updateConfig('voice', value)}>
                  <SelectTrigger>
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
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Select value={config.tone} onValueChange={value => updateConfig('tone', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={config.language} onValueChange={value => updateConfig('language', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="spanish">Spanish</SelectItem>
                    <SelectItem value="french">French</SelectItem>
                    <SelectItem value="german">German</SelectItem>
                    <SelectItem value="italian">Italian</SelectItem>
                    <SelectItem value="portuguese">Portuguese</SelectItem>
                    <SelectItem value="russian">Russian</SelectItem>
                    <SelectItem value="chinese">Chinese</SelectItem>
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

            <div className="space-y-2">
              <Label htmlFor="calendlyLink">Calendly Link (Optional)</Label>
              <Input id="calendlyLink" value={config.calendlyLink} onChange={e => updateConfig('calendlyLink', e.target.value)} placeholder="https://calendly.com/your-link" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" value={config.description} onChange={e => updateConfig('description', e.target.value)} placeholder="Describe your business or any special instructions for the assistant..." rows={3} />
            </div>
          </div>

          {false && <div className="flex items-center justify-between rounded-md border border-muted/40 bg-muted/5 p-3">
              <div className="space-y-1">
                <Label htmlFor="replaceIndex">Replace existing index (full rebuild)</Label>
                <p className="text-sm text-muted-foreground">Off = update/upsert only. On = delete namespace first, then reindex.</p>
              </div>
              <Switch id="replaceIndex" checked={replaceIndex} onCheckedChange={setReplaceIndex} className="ring-1 ring-ring/30 focus-visible:ring-2" />
            </div>}

          <Button onClick={handleSubmit} disabled={!jsonData || !config.businessName || isLoading} className="w-full">
            {isLoading ? <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Voice Assistant...
              </> : 'Create Voice Assistant'}
          </Button>
        </CardContent>
      </Card>
    </div>;
}
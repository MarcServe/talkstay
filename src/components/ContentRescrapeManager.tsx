import React, { useState, useEffect } from 'react';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, CheckCircle, Globe, Phone, Mail, MapPin, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { WebsiteSizeSelector, WebsiteSize, getCrawlLimitForSize } from '@/components/WebsiteSizeSelector';
import { KeepTabOpenNotice } from '@/components/KeepTabOpenNotice';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ContentRescrapeManagerProps {
  assistantId: string;
  onRescrapeComplete?: () => void;
}

export const ContentRescrapeManager: React.FC<ContentRescrapeManagerProps> = ({
  assistantId,
  onRescrapeComplete
}) => {
  const { canUseFirecrawl, hasFeature, getUpgradeMessage } = useFeatureGating();
  const [rescraping, setRescraping] = useState(false);
  const [lastRescrapeResult, setLastRescrapeResult] = useState<any>(null);
  const [websiteUrl, setWebsiteUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [crawlLimitOverride, setCrawlLimitOverride] = useState<number | null>(null);
  const [websiteSize, setWebsiteSize] = useState<WebsiteSize>('medium');

  useEffect(() => {
    const fetchAssistantData = async () => {
      try {
      const { data, error } = await supabase
          .from('assistants')
          .select('website_url, crawl_limit_override')
          .eq('id', assistantId)
          .single();

        if (error) throw error;
        setWebsiteUrl(data?.website_url || '');
        setCrawlLimitOverride((data as any)?.crawl_limit_override || null);
      } catch (error) {
        console.error('Error fetching assistant data:', error);
        toast.error('Failed to load assistant data');
      } finally {
        setLoading(false);
      }
    };

    fetchAssistantData();
  }, [assistantId]);

  const handleRescrapeClick = () => {
    if (!websiteUrl) {
      toast.error('Website URL is required for re-scraping');
      return;
    }

    if (!canUseFirecrawl()) {
      toast.error(getUpgradeMessage('firecrawl_usage'));
      return;
    }

    // Show confirmation dialog before proceeding
    setShowConfirmDialog(true);
  };

  const handleRescrapeConfirmed = async () => {
    setShowConfirmDialog(false);
    setRescraping(true);
    try {
      console.log('Triggering re-scrape for:', { assistantId, websiteUrl });
      
      // Fetch existing manual entries to include alongside scraped content
      let manualPages: { url: string; title: string; content: string }[] = [];
      try {
        const { data: assistantData } = await supabase
          .from('assistants')
          .select('scraped_content')
          .eq('id', assistantId)
          .single();

        const scrapedContent = assistantData?.scraped_content as any;
        const manualEntries = scrapedContent?.manualEntries;
        if (Array.isArray(manualEntries) && manualEntries.length > 0) {
          console.log(`Will merge ${manualEntries.length} manual entries after Firecrawl`);
          manualPages = manualEntries
            .filter((e: any) => e?.content?.trim())
            .map((e: any) => ({
              url: e.url || 'manual-entry',
              title: e.title || 'Manual Entry',
              content: e.content
            }));
        }
      } catch (mergeErr) {
        console.warn('Could not fetch manual entries for merge:', mergeErr);
      }

      const effectiveCrawlLimit = crawlLimitOverride || getCrawlLimitForSize(websiteSize);
      const { data, error } = await supabase.functions.invoke('knowledge-upsert', {
        body: {
          assistantId,
          websiteUrl,
          useScraper: 'firecrawl',
          crawlLimit: effectiveCrawlLimit,
          crawlDepth: 5,
          additionalPages: manualPages.length > 0 ? manualPages : undefined,
          // Wipe stale scraped vectors before re-indexing so removed/renamed pages
          // don't keep answering. Manual:// vectors and uploaded documents are preserved
          // by the edge function.
          forceClean: true
        }
      });

      if (error) {
        const msg = error.message || '';
        if (msg.includes('FIRECRAWL_CREDIT_LIMIT') || msg.includes('Insufficient credits')) {
          toast.error('Firecrawl credit limit reached. Please upgrade your Firecrawl plan at firecrawl.dev/pricing or reduce the crawl limit.');
        } else {
          throw new Error(msg);
        }
      } else {
        setLastRescrapeResult(data);
        toast.success('Website content re-scraped successfully with enhanced extraction!');
        onRescrapeComplete?.();
      }
    } catch (error) {
      console.error('Error re-scraping content:', error);
      const errMsg = (error as Error)?.message || '';
      if (errMsg.includes('credits') || errMsg.includes('upgrade')) {
        toast.error(errMsg);
      } else {
        toast.error('Something went wrong while re-scraping. Please try again or contact support.');
      }
    } finally {
      setRescraping(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="py-8">
          <div className="text-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card className="w-full border-l-4 border-l-ai-blue">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-ai-blue" />
          Website Re-scraping
        </CardTitle>
        <CardDescription>
          Re-scrape your website with enhanced AI extraction to capture business details, 
          contact information, and comprehensive content analysis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" className="bg-gradient-to-r from-green-50 to-blue-50">
            <RefreshCw className="h-3 w-3 mr-1" />
            Enhanced Extraction
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-blue-500" />
            <span>Phone Numbers</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-green-500" />
            <span>Email Addresses</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-red-500" />
            <span>Business Addresses</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-purple-500" />
            <span>Content Analysis</span>
          </div>
        </div>

        {lastRescrapeResult && (
          <Card className="border-dashed bg-green-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Last Re-scrape Results</span>
              </div>
              <div className="space-y-2 text-sm">
                {lastRescrapeResult.contactsFound && (
                  <div>
                    <span className="font-medium">Contacts Found:</span> {lastRescrapeResult.contactsFound}
                  </div>
                )}
                {lastRescrapeResult.pagesProcessed && (
                  <div>
                    <span className="font-medium">Pages Processed:</span> {lastRescrapeResult.pagesProcessed}
                  </div>
                )}
                {lastRescrapeResult.timestamp && (
                  <div>
                    <span className="font-medium">Completed:</span> {' '}
                    {new Date(lastRescrapeResult.timestamp).toLocaleString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Current website: <code className="px-1 bg-muted rounded">{websiteUrl}</code>
          </div>

          <WebsiteSizeSelector
            value={websiteSize}
            onChange={setWebsiteSize}
            disabled={rescraping}
            overrideLimit={crawlLimitOverride}
          />
          
          <Button
            onClick={handleRescrapeClick}
            disabled={rescraping || !websiteUrl}
            className="w-full"
          >
            {rescraping ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Re-scraping with enhanced extraction...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-scrape Website Content
              </>
            )}
          </Button>

          <KeepTabOpenNotice visible={rescraping} />
        </div>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Enhanced Extraction Features</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Intelligent contact information detection</li>
            <li>• Business address and location extraction</li>
            <li>• Enhanced content analysis and categorization</li>
            <li>• Improved knowledge base organization</li>
          </ul>
        </div>
      </CardContent>
    </Card>
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Re-scrape Website Content?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will re-crawl your website and <strong>fully replace</strong> the existing scraped website content in your knowledge base.</p>
              <p className="text-sm">✅ Uploaded documents (PDF, DOCX, etc.) will <strong>not</strong> be affected.</p>
              <p className="text-sm">✅ Manual knowledge entries will be preserved.</p>
              <p className="text-sm">⚠️ Old pages that no longer exist on your site will be removed so the assistant only uses your latest content.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRescrapeConfirmed}>
              Continue Re-scrape
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { RefreshCw, Globe, Crown, AlertCircle, CheckCircle, Clock, Database, Loader2, RotateCcw, AlertTriangle, Phone, Mail, MapPin, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { KeepTabOpenNotice } from '@/components/KeepTabOpenNotice';
import { WebsiteSizeSelector, WebsiteSize, getCrawlLimitForSize } from '@/components/WebsiteSizeSelector';
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

interface ContentRefreshManagerProps {
  assistantId: string;
}

interface RefreshLog {
  id: string;
  started_at: string;
  completed_at?: string;
  refresh_status: string;
  changes_detected: any;
  triggered_by: string;
  error_message?: string;
}

export const ContentRefreshManager: React.FC<ContentRefreshManagerProps> = ({ assistantId }) => {
  const [loading, setLoading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [recrawling, setRecrawling] = useState(false);
  const [refreshLogs, setRefreshLogs] = useState<RefreshLog[]>([]);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshFrequency, setRefreshFrequency] = useState('manual');
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [reindexProgress, setReindexProgress] = useState<{ current: number; total: number; status: string } | null>(null);
  const cancelRef = useRef(false);
  const { toast } = useToast();
  // TalkStay: website content refresh is included for every hotel — no
  // subscription gating (differs from TalkWeb, where this is a paid feature).
  const subscription = { subscribed: true } as ReturnType<typeof useSubscription>["subscription"];
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);
  const [showReindexDialog, setShowReindexDialog] = useState(false);
  const [showRecrawlDialog, setShowRecrawlDialog] = useState(false);
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [websiteSize, setWebsiteSize] = useState<WebsiteSize>('medium');
  const [crawlLimitOverride, setCrawlLimitOverride] = useState<number | null>(null);

  useEffect(() => {
    if (assistantId && subscription.subscribed) {
      fetchAssistantSettings();
      fetchRefreshLogs();
    }
  }, [assistantId, subscription.subscribed]);

  const fetchAssistantSettings = async () => {
    try {
      const { data: assistant, error } = await supabase
        .from('assistants')
        .select('auto_refresh_enabled, refresh_frequency, last_scraped_at, crawl_limit_override')
        .eq('id', assistantId)
        .single();

      if (error) throw error;

      if (assistant) {
        setAutoRefreshEnabled(assistant.auto_refresh_enabled || false);
        setRefreshFrequency(assistant.refresh_frequency || 'manual');
        setLastRefresh(assistant.last_scraped_at);
        setCrawlLimitOverride((assistant as any)?.crawl_limit_override || null);
      }
    } catch (error: any) {
      console.error('Error fetching assistant settings:', error);
    }
  };

  const fetchRefreshLogs = async () => {
    try {
      const { data: logs, error } = await supabase
        .from('content_refresh_logs')
        .select('*')
        .eq('assistant_id', assistantId)
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRefreshLogs(logs || []);
    } catch (error: any) {
      console.error('Error fetching refresh logs:', error);
    }
  };

  const updateAssistantSettings = async (settings: { auto_refresh_enabled?: boolean; refresh_frequency?: string }) => {
    try {
      const { data, error } = await supabase
        .from('assistants')
        .update(settings)
        .eq('id', assistantId)
        .select('auto_refresh_enabled, refresh_frequency')
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error updating assistant settings:', error);
      throw error;
    }
  };

  const handleManualRefresh = async () => {
    if (!subscription.subscribed) {
      toast({
        title: "Premium Feature",
        description: "Content refresh is available for paid subscribers only",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get current assistant data
      const { data: assistant, error: assistantError } = await supabase
        .from('assistants')
        .select('website_url')
        .eq('id', assistantId)
        .single();

      if (assistantError || !assistant) {
        throw new Error('Assistant not found');
      }

      if (!assistant.website_url) {
        throw new Error('No website URL configured for this assistant. Please add a website URL first.');
      }

      // Create refresh log entry
      const { data: logEntry, error: logError } = await supabase
        .from('content_refresh_logs')
        .insert({
          assistant_id: assistantId,
          refresh_status: 'in_progress',
          triggered_by: 'manual'
        })
        .select()
        .single();

      if (logError) throw logError;

      // Scrape website and index into pgvector
      let scrapeData: any = null;
      let scrapeSucceeded = false;

      try {
        const { data, error } = await supabase.functions.invoke('scrape-website', {
          body: { url: assistant.website_url }
        });
        if (!error && data?.data?.content) {
          scrapeData = data;
          scrapeSucceeded = true;
        } else {
          console.warn('[Refresh] scrape-website failed, will fallback to direct knowledge-upsert:', error?.message || 'No content returned');
        }
      } catch (scrapeErr: any) {
        console.warn('[Refresh] scrape-website threw error, falling back:', scrapeErr?.message);
      }

      // Fallback: skip scrape step and go directly to knowledge-upsert with the URL
      if (!scrapeSucceeded) {
        console.log('[Refresh] Using direct knowledge-upsert fallback for:', assistant.website_url);
        const { data: directResult, error: directError } = await supabase.functions.invoke('knowledge-upsert', {
          body: {
            assistantId,
            websiteUrl: assistant.website_url,
            useScraper: true,
            tags: ['manual-refresh-fallback']
          }
        });

        if (directError || !directResult?.success) {
          const errMsg = directError?.message || directResult?.error || 'Knowledge upsert fallback also failed';
          await supabase
            .from('content_refresh_logs')
            .update({
              refresh_status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: errMsg,
            })
            .eq('id', logEntry.id);
          throw new Error(errMsg);
        }

        // Fallback succeeded - update log and return
        await supabase
          .from('content_refresh_logs')
          .update({
            refresh_status: 'completed',
            completed_at: new Date().toISOString(),
            changes_detected: { total_changes: 0, note: 'Refreshed via direct knowledge-upsert fallback' }
          })
          .eq('id', logEntry.id);

        await supabase
          .from('assistants')
          .update({ last_scraped_at: new Date().toISOString() })
          .eq('id', assistantId);

        setLastRefresh(new Date().toISOString());
        fetchRefreshLogs();

        toast({
          title: "Content Refreshed",
          description: `Knowledge base updated successfully via fallback method.`,
        });
        return;
      }

      // Index into pgvector
      const pages = [{
        url: assistant.website_url,
        title: scrapeData.data.title || 'Website Content',
        content: scrapeData.data.content
      }];

      const { data: indexResult, error: indexError } = await supabase.functions.invoke('knowledge-upsert', {
        body: { 
          assistantId,
          websiteUrl: assistant.website_url, // Required for domain extraction
          pages
        }
      });

      if (indexError || !indexResult?.success) {
        const errMsg = indexError?.message || indexResult?.error || 'Indexing failed';
        await supabase
          .from('content_refresh_logs')
          .update({
            refresh_status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: errMsg,
          })
          .eq('id', logEntry.id);
        throw new Error(errMsg);
      }

      const crawlResult = { success: true, data: scrapeData.data };

      const newScraped = crawlResult.data;

      // Compare with existing content to detect changes
      const { data: currentAssistant } = await supabase
        .from('assistants')
        .select('scraped_content')
        .eq('id', assistantId)
        .single();

      const changes = detectContentChanges(currentAssistant?.scraped_content, newScraped);

      // MERGE new content into existing scraped_content instead of overwriting
      const existingScraped = currentAssistant?.scraped_content;
      const existingParsed = typeof existingScraped === 'string' ? JSON.parse(existingScraped) : existingScraped;
      const existingAllPages = existingParsed?.allPages || existingParsed?.pages || [];
      const existingManualEntries = existingParsed?.manualEntries || [];

      // Merge: add/update the refreshed page without removing existing pages
      const refreshedPageUrl = assistant.website_url;
      const updatedAllPages = [...existingAllPages];
      const existingIndex = updatedAllPages.findIndex((p: any) => p.url === refreshedPageUrl);
      const rawContent = newScraped?.content;
      const newContentStr = typeof rawContent === 'string'
        ? rawContent
        : (rawContent != null ? String(rawContent) : '');
      const newPageEntry = {
        url: refreshedPageUrl,
        title: newScraped?.title || 'Website Content',
        content: newContentStr,
        paragraphs: newContentStr.split(/\n\n+/).slice(0, 20),
      };
      if (existingIndex >= 0) {
        updatedAllPages[existingIndex] = newPageEntry;
      } else {
        updatedAllPages.push(newPageEntry);
      }

      const mergedContent = {
        ...existingParsed,
        allPages: updatedAllPages,
        manualEntries: existingManualEntries,
      };

      const { error: updateError } = await supabase
        .from('assistants')
        .update({
          scraped_content: mergedContent,
          last_scraped_at: new Date().toISOString()
        })
        .eq('id', assistantId);

      if (updateError) throw updateError;

      // Update log with success
      await supabase
        .from('content_refresh_logs')
        .update({
          refresh_status: 'completed',
          completed_at: new Date().toISOString(),
          changes_detected: changes
        })
        .eq('id', logEntry.id);

      setLastRefresh(new Date().toISOString());
      fetchRefreshLogs();

      toast({
        title: "Content Refreshed",
        description: `Content updated successfully. ${changes.total_changes} changes detected.`,
      });

    } catch (error: any) {
      console.error('Error refreshing content:', error);
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh content",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const detectContentChanges = (oldContent: any, newContent: any) => {
    const changes = {
      total_changes: 0,
      new_pages: 0,
      updated_pages: 0,
      removed_pages: 0,
      content_changes: 0
    };

    try {
      const oldData = typeof oldContent === 'string' ? JSON.parse(oldContent) : oldContent;
      const newData = newContent;

      if (oldData?.navigation && newData?.navigation) {
        const oldPages = Object.keys(oldData.navigation);
        const newPages = Object.keys(newData.navigation);
        
        changes.new_pages = newPages.filter(page => !oldPages.includes(page)).length;
        changes.removed_pages = oldPages.filter(page => !newPages.includes(page)).length;
        changes.updated_pages = oldPages.filter(page => 
          newPages.includes(page) && 
          JSON.stringify(oldData.navigation[page]) !== JSON.stringify(newData.navigation[page])
        ).length;
      }

      changes.total_changes = changes.new_pages + changes.updated_pages + changes.removed_pages;
    } catch (error) {
      console.error('Error detecting changes:', error);
    }

    return changes;
  };

  const handleAutoRefreshToggle = async (enabled: boolean) => {
    if (!subscription.subscribed) {
      toast({
        title: "Premium Feature",
        description: "Auto-refresh is available for paid subscribers only",
        variant: "destructive",
      });
      return;
    }

    try {
      const data = await updateAssistantSettings({ auto_refresh_enabled: enabled });
      if (data) {
        setAutoRefreshEnabled(data.auto_refresh_enabled || false);
      }

      // If enabling auto-refresh, create the schedule
      if (enabled) {
        await scheduleRefresh(refreshFrequency);
      }
      
      toast({
        title: enabled ? "Auto-refresh Enabled" : "Auto-refresh Disabled",
        description: enabled 
          ? `Content will refresh automatically every ${refreshFrequency}`
          : "Manual refresh only",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update auto-refresh settings",
        variant: "destructive",
      });
    }
  };

  const handleFrequencyChange = async (frequency: string) => {
    if (!subscription.subscribed) return;

    try {
      const data = await updateAssistantSettings({ refresh_frequency: frequency });
      if (data) {
        setRefreshFrequency(data.refresh_frequency || 'manual');
      }

      // Update the schedule with new frequency if auto-refresh is enabled
      if (autoRefreshEnabled) {
        await scheduleRefresh(frequency);
      }
      
      toast({
        title: "Frequency Updated",
        description: `Auto-refresh frequency set to ${frequency}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update refresh frequency",
        variant: "destructive",
      });
    }
  };

  const scheduleRefresh = async (frequency: string) => {
    try {
      const { error } = await supabase.functions.invoke('schedule-content-refresh', {
        body: {
          assistantId,
          frequency
        }
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error scheduling refresh:', error);
      throw error;
    }
  };

  const handleReindexFromJson = async () => {
    if (!assistantId) return;
    setReindexing(true);
    setReindexProgress(null);
    try {
      // 1. Get the firecrawl_job_id from the assistant
      const { data: assistant, error: assistantError } = await supabase
        .from('assistants')
        .select('firecrawl_job_id, website_url, scraped_content')
        .eq('id', assistantId)
        .single();

      if (assistantError) throw assistantError;

      const jobId = assistant?.firecrawl_job_id;

      // If no Firecrawl job ID, fall back to local reindex
      if (!jobId) {
        console.log('No Firecrawl job ID found, falling back to local reindex');
        await handleLocalReindex();
        return;
      }

      // 2. Paginated fetch from Firecrawl via proxy
      let nextUrl: string | null = null;
      let isFirstBatch = true;
      let totalPagesIndexed = 0;
      let totalBatches = 0;
      let totalFromFirecrawl = 0;
      const BATCH_SIZE = 10;

      setReindexProgress({ current: 0, total: 0, status: 'Fetching pages from Firecrawl...' });

      // Loop through all Firecrawl pagination pages
      while (true) {
        // Fetch one page of results from Firecrawl
        const { data: pageData, error: pageError } = await supabase.functions.invoke('firecrawl-fetch-page', {
          body: { jobId, nextUrl }
        });

        if (pageError) {
          console.error('firecrawl-fetch-page error:', pageError);
          // Fall back to local reindex if Firecrawl is unavailable
          console.log('Firecrawl fetch failed, falling back to local reindex');
          await handleLocalReindex();
          return;
        }

        if (!pageData?.success) {
          // If Firecrawl returned an error (expired job, 502, etc.), fall back
          console.log('Firecrawl returned error, falling back to local reindex:', pageData?.error);
          await handleLocalReindex();
          return;
        }

        const items = pageData.items || [];
        totalFromFirecrawl = pageData.total || totalFromFirecrawl;
        nextUrl = pageData.next || null;

        if (items.length === 0 && !nextUrl) {
          // No data at all from Firecrawl, fall back to local
          if (totalPagesIndexed === 0) {
            console.log('No items from Firecrawl, falling back to local reindex');
            await handleLocalReindex();
            return;
          }
          break;
        }

        // Extract pages from Firecrawl items
        const pages: { url?: string; title?: string; content: string }[] = [];
        for (const item of items) {
          const content = item.markdown || item.content || item.html || item.rawHtml || '';
          const title = item.metadata?.title || item.metadata?.sourceURL || 'Untitled';
          const url = item.metadata?.sourceURL || item.url || '';
          const clean = String(content || '').trim();
          if (clean.length > 0) {
            pages.push({ url, title, content: clean });
          }
        }

        // Send pages in sub-batches of BATCH_SIZE to knowledge-upsert
        for (let i = 0; i < pages.length; i += BATCH_SIZE) {
          const batch = pages.slice(i, i + BATCH_SIZE);
          totalBatches++;

          setReindexProgress({
            current: totalPagesIndexed + i,
            total: totalFromFirecrawl,
            status: `Indexing batch ${totalBatches} (${totalPagesIndexed + i + batch.length} of ~${totalFromFirecrawl} pages)...`
          });

          const { data: upsertData, error: upsertError } = await supabase.functions.invoke('knowledge-upsert', {
            body: {
              assistantId,
              websiteUrl: assistant?.website_url,
              pages: batch,
              tags: ['firecrawl-reindex']
            }
          });

          if (upsertError) {
            console.error('knowledge-upsert error on batch', totalBatches, upsertError);
            throw new Error(`Indexing failed on batch ${totalBatches}: ${upsertError.message}`);
          }
          if (!upsertData?.success) {
            throw new Error(upsertData?.error || `Indexing failed on batch ${totalBatches}`);
          }

          isFirstBatch = false;
        }

        totalPagesIndexed += pages.length;

        // If no more pages, we're done
        if (!nextUrl) break;
      }

      // 3. Update crawl_status to 'indexed'
      await supabase
        .from('assistants')
        .update({ crawl_status: 'indexed' })
        .eq('id', assistantId);

      setReindexProgress({ current: totalPagesIndexed, total: totalPagesIndexed, status: 'Complete!' });

      toast({
        title: 'Re-index complete',
        description: `Indexed ${totalPagesIndexed} pages across ${totalBatches} batch(es). Zero credits used.`
      });
    } catch (err: any) {
      console.error('Reindex error', err);
      toast({
        title: 'Reindex failed',
        description: err?.message || 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setReindexing(false);
      // Clear progress after a delay
      setTimeout(() => setReindexProgress(null), 5000);
    }
  };

  const handleLocalReindex = async () => {
    // Reindex from scraped_content JSON, falling back to knowledge_vectors if minimal data
    try {
      const { data: assistant, error } = await supabase
        .from('assistants')
        .select('scraped_content, website_url, business_name')
        .eq('id', assistantId)
        .single();
      if (error) throw error;

      let kb: any = assistant?.scraped_content;
      if (typeof kb === 'string') {
        try { kb = JSON.parse(kb); } catch {/* keep as-is */}
      }

      const pages: { url?: string; title?: string; content: string; headings?: string[] }[] = [];
      const pushPage = (p: any) => {
        if (!p) return;
        const title = p.title || p.pageTitle || p.h1 || p.path || p.url || 'Untitled';
        let content = p.content || p.markdown || p.text || p.body || p.full_text || p.description || '';
        if (!content && Array.isArray(p.paragraphs) && p.paragraphs.length > 0) {
          content = p.paragraphs.join('\n\n');
        }
        if (!content && p.rawHtml) content = p.rawHtml;
        if (!content && p.extractedText) content = p.extractedText;
        const url = p.url || p.sourceURL || (typeof p.path === 'string' ? p.path : undefined);
        const headings = Array.isArray(p.headings) ? p.headings : undefined;
        const clean = String(content || '').trim();
        if (clean.length > 0) pages.push({ url, title, content: clean, headings });
      };

      if (kb) {
        if (Array.isArray(kb?.allPages)) kb.allPages.forEach((p: any) => pushPage(p));
        else if (Array.isArray(kb?.pages)) kb.pages.forEach((p: any) => pushPage(p));
        else if (Array.isArray(kb)) kb.forEach((p: any) => pushPage(p));
        if (!pages.length && kb?.data && Array.isArray(kb.data)) kb.data.forEach((p: any) => pushPage(p));
      }

      // If scraped_content has very few pages, also pull website vectors from knowledge_vectors
      if (pages.length <= 3) {
        console.log(`[LocalReindex] scraped_content has only ${pages.length} pages, also fetching from knowledge_vectors...`);
        setReindexProgress({ current: 0, total: 0, status: 'Fetching stored vectors from database...' });

        let allVectors: any[] = [];
        const PAGE_SIZE = 1000;
        let pageNum = 0;
        let hasMore = true;

        while (hasMore) {
          const from = pageNum * PAGE_SIZE;
          const to = from + PAGE_SIZE - 1;

          const { data: vectors, error: vecErr } = await supabase
            .from('knowledge_vectors')
            .select('content, title, url, source_id')
            .eq('assistant_id', assistantId)
            .not('url', 'ilike', 'uploaded://%')
            .range(from, to);

          if (vecErr) {
            console.warn('[LocalReindex] Vector fetch error:', vecErr.message);
            break;
          }

          if (vectors && vectors.length > 0) {
            allVectors.push(...vectors);
          }
          hasMore = (vectors?.length || 0) === PAGE_SIZE;
          pageNum++;
        }

        if (allVectors.length > 0) {
          console.log(`[LocalReindex] Found ${allVectors.length} website vectors in database`);
          // Group vectors by URL to reconstruct pages
          const pageMap = new Map<string, { url: string; title: string; content: string }>();
          for (const v of allVectors) {
            const key = v.url || v.source_id || `vec-${Math.random()}`;
            const existing = pageMap.get(key);
            if (existing) {
              existing.content += '\n\n' + v.content;
            } else {
              pageMap.set(key, {
                url: v.url || '',
                title: v.title || 'Untitled',
                content: v.content || '',
              });
            }
          }

          // Add vector-reconstructed pages (deduplicate against scraped_content pages)
          const existingUrls = new Set(pages.map(p => p.url));
          const vectorPages = Array.from(pageMap.values());
          for (const vp of vectorPages) {
            if (!existingUrls.has(vp.url)) {
              pages.push(vp);
            }
          }
          console.log(`[LocalReindex] Total pages after merging: ${pages.length}`);
        }
      }

      if (!pages.length) throw new Error('No valid pages found in stored knowledge base or vectors.');

      const batchSize = 10;
      let totalIndexed = 0;
      setReindexProgress({ current: 0, total: pages.length, status: `Re-indexing ${pages.length} pages...` });
      for (let i = 0; i < pages.length; i += batchSize) {
        const batch = pages.slice(i, i + batchSize);
        setReindexProgress({
          current: totalIndexed,
          total: pages.length,
          status: `Indexing batch ${Math.floor(i / batchSize) + 1} (${totalIndexed + batch.length} of ${pages.length} pages)...`
        });
        const { data, error: upsertError } = await supabase.functions.invoke('knowledge-upsert', {
          body: { assistantId, websiteUrl: assistant?.website_url, pages: batch, tags: ['kb-upload'] }
        });
        if (upsertError) throw upsertError;
        if (!data?.success) throw new Error(data?.error || 'Reindex failed');
        totalIndexed += data.pages || batch.length;

        // Small delay between batches for large sets
        if (i + batchSize < pages.length) {
          await new Promise(r => setTimeout(r, 300));
        }
      }

      // Save reconstructed pages back to scraped_content.allPages with contact info
      // so that knowledge-search Contact Directory aggregation has data to work with
      try {
        const enrichedPages = pages.map(p => {
          const text = p.content || '';
          const contactInfo: Array<{ type: string; value: string }> = [];

          // Client-side plain-text contact extraction
          // Emails
          const emailMatches = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [];
          emailMatches.forEach(e => {
            const domain = e.split('@')[1]?.toLowerCase();
            if (domain && !['sentry.io', 'example.com', 'w3.org', 'schema.org', 'wixpress.com'].includes(domain)) {
              contactInfo.push({ type: 'email', value: e.toLowerCase() });
            }
          });

          // Phones - international formats
          const phoneMatches = text.match(/(?:\+?\d{1,4}[\s.\-]?)?[\(]?\d{2,5}[\)]?[\s.\-]?\d{2,5}[\s.\-]?\d{2,6}(?:[\s.\-]?\d{0,5})?/g) || [];
          phoneMatches.forEach(ph => {
            const digits = ph.replace(/\D/g, '');
            if (digits.length >= 7 && digits.length <= 15 && !/^(.)\1+$/.test(digits)) {
              contactInfo.push({ type: 'phone', value: ph.trim() });
            }
          });

          // Addresses - look for labeled patterns in plain text
          const addressPatterns = [
            /(?:address|location|office|headquarters)[:\s]*([^\n]{10,120})/gi,
            /\d+\s+[A-Za-z0-9\s,.'#\-]+,\s*[A-Za-z\s]+,?\s*[A-Za-z]{2}\s*\d{5}(?:-\d{4})?/g,
            /[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/gi,
            /(?:\d{1,5}\s)?[A-Za-zÀ-ÿ\s\-\.]+(?:straße|strasse|str\.|weg|platz|gasse|avenue|rue|via|calle|plaza)\s*\d{0,5}[,\s]*\d{4,5}\s+[A-Za-zÀ-ÿ\s\-]+/gi,
          ];
          addressPatterns.forEach(re => {
            const matches = text.match(re) || [];
            matches.forEach(a => {
              const clean = a.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
              if (clean.length > 8 && clean.length < 200) {
                contactInfo.push({ type: 'address', value: clean });
              }
            });
          });

          // Also look for labeled contact lines: "Phone: ...", "Email: ...", "Address: ..."
          const labeledLines = text.match(/(?:phone|tel|telephone|fax|email|e-mail|address|location)[:\s]+[^\n]{5,120}/gi) || [];
          labeledLines.forEach(line => {
            const clean = line.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
            if (clean.toLowerCase().startsWith('phone') || clean.toLowerCase().startsWith('tel')) {
              contactInfo.push({ type: 'phone', value: clean });
            } else if (clean.toLowerCase().startsWith('email') || clean.toLowerCase().startsWith('e-mail')) {
              contactInfo.push({ type: 'email', value: clean });
            } else if (clean.toLowerCase().startsWith('address') || clean.toLowerCase().startsWith('location')) {
              contactInfo.push({ type: 'address', value: clean });
            }
          });

          // Deduplicate contactInfo
          const seen = new Set<string>();
          const uniqueContact = contactInfo.filter(ci => {
            const key = `${ci.type}:${ci.value}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          return {
            url: p.url || '',
            title: p.title || 'Untitled',
            content: text,
            headings: p.headings || [],
            paragraphs: text.split(/\n\n+/).filter(Boolean).slice(0, 50),
            contactInfo: uniqueContact,
          };
        });

        // Get existing scraped_content to merge
        const { data: currentAssistant } = await supabase
          .from('assistants')
          .select('scraped_content')
          .eq('id', assistantId)
          .single();

        const existingScraped = (currentAssistant?.scraped_content && typeof currentAssistant.scraped_content === 'object')
          ? currentAssistant.scraped_content as Record<string, unknown>
          : {};

        // Merge manual entries into allPages JSON for Contact Directory visibility ONLY
        // Manual entries are NOT re-sent to knowledge-upsert — they are primary truth, indexed once on create/edit
        const manualEntries = (existingScraped as any)?.manualEntries;
        let allPagesWithManual = [...enrichedPages];
        if (Array.isArray(manualEntries) && manualEntries.length > 0) {
          console.log(`[LocalReindex] Merging ${manualEntries.length} manual entries into allPages JSON (read-only, not re-embedded)`);
          const existingUrls = new Set(enrichedPages.map((p: any) => p.url));
          for (const entry of manualEntries) {
            const entryText = typeof entry === 'string' ? entry : (entry?.content || entry?.text || '');
            if (!entryText) continue;
            const entryUrl = entry?.url || entry?.id ? `manual://${entry.id}` : `manual://${Math.random().toString(36).slice(2)}`;
            if (existingUrls.has(entryUrl)) continue;

            // Extract contact info for Contact Directory visibility
            const contactInfo: Array<{ type: string; value: string }> = [];
            const emailMatches = entryText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [];
            emailMatches.forEach((e: string) => {
              const domain = e.split('@')[1]?.toLowerCase();
              if (domain && !['sentry.io', 'example.com', 'w3.org', 'schema.org', 'wixpress.com'].includes(domain)) {
                contactInfo.push({ type: 'email', value: e.toLowerCase() });
              }
            });
            const phoneMatches = entryText.match(/(?:\+?\d{1,4}[\s.\-]?)?[\(]?\d{2,5}[\)]?[\s.\-]?\d{2,5}[\s.\-]?\d{2,6}(?:[\s.\-]?\d{0,5})?/g) || [];
            phoneMatches.forEach((ph: string) => {
              const digits = ph.replace(/\D/g, '');
              if (digits.length >= 7 && digits.length <= 15 && !/^(.)\1+$/.test(digits)) {
                contactInfo.push({ type: 'phone', value: ph.trim() });
              }
            });
            if (entryText.length < 300 && /\d{4,6}/.test(entryText) && /[A-Za-z]{3,}/.test(entryText)) {
              contactInfo.push({ type: 'address', value: entryText.trim() });
            }
            const addressPatterns = [/(?:address|location|office|headquarters)[:\s]*([^\n]{10,120})/gi];
            addressPatterns.forEach((re: RegExp) => {
              const matches = entryText.match(re) || [];
              matches.forEach((a: string) => {
                contactInfo.push({ type: 'address', value: a.replace(/\s+/g, ' ').trim() });
              });
            });

            allPagesWithManual.push({
              url: entryUrl,
              title: entry?.title || 'Manual Entry',
              content: entryText,
              headings: [],
              paragraphs: entryText.split(/\n\n+/).filter(Boolean).slice(0, 50),
              contactInfo,
            });
          }
        }

        await supabase
          .from('assistants')
          .update({
            scraped_content: { ...existingScraped, allPages: allPagesWithManual },
            crawl_status: 'indexed',
          })
          .eq('id', assistantId);

        console.log(`[LocalReindex] Saved ${enrichedPages.length} enriched pages back to scraped_content.allPages`);
      } catch (saveErr: any) {
        console.warn('[LocalReindex] Failed to save enriched pages to scraped_content:', saveErr?.message);
        // Still update crawl_status even if save fails
        await supabase
          .from('assistants')
          .update({ crawl_status: 'indexed' })
          .eq('id', assistantId);
      }

      toast({
        title: 'Reindex complete (local)',
        description: `Reindexed ${totalIndexed} page(s) from stored content with contact data extracted.`
      });
    } catch (err: any) {
      throw err; // Let the caller handle it
    }
  };

  const handleRecrawlAndIndex = async () => {
    if (!assistantId) return;
    setRecrawling(true);
    setReindexProgress(null);
    cancelRef.current = false;
    try {
      // 1. Get the website URL
      const { data: assistant, error: assistantError } = await supabase
        .from('assistants')
        .select('website_url')
        .eq('id', assistantId)
        .single();

      if (assistantError || !assistant?.website_url) {
        throw new Error('No website URL configured for this assistant.');
      }

      setReindexProgress({ current: 0, total: 0, status: 'Starting fresh crawl...' });

      // 2. Use crawl limit from override or category selector
      const effectiveCrawlLimit = crawlLimitOverride || getCrawlLimitForSize(websiteSize);

      // Start a new Firecrawl crawl
      const { data: crawlResult, error: crawlError } = await supabase.functions.invoke('firecrawl-crawl', {
        body: {
          assistantId,
          url: assistant.website_url,
          crawlLimit: effectiveCrawlLimit,
          crawlDepth: 5,
        }
      });

      if (crawlError) throw new Error(crawlError.message || 'Failed to start crawl');

      // Check for inline error from the edge function (returned as 200 with success:false)
      if (crawlResult && crawlResult.success === false) {
        throw new Error(crawlResult.error || 'Crawl service returned an error');
      }

      // Extract the job ID from the crawl response
      const newJobId = crawlResult?.data?.id || crawlResult?.id || crawlResult?.jobId;
      if (!newJobId) {
        // The crawl endpoint might have already completed inline via knowledge-upsert
        toast({
          title: 'Crawl initiated',
          description: 'Crawl started. The webhook will handle indexing when complete. Check back in a few minutes.',
        });
        return;
      }

      // 3. Save the new job ID
      await supabase
        .from('assistants')
        .update({ firecrawl_job_id: newJobId, crawl_status: 'crawling' })
        .eq('id', assistantId);

      setReindexProgress({ current: 0, total: 0, status: `Crawl started (Job: ${newJobId.slice(0, 8)}...). Polling for completion...` });

      // 4. Poll until crawl is complete
      let pollAttempts = 0;
      const MAX_POLL_ATTEMPTS = 300; // ~25 minutes at 5s intervals
      let crawlComplete = false;

      while (!crawlComplete && pollAttempts < MAX_POLL_ATTEMPTS) {
        if (cancelRef.current) {
          toast({ title: 'Re-crawl cancelled', description: 'The crawl job continues on Firecrawl servers. You can re-index later.' });
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 5000)); // 5s delay
        pollAttempts++;

        const { data: statusData } = await supabase.functions.invoke('firecrawl-fetch-page', {
          body: { jobId: newJobId }
        });

        if (!statusData?.success) {
          setReindexProgress(prev => prev ? { ...prev, status: `Polling... (attempt ${pollAttempts}, waiting for crawl)` } : null);
          continue;
        }

        const status = statusData.status;
        const completed = statusData.completed || 0;
        const total = statusData.total || 0;

        setReindexProgress({
          current: completed,
          total: total || completed,
          status: status === 'completed'
            ? 'Crawl complete! Starting indexing...'
            : `Crawling: ${completed}/${total} pages (${status})...`
        });

        if (status === 'completed') {
          crawlComplete = true;
        }
      }

      if (!crawlComplete) {
        toast({
          title: 'Crawl still in progress',
          description: 'The crawl is taking longer than expected. The webhook will handle indexing when it completes.',
          variant: 'destructive',
        });
        return;
      }

      // 5. Now paginate through ALL results and index them client-side
      let nextUrl: string | null = null;
      let isFirstBatch = true;
      let totalPagesIndexed = 0;
      let totalBatches = 0;
      let totalFromFirecrawl = 0;
      const BATCH_SIZE = 10;
      const allPagesForStorage: any[] = [];

      while (true) {
        if (cancelRef.current) break;

        const { data: pageData, error: pageError } = await supabase.functions.invoke('firecrawl-fetch-page', {
          body: { jobId: newJobId, nextUrl }
        });

        if (pageError || !pageData?.success) {
          console.error('Fetch page error during re-crawl indexing:', pageError || pageData?.error);
          break;
        }

        const items = pageData.items || [];
        totalFromFirecrawl = pageData.total || totalFromFirecrawl;
        nextUrl = pageData.next || null;

        if (items.length === 0 && !nextUrl) break;

        // Extract pages
        const pages: { url?: string; title?: string; content: string }[] = [];
        for (const item of items) {
          const content = item.markdown || item.content || item.html || '';
          const title = item.metadata?.title || item.metadata?.sourceURL || 'Untitled';
          const url = item.metadata?.sourceURL || item.url || '';
          const clean = String(content || '').trim();
          if (clean.length > 0) {
            pages.push({ url, title, content: clean });
            // Also store for scraped_content backup
            allPagesForStorage.push({ url, title, content: clean, paragraphs: clean.split(/\n\n+/).slice(0, 20) });
          }
        }

        // Send in sub-batches
        for (let i = 0; i < pages.length; i += BATCH_SIZE) {
          if (cancelRef.current) break;
          const batch = pages.slice(i, i + BATCH_SIZE);
          totalBatches++;

          setReindexProgress({
            current: totalPagesIndexed + i + batch.length,
            total: totalFromFirecrawl,
            status: `Indexing batch ${totalBatches} (${totalPagesIndexed + i + batch.length} of ${totalFromFirecrawl} pages)...`
          });

          const { data: upsertData, error: upsertError } = await supabase.functions.invoke('knowledge-upsert', {
            body: {
              assistantId,
              websiteUrl: assistant.website_url,
              pages: batch,
              tags: ['firecrawl-recrawl']
            }
          });

          if (upsertError) {
            console.error('knowledge-upsert error on batch', totalBatches, upsertError);
            // Continue with remaining batches instead of failing entirely
            continue;
          }
          isFirstBatch = false;
        }

        totalPagesIndexed += pages.length;

        // Periodically save allPages to scraped_content (every 100 pages)
        if (allPagesForStorage.length % 100 < BATCH_SIZE && allPagesForStorage.length > 0) {
          await supabase.from('assistants').update({
            scraped_content: { allPages: allPagesForStorage },
            last_scraped_at: new Date().toISOString(),
          }).eq('id', assistantId);
        }

        if (!nextUrl) break;
      }

      // 6. Final save of all pages to scraped_content
      if (allPagesForStorage.length > 0) {
        await supabase.from('assistants').update({
          scraped_content: { allPages: allPagesForStorage },
          last_scraped_at: new Date().toISOString(),
          crawl_status: 'indexed',
          firecrawl_job_id: newJobId,
        }).eq('id', assistantId);
      }

      setReindexProgress({ current: totalPagesIndexed, total: totalPagesIndexed, status: 'Complete!' });
      setLastRefresh(new Date().toISOString());

      toast({
        title: 'Re-crawl & Index complete',
        description: `Crawled and indexed ${totalPagesIndexed} pages across ${totalBatches} batches. All pages saved locally for future re-indexing.`
      });
    } catch (err: any) {
      console.error('Re-crawl error:', err);
      toast({
        title: 'Re-crawl failed',
        description: err?.message || 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setRecrawling(false);
      setTimeout(() => setReindexProgress(null), 8000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (!subscription.subscribed) {
    return (
      <Card className="border-l-4 border-l-ai-blue">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Premium Feature: Website Content Refresh
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Globe className="h-12 w-12 text-ai-blue mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Upgrade for Website Content Refresh</h3>
          <p className="text-muted-foreground mb-4">
            Keep your voice assistant updated with the latest website content automatically.
          </p>
          <Button onClick={() => window.location.href = '/pricing'}>
            View Pricing Plans
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="w-full border-l-4 border-l-ai-blue">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-ai-blue" />
            Website Content Refresh
            <Badge variant="secondary" className="ml-2">Premium</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Keep your assistant updated with the latest website content — business details, 
            contact information, and comprehensive content analysis.
          </p>
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

          {/* Auto-refresh toggle */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-1">
              <Label htmlFor="auto-refresh">Auto-refresh Content</Label>
              <p className="text-sm text-muted-foreground">
                Automatically update your assistant when website content changes
              </p>
            </div>
            <Switch
              id="auto-refresh"
              checked={autoRefreshEnabled}
              onCheckedChange={handleAutoRefreshToggle}
            />
          </div>

          {autoRefreshEnabled && (
            <div className="space-y-2">
              <Label>Refresh Frequency</Label>
              <Select value={refreshFrequency} onValueChange={handleFrequencyChange}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Current website + last updated */}
          <div className="space-y-2 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {lastRefresh 
                ? `Last updated: ${formatDate(lastRefresh)}`
                : "Never refreshed"
              }
            </div>

            {/* Website size selector */}
            <WebsiteSizeSelector
              value={websiteSize}
              onChange={setWebsiteSize}
              disabled={recrawling || reindexing || loading}
              overrideLimit={crawlLimitOverride}
            />

            {/* Action buttons stacked */}
            <Button
              onClick={() => setShowRecrawlDialog(true)}
              disabled={recrawling || reindexing || loading}
              className="w-full"
            >
              {recrawling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Re-scraping website content...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Re-scrape Website Content
                </>
              )}
            </Button>
            <Button 
              onClick={() => setShowRefreshDialog(true)} 
              disabled={loading || reindexing || recrawling}
              variant="outline"
              className="w-full"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Homepage
            </Button>
            <Button
              onClick={() => setShowReindexDialog(true)}
              disabled={reindexing || loading || recrawling}
              variant="outline"
              className="w-full"
            >
              {reindexing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Re-index Stored Content
            </Button>
          </div>

          {/* Blue guidance box */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Content Management Features</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Intelligent contact information detection</li>
              <li>• Business address and location extraction</li>
              <li>• Automatic content updates on schedule</li>
              <li>• Documents and manual entries always preserved</li>
            </ul>
          </div>


          {reindexProgress && (
            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{reindexProgress.status}</span>
                {reindexProgress.total > 0 && (
                  <span className="font-medium">
                    {reindexProgress.current} / {reindexProgress.total}
                  </span>
                )}
              </div>
              <Progress 
                value={reindexProgress.total > 0 ? (reindexProgress.current / reindexProgress.total) * 100 : undefined} 
                className={`h-2 ${reindexProgress.total === 0 ? 'animate-pulse' : ''}`}
              />
              <KeepTabOpenNotice visible={true} />
            </div>
          )}

          {(recrawling || loading) && !reindexProgress && (
            <KeepTabOpenNotice visible={true} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Refresh History</CardTitle>
          {refreshLogs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClearHistoryDialog(true)}
              disabled={clearingHistory}
              className="text-muted-foreground hover:text-destructive"
            >
              {clearingHistory ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Clear
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {refreshLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No refresh history yet. Start by running a manual refresh.
            </div>
          ) : (
            <div className="space-y-3">
              {refreshLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(log.refresh_status)}
                    <div>
                      <div className="font-medium capitalize">{log.refresh_status}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(log.started_at)} • {log.triggered_by}
                      </div>
                      {log.changes_detected?.total_changes > 0 && (
                        <div className="text-sm text-green-600">
                          {log.changes_detected.total_changes} changes detected
                        </div>
                      )}
                      {log.error_message && (
                        <div className="text-sm text-red-600">
                          Error: {log.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Badge 
                    variant={
                      log.refresh_status === 'completed' ? 'secondary' :
                      log.refresh_status === 'failed' ? 'destructive' : 'outline'
                    }
                  >
                    {log.refresh_status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refresh Now Confirmation */}
      <AlertDialog open={showRefreshDialog} onOpenChange={setShowRefreshDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-500" />
              Refresh Website Content?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This performs a <strong>lightweight single-page scrape</strong> of your main website URL.</p>
              <p className="text-sm">✅ No crawl credits used.</p>
              <p className="text-sm">✅ Uploaded documents and manual entries are <strong>not affected</strong>.</p>
              <p className="text-sm">ℹ️ Only the main page content will be updated — subpages are not crawled.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowRefreshDialog(false); handleManualRefresh(); }}>
              Refresh Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Re-index Stored Content Confirmation */}
      <AlertDialog open={showReindexDialog} onOpenChange={setShowReindexDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              Re-index Stored Content?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This re-processes your <strong>previously crawled website data</strong> stored in the database.</p>
              <p className="text-sm">✅ No crawl credits used — zero cost.</p>
              <p className="text-sm">✅ Uploaded documents and manual entries are <strong>not affected</strong>.</p>
              <p className="text-sm">ℹ️ The system will use your locally stored content to rebuild the knowledge base.</p>
              <p className="text-sm">💡 Use this when you want to rebuild your knowledge vectors without re-crawling.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowReindexDialog(false); handleReindexFromJson(); }}>
              Re-index Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Re-scrape Website Content Confirmation */}
      <AlertDialog open={showRecrawlDialog} onOpenChange={setShowRecrawlDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Re-scrape Website Content?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will re-crawl your website with <strong>enhanced AI extraction</strong> to capture business details, contact information, and comprehensive content.</p>
              <p className="text-sm">⚠️ <strong>Uses crawl credits</strong> — a new crawl job will be created.</p>
              <p className="text-sm">✅ Uploaded documents (PDF, DOCX, etc.) will <strong>not</strong> be affected.</p>
              <p className="text-sm">✅ Manual knowledge entries will be preserved.</p>
              <p className="text-sm">⚠️ Previously scraped website pages will be updated with fresh content.</p>
              <p className="text-sm">⏱️ Large websites may take several minutes. Progress will be shown below.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowRecrawlDialog(false); handleRecrawlAndIndex(); }}>
              Start Re-scrape
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear History Confirmation */}
      <AlertDialog open={showClearHistoryDialog} onOpenChange={setShowClearHistoryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Clear Refresh History?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will permanently remove all refresh history entries for this assistant.</p>
              <p className="text-sm">ℹ️ This only clears the log entries — your knowledge base content is <strong>not affected</strong>.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowClearHistoryDialog(false);
                setClearingHistory(true);
                try {
                  const { error } = await supabase
                    .from('content_refresh_logs')
                    .delete()
                    .eq('assistant_id', assistantId);
                  if (error) throw error;
                  setRefreshLogs([]);
                  toast({ title: 'History cleared', description: 'All refresh history entries have been removed.' });
                } catch (err: any) {
                  toast({ title: 'Failed to clear history', description: err.message, variant: 'destructive' });
                } finally {
                  setClearingHistory(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
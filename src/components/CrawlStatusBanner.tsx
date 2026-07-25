import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Database, Radio, X, Sparkles, AlertTriangle } from 'lucide-react';
import { KeepTabOpenNotice } from '@/components/KeepTabOpenNotice';

interface CrawlStatusBannerProps {
  assistantId: string;
  onReindex: () => Promise<void>;
}

export const CrawlStatusBanner: React.FC<CrawlStatusBannerProps> = ({ assistantId, onReindex }) => {
  const [crawlStatus, setCrawlStatus] = useState<string>('idle');
  const [reindexing, setReindexing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [fixingStatus, setFixingStatus] = useState(false);
  const [crawlStartedAt, setCrawlStartedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!assistantId) return;

    const fetchStatus = async () => {
      const { data } = await supabase
        .from('assistants')
        .select('crawl_status, updated_at, scraped_content')
        .eq('id', assistantId)
        .single();
      if (data?.crawl_status) {
        setCrawlStatus(data.crawl_status);
        setCrawlStartedAt(data.updated_at);
      }
    };
    fetchStatus();

    const channel = supabase
      .channel(`crawl-status-${assistantId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'assistants',
          filter: `id=eq.${assistantId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any)?.crawl_status;
          if (newStatus) {
            setCrawlStatus(newStatus);
            setDismissed(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [assistantId]);

  const handleReindex = async () => {
    setReindexing(true);
    try {
      await onReindex();
      setCrawlStatus('indexed');
    } catch {
      // Error handled by parent
    } finally {
      setReindexing(false);
    }
  };

  const handleFixStuckStatus = async () => {
    setFixingStatus(true);
    try {
      // Check if scraped_content exists — if so, the crawl completed but status wasn't updated
      const { data } = await supabase
        .from('assistants')
        .select('scraped_content')
        .eq('id', assistantId)
        .single();

      const scraped = data?.scraped_content as any;
      const hasContent = scraped && (
        (Array.isArray(scraped?.allPages) && scraped.allPages.length > 0) ||
        (Array.isArray(scraped?.pages) && scraped.pages.length > 0)
      );

      const newStatus = hasContent ? 'completed' : 'idle';

      await supabase
        .from('assistants')
        .update({ crawl_status: newStatus })
        .eq('id', assistantId);

      setCrawlStatus(newStatus);
    } catch (err) {
      console.error('Failed to fix stuck status:', err);
    } finally {
      setFixingStatus(false);
    }
  };

  if (dismissed) return null;

  if (crawlStatus === 'idle' || !crawlStatus) {
    return null;
  }

  // Check if crawling has been stuck for more than 30 minutes
  const isStuckCrawling = crawlStatus === 'crawling' && crawlStartedAt &&
    (Date.now() - new Date(crawlStartedAt).getTime() > 30 * 60 * 1000);

  if (crawlStatus === 'crawling') {
    return (
      <div className="space-y-2">
        <div className={`rounded-lg border p-4 flex items-center gap-3 ${
          isStuckCrawling
            ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
            : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 animate-pulse'
        }`}>
          {isStuckCrawling ? (
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          ) : (
            <Radio className="h-5 w-5 text-blue-500 animate-spin" />
          )}
          <div className="flex-1">
            <p className={`font-medium ${
              isStuckCrawling
                ? 'text-amber-800 dark:text-amber-200'
                : 'text-blue-800 dark:text-blue-200'
            }`}>
              {isStuckCrawling ? 'Crawl status may be stuck' : 'Website crawl in progress...'}
            </p>
            <p className={`text-sm ${
              isStuckCrawling
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-blue-600 dark:text-blue-400'
            }`}>
              {isStuckCrawling
                ? 'The crawl has been running for over 30 minutes. It may have completed but the status wasn\'t updated. Click "Fix Status" to check.'
                : 'Firecrawl is scanning your website pages. This banner will update automatically when complete.'
              }
            </p>
          </div>
          {isStuckCrawling ? (
            <Button
              onClick={handleFixStuckStatus}
              disabled={fixingStatus}
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-100 flex-shrink-0"
            >
              {fixingStatus ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                'Fix Status'
              )}
            </Button>
          ) : (
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          )}
        </div>
        <KeepTabOpenNotice visible={true} />
      </div>
    );
  }

  if (crawlStatus === 'completed') {
    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-green-800 dark:text-green-200">
              ✅ Website crawl complete!
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              Your content has been crawled successfully. Click the button to index it into your knowledge base.
            </p>
          </div>
          <Button
            onClick={handleReindex}
            disabled={reindexing}
            className="bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
          >
            {reindexing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Indexing...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Index Content Now
              </>
            )}
          </Button>
        </div>
        <KeepTabOpenNotice visible={reindexing} />
      </div>
    );
  }

  if (crawlStatus === 'indexed') {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 p-4 flex items-start gap-3">
        <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-emerald-800 dark:text-emerald-200">
            🎉 Website knowledge base is active!
          </p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
            Your assistant is now using your website content to answer questions. You can click <strong>"Re-index Stored Content"</strong> below anytime to refresh vectors without using crawl credits.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-emerald-400 hover:text-emerald-600 dark:text-emerald-500 dark:hover:text-emerald-300 flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return null;
};

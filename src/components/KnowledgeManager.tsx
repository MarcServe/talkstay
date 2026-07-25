import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UploadCloud, Search, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface KnowledgeManagerProps {
  assistantId: string;
  assistantName?: string;
}
interface SearchMatch {
  id: string;
  score?: number;
  metadata?: Record<string, any>;
}
export const KnowledgeManager: React.FC<KnowledgeManagerProps> = ({
  assistantId,
  assistantName
}) => {
  const {
    toast
  } = useToast();
  const {
    subscription
  } = useSubscription();
  const isSubscribed = !!subscription?.subscribed;
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState<number>(3);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchMatch[] | null>(null);
  const [domainFilter, setDomainFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [runningDiag, setRunningDiag] = useState(false);
  const [diag, setDiag] = useState<any | null>(null);
  const [diagDialogOpen, setDiagDialogOpen] = useState(false);
  const handleIngest = async () => {
    if (!assistantId) return;
    if (!isSubscribed) {
      toast({
        title: "Subscription required",
        description: "Upgrade to enable full-site indexing with Firecrawl.",
        variant: "destructive"
      });
      return;
    }
    if (!websiteUrl) {
      toast({
        title: "Website URL required",
        description: "Enter a website URL to index.",
        variant: "destructive"
      });
      return;
    }
    setIngesting(true);
    setResults(null);
    const showError = (title: string, err: any) => {
      console.error(title, err);
      
      // Determine if this is a refresh scenario or initial ingestion
      const errorMessage = err?.message || String(err);
      const isRefreshMode = !replaceExisting;
      
      // Provide context-aware friendly messages
      if (isRefreshMode && errorMessage.includes('already exists')) {
        toast({
          title: "Content Already Indexed",
          description: "This content is already in your knowledge base. Enable 'Refresh Content' to update it.",
        });
      } else if (errorMessage.includes('websiteUrl')) {
        toast({
          title: "Invalid URL",
          description: "Please check the website URL and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Indexing Issue",
          description: isRefreshMode 
            ? "Unable to add new content. Try enabling 'Refresh Content' to replace existing data."
            : "Unable to process the website content. Please try again.",
        });
      }
    };
    try {
      // First scrape the website to get content
      const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke("scrape-website", {
        body: {
          url: websiteUrl
        }
      });
      
      if (scrapeError || !scrapeData?.data?.content) {
        throw new Error(scrapeError?.message || 'Failed to scrape website content');
      }

      // Then index into pgvector
      const pages = [{
        url: websiteUrl,
        title: scrapeData.data.title || 'Website Content',
        content: scrapeData.data.content
      }];

      const {
        data,
        error
      } = await supabase.functions.invoke("knowledge-upsert", {
        body: {
          assistantId,
          websiteUrl, // Required for domain extraction
          pages,
          replace: replaceExisting
        }
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Upsert failed');
      toast({
        title: "Success",
        description: `Indexed ${data.chunks || 0} chunks from ${data.pages || 0} page(s).`
      });
    } catch (err: any) {
      console.error("Knowledge ingest error", err);
      showError('Ingestion failed', err);
    } finally {
      setIngesting(false);
    }
  };
  const handleReindexFromJson = async () => {
    if (!assistantId) return;
    setReindexing(true);
    try {
      // Fetch assistant with stored knowledge base
      const {
        data: assistant,
        error
      } = await supabase.from('assistants').select('scraped_content, website_url, business_name').eq('id', assistantId).single();
      if (error) throw error;
      let kb: any = assistant?.scraped_content;
      if (!kb) throw new Error('No stored knowledge base found for this assistant.');
      if (typeof kb === 'string') {
        try {
          kb = JSON.parse(kb);
        } catch {/* keep as-is */}
      }

      // Accept several shapes and normalize to pages[]
      const pages: {
        url?: string;
        title?: string;
        content: string;
        headings?: string[];
      }[] = [];
      const pushPage = (p: any) => {
        if (!p) return;
        const title = p.title || p.pageTitle || p.h1 || p.path || p.url || 'Untitled';
        const content = p.content || p.markdown || p.text || p.body || '';
        const url = p.url || (typeof p.path === 'string' ? p.path : undefined);
        const headings = Array.isArray(p.headings) ? p.headings : undefined;
        const clean = String(content || '').trim();
        if (clean.length > 0) pages.push({
          url,
          title,
          content: clean,
          headings
        });
      };
      if (Array.isArray(kb?.allPages)) {
        kb.allPages.forEach((p: any) => pushPage(p));
      } else if (Array.isArray(kb?.pages)) {
        kb.pages.forEach((p: any) => pushPage(p));
      } else if (Array.isArray(kb)) {
        kb.forEach((p: any) => pushPage(p));
      }
      if (!pages.length) throw new Error('No valid pages found in stored knowledge base.');
      const {
        data,
        error: upsertError
      } = await supabase.functions.invoke('knowledge-upsert', {
        body: {
          assistantId,
          pages,
          tags: ['kb-upload']
        }
      });
      if (upsertError) throw upsertError;
      if (!data?.success) throw new Error(data?.error || 'Reindex failed');
      toast({
        title: 'Reindex complete',
        description: `Reindexed ${data.pages || pages.length} page(s) for ${assistant?.business_name || 'assistant'}.`
      });
    } catch (err: any) {
      console.error('KB reindex error', err);
      toast({
        title: 'Reindex failed',
        description: err?.message || 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setReindexing(false);
    }
  };
  const handleSearch = async () => {
    if (!assistantId || !query) {
      toast({
        title: "Missing query",
        description: "Enter a search query first.",
        variant: "destructive"
      });
      return;
    }
    setSearching(true);
    setResults(null);
    try {
      const tags = tagFilter.split(',').map(s => s.trim()).filter(Boolean);
      const {
        data,
        error
      } = await supabase.functions.invoke("knowledge-search", {
        body: {
          assistantId,
          query,
          topK,
          domain: domainFilter || undefined,
          tags: tags.length ? tags : undefined
        }
      });
      if (error) throw error;

      // Expect result shape: { matches: [...] }
      const matches: SearchMatch[] = data?.matches || data?.results || [];
      setResults(matches);
      toast({
        title: "Search complete",
        description: `${matches.length} result(s) found.`
      });
    } catch (err: any) {
      console.error("Knowledge search error", err);
      toast({
        title: "Search failed",
        description: err.message || "Unknown error",
        variant: "destructive"
      });
    } finally {
      setSearching(false);
    }
  };
  const handleDiagnostics = async () => {
    setRunningDiag(true);
    setDiag(null);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("knowledge-diagnostics", {
        body: {
          assistantId
        }
      });
      if (error) throw error;
      setDiag(data);
      setDiagDialogOpen(true);

      // Enhanced feedback for pgvector diagnostics
      const vectorCount = data?.pgvector?.vectorCount;
      if (typeof vectorCount === 'number') {
        toast({
          title: "Diagnostics complete",
          description: `Found ${vectorCount} vectors in your knowledge base.`
        });
      } else {
        toast({
          title: "Diagnostics complete",
          description: "Checks finished - see results below."
        });
      }
    } catch (err: any) {
      console.error("Diagnostics error", err);
      setDiag({
        ok: false,
        error: err?.message || "Unknown error"
      });
      setDiagDialogOpen(true);
      toast({
        title: "Diagnostics failed",
        description: err?.message || "Unknown error",
        variant: "destructive"
      });
    } finally {
      setRunningDiag(false);
    }
  };
  // Add helper function to test specific domain search
  const handleDomainSearch = async (domain: string) => {
    setQuery(`bizboosters content`);
    setDomainFilter(domain);
    setTopK(10);
    await handleSearch();
  };
  return <div className="space-y-6">
      <Card className="bg-glass border-glass backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Ingest Knowledge {assistantName ? `for \"${assistantName}\"` : ""}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input id="websiteUrl" type="url" placeholder="https://example.com" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} />
            </div>

            <div className="flex flex-col justify-end gap-2">
              <Button onClick={handleIngest} disabled={ingesting || !assistantId || !isSubscribed} className="w-full">
                {ingesting ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating
                  </> : <>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    {isSubscribed ? 'Update Website' : 'Subscribe to Update'}
                  </>}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {!isSubscribed && <div className="rounded-md border p-3">
                <div className="space-y-1">
                  <Label>Full indexing with Firecrawl</Label>
                  <p className="text-sm text-muted-foreground">Preview uses a lightweight scan. Subscribe to index your entire site and keep it fresh.</p>
                </div>
              </div>}
            <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/5 p-3 hover:border-primary/60 transition-colors">
              <div className="space-y-1">
                <Label htmlFor="replaceExisting">Refresh Content (replace old website content)</Label>
                <p className="text-sm text-muted-foreground">Re-index and replace existing vectors safely</p>
              </div>
              <Switch id="replaceExisting" checked={replaceExisting} onCheckedChange={setReplaceExisting} className="ring-1 ring-ring/30 focus-visible:ring-2" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" onClick={handleDiagnostics} disabled={runningDiag}>
              {runningDiag ? <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running diagnostics
                </> : <>Run diagnostics</>}
            </Button>

            <Button variant="outline" onClick={handleReindexFromJson} disabled={reindexing || !assistantId}>
              {reindexing ? <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Re-indexing…
                </> : <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-index Stored Content
                </>}
            </Button>
            
            <Button variant="outline" onClick={() => handleDomainSearch('bizboosters.co.uk')} disabled={searching} className="text-sm">
              Test {assistantName || 'Search'}
            </Button>
          </div>

        </CardContent>
      </Card>

      <Card className="bg-card">
        
        
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Test Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="query">Query</Label>
              <Input id="query" placeholder="e.g. What services do you offer?" value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topk">Top K</Label>
              <Input id="topk" type="number" min={1} max={20} value={topK} onChange={e => setTopK(parseInt(e.target.value || "3", 10))} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="domain-filter">Domain Filter (optional)</Label>
              <Input id="domain-filter" placeholder="e.g. bizboosters.co.uk" value={domainFilter} onChange={e => setDomainFilter(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag-filter">Tag Filter (optional, comma-separated)</Label>
              <Input id="tag-filter" placeholder="e.g. firecrawl, kb-upload" value={tagFilter} onChange={e => setTagFilter(e.target.value)} />
            </div>
          </div>

          

          <div className="flex justify-end">
            <Button onClick={handleSearch} disabled={searching || !assistantId}>
              {searching ? <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching
                </> : <>
                  <Search className="mr-2 h-4 w-4" />
                  Test Search
                </>}
            </Button>
          </div>

          <Separator />

          {results && <div className="space-y-3">
              <h4 className="text-sm font-medium">Results</h4>
              <ul className="space-y-2">
                {results.map(m => <li key={m.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate">{m.metadata?.title || m.metadata?.url || m.id}</div>
                      {typeof m.score === "number" && <span className="text-xs text-muted-foreground">score: {m.score.toFixed(3)}</span>}
                    </div>
                    {m.metadata?.url && <a href={m.metadata.url} target="_blank" rel="noreferrer" className="text-sm text-primary underline" aria-label={`Open source page: ${m.metadata.url}`}>
                        {m.metadata.url}
                      </a>}
                    {m.metadata?.snippet && <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{m.metadata.snippet}</p>}
                    {(m.metadata?.domain || Array.isArray(m.metadata?.tags) && m.metadata.tags.length) && <div className="mt-2 text-xs text-muted-foreground">
                        {m.metadata?.domain && <span>Domain: {m.metadata.domain}</span>}
                        {m.metadata?.domain && Array.isArray(m.metadata?.tags) && m.metadata.tags.length && <span> • </span>}
                        {Array.isArray(m.metadata?.tags) && m.metadata.tags.length && <span>Tags: {m.metadata.tags.join(', ')}</span>}
                      </div>}
                  </li>)}
              </ul>
            </div>}
        </CardContent>
      </Card>
    <Dialog open={diagDialogOpen} onOpenChange={setDiagDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Diagnostics</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <div className="text-sm">
            <strong>Connection Status:</strong> {diag?.ok ? "✅ All systems connected" : "❌ Some checks failed"}
          </div>
          
          {diag?.openai && <div className="space-y-2 p-3 bg-muted rounded">
              <div className="font-medium">OpenAI Status</div>
              <div className="text-sm">
                Embeddings: {diag.openai.ok ? "✅ Working" : "❌ Failed"}
              </div>
            </div>}
          
          {diag?.firecrawl && <div className="space-y-2 p-3 bg-muted rounded">
              <div className="font-medium">Firecrawl Status</div>
              <div className="text-sm space-y-1">
                <div>API: {diag.firecrawl.ok ? "✅ Working" : "❌ Failed"}</div>
                {diag.firecrawl.pages_scraped && <div>Recent test scrape: {diag.firecrawl.pages_scraped} pages</div>}
              </div>
            </div>}
          
          {diag?.error && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
              <div className="text-sm text-destructive">{diag.error}</div>
            </div>}
        </div>
        <DialogFooter>
          <Button onClick={() => setDiagDialogOpen(false)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>;
};
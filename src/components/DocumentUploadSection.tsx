import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText, Loader2, X, RotateCcw } from "lucide-react";
import { parseClientPDF, shouldUseClientParsing } from "@/utils/clientPDFParser";
import { validateKnowledgeBaseJson } from "@/utils/knowledgeBaseProcessor";
import { KeepTabOpenNotice } from "@/components/KeepTabOpenNotice";
import { Progress as ProgressBar } from "@/components/ui/progress";

const ACCEPTED_FORMATS = ".pdf,.docx,.doc,.txt,.json,.csv,.xlsx,.pptx,.rtf";

const DOCUMENT_TYPES = [
{ value: "policy", label: "Policy Document" },
{ value: "faq", label: "FAQ / Help Docs" },
{ value: "training", label: "Training Manual" },
{ value: "product", label: "Product Catalog" },
{ value: "contract", label: "Contract / Agreement" },
{ value: "company", label: "Company Profile" },
{ value: "portfolio", label: "Portfolio / Case Studies" },
{ value: "resume", label: "Resume / CV" },
{ value: "other", label: "Other" }];


interface DocumentUploadSectionProps {
  assistantId: string;
  websiteUrl: string;
  onUploadComplete?: () => void;
  /** TalkStay Knowledge: dashed simple chrome (same features, fewer clicks). */
  variant?: "default" | "simple";
}

type ParsedPage = {url: string;title: string;content: string;headings: string[];};

async function parseFile(
file: File,
onProgress: (status: string, pct: number) => void)
: Promise<ParsedPage[]> {
  const fileName = file.name;
  const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
  let pages: ParsedPage[] = [];

  if (fileExt === 'json') {
    const text = await file.text();
    const parsed = JSON.parse(text);

    // Handle single-page Firecrawl result objects: { success, data: { markdown, metadata } }
    // or { markdown, metadata } or { data: { markdown } }
    const fcData = parsed?.data || parsed;
    const fcContent = fcData?.markdown || fcData?.html || fcData?.rawHtml || fcData?.content || fcData?.full_text;
    const fcMeta = fcData?.metadata || parsed?.metadata;

    if (fcContent && typeof fcContent === 'string' && fcContent.trim().length > 20) {
      // Single Firecrawl page object detected
      pages = [{
        url: fcMeta?.sourceURL || fcMeta?.url || `uploaded://${fileName}`,
        title: fcMeta?.title || fileName.replace(/\.json$/i, '').replace(/[_-]/g, ' '),
        content: fcContent.trim(),
        headings: []
      }];
      onProgress("Firecrawl JSON parsed", 100);
    } else if (validateKnowledgeBaseJson(parsed)) {
      // Collection-based format (array, pages, allPages, map)
      const rawPages = parsed.pages || parsed.allPages || (Array.isArray(parsed) ? parsed : Object.values(parsed));
      pages = (rawPages as any[]).map((p: any, i: number) => ({
        url: p.url || p.metadata?.sourceURL || `uploaded://${fileName}#${i}`,
        title: p.title || p.metadata?.title || `${fileName} - Section ${i + 1}`,
        content: typeof p === 'string' ? p : p.markdown || p.content || p.full_text || p.html || JSON.stringify(p),
        headings: p.headings || []
      }));
      onProgress("JSON parsed", 100);
    } else {
      throw new Error(`Unrecognized JSON format in ${fileName}. Expected Firecrawl result or knowledge base collection.`);
    }

  } else if (fileExt === 'pdf' && shouldUseClientParsing(file)) {
    onProgress("Parsing PDF locally...", 10);
    const result = await parseClientPDF(file, fileName, (p) => {
      onProgress(`Parsing PDF page ${p.currentPage}/${p.totalPages}`, Math.round(p.percentage * 0.9));
    });
    pages = result.pages.map((p) => ({
      url: p.url, title: p.title, content: p.content, headings: p.headings
    }));

  } else {
    onProgress("Uploading to server...", 20);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', fileName);

    const { data, error } = await supabase.functions.invoke('parse-document', { body: formData });
    if (error) throw new Error(`Server parsing failed for ${fileName}: ${error.message}`);
    if (!data?.pages || data.pages.length === 0) {
      throw new Error(`No content extracted from ${fileName}.`);
    }
    pages = data.pages.map((p: any, i: number) => ({
      url: p.url || `uploaded://${fileName}#${i}`,
      title: p.title || `${fileName} - Page ${i + 1}`,
      content: p.content || '',
      headings: p.headings || []
    }));
  }

  return pages.filter((p) => p.content.trim().length > 20);
}

export const DocumentUploadSection = ({
  assistantId, websiteUrl, onUploadComplete, variant = "default",
}: DocumentUploadSectionProps) => {
  const [uploading, setUploading] = useState(false);
  const [reindexingDocs, setReindexingDocs] = useState(false);
  const [reindexProgress, setReindexProgress] = useState<{current: number;total: number;status: string;} | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState("other");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxSize = 50 * 1024 * 1024;
    const oversized = files.filter((f) => f.size > maxSize);
    if (oversized.length > 0) {
      toast.error(`${oversized.length} file(s) exceed 50MB limit and were skipped.`);
    }
    const valid = files.filter((f) => f.size <= maxSize);
    if (valid.length === 0) return;

    setSelectedFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReindexDocuments = async () => {
    setReindexingDocs(true);
    setReindexProgress({ current: 0, total: 0, status: 'Fetching uploaded document vectors...' });
    try {
      // Fetch ALL document vectors with pagination (default Supabase limit is 1000)
      let allVectors: any[] = [];
      const PAGE_SIZE = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        // Strategy 1: Query by uploaded:// URL prefix
        const { data: urlVectors, error: urlErr } = await supabase.
        from('knowledge_vectors').
        select('content, title, url, source_id, metadata').
        eq('assistant_id', assistantId).
        ilike('url', 'uploaded://%').
        range(from, to);

        if (urlErr) throw new Error(urlErr.message);

        if (urlVectors && urlVectors.length > 0) {
          allVectors.push(...urlVectors);
        }
        hasMore = (urlVectors?.length || 0) === PAGE_SIZE;
        page++;
      }

      // Strategy 2: Also query by metadata tags containing 'document-upload' (catches docs without uploaded:// prefix)
      page = 0;
      hasMore = true;
      const existingIds = new Set(allVectors.map((v) => v.source_id));

      while (hasMore) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data: tagVectors, error: tagErr } = await supabase.
        from('knowledge_vectors').
        select('content, title, url, source_id, metadata').
        eq('assistant_id', assistantId).
        not('url', 'ilike', 'uploaded://%').
        contains('metadata', { tags: ['document-upload'] }).
        range(from, to);

        if (tagErr) {
          console.warn('[DocReindex] Tag-based query failed, skipping:', tagErr.message);
          break;
        }

        if (tagVectors && tagVectors.length > 0) {
          // Deduplicate against URL-based results
          for (const v of tagVectors) {
            if (!existingIds.has(v.source_id)) {
              allVectors.push(v);
              existingIds.add(v.source_id);
            }
          }
        }
        hasMore = (tagVectors?.length || 0) === PAGE_SIZE;
        page++;
      }

      if (allVectors.length === 0) {
        toast.info("No uploaded documents found to re-index.");
        return;
      }

      console.log(`[DocReindex] Found ${allVectors.length} document vectors to re-index`);
      setReindexProgress({ current: 0, total: allVectors.length, status: `Found ${allVectors.length} document chunks...` });

      // Group by source URL to reconstruct pages
      const pageMap = new Map<string, {url: string;title: string;content: string;source_id: string;}>();
      for (const v of allVectors) {
        // Group by base URL (strip chunk index from source_id)
        const baseUrl = v.url || 'uploaded://reindex';
        const key = baseUrl;
        const existing = pageMap.get(key);
        if (existing) {
          existing.content += '\n\n' + v.content;
        } else {
          pageMap.set(key, {
            url: baseUrl,
            title: v.title || 'Uploaded Document',
            content: v.content,
            source_id: v.source_id || ''
          });
        }
      }

      const pages = Array.from(pageMap.values());
      const BATCH_SIZE = 10;
      const totalBatches = Math.ceil(pages.length / BATCH_SIZE);
      let totalChunks = 0;

      for (let b = 0; b < totalBatches; b++) {
        const batch = pages.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
        setReindexProgress({
          current: b * BATCH_SIZE + batch.length,
          total: pages.length,
          status: `Re-indexing batch ${b + 1}/${totalBatches} (${batch.length} document pages)...`
        });

        const { data: upsertData, error: upsertError } = await supabase.functions.invoke('knowledge-upsert', {
          body: {
            assistantId,
            pages: batch.map((p) => ({ url: p.url, title: p.title, content: p.content })),
            websiteUrl: websiteUrl || 'uploaded://reindex',
            replace: false,
            tags: ['document-upload', 'document-reindex']
          }
        });

        if (upsertError) {
          console.warn(`[DocReindex] Batch ${b + 1} failed:`, upsertError.message);
        } else {
          totalChunks += upsertData?.chunks ?? 0;
        }

        // Small delay between batches to avoid rate limits
        if (b < totalBatches - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      setReindexProgress({ current: pages.length, total: pages.length, status: 'Complete!' });
      toast.success(`Re-indexed ${pages.length} document pages (${totalChunks} chunks). No duplicates created.`);
      onUploadComplete?.();
    } catch (err: any) {
      console.error('[DocReindex] Error:', err);
      toast.error(err.message || 'Failed to re-index documents.');
    } finally {
      setReindexingDocs(false);
      setTimeout(() => setReindexProgress(null), 5000);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select file(s) first.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setProgressStatus("Preparing files...");

    try {
      const allPages: ParsedPage[] = [];
      const fileCount = selectedFiles.length;
      let failedFiles: string[] = [];

      for (let i = 0; i < fileCount; i++) {
        const file = selectedFiles[i];
        const fileLabel = `File ${i + 1} of ${fileCount}: ${file.name}`;
        setProgressStatus(`Processing ${fileLabel}`);

        // Per-file progress mapped to overall progress
        const fileProgressBase = i / fileCount * 80;
        const fileProgressRange = 80 / fileCount;

        try {
          const pages = await parseFile(file, (status, pct) => {
            const overall = fileProgressBase + pct / 100 * fileProgressRange;
            setProgress(Math.round(overall));
            setProgressStatus(`${fileLabel} — ${status}`);
          });

          allPages.push(...pages);
        } catch (err: any) {
          console.error(`[DocumentUpload] Failed to parse ${file.name}:`, err);
          failedFiles.push(file.name);
        }
      }

      if (allPages.length === 0) {
        throw new Error("No meaningful content extracted from any file.");
      }

      // Trim oversized page content to prevent edge function memory issues
      const MAX_CONTENT_LENGTH = 15000; // ~15k chars per page max
      const trimmedPages = allPages.map((p) => ({
        ...p,
        content: p.content.length > MAX_CONTENT_LENGTH ?
        p.content.slice(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated for indexing]' :
        p.content
      }));

      // Batch upsert in chunks of 10 pages to avoid edge function memory/timeout limits
      const BATCH_SIZE = 10;
      const totalBatches = Math.ceil(trimmedPages.length / BATCH_SIZE);
      let totalChunks = 0;
      let failedBatches: number[] = [];

      const upsertBatch = async (batch: ParsedPage[], batchLabel: string) => {
        const { data: upsertData, error: upsertError } = await supabase.functions.invoke('knowledge-upsert', {
          body: {
            assistantId,
            pages: batch,
            websiteUrl: websiteUrl || `uploaded://batch-upload`,
            replace: false,
            tags: ['document-upload', documentType]
          }
        });
        if (upsertError) throw new Error(upsertError.message);
        return upsertData?.chunks ?? 0;
      };

      // First pass
      for (let b = 0; b < totalBatches; b++) {
        const batch = trimmedPages.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
        const batchProgress = 85 + b / totalBatches * 12;
        setProgress(Math.round(batchProgress));
        setProgressStatus(`Indexing batch ${b + 1}/${totalBatches} (${batch.length} pages)...`);

        try {
          totalChunks += await upsertBatch(batch, `Batch ${b + 1}`);
        } catch (err: any) {
          console.warn(`[DocumentUpload] Batch ${b + 1} failed, will retry:`, err.message);
          failedBatches.push(b);
        }
      }

      // Retry failed batches once
      if (failedBatches.length > 0) {
        const retryBatches = [...failedBatches];
        failedBatches = [];
        setProgressStatus(`Retrying ${retryBatches.length} failed batch(es)...`);

        for (const b of retryBatches) {
          const batch = trimmedPages.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
          setProgressStatus(`Retrying batch ${b + 1}/${totalBatches}...`);

          // Small delay before retry
          await new Promise((r) => setTimeout(r, 2000));

          try {
            totalChunks += await upsertBatch(batch, `Retry batch ${b + 1}`);
          } catch (err: any) {
            console.error(`[DocumentUpload] Batch ${b + 1} failed on retry:`, err.message);
            failedBatches.push(b);
          }
        }
      }

      if (totalChunks === 0 && failedBatches.length === totalBatches) {
        throw new Error("All batches failed after retry. The edge function may be overloaded — try uploading fewer files.");
      }

      const upsertData = { chunks: totalChunks };

      setProgress(100);
      setProgressStatus("Complete!");

      // Log to content_refresh_logs so it appears in refresh history
      try {
        await supabase.from('content_refresh_logs').insert({
          assistant_id: assistantId,
          refresh_status: failedBatches.length > 0 || failedFiles.length > 0 ? 'partial' : 'completed',
          triggered_by: 'document-upload',
          completed_at: new Date().toISOString(),
          changes_detected: {
            total_changes: allPages.length,
            chunks: totalChunks,
            files: fileCount - failedFiles.length,
            failed_files: failedFiles.length,
            failed_batches: failedBatches.length
          }
        });
      } catch (logErr) {
        console.warn('[DocumentUpload] Failed to write refresh log:', logErr);
      }

      const chunks = upsertData?.chunks ?? 0;
      const successMsg = `${allPages.length} pages indexed (${chunks} chunks) from ${fileCount - failedFiles.length} file(s).`;
      const warnings: string[] = [];
      if (failedFiles.length > 0) warnings.push(`${failedFiles.length} file(s) failed to parse.`);
      if (failedBatches.length > 0) warnings.push(`${failedBatches.length} batch(es) failed to index.`);

      if (warnings.length > 0) {
        toast.warning(`${successMsg} ${warnings.join(' ')}`);
      } else {
        toast.success(successMsg);
      }

      clearFiles();
      onUploadComplete?.();

    } catch (error: any) {
      console.error('[DocumentUpload] Error:', error);
      toast.error(error.message || "Failed to upload documents.");
    } finally {
      setUploading(false);
      setTimeout(() => {
        setProgress(0);
        setProgressStatus("");
      }, 3000);
    }
  };

  const isMultiple = selectedFiles.length > 1;
  const simple = variant === "simple";

  if (simple) {
    return (
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FORMATS}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {selectedFiles.length > 0 && (
          <div className="space-y-1 max-h-36 overflow-y-auto rounded-xl border bg-background/70 p-2">
            {selectedFiles.map((file, idx) => (
              <div key={`${file.name}-${idx}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs">
                <span className="mr-2 truncate">{file.name}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                  {!uploading && (
                    <button type="button" onClick={() => removeFile(idx)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {uploading && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {progressStatus}
            </p>
            <KeepTabOpenNotice visible={true} />
          </div>
        )}

        {selectedFiles.length > 0 && !uploading && (
          <Button type="button" size="sm" onClick={handleUpload} className="bg-violet-600 hover:bg-violet-700">
            <Upload className="mr-1 h-3.5 w-3.5" />
            Upload &amp; index {isMultiple ? `${selectedFiles.length} files` : "file"}
          </Button>
        )}

        {!uploading && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleReindexDocuments}
            disabled={reindexingDocs}
            className="h-8 px-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            {reindexingDocs ? (
              <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Re-indexing…</>
            ) : (
              <><RotateCcw className="mr-1 h-3.5 w-3.5" /> Re-index uploaded documents</>
            )}
          </Button>
        )}
        {reindexProgress && (
          <p className="text-[11px] text-muted-foreground">{reindexProgress.status}</p>
        )}
      </div>
    );
  }

  return (
    <Card className="border-l-4 border-l-ai-pink">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-ai-pink" />
          <CardTitle className="text-base">Upload Documents to Knowledge Base</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Upload PDF, DOCX, TXT, CSV, or JSON files. Select multiple files at once (Ctrl+A / Cmd+A). 
          Existing knowledge is preserved — new content is appended.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Document type selector */}
        <div className="space-y-2">
          <Label>Document Type</Label>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map(dt => (
                <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* File drop zone */}
        <div
          className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FORMATS}
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          {selectedFiles.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-foreground">
                {selectedFiles.length} file{isMultiple ? 's' : ''} selected
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {(totalSize / (1024 * 1024)).toFixed(2)} MB total — Click to add more
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground">Click to select files (multiple supported)</p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOCX, TXT, JSON, CSV, XLSX, PPTX, RTF (max 50MB each)
              </p>
            </div>
          )}
        </div>

        {/* File list */}
        {selectedFiles.length > 0 && (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {selectedFiles.map((file, idx) => (
              <div key={`${file.name}-${idx}`} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/40">
                <span className="truncate mr-2 text-foreground">{file.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                  {!uploading && (
                    <button onClick={(e) => { e.stopPropagation(); removeFile(idx); }} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!uploading && selectedFiles.length > 1 && (
              <button onClick={clearFiles} className="text-xs text-muted-foreground hover:text-destructive mt-1">
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Progress */}
        {uploading && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              {progressStatus}
            </p>
            <KeepTabOpenNotice visible={true} />
          </div>
        )}

        {/* Upload button */}
        <Button
          type="button"
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || uploading}
          className="w-full sm:w-auto"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload & Index {isMultiple ? `${selectedFiles.length} Documents` : 'Document'}
            </>
          )}
        </Button>

        {/* Re-index uploaded documents */}
        {!uploading && (
          <div className="pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleReindexDocuments}
              disabled={reindexingDocs || uploading}
              className="w-full sm:w-auto"
            >
              {reindexingDocs ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Re-indexing...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Re-index Uploaded Documents
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              Re-vectorize previously uploaded documents with improved chunking. No duplicates created.
            </p>
          </div>
        )}

        {/* Re-index progress */}
        {reindexProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{reindexProgress.status}</span>
              {reindexProgress.total > 0 && (
                <span className="font-medium">{reindexProgress.current} / {reindexProgress.total}</span>
              )}
            </div>
            <ProgressBar
              value={reindexProgress.total > 0 ? (reindexProgress.current / reindexProgress.total) * 100 : undefined}
              className={`h-2 ${reindexProgress.total === 0 ? 'animate-pulse' : ''}`}
            />
            <KeepTabOpenNotice visible={true} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
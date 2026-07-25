import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { KnowledgeBaseEditor } from "@/components/KnowledgeBaseEditor";
import { DocumentUploadSection } from "@/components/DocumentUploadSection";
import { Save, Loader2, BookOpen, Lightbulb } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface KnowledgeBasePageProps {
  assistantId: string;
}

export const KnowledgeBasePage = ({ assistantId }: KnowledgeBasePageProps) => {
  const [manualEntries, setManualEntries] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Fetch assistant's scraped_content.manualEntries
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("assistants")
        .select("scraped_content, website_url")
        .eq("id", assistantId)
        .single();

      if (error) throw error;

      const sc = data?.scraped_content as any;
      const raw = sc?.manualEntries;
      setWebsiteUrl(data?.website_url || "");
      
      // Handle both string and array-of-objects formats
      if (typeof raw === 'string') {
        setManualEntries(raw);
      } else if (Array.isArray(raw)) {
        // Convert array of {title, content, id} objects to editor string format
        // Use date-based separators so KnowledgeBaseEditor can parse them
        const d = new Date();
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
        
        const asString = raw
          .filter((e: any) => e?.content && e.content.toString().trim().length > 0)
          .map((e: any) => {
            const title = e.title ? `Title: ${e.title}\n` : '';
            return `${title}${e.content}`;
          })
          .join(`\n--- Added: ${dateStr} ---\n`);
        setManualEntries(asString);
      } else {
        setManualEntries("");
      }
    } catch (err: any) {
      console.error("Failed to load knowledge base:", err);
      toast({
        title: "Error loading knowledge base",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [assistantId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveAndIndex = async () => {
    setSaving(true);
    try {
      // 1. Fetch current scraped_content to merge
      const { data: current, error: fetchErr } = await supabase
        .from("assistants")
        .select("scraped_content, website_url")
        .eq("id", assistantId)
        .single();

      if (fetchErr) throw fetchErr;

      const existingContent = (current?.scraped_content as any) || {};

      // Parse entries into array-of-objects for canonical storage
      const parsedEntries = manualEntries
        .split(/\n---\s*(?:Added|Updated|Legacy Entry).*?---\n/i)
        .map((chunk, idx) => chunk.trim())
        .filter((chunk) => chunk.length > 10)
        .map((chunk, idx) => {
          // Try to extract title from "Title: ..." prefix
          const titleMatch = chunk.match(/^Title:\s*(.+)\n/);
          const title = titleMatch ? titleMatch[1].trim() : `Manual Entry ${idx + 1}`;
          const content = titleMatch ? chunk.replace(/^Title:\s*.+\n/, '').trim() : chunk;
          return { id: `entry-${idx}`, title, content };
        });

      const updatedContent = {
        ...existingContent,
        manualEntries: parsedEntries,
      };

      // 2. Save to Supabase
      const { error: updateErr } = await supabase
        .from("assistants")
        .update({ scraped_content: updatedContent })
        .eq("id", assistantId);

      if (updateErr) throw updateErr;

      // 3. Index manual entries via knowledge-upsert
      const manualPages = parsedEntries.map((entry, idx) => ({
        url: `manual://${entry.id}`,
        title: entry.title,
        content: entry.content,
        headings: [],
      }));

      let chunks = 0;
      if (manualPages.length > 0) {
        const { data: upsertData, error: upsertErr } = await supabase.functions.invoke(
          "knowledge-upsert",
          {
            body: {
              assistantId,
              websiteUrl: current?.website_url || "",
              pages: manualPages,
              replace: false,
              tags: ["manual"],
            },
          }
        );

        if (upsertErr) {
          console.error("Indexing error:", upsertErr);
          toast({
            title: "Saved but indexing failed",
            description: "Your entries were saved but couldn't be indexed. They'll still be available via keyword search.",
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
        chunks = upsertData?.chunks || upsertData?.totalChunks || 0;
      }

      toast({
        title: "Knowledge base saved & indexed",
        description: `${manualPages.length} entries saved and indexed successfully${chunks ? ` (${chunks} chunks)` : ''}.`,
      });
    } catch (err: any) {
      console.error("Save error:", err);
      toast({
        title: "Error saving knowledge base",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card variant="modern">
        <CardContent className="text-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading knowledge base...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card variant="modern">
        <CardHeader className="ai-section-header">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle className="ai-gradient-text">Knowledge Base</CardTitle>
          </div>
          <CardDescription>
            Add information your assistant should know — business details, FAQs, policies, pricing, and more.
            These entries are prioritised when your assistant answers questions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator />

          {/* Quick guide */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground w-full justify-start px-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                <span className="text-xs font-medium">How to add information effectively</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground space-y-2 mt-1">
                <p className="font-medium text-foreground">Tips for best results:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>One topic per entry</strong> — e.g. "Opening Hours", "Return Policy", "Pricing". Click <strong>+ Add Entry</strong> to create a new one.</li>
                  <li><strong>Keep it clear and natural</strong> — write the way you'd explain it to a customer. Short paragraphs work best.</li>
                  <li><strong>Use titles</strong> — give each entry a descriptive title so your assistant knows what it's about.</li>
                  <li><strong>Add in batches</strong> — you can add several entries at once before clicking <strong>Save & Index</strong>. All entries will be processed together.</li>
                  <li><strong>Update anytime</strong> — edit or delete entries as your business changes. Just hit Save & Index again to refresh.</li>
                </ul>
                <p className="text-muted-foreground/80 pt-1">
                  💡 After saving, your assistant will instantly use this information to answer customer questions more accurately.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <KnowledgeBaseEditor value={manualEntries} onChange={setManualEntries} />

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveAndIndex}
              disabled={saving}
              variant="aiAccent"
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving & Indexing...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save & Index
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Document Upload Section */}
      <DocumentUploadSection
        assistantId={assistantId}
        websiteUrl={websiteUrl}
      />
    </div>
  );
};

export default KnowledgeBasePage;

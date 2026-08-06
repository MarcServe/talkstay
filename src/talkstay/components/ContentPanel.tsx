import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Globe } from "lucide-react";
import { ingestHotelWebsite, setHotelWebsite, isPlaceholderWebsite, type Hotel } from "@/talkstay/lib/hotels";

// TalkWeb's Content section, reused wholesale for the hotel's linked assistant
// (mirrors TalkWeb Dashboard.tsx `activeView === 'content'`).
const CrawlStatusBanner = React.lazy(() =>
  import("@/components/CrawlStatusBanner").then((m) => ({ default: m.CrawlStatusBanner }))
);
const DocumentUploadSection = React.lazy(() =>
  import("@/components/DocumentUploadSection").then((m) => ({ default: m.DocumentUploadSection }))
);
const ContentRefreshManager = React.lazy(() =>
  import("@/components/ContentRefreshManager").then((m) => ({ default: m.ContentRefreshManager }))
);

export default function ContentPanel({ hotel }: { hotel: Hotel }) {
  const assistantId = hotel.assistant_id;
  // The real saved value (assistants.website_url) — may be the NOT-NULL
  // placeholder for a hotel that never set a real website.
  const [savedUrl, setSavedUrl] = useState("");
  const [websiteInput, setWebsiteInput] = useState("");
  const [savingWebsite, setSavingWebsite] = useState(false);

  const hasRealWebsite = !isPlaceholderWebsite(savedUrl);

  useEffect(() => {
    if (!assistantId) return;
    supabase.from("assistants").select("website_url").eq("id", assistantId).maybeSingle()
      .then(({ data }) => {
        const url = data?.website_url ?? "";
        setSavedUrl(url);
        setWebsiteInput(isPlaceholderWebsite(url) ? "" : url);
      });
  }, [assistantId]);

  if (!assistantId) {
    return <p className="text-sm text-muted-foreground">This hotel has no linked assistant.</p>;
  }

  const saveWebsite = async () => {
    const input = websiteInput.trim();
    if (!input) { toast.error("Enter a website address"); return; }
    setSavingWebsite(true);
    try {
      const normalized = await setHotelWebsite(assistantId, input);
      setSavedUrl(normalized);
      setWebsiteInput(normalized);
      toast.message("Website saved — scanning it now…");
      const { chunks, crawlStarted } = await ingestHotelWebsite(assistantId, normalized);
      toast.success(
        chunks > 0
          ? `Indexed ${chunks} knowledge chunks from your website.${crawlStarted ? " Full site crawl running in the background." : ""}`
          : "Website saved. Full site crawl running in the background."
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save/scan that website");
    } finally {
      setSavingWebsite(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Your hotel's website content powers the assistant. Add it once to build starter knowledge
        automatically, then re-scrape after site updates — or upload documents (menus, policies,
        guides) below, which get indexed the same way.
      </p>

      <div className="space-y-2 rounded-xl border p-4">
        <Label className="flex items-center gap-1.5 text-sm"><Globe className="h-3.5 w-3.5" /> Hotel website</Label>
        {!hasRealWebsite && (
          <p className="text-xs text-muted-foreground">
            No website connected yet. Add one to scan it into the knowledge base — or skip this and just upload documents below if you don't have one.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Input
            value={websiteInput}
            onChange={(e) => setWebsiteInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveWebsite(); }}
            placeholder="yourhotel.com"
            className="min-w-[200px] flex-1"
          />
          <Button size="sm" disabled={savingWebsite || !websiteInput.trim()} onClick={saveWebsite}>
            {savingWebsite ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {hasRealWebsite ? "Update & rescan" : "Add & scan website"}
          </Button>
        </div>
      </div>

      {/* Re-scrape / refresh tools only make sense once a REAL website is set —
          otherwise they'd operate on the NOT-NULL placeholder and could index
          TalkStay's own marketing site into this hotel's knowledge base. */}
      {hasRealWebsite && (
        <>
          <React.Suspense fallback={null}>
            <CrawlStatusBanner
              assistantId={assistantId}
              onReindex={async () => {
                const { data, error } = await supabase.functions.invoke("reindex-knowledge", {
                  body: { assistantId },
                });
                if (error) throw error;
                if (!data?.success) throw new Error(data?.error || "Reindex failed");
              }}
            />
          </React.Suspense>
          <React.Suspense fallback={<div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>}>
            <ContentRefreshManager assistantId={assistantId} />
          </React.Suspense>
        </>
      )}

      <React.Suspense fallback={<div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>}>
        <DocumentUploadSection
          assistantId={assistantId}
          websiteUrl={hasRealWebsite ? savedUrl : ""}
          onUploadComplete={() => toast.success("Document indexed.")}
        />
      </React.Suspense>
    </div>
  );
}

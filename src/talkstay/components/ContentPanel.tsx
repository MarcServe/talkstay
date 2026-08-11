import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Globe, Upload } from "lucide-react";
import { ingestHotelWebsite, setHotelWebsite, isPlaceholderWebsite, type Hotel } from "@/talkstay/lib/hotels";

// TalkWeb's Content section, reused for the hotel's linked assistant.
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
  const [savedUrl, setSavedUrl] = useState("");
  const [websiteInput, setWebsiteInput] = useState("");
  const [savingWebsite, setSavingWebsite] = useState(false);
  const uploadAnchorRef = useRef<HTMLDivElement>(null);

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
    return <p className="text-sm text-muted-foreground">This property has no linked assistant.</p>;
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

  const openUpload = () => {
    uploadAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    window.setTimeout(() => {
      uploadAnchorRef.current?.querySelector<HTMLInputElement>('input[type="file"]')?.click();
    }, 50);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-dashed bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <Upload className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Website crawl &amp; document upload</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Paste your website to crawl pages, or upload menus / house rules as PDF or images.
              TalkStay extracts answers automatically for the guest assistant.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={websiteInput}
                  onChange={(e) => setWebsiteInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void saveWebsite(); }}
                  placeholder="yourhotel.com"
                  className="h-9 pl-9"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={savingWebsite || !websiteInput.trim()}
                onClick={() => void saveWebsite()}
              >
                {savingWebsite ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                Crawl website
              </Button>
              <Button size="sm" variant="outline" onClick={openUpload}>
                <Upload className="mr-1 h-3.5 w-3.5" /> Upload menu / PDF
              </Button>
            </div>
            {!hasRealWebsite && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                No website connected yet — crawl when you have one, or upload documents anytime.
              </p>
            )}
            <div ref={uploadAnchorRef} className="mt-3">
              <React.Suspense fallback={null}>
                <DocumentUploadSection
                  assistantId={assistantId}
                  websiteUrl={hasRealWebsite ? savedUrl : ""}
                  variant="simple"
                  onUploadComplete={() => toast.success("Document indexed.")}
                />
              </React.Suspense>
            </div>
          </div>
        </div>
      </div>

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
          <React.Suspense fallback={null}>
            <ContentRefreshManager assistantId={assistantId} />
          </React.Suspense>
        </>
      )}
    </div>
  );
}

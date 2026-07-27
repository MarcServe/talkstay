import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Hotel } from "@/talkstay/lib/hotels";

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
  const [websiteUrl, setWebsiteUrl] = useState("");

  useEffect(() => {
    if (!assistantId) return;
    supabase.from("assistants").select("website_url").eq("id", assistantId).maybeSingle()
      .then(({ data }) => setWebsiteUrl(data?.website_url ?? ""));
  }, [assistantId]);

  if (!assistantId) {
    return <p className="text-sm text-muted-foreground">This hotel has no linked assistant.</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Your hotel's website content powers the assistant. Re-scrape after site updates, or upload
        documents (menus, policies, guides) — everything is indexed into the knowledge base.
      </p>
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
        <DocumentUploadSection
          assistantId={assistantId}
          websiteUrl={websiteUrl}
          onUploadComplete={() => toast.success("Document indexed.")}
        />
      </React.Suspense>
      <React.Suspense fallback={<div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>}>
        <ContentRefreshManager assistantId={assistantId} />
      </React.Suspense>
    </div>
  );
}

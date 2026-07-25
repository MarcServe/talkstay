
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BrandingSettingsProps {
  assistantId: string;
}

const BrandingSettings: React.FC<BrandingSettingsProps> = ({ assistantId }) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchBrandingData = async () => {
      console.log("[BrandingSettings] Fetching branding data for assistant:", assistantId);
      const { data, error } = await supabase
        .from("assistants")
        .select("logo_url")
        .eq("id", assistantId)
        .maybeSingle();

      if (error) {
        console.error("[BrandingSettings] Failed to load branding data", error);
        return;
      }
      
      if (mounted) {
        setLogoUrl(data?.logo_url ?? null);
      }
    };
    fetchBrandingData();
    return () => {
      mounted = false;
    };
  }, [assistantId]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${assistantId}/${Date.now()}.${ext}`;

      console.log("[BrandingSettings] Uploading file to storage:", path);
      const { error: uploadError } = await supabase.storage.from("logos").upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
      });

      if (uploadError) {
        console.error("[BrandingSettings] Upload error", uploadError);
        toast.error("Failed to upload logo. Please try again.");
        return;
      }

      const { data: publicData } = supabase.storage.from("logos").getPublicUrl(path);
      const publicUrl = publicData?.publicUrl;

      if (!publicUrl) {
        toast.error("Could not get public URL for the uploaded file.");
        return;
      }

      console.log("[BrandingSettings] Public URL:", publicUrl, "Updating assistant...");
      const { error: updateError } = await supabase
        .from("assistants")
        .update({ logo_url: publicUrl })
        .eq("id", assistantId);

      if (updateError) {
        console.error("[BrandingSettings] Update assistants.logo_url failed", updateError);
        toast.error("Saved upload, but failed to link it to your assistant.");
        return;
      }

      setLogoUrl(publicUrl);
      toast.success("Logo updated successfully! Your voice popup will now use this branding.");
    } finally {
      setUploading(false);
      // reset input value so the same file can be selected again if needed
      e.target.value = "";
    }
  };


  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImagePlus className="h-5 w-5" />
          Logo & Brand Assets
        </CardTitle>
        <CardDescription>
          Upload your company logo. It will be used to brand the voice popup background and will appear in the footer of your preview and voice form pages.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-center gap-6">
          <div className="w-28 h-28 rounded-lg bg-muted/50 border flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Company logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-muted-foreground flex flex-col items-center text-sm">
                <ImagePlus className="h-6 w-6 mb-1" />
                No logo yet
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                disabled={uploading}
                className="max-w-xs"
              />
              <Button type="button" variant="secondary" disabled>
                {uploading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                  </span>
                ) : (
                  "Choose file"
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Recommended: square image (e.g. 512x512). PNG or SVG works best.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BrandingSettings;

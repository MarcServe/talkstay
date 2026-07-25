import React, { useEffect, useState } from "react";
import { MiniRichText } from "@/components/ui/mini-rich-text";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ImagePlus, Loader2, Palette, Building2, Check, ChevronDown, QrCode } from "lucide-react";
import { toast } from "sonner";
import { WidgetDesignConfig, defaultColors } from "./widget-design/types";
import ChatModalColors from "./widget-design/ChatModalColors";
import WidgetShapeStyle from "./widget-design/WidgetShapeStyle";
import AnimationStyle from "./widget-design/AnimationStyle";
import EnhancedPreview from "./widget-design/EnhancedPreview";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { AssistantQRCode } from "./AssistantQRCode";

interface WhiteLabelSettingsProps {
  assistantId: string;
}

const WhiteLabelSettings: React.FC<WhiteLabelSettingsProps> = ({ assistantId }) => {
  const [config, setConfig] = useState<WidgetDesignConfig>({
    logo_url: null,
    widget_primary_color: null,
    widget_accent_color: null,
    widget_text_color: null,
    widget_background_color: null,
    widget_border_color: null,
    widget_user_bubble_color: null,
    widget_ai_bubble_color: null,
    widget_gradient_enabled: false,
    widget_button_gradient_enabled: true,
    widget_shape: 'round',
    widget_button_size: 'medium',
    widget_shadow_style: 'medium',
    widget_border_width: 'none',
    widget_animation_style: 'none',
    widget_banner_line1: null,
    widget_banner_line2: null,
    business_name: ''
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hideTalkwebBranding, setHideTalkwebBranding] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      const { data, error } = await supabase
        .from("assistants")
        .select("logo_url, widget_primary_color, widget_accent_color, widget_text_color, widget_background_color, widget_border_color, widget_user_bubble_color, widget_ai_bubble_color, widget_gradient_enabled, widget_button_gradient_enabled, widget_shape, widget_button_size, widget_shadow_style, widget_border_width, widget_animation_style, widget_banner_line1, widget_banner_line2, business_name")
        .eq("id", assistantId)
        .maybeSingle();

      if (error) {
        console.error("[WhiteLabelSettings] Failed to load config", error);
        return;
      }
      
      if (data) {
        setConfig({
          logo_url: data.logo_url,
          widget_primary_color: data.widget_primary_color,
          widget_accent_color: data.widget_accent_color,
          widget_text_color: data.widget_text_color,
          widget_background_color: data.widget_background_color,
          widget_border_color: data.widget_border_color,
          widget_user_bubble_color: data.widget_user_bubble_color,
          widget_ai_bubble_color: data.widget_ai_bubble_color,
          widget_gradient_enabled: data.widget_gradient_enabled ?? false,
          widget_button_gradient_enabled: (data as any).widget_button_gradient_enabled ?? true,
          widget_shape: data.widget_shape || 'round',
          widget_button_size: data.widget_button_size || 'medium',
          widget_shadow_style: data.widget_shadow_style || 'medium',
          widget_border_width: data.widget_border_width || 'none',
          widget_animation_style: data.widget_animation_style || 'none',
          widget_banner_line1: data.widget_banner_line1 || null,
          widget_banner_line2: data.widget_banner_line2 || null,
          business_name: data.business_name || ''
        });
        setHideTalkwebBranding(!!data.logo_url);
      }
    };
    
    fetchConfig();
  }, [assistantId]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${assistantId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("logos").upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
      });

      if (uploadError) {
        console.error("[WhiteLabelSettings] Upload error", uploadError);
        toast.error("Failed to upload logo. Please try again.");
        return;
      }

      const { data: publicData } = supabase.storage.from("logos").getPublicUrl(path);
      const publicUrl = publicData?.publicUrl;

      if (!publicUrl) {
        toast.error("Could not get public URL for the uploaded file.");
        return;
      }

      const { error: updateError } = await supabase
        .from("assistants")
        .update({ logo_url: publicUrl })
        .eq("id", assistantId);

      if (updateError) {
        console.error("[WhiteLabelSettings] Update logo_url failed", updateError);
        toast.error("Saved upload, but failed to link it to your assistant.");
        return;
      }

      setConfig(prev => ({ ...prev, logo_url: publicUrl }));
      setHideTalkwebBranding(true);
      toast.success("Logo uploaded! Your widget is now white-labeled.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleChange = (field: keyof WidgetDesignConfig, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const saveDesign = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("assistants")
        .update({
          widget_primary_color: config.widget_primary_color,
          widget_accent_color: config.widget_accent_color,
          widget_text_color: config.widget_text_color,
          widget_background_color: config.widget_background_color,
          widget_border_color: config.widget_border_color,
          widget_user_bubble_color: config.widget_user_bubble_color,
          widget_ai_bubble_color: config.widget_ai_bubble_color,
          widget_gradient_enabled: config.widget_gradient_enabled,
          widget_button_gradient_enabled: config.widget_button_gradient_enabled,
          widget_shape: config.widget_shape,
          widget_button_size: config.widget_button_size,
          widget_shadow_style: config.widget_shadow_style,
          widget_border_width: config.widget_border_width,
          widget_animation_style: config.widget_animation_style,
          widget_banner_line1: config.widget_banner_line1,
          widget_banner_line2: config.widget_banner_line2,
        })
        .eq("id", assistantId);

      if (error) throw error;
      
      toast.success("Widget design saved!");
    } catch (error) {
      console.error("[WhiteLabelSettings] Save design failed", error);
      toast.error("Failed to save design. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const removeLogo = async () => {
    try {
      const { error } = await supabase
        .from("assistants")
        .update({ logo_url: null })
        .eq("id", assistantId);

      if (error) throw error;
      
      setConfig(prev => ({ ...prev, logo_url: null }));
      setHideTalkwebBranding(false);
      toast.success("Logo removed. TalkWeb branding will be shown.");
    } catch (error) {
      console.error("[WhiteLabelSettings] Remove logo failed", error);
      toast.error("Failed to remove logo.");
    }
  };

  const primaryColor = config.widget_primary_color || defaultColors.primary;
  const accentColor = config.widget_accent_color || defaultColors.accent;
  const textColor = config.widget_text_color || defaultColors.text;

  return (
    <div className="space-y-6">
      {/* Logo Upload Card */}
      <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            White-Label Your Widget
          </CardTitle>
          <CardDescription>
            Upload your company logo to create a fully branded experience. Users will interact directly with your brand - no TalkWeb branding visible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-xl bg-muted/50 border-2 border-dashed flex items-center justify-center overflow-hidden">
                {config.logo_url ? (
                  <img src={config.logo_url} alt="Company logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="text-muted-foreground flex flex-col items-center text-sm p-4 text-center">
                    <ImagePlus className="h-8 w-8 mb-2" />
                    <span>Add your logo</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <Label htmlFor="logo-upload" className="text-sm font-medium">Company Logo</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Square image recommended (512x512px). PNG or SVG for best quality.
                </p>
                <div className="flex items-center gap-3">
                  <Input id="logo-upload" type="file" accept="image/*" onChange={handleLogoUpload}
                    disabled={uploading} className="max-w-xs" />
                  {uploading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </div>
              </div>
              {config.logo_url && (
                <Button variant="outline" size="sm" onClick={removeLogo}
                  className="text-destructive hover:text-destructive">
                  Remove Logo
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {config.logo_url ? (
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="font-medium text-sm">
                  {config.logo_url ? "White-Label Active" : "Standard Branding"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {config.logo_url 
                    ? `Users see "${config.business_name}" branding only` 
                    : "TalkWeb branding is visible to users"}
                </p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              config.logo_url 
                ? 'bg-green-500/20 text-green-700 dark:text-green-400' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {config.logo_url ? "Enabled" : "Disabled"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Widget Colors Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Widget Colors
          </CardTitle>
          <CardDescription>Customize your widget colors to match your brand identity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" id="primary-color" value={primaryColor}
                  onChange={(e) => handleChange('widget_primary_color', e.target.value)}
                  className="w-10 h-10 rounded-lg border cursor-pointer" />
                <Input value={primaryColor}
                  onChange={(e) => handleChange('widget_primary_color', e.target.value)}
                  placeholder="#6366f1" className="flex-1 font-mono text-sm" />
              </div>
              <p className="text-xs text-muted-foreground">Main button and header color</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accent-color">Accent Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" id="accent-color" value={accentColor}
                  onChange={(e) => handleChange('widget_accent_color', e.target.value)}
                  className="w-10 h-10 rounded-lg border cursor-pointer" />
                <Input value={accentColor}
                  onChange={(e) => handleChange('widget_accent_color', e.target.value)}
                  placeholder="#8b5cf6" className="flex-1 font-mono text-sm" />
              </div>
              <p className="text-xs text-muted-foreground">Highlights and hover states</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="text-color">Text Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" id="text-color" value={textColor}
                  onChange={(e) => handleChange('widget_text_color', e.target.value)}
                  className="w-10 h-10 rounded-lg border cursor-pointer" />
                <Input value={textColor}
                  onChange={(e) => handleChange('widget_text_color', e.target.value)}
                  placeholder="#ffffff" className="flex-1 font-mono text-sm" />
              </div>
              <p className="text-xs text-muted-foreground">Text on colored backgrounds</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Widget Banner Text Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Widget Banner Text
          </CardTitle>
          <CardDescription>
            Customize the two lines of text that appear on your widget banner. Leave blank for defaults.
            <br />
            <span className="text-xs text-muted-foreground/70 mt-1 inline-block">
              💡 HTML supported — e.g. <code className="bg-muted px-1 rounded text-[10px]">&lt;b&gt;Bold&lt;/b&gt;</code>, <code className="bg-muted px-1 rounded text-[10px]">&lt;span style="color:#fcd34d"&gt;Gold&lt;/span&gt;</code>, <code className="bg-muted px-1 rounded text-[10px]">&lt;i&gt;Italic&lt;/i&gt;</code>
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="banner-line1">Line 1</Label>
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${(config.widget_banner_line1 || '').length > 80 ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                  {(config.widget_banner_line1 || '').length}/80
                </span>
              </div>
              <MiniRichText
                id="banner-line1"
                value={config.widget_banner_line1 || ''}
                onChange={(val) => handleChange('widget_banner_line1', val)}
                placeholder="Skip the Scrolling"
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="banner-line2">Line 2</Label>
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${(config.widget_banner_line2 || '').length > 120 ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                  {(config.widget_banner_line2 || '').length}/120
                </span>
              </div>
              <MiniRichText
                id="banner-line2"
                value={config.widget_banner_line2 || ''}
                onChange={(val) => handleChange('widget_banner_line2', val)}
                placeholder='Use "Voice"'
                maxLength={120}
              />
            </div>
          </div>

          {/* Inline preview pill */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Preview</Label>
            <div className="flex justify-center">
              <div className="inline-flex flex-col items-center px-5 py-3 rounded-full border bg-muted/50"
                style={{
                  background: config.widget_primary_color
                    ? `linear-gradient(135deg, ${config.widget_primary_color}, ${config.widget_accent_color || config.widget_primary_color})`
                    : undefined,
                }}>
                <span
                  className="text-xs font-medium"
                  style={{ color: config.widget_primary_color ? (config.widget_text_color || '#ffffff') : undefined }}
                  dangerouslySetInnerHTML={{ __html: config.widget_banner_line1 || 'Skip the Scrolling' }}
                />
                <span
                  className="text-sm font-bold"
                  style={{ color: config.widget_primary_color ? (config.widget_text_color || '#ffffff') : undefined }}
                  dangerouslySetInnerHTML={{ __html: config.widget_banner_line2 || 'Use <span style="font-weight:bold;color:#fcd34d">"Voice"</span>' }}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => {
              handleChange('widget_banner_line1', '');
              handleChange('widget_banner_line2', '');
            }}>
              Reset to Default
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Branding Settings - Collapsible */}
      <Separator className="my-2" />
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 group">
          <div className="space-y-1 text-left">
            <h2 className="text-xl font-bold tracking-tight">Advanced Branding Settings</h2>
            <p className="text-sm text-muted-foreground">Fine-tune the chat modal, widget shape, and animations for a fully custom look.</p>
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-6 pt-4">
          <ChatModalColors config={config} onChange={handleChange} />
          <WidgetShapeStyle config={config} onChange={handleChange} />
          <AnimationStyle config={config} onChange={handleChange} />
          <EnhancedPreview config={config} />
        </CollapsibleContent>
      </Collapsible>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveDesign} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            "Save All Design Settings"
          )}
        </Button>
      </div>

      {/* Benefits Card */}
      <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
        <CardHeader>
          <CardTitle className="text-lg">White-Label Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Users interact directly with <strong>your brand</strong> - no third-party mentions</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Your logo appears in the widget header, voice popup, and footer</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Custom colors match your website's design perfectly</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Perfect for agencies and resellers offering voice AI to clients</span>
            </li>
          </ul>
        </CardContent>
      </Card>
      {/* QR Code Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            QR Code
          </CardTitle>
          <CardDescription>
            Generate a branded QR code for your assistant. Share it on flyers, business cards, exhibitions, and more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowQRCode(true)} className="gap-2">
            <QrCode className="w-4 h-4" />
            Customise & Download QR Code
          </Button>
        </CardContent>
      </Card>

      <AssistantQRCode
        open={showQRCode}
        onOpenChange={setShowQRCode}
        assistantName={config.business_name || 'Assistant'}
        assistantId={assistantId}
      />
    </div>
  );
};

export default WhiteLabelSettings;

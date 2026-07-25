import React, { useRef, useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2, Palette, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generatePreviewUrl } from '@/utils/previewUrlUtils';

interface QRDesignSettings {
  qrColor: string;
  bgColor: string;
  textColor: string;
  logoUrl: string;
  showLogo: boolean;
  qrStyle: 'squares' | 'dots';
  customText: string;
  headerText: string;
  headerColor: string;
}

const DEFAULT_DESIGN: QRDesignSettings = {
  qrColor: '#000000',
  bgColor: '#ffffff',
  textColor: '#000000',
  logoUrl: '/talkweb-logo.png',
  showLogo: true,
  qrStyle: 'squares',
  customText: 'Scan to chat with our AI assistant!',
  headerText: '🎙 Scan and Speak',
  headerColor: '#000000',
};

const getStorageKey = (assistantId: string) => `qr-design-${assistantId}`;

const loadDesignFromLocal = (assistantId: string): QRDesignSettings => {
  try {
    const saved = localStorage.getItem(getStorageKey(assistantId));
    if (saved) return { ...DEFAULT_DESIGN, ...JSON.parse(saved) };
  } catch {}
  return { ...DEFAULT_DESIGN };
};

const saveDesignToLocal = (assistantId: string, design: QRDesignSettings) => {
  try {
    localStorage.setItem(getStorageKey(assistantId), JSON.stringify(design));
  } catch {}
};

interface AssistantQRCodeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistantName: string;
  assistantId: string;
  previewUrl?: string;
}

export const AssistantQRCode: React.FC<AssistantQRCodeProps> = ({
  open,
  onOpenChange,
  assistantName,
  assistantId,
  previewUrl,
}) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const widgetUrl = previewUrl || generatePreviewUrl(assistantId);
  
  // Load saved design on mount / when assistantId changes
  const [design, setDesignState] = useState<QRDesignSettings>(() => loadDesignFromLocal(assistantId));
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load from Supabase on mount and when assistantId changes
  useEffect(() => {
    const loadFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from('assistants')
          .select('qr_design')
          .eq('id', assistantId)
          .single();
        
        if (!error && data?.qr_design) {
          const dbDesign = { ...DEFAULT_DESIGN, ...(data.qr_design as Record<string, unknown>) } as QRDesignSettings;
          setDesignState(dbDesign);
          saveDesignToLocal(assistantId, dbDesign);
        } else {
          // Fall back to localStorage
          setDesignState(loadDesignFromLocal(assistantId));
        }
      } catch {
        setDesignState(loadDesignFromLocal(assistantId));
      }
    };
    loadFromSupabase();
  }, [assistantId]);

  const updateDesign = useCallback((updates: Partial<QRDesignSettings>) => {
    setDesignState(prev => {
      const next = { ...prev, ...updates };
      // Save to localStorage immediately
      saveDesignToLocal(assistantId, next);
      // Debounce save to Supabase (500ms)
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await supabase
            .from('assistants')
            .update({ qr_design: next as unknown as Record<string, unknown> })
            .eq('id', assistantId);
        } catch (e) {
          console.error('Failed to save QR design to database:', e);
        }
      }, 500);
      return next;
    });
  }, [assistantId]);

  // Destructure for convenience
  const { qrColor, bgColor, textColor, logoUrl, showLogo, qrStyle, customText, headerText, headerColor } = design;

  // Pre-process uploaded logo for better quality
  const processLogoForQuality = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 128; // Target size for crisp logo
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        // Enable high-quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        // Draw centered and scaled
        const scale = Math.min(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (size - w) / 2;
        const y = (size - h) / 2;
        ctx.drawImage(img, x, y, w, h);
        resolve(canvas.toDataURL('image/png', 1.0));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const downloadQRCode = () => {
    if (!qrRef.current) return;

    const container = qrRef.current;
    
    // Create a high-resolution canvas (2x scale for crisp output)
    const scale = 2;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with padding for text (2x for high DPI)
    const qrSize = 256 * scale;
    const padding = 40 * scale;
    const textHeight = (customText ? 100 : 60) * scale;
    canvas.width = qrSize + (padding * 2);
    canvas.height = qrSize + (padding * 2) + textHeight;

    // Enable high-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Measure header text height
    const headerHeight = headerText ? 40 * scale : 0;

    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height + headerHeight);

    // Adjust canvas height for header
    canvas.height = canvas.height + headerHeight;
    // Re-fill after resize
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Get the SVG and convert to image
    const svg = container.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // Draw header text above QR code
      if (headerText) {
        ctx.fillStyle = headerColor;
        ctx.font = `bold ${22 * scale}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(headerText, canvas.width / 2, padding + (headerHeight / 2));
      }

      // Draw QR code centered with padding (offset by header)
      ctx.drawImage(img, padding, padding + headerHeight, qrSize, qrSize);
      
      // Draw business name at the bottom (scaled for 2x canvas)
      ctx.fillStyle = textColor;
      ctx.font = `bold ${20 * scale}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const maxWidth = canvas.width - (padding * 2);
      const text = assistantName;
      let currentY = qrSize + padding + headerHeight + (20 * scale);
      
      // Word wrap business name if needed
      const words = text.split(' ');
      let line = '';
      let lines: string[] = [];
      
      for (let word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== '') {
          lines.push(line.trim());
          line = word + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line.trim());
      
      // Draw business name lines
      const lineHeight = 24 * scale;
      lines.forEach((line, i) => {
        ctx.fillText(line, canvas.width / 2, currentY + (i * lineHeight));
      });
      currentY += lines.length * lineHeight + (8 * scale);
      
      // Draw custom text if present
      if (customText) {
        ctx.font = `${14 * scale}px system-ui, -apple-system, sans-serif`;
        const customWords = customText.split(' ');
        let customLine = '';
        let customLines: string[] = [];
        
        for (let word of customWords) {
          const testLine = customLine + word + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && customLine !== '') {
            customLines.push(customLine.trim());
            customLine = word + ' ';
          } else {
            customLine = testLine;
          }
        }
        customLines.push(customLine.trim());
        
        customLines.forEach((line, i) => {
          ctx.fillText(line, canvas.width / 2, currentY + (i * 18 * scale));
        });
        currentY += customLines.length * 18 * scale + (8 * scale);
      }

      // Draw "Powered by TalkWeb" footer - bottom right, smaller
      ctx.globalAlpha = 0.3;
      ctx.font = `${7 * scale}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'right';
      ctx.fillText('Powered by TalkWeb', canvas.width - padding, currentY + (10 * scale));
      ctx.textAlign = 'center';
      ctx.globalAlpha = 1.0;
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const filename = `${assistantName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-assistant-qr.png`;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(downloadUrl);
        
        toast({
          title: 'QR Code downloaded',
          description: 'QR code has been saved to your device',
        });
      });
      
      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  const shareQRCode = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Chat with ${assistantName}`,
          text: `Talk to our AI Assistant: ${assistantName}`,
          url: widgetUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback: Copy URL to clipboard
      navigator.clipboard.writeText(widgetUrl);
      toast({
        title: 'Link copied',
        description: 'Assistant link has been copied to clipboard',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>QR Code for {assistantName}</DialogTitle>
          <DialogDescription>
            Scan this QR code to chat with your AI assistant
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="customize">
              <Palette className="w-4 h-4 mr-2" />
              Customize
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div ref={qrRef} className="flex flex-col items-center p-6 rounded-lg" style={{ backgroundColor: bgColor }}>
                  {headerText && (
                    <p className="text-xl font-bold mb-3" style={{ color: headerColor }}>
                      {headerText}
                    </p>
                  )}
                  <QRCodeSVG
                    value={widgetUrl}
                    size={256}
                    level="H"
                    includeMargin={true}
                    fgColor={qrColor}
                    bgColor={bgColor}
                    imageSettings={showLogo ? {
                      src: logoUrl,
                      height: 64,
                      width: 64,
                      excavate: true,
                    } : undefined}
                    style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
                  />
                  <div className="mt-4 text-center">
                    <p className="text-lg font-bold" style={{ color: textColor }}>
                      {assistantName}
                    </p>
                    {customText && (
                      <p className="text-sm mt-2 max-w-[240px]" style={{ color: textColor }}>
                        {customText}
                      </p>
                    )}
                  </div>
                  <p className="mt-3 text-[7px] opacity-30 self-end pr-1" style={{ color: textColor }}>
                    Powered by TalkWeb
                  </p>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground break-all">{widgetUrl}</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                onClick={downloadQRCode}
                variant="outline"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PNG
              </Button>
              <Button
                onClick={shareQRCode}
                variant="outline"
                className="flex-1"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Tip:</strong> Print this QR code on business cards, flyers, or display it at your
                location so customers can instantly chat with your AI assistant.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="customize" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="header-text">Header Text (above QR code)</Label>
                <Input
                  id="header-text"
                  type="text"
                  value={headerText}
                  onChange={(e) => updateDesign({ headerText: e.target.value })}
                  placeholder="e.g., 🎙 Scan and Speak"
                  maxLength={40}
                />
                <p className="text-xs text-muted-foreground">
                  Displayed above the QR code (max 40 characters)
                </p>
                <Label className="mt-2">Header Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={headerColor}
                    onChange={(e) => updateDesign({ headerColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={headerColor}
                    onChange={(e) => updateDesign({ headerColor: e.target.value })}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-text">Custom Call-to-Action Text</Label>
                <Input
                  id="custom-text"
                  type="text"
                  value={customText}
                  onChange={(e) => updateDesign({ customText: e.target.value })}
                  placeholder="e.g., Scan to chat with our AI!"
                  maxLength={80}
                />
                <p className="text-xs text-muted-foreground">
                  Add your own message to encourage scanning (max 80 characters)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qr-color">QR Code Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="qr-color"
                    type="color"
                    value={qrColor}
                    onChange={(e) => updateDesign({ qrColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={qrColor}
                    onChange={(e) => updateDesign({ qrColor: e.target.value })}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bg-color">Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="bg-color"
                    type="color"
                    value={bgColor}
                    onChange={(e) => updateDesign({ bgColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={bgColor}
                    onChange={(e) => updateDesign({ bgColor: e.target.value })}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="text-color">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="text-color"
                    type="color"
                    value={textColor}
                    onChange={(e) => updateDesign({ textColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={textColor}
                    onChange={(e) => updateDesign({ textColor: e.target.value })}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Color for business name and call-to-action text
                </p>
              </div>

              <div className="space-y-2">
                <Label>Logo (optional)</Label>
                <div className="flex gap-2">
                  <label className="flex-1">
                    <div className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-border rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Upload Logo</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            const processedLogo = await processLogoForQuality(reader.result as string);
                            updateDesign({ logoUrl: processedLogo });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="text-xs text-muted-foreground">Or enter a URL:</div>
                <Input
                  id="logo-url"
                  type="text"
                  value={logoUrl.startsWith('data:') ? '' : logoUrl}
                  onChange={(e) => updateDesign({ logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="show-logo"
                    checked={showLogo}
                    onChange={(e) => updateDesign({ showLogo: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="show-logo" className="text-sm cursor-pointer">
                    Show logo in center
                  </Label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    updateDesign({ ...DEFAULT_DESIGN });
                  }}
                  className="flex-1"
                >
                  Reset to Default
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface VoiceFormQRCodeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formName: string;
  formSlug: string;
}

export const VoiceFormQRCode: React.FC<VoiceFormQRCodeProps> = ({
  open,
  onOpenChange,
  formName,
  formSlug,
}) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const formUrl = `${window.location.origin}/form/${formSlug}`;
  
  const [qrColor, setQrColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#000000');
  const [logoUrl, setLogoUrl] = useState('/talkweb-logo.png');
  const [showLogo, setShowLogo] = useState(true);

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

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    // Create a high-resolution canvas (2x scale for crisp output)
    const renderScale = 2;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // Enable high-quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Measure text to handle long names (scaled)
      ctx.font = `bold ${20 * renderScale}px Arial`;
      const maxWidth = (img.width * renderScale) - (40 * renderScale);
      const words = formName.split(' ');
      const lines: string[] = [];
      let currentLine = words[0];

      // Wrap text into multiple lines if needed
      for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth) {
          lines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);

      // Calculate canvas height based on number of lines (scaled)
      const lineHeight = 28 * renderScale;
      const textHeight = lines.length * lineHeight + (40 * renderScale);
      canvas.width = img.width * renderScale;
      canvas.height = (img.height * renderScale) + textHeight;
      
      // Re-enable after resize
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Add custom background color
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw QR code (scaled)
      ctx.drawImage(img, 0, 0, img.width * renderScale, img.height * renderScale);
      
      // Add form name below QR code (multi-line, scaled)
      ctx.fillStyle = textColor;
      ctx.font = `bold ${20 * renderScale}px Arial`;
      ctx.textAlign = 'center';
      
      lines.forEach((line, index) => {
        const y = (img.height * renderScale) + (30 * renderScale) + (index * lineHeight);
        ctx.fillText(line, canvas.width / 2, y);
      });
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const sanitizedName = formName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        a.download = `${sanitizedName}-form-qr.png`;
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
          title: formName,
          text: `Fill out this form: ${formName}`,
          url: formUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback: Copy URL to clipboard
      navigator.clipboard.writeText(formUrl);
      toast({
        title: 'Link copied',
        description: 'Form link has been copied to clipboard',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code for {formName}</DialogTitle>
          <DialogDescription>
            Scan this QR code to access the form directly
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="customize">Customize</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div ref={qrRef} className="flex justify-center p-4 rounded-lg" style={{ backgroundColor: bgColor }}>
                  <QRCodeSVG
                    value={formUrl}
                    size={256}
                    level="H"
                    includeMargin={true}
                    fgColor={qrColor}
                    bgColor={bgColor}
                    imageSettings={showLogo && logoUrl ? {
                      src: logoUrl,
                      height: 64,
                      width: 64,
                      excavate: true,
                    } : undefined}
                    style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
                  />
                </div>
                <div className="mt-4 text-center">
                  <h3 className="text-lg font-semibold mb-2" style={{ color: textColor }}>
                    {formName}
                  </h3>
                  <p className="text-sm text-muted-foreground break-all">{formUrl}</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button onClick={downloadQRCode} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download PNG
              </Button>
              <Button onClick={shareQRCode} variant="outline" className="flex-1">
                <Share2 className="h-4 w-4 mr-2" />
                Share Link
              </Button>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Tip:</strong> Print this QR code on flyers, business cards, or display it at your
                location so people can easily access your form.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="customize" className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="qr-color">QR Code Color</Label>
                  <Input
                    id="qr-color"
                    type="color"
                    value={qrColor}
                    onChange={(e) => setQrColor(e.target.value)}
                    className="h-10 w-full cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bg-color">Background Color</Label>
                  <Input
                    id="bg-color"
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="h-10 w-full cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="text-color">Text Color</Label>
                  <Input
                    id="text-color"
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="h-10 w-full cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Color for form name text
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="show-logo"
                      checked={showLogo}
                      onCheckedChange={(checked) => setShowLogo(checked as boolean)}
                    />
                    <Label htmlFor="show-logo">Include Logo</Label>
                  </div>
                  {showLogo && (
                    <>
                      <label className="block">
                        <div className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-border rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
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
                                setLogoUrl(processedLogo);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <Input
                        type="url"
                        value={logoUrl.startsWith('data:') ? '' : logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="Or enter logo URL"
                      />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Customization Tips:</strong> Choose colors that match your brand while ensuring
                the QR code remains scannable. High contrast works best.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

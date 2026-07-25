import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, ExternalLink, Settings, QrCode, Link2, Check, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ensureWidgetOnlyMode, generateShortUrl, generateSlugFromName } from '@/utils/previewUrlUtils';
import { supabase } from '@/integrations/supabase/client';

interface EmbedCodePreviewProps {
  embedCode: string;
  previewUrl: string;
  businessName: string;
  assistantId?: string;
  previewSlug?: string | null;
  onShowQRCode?: () => void;
}

export const EmbedCodePreview = ({ embedCode, previewUrl, businessName, assistantId, previewSlug, onShowQRCode }: EmbedCodePreviewProps) => {
  const { toast } = useToast();
  const [slug, setSlug] = useState(previewSlug || '');
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugInput, setSlugInput] = useState(previewSlug || '');
  const [savingSlug, setSavingSlug] = useState(false);
  
  const validatedPreviewUrl = ensureWidgetOnlyMode(previewUrl);
  const shortUrl = slug ? generateShortUrl(slug) : null;

  useEffect(() => {
    if (previewSlug) {
      setSlug(previewSlug);
      setSlugInput(previewSlug);
    }
  }, [previewSlug]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const openPreview = () => {
    let finalUrl = validatedPreviewUrl;
    if (!validatedPreviewUrl.startsWith('http')) {
      finalUrl = validatedPreviewUrl.startsWith('/') ? 
        `${window.location.origin}${validatedPreviewUrl}` : 
        `${window.location.origin}/preview/${validatedPreviewUrl}`;
    }
    window.open(finalUrl, '_blank');
  };

  const saveSlug = async () => {
    if (!assistantId || !slugInput.trim()) return;
    
    const normalized = generateSlugFromName(slugInput);
    if (!normalized) {
      toast({ title: "Invalid slug", description: "Please enter a valid name with letters or numbers.", variant: "destructive" });
      return;
    }

    setSavingSlug(true);
    const { error } = await supabase
      .from('assistants')
      .update({ preview_slug: normalized } as any)
      .eq('id', assistantId);

    if (error) {
      const msg = error.message.includes('unique') ? 'This short link is already taken. Try a different one.' : error.message;
      toast({ title: "Error", description: msg, variant: "destructive" });
    } else {
      setSlug(normalized);
      setSlugInput(normalized);
      setEditingSlug(false);
      toast({ title: "Short link saved!", description: `Your link: ${generateShortUrl(normalized)}` });
    }
    setSavingSlug(false);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg p-6 text-white">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">
          {businessName} - Voice Assistant Ready
        </h3>
        <p className="text-slate-300 text-sm">
          Your website visitors can now interact with your business just by speaking. Better user experience.
        </p>
      </div>

      {/* Short Link Section */}
      {assistantId && (
        <div className="mb-4 p-3 bg-slate-950/50 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="h-4 w-4 text-blue-400" />
            <h4 className="text-white font-medium text-sm">Social Profile Link</h4>
          </div>
          {editingSlug ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <span className="text-slate-400 text-xs truncate max-w-full">{window.location.origin}/a/</span>
              <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
                <Input
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="h-7 text-xs bg-slate-800 border-slate-600 text-white flex-1 min-w-0"
                  placeholder="your-business-name"
                  maxLength={60}
                />
                <Button size="sm" className="h-7 px-2 text-xs shrink-0" onClick={saveSlug} disabled={savingSlug}>
                  <Check className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-slate-400 shrink-0" onClick={() => { setEditingSlug(false); setSlugInput(slug); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : shortUrl ? (
            <div className="flex items-center gap-2 min-w-0">
              <code className="text-blue-400 text-xs font-mono flex-1 min-w-0 truncate break-all">{shortUrl}</code>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="outline" size="sm" className="h-7 w-7 p-0 bg-slate-800/80 border-slate-600 hover:bg-slate-700" onClick={() => copyToClipboard(shortUrl, 'Short link')}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0 bg-slate-800/80 border-slate-600 hover:bg-slate-700" onClick={() => window.open(shortUrl, '_blank')}>
                  <ExternalLink className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0 bg-slate-800/80 border-slate-600 hover:bg-slate-700" onClick={() => setEditingSlug(true)}>
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="text-xs h-7 border-slate-600 hover:bg-slate-700" onClick={() => { setSlugInput(generateSlugFromName(businessName)); setEditingSlug(true); }}>
              Create short link for social profiles
            </Button>
          )}
          <p className="text-slate-500 text-[10px] mt-1">Perfect for Instagram, TikTok, LinkedIn bios</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {/* Embed Code Section */}
        <div>
          <h4 className="text-white font-medium mb-2 text-sm sm:text-base">Embed Code</h4>
          <div className="relative">
            <div className="bg-slate-950/50 rounded-lg p-3 sm:p-4 border border-slate-700 pr-10 overflow-x-auto">
              <code className="text-green-400 text-xs sm:text-sm font-mono break-all">
                {embedCode}
              </code>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2 h-7 w-7 sm:h-8 sm:w-8 p-0 bg-slate-800/80 border-slate-600 hover:bg-slate-700"
              onClick={() => copyToClipboard(embedCode, 'Embed code')}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Preview Link Section */}
        <div>
          <h4 className="text-white font-medium mb-2 text-sm sm:text-base">Preview Link</h4>
          <div className="relative">
            <div className="bg-slate-950/50 rounded-lg p-3 sm:p-4 border border-slate-700 overflow-x-auto">
              <div className="text-blue-400 text-xs sm:text-sm font-mono break-all pr-24 sm:pr-28">
                {validatedPreviewUrl}
              </div>
            </div>
            <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex flex-wrap gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 bg-slate-800/80 border-slate-600 hover:bg-slate-700"
                onClick={() => copyToClipboard(validatedPreviewUrl, 'Preview link')}
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 bg-slate-800/80 border-slate-600 hover:bg-slate-700"
                onClick={openPreview}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
              {onShowQRCode && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 bg-slate-800/80 border-slate-600 hover:bg-slate-700"
                  onClick={onShowQRCode}
                >
                  <QrCode className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 bg-slate-800/80 border-slate-600 hover:bg-slate-700"
              >
                <Settings className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

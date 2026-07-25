import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { VoiceFormWidget } from '@/components/VoiceFormWidget';
import { supabase } from '@/integrations/supabase/client';
import { applyVoiceFormTheme, isValidVoiceFormTheme, VoiceFormTheme } from '@/utils/voiceFormTheme';

/**
 * Standalone page for embedding voice forms via iframe
 *
 * Usage:
 * <iframe src="https://yourdomain.com/embed/voice-form?formId=xxx&position=bottom-right&color=3b82f6&theme=dark" />
 */
const EmbedVoiceForm = () => {
  const [searchParams] = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<VoiceFormTheme | null>(null);

  const formId = searchParams.get('formId');
  const position = (searchParams.get('position') as any) || 'bottom-right';
  const color = searchParams.get('color') || '3b82f6';
  const buttonText = searchParams.get('buttonText') || 'Open Form';
  const buttonIcon = searchParams.get('buttonIcon') !== 'false';
  const themeParam = searchParams.get('theme');

  useEffect(() => {
    setMounted(true);

    // Notify parent window that widget is ready
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'voice-form-widget-ready',
        formId,
      }, '*');
    }

    // Listen for messages from parent
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'open-voice-form') {
        // Handle open form command from parent
        console.log('Open form command received');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [formId]);

  // Resolve theme: URL param wins, else saved form theme, else 'auto'.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isValidVoiceFormTheme(themeParam)) {
        if (!cancelled) setResolvedTheme(themeParam);
        return;
      }
      if (!formId) return;
      const { data } = await supabase
        .from('voice_forms')
        .select('theme')
        .eq('id', formId)
        .maybeSingle();
      if (cancelled) return;
      const t = (data as any)?.theme;
      setResolvedTheme(isValidVoiceFormTheme(t) ? t : 'auto');
    })();
    return () => { cancelled = true; };
  }, [formId, themeParam]);

  // Apply / restore <html> dark class.
  useEffect(() => {
    if (!resolvedTheme) return;
    return applyVoiceFormTheme(resolvedTheme);
  }, [resolvedTheme]);

  if (!formId) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 text-center">
        <div>
          <h1 className="text-2xl font-bold text-destructive mb-2">Invalid Configuration</h1>
          <p className="text-muted-foreground">
            Please provide a valid formId parameter.
          </p>
        </div>
      </div>
    );
  }

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <VoiceFormWidget
        formId={formId}
        position={position}
        primaryColor={`#${color.replace('#', '')}`}
        buttonText={buttonText}
        buttonIcon={buttonIcon}
      />
    </div>
  );
};

export default EmbedVoiceForm;

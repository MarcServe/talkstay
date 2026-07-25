import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const ShortLinkRedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  const [assistantId, setAssistantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const lookupSlug = async () => {
      const { data, error } = await supabase
        .from('assistants')
        .select('id, business_name, is_trial, trial_expires_at, embed_code')
        .eq('preview_slug', slug.toLowerCase())
        .maybeSingle();

      if (error || !data) {
        console.warn('Short link lookup failed:', slug, error?.message);
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Validate assistant is accessible
      const isTrialActive = data.is_trial && data.trial_expires_at && new Date(data.trial_expires_at) > new Date();
      const hasEmbed = data.embed_code && data.embed_code.length > 0;

      if (!isTrialActive && !hasEmbed) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setAssistantId(data.id);
      setLoading(false);
    };

    lookupSlug();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Loading assistant...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return <Navigate to="/not-found" replace />;
  }

  return <Navigate to={`/preview/${assistantId}?mode=widget-only`} replace />;
};

export default ShortLinkRedirect;

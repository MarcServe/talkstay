import { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';

export const EmbedRedirect = () => {
  const { assistantId } = useParams<{ assistantId: string }>();

  useEffect(() => {
    // Enhanced debugging for redirect
    console.log('=== EMBED REDIRECT DEBUG ===');
    console.log('EmbedRedirect component mounted');
    console.log('assistantId from useParams:', assistantId);
    console.log('Current window.location:', window.location.href);
    console.log('Will redirect to:', `/preview/${assistantId}`);
    console.log('=== EMBED REDIRECT DEBUG END ===');
    
    // Track this redirect event
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: 'embed_redirect',
        assistant_id: assistantId,
        from_path: `/embed/${assistantId}`,
        to_path: `/preview/${assistantId}`,
      });
    }
  }, [assistantId]);

  if (!assistantId) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={`/preview/${assistantId}`} replace />;
};
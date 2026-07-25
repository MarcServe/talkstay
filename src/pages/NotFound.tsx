import { useLocation, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { URLMapper } from "@/utils/URLMapper";

const NotFound = () => {
  const location = useLocation();
  const { assistantId } = useParams();
  const allParams = useParams();
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [urlMapper, setUrlMapper] = useState<URLMapper | null>(null);

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
    console.log('NotFound component - Full location object:', location);
    console.log('NotFound component - assistantId from params:', assistantId);
    console.log('NotFound component - All URL params:', allParams);

    // Detect if we're running in an embedded context (iframe)
    setIsEmbedded(window !== window.parent);

    // Initialize URLMapper if we have an assistantId
    if (assistantId) {
      const mapper = new URLMapper(assistantId, 'https://talkweb.io');
      setUrlMapper(mapper);
    }
  }, [location.pathname, assistantId]);

  const handleReturnHome = (e: React.MouseEvent) => {
    e.preventDefault();

    if (isEmbedded && window.parent) {
      // We're in an iframe, send message to parent window
      let targetUrl = '/';
      
      if (urlMapper) {
        // Try to get the website URL for "home" or fallback to base URL
        const homeUrl = urlMapper.getWebsiteURL('home') || urlMapper.getWebsiteURL('main');
        if (homeUrl && urlMapper.isValidURL(homeUrl)) {
          targetUrl = homeUrl;
        }
      }

      // Send navigation message to parent window (widget.js will handle this)
      window.parent.postMessage({
        type: 'navigate',
        url: targetUrl
      }, '*');
    } else {
      // Not embedded, navigate normally
      window.location.href = '/';
    }
  };

  const handleGoBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.history.length > 1) {
      window.history.back();
    } else {
      handleReturnHome(e);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-4">Oops! Page not found</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={handleGoBack}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Go Back
          </button>
          <button 
            onClick={handleReturnHome}
            className="px-6 py-2 border border-primary text-primary rounded-md hover:bg-primary/10 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

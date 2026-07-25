import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Search, RefreshCw, AlertCircle } from "lucide-react";

const SmartNotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if this might be a preview URL that the server didn't route correctly
  useEffect(() => {
    const path = location.pathname;
    console.log('SmartNotFound: Analyzing path:', path);
    
    // If this looks like a preview URL, try to extract the assistant ID and redirect
    const previewMatch = path.match(/\/preview\/([a-f0-9-]{36})/i);
    const diagnosticMatch = path.match(/\/diagnostic\/([a-f0-9-]{36})/i);
    
    if (previewMatch) {
      console.log('SmartNotFound: Detected preview URL, attempting client-side redirect');
      // Force a client-side navigation to the preview route
      setTimeout(() => {
        navigate(`/preview/${previewMatch[1]}`, { replace: true });
      }, 1000); // Give user time to see what's happening
    } else if (diagnosticMatch) {
      console.log('SmartNotFound: Detected diagnostic URL, attempting client-side redirect');
      setTimeout(() => {
        navigate(`/diagnostic/${diagnosticMatch[1]}`, { replace: true });
      }, 1000);
    }
  }, [location.pathname, navigate]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const isPreviewURL = location.pathname.includes('/preview/') || location.pathname.includes('/diagnostic/');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            {isPreviewURL ? (
              <RefreshCw className="w-12 h-12 text-primary animate-spin" />
            ) : (
              <Search className="w-12 h-12 text-primary" />
            )}
          </div>
          <CardTitle className="text-6xl font-bold text-primary mb-2">
            {isPreviewURL ? "🔄" : "404"}
          </CardTitle>
          <p className="text-xl text-muted-foreground">
            {isPreviewURL ? "Redirecting..." : "Oops! Page not found"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPreviewURL ? (
            <div className="space-y-2">
              <p className="text-sm text-green-600">
                ✅ Preview URL detected - attempting to redirect...
              </p>
              <div className="text-xs text-muted-foreground bg-green-50 p-2 rounded border">
                <strong>Redirecting to:</strong> {location.pathname}
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                The page you're looking for doesn't exist or may have been moved.
              </p>
              
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                <strong>URL:</strong> {location.pathname}
              </div>
            </>
          )}
          
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={handleGoHome} className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Return to Home
            </Button>
            {!isPreviewURL && (
              <Button onClick={handleRefresh} variant="outline" className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </Button>
            )}
          </div>
          
          {!isPreviewURL && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                If you think this is an error, please contact support.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartNotFound;
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Globe, ExternalLink, Code, Eye, Shield } from "lucide-react";
import { getCurrentConfig } from "@/config/environment";
import { generatePreviewUrl } from "@/utils/previewUrlUtils";
interface Assistant {
  id: string;
  business_name: string;
  website_url: string;
  voice_type?: string;
  tone?: string;
  language?: string;
  scraped_content?: any;
}
interface WebsitePreviewProps {
  assistant: Assistant;
}
export const WebsitePreview = ({
  assistant
}: WebsitePreviewProps) => {
  const [previewMode, setPreviewMode] = useState<'website' | 'widget'>('website');
  const [websiteUrl, setWebsiteUrl] = useState(assistant.website_url || 'https://example.com');
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState(false);
  const [showCorsWidgetDemo, setShowCorsWidgetDemo] = useState(false);

  // Check if we're in widget-only mode to hide footer
  const urlParams = new URLSearchParams(window.location.search);
  const isWidgetOnlyMode = urlParams.get('mode') === 'widget-only';

  // Generate the preview URL and embed code using environment config
  const config = getCurrentConfig();
  const previewUrl = generatePreviewUrl(assistant.id, config.baseUrl);
  const embedCode = `<script>
(function() {
  const script = document.createElement('script');
  script.src = '${config.widgetUrl}';
  script.setAttribute('data-assistant', '${assistant.id}');
  script.setAttribute('data-base-url', '${config.baseUrl}');
  document.head.appendChild(script);
})();
</script>`;

  // Listen for messages from iframe to open chat widget
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'open_chat_widget') {
        setWidgetOpen(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Simple iframe handling with URL validation
  useEffect(() => {
    if (previewMode === 'website') {
      setIsLoading(true);
      setIframeBlocked(false);
      setPreviewError(null);
      setUrlError(false);
      setShowCorsWidgetDemo(false); // Reset CORS widget demo when URL changes
      
      // Validate URL format
      try {
        new URL(websiteUrl);
      } catch {
        setUrlError(true);
        setIsLoading(false);
        setPreviewError('Invalid URL format. Please enter a valid website URL (e.g., https://example.com)');
      }
    }
  }, [previewMode, websiteUrl]);

  // Fallback: if iframe doesn't load (likely blocked by X-Frame-Options/CSP), show a helpful message
  useEffect(() => {
    if (previewMode !== 'website') return;
    if (!isLoading) return;
    const timeout = window.setTimeout(() => {
      setIframeBlocked(true);
      setPreviewError('This website uses security settings that block loading inside an iframe (X-Frame-Options/CSP). This only affects the preview here. Once you install the widget on your site, visitors will be able to open and use it normally.');
      setIsLoading(false);
    }, 6000);
    return () => window.clearTimeout(timeout);
  }, [previewMode, websiteUrl, isLoading]);
  const handleIframeError = () => {
    setIsLoading(false);
    setIframeBlocked(true);
    
    // Check if it's a 404 or server error vs iframe blocking
    fetch(websiteUrl, { method: 'HEAD', mode: 'no-cors' })
      .then(() => {
        setPreviewError('This website uses security settings that block loading inside an iframe (X-Frame-Options/CSP). This only affects the preview here. Once you install the widget on your site, visitors will be able to open and use it normally.');
      })
      .catch(() => {
        setPreviewError(`Unable to load "${websiteUrl}". The website may be down, moved, or the URL may be incorrect. Please check the URL and try again, or try a different website for testing.`);
      });
  };
  const handleIframeLoad = () => {
    setIsLoading(false);
    setPreviewError(null);
    setIframeBlocked(false);
  };
  const handleWebsitePreview = () => {
    setPreviewMode('website');
  };
  const handleWidgetPreview = () => {
    setPreviewMode('widget');
  };
  return <div className="space-y-6">
      {/* Preview Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-2">Website Preview</h3>
          <p className="text-sm text-muted-foreground">
            See how your assistant will appear on your website
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={previewMode === 'website' ? 'default' : 'outline'} size="sm" onClick={handleWebsitePreview} className="gap-2">
            <Globe className="w-4 h-4" />
            Live Website
          </Button>
          <Button variant={previewMode === 'widget' ? 'default' : 'outline'} size="sm" onClick={handleWidgetPreview} className="gap-2">
            <Eye className="w-4 h-4" />
            Widget Only
          </Button>
        </div>
      </div>

      {/* URL Input - only show for website mode */}
      {previewMode === 'website' && <div className="space-y-2">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input 
                value={websiteUrl} 
                onChange={e => setWebsiteUrl(e.target.value)} 
                placeholder="Enter website URL to preview (e.g., https://example.com)" 
                className={`flex-1 ${urlError ? 'border-red-500' : ''}`} 
              />
              <Button variant="outline" size="icon" onClick={() => window.open(websiteUrl, '_blank')}>
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
            {urlError && (
              <p className="text-sm text-red-600">Please enter a valid URL starting with http:// or https://</p>
            )}
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setWebsiteUrl('https://example.com')}
                className="text-xs"
              >
                Try Example.com
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setWebsiteUrl('https://www.wikipedia.org')}
                className="text-xs"
              >
                Try Wikipedia
              </Button>
            </div>
          </div>
        </div>}

      {/* Preview Frame */}
      <Card className="overflow-hidden">
        <div className="bg-muted/50 p-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {previewMode === 'website' ? 'Live Website' : 'Widget Demo'}
              </Badge>
              <Badge variant="outline" className="text-xs">Preview Mode</Badge>
              <span className="text-xs text-muted-foreground">
                {websiteUrl}
              </span>
            </div>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
        </div>

        <div className="relative h-[600px]">
          {previewMode === 'website' ? <>
              {/* Loading State */}
              {isLoading && !iframeBlocked && !urlError && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Loading website preview...</p>
                      <p className="text-xs text-muted-foreground">Connecting to {websiteUrl}</p>
                    </div>
                  </div>
                </div>}

              {!iframeBlocked && !urlError ? <>
                  {/* Website iframe with widget injection */}
                  <iframe 
                    src={websiteUrl} 
                    className="w-full h-full border-none" 
                    title="Website Preview" 
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups" 
                    onError={handleIframeError} 
                    onLoad={handleIframeLoad} 
                    style={{
                      transform: 'scale(0.8)',
                      transformOrigin: 'top left',
                      width: '125%',
                      height: '125%'
                    }}
                    ref={(iframe) => {
                      if (iframe && !iframe.dataset.widgetInjected) {
                        iframe.dataset.widgetInjected = 'true';
                        
                        let injectionAttempts = 0;
                        const maxAttempts = 3;
                        
                        const injectWidget = (attempt = 1) => {
                          injectionAttempts = attempt;
                          console.log(`Widget injection attempt ${attempt}/${maxAttempts}`);
                          
                          try {
                            // Test cross-origin access immediately
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                            
                            if (!iframeDoc) {
                              console.log('Cross-origin restriction detected - no document access');
                              setShowCorsWidgetDemo(true);
                              return;
                            }
                            
                            if (iframeDoc && iframeDoc.body) {
                              // Check if widget script is already injected
                              const existingScript = iframeDoc.querySelector(`script[data-assistant="${assistant.id}"]`);
                              if (!existingScript) {
                                console.log('Injecting widget into iframe...');
                                
                                // Create and inject the widget script with iframe context
                                const script = iframeDoc.createElement('script');
                                script.src = config.widgetUrl;
                                script.setAttribute('data-assistant', assistant.id);
                                script.setAttribute('data-base-url', config.baseUrl);
                                script.setAttribute('data-preview-mode', 'true');
                                script.setAttribute('data-iframe-context', 'true');
                                
                                // Add error handling to the script
                                script.onerror = () => {
                                  console.log('Widget script failed to load, showing demo overlay');
                                  setShowCorsWidgetDemo(true);
                                };
                                
                                script.onload = () => {
                                  console.log('Widget script loaded successfully');
                                  // Give the widget time to initialize
                                  setTimeout(() => {
                                    const widgetElement = iframeDoc.querySelector('#talkweb-root');
                                    if (!widgetElement) {
                                      console.log('Widget not found after loading, showing demo overlay');
                                      setShowCorsWidgetDemo(true);
                                    } else {
                                      console.log('Widget successfully initialized in iframe');
                                    }
                                  }, 2000);
                                };
                                
                                // Inject into head for better loading
                                (iframeDoc.head || iframeDoc.body).appendChild(script);
                                console.log('Widget script injected successfully');
                              } else {
                                console.log('Widget script already exists in iframe');
                              }
                            } else {
                              // Document not ready, try again
                              if (attempt < maxAttempts) {
                                console.log(`Document not ready, retrying in ${attempt * 1000}ms...`);
                                setTimeout(() => injectWidget(attempt + 1), attempt * 1000);
                              } else {
                                console.log('Max injection attempts reached, showing demo overlay');
                                setShowCorsWidgetDemo(true);
                              }
                            }
                          } catch (error) {
                            console.log(`Widget injection failed (attempt ${attempt}):`, error);
                            if (error.name === 'SecurityError' || error.message.includes('cross-origin')) {
                              console.log('Cross-origin security error detected');
                              setShowCorsWidgetDemo(true);
                            } else if (attempt < maxAttempts) {
                              setTimeout(() => injectWidget(attempt + 1), attempt * 1000);
                            } else {
                              console.log('Max injection attempts reached, showing demo overlay');
                              setShowCorsWidgetDemo(true);
                            }
                          }
                        };
                        
                        // Immediate cross-origin test
                        setTimeout(() => {
                          try {
                            const testAccess = iframe.contentDocument;
                            if (!testAccess) {
                              console.log('Immediate cross-origin block detected');
                              setShowCorsWidgetDemo(true);
                              return;
                            }
                          } catch (e) {
                            console.log('Cross-origin restriction confirmed');
                            setShowCorsWidgetDemo(true);
                            return;
                          }
                          
                          // If we can access, try injection
                          if (iframe.contentDocument?.readyState === 'complete') {
                            setTimeout(() => injectWidget(1), 500);
                          } else {
                            iframe.addEventListener('load', () => {
                              setTimeout(() => injectWidget(1), 500);
                            }, { once: true });
                          }
                        }, 100);
                      }
                    }}
                  />

                  {/* Cross-origin widget demo overlay */}
                  {showCorsWidgetDemo && (
                    <div className="absolute top-4 right-4 bg-primary text-primary-foreground rounded-lg p-3 shadow-lg max-w-xs">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Widget Demo</p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setShowCorsWidgetDemo(false)}
                          className="h-6 w-6 p-0 text-primary-foreground hover:bg-primary-foreground/20"
                        >
                          ✕
                        </Button>
                      </div>
                      <p className="text-xs opacity-90 mb-3">
                        Widget injection blocked by website security. External sites will show your new widget design correctly!
                      </p>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => setWidgetOpen(true)}
                        className="w-full text-xs"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Show Widget Demo
                      </Button>
                    </div>
                  )}

                  {/* Demo notice */}
                  <div className="absolute top-4 left-4 bg-primary/90 text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                    🎯 Live website with AI widget injected
                  </div>
                </> : (/* Blocked iframe message */
          <div className="w-full h-full bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-8">
                  <div className="text-center max-w-md space-y-4">
                    <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                      <Shield className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="text-xl font-semibold">Website Preview Unavailable</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {previewError || "This website cannot be displayed in a preview frame due to security restrictions. This is normal and doesn't affect your widget's functionality."}
                    </p>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mt-3">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>Why this happens:</strong> Many websites use security headers (X-Frame-Options/CSP) that prevent embedding in frames. This protects against clickjacking attacks but blocks legitimate previews.
                      </p>
                    </div>
                    
                    <div className="space-y-3 pt-2">
                      <Button onClick={() => window.open(websiteUrl, '_blank')} className="gap-2 w-full">
                        <ExternalLink className="w-4 h-4" />
                        Open Website in New Tab
                      </Button>
                      
                      <Button variant="outline" onClick={() => setWidgetOpen(true)} className="gap-1 text-xs w-full" size="sm">
                        <Eye className="w-3 h-3" />
                        Show Widget Demo
                      </Button>
                      
                      <Button variant="outline" onClick={() => setPreviewMode('widget')} className="gap-1 text-xs w-full" size="sm">
                        <Eye className="w-3 h-3" />
                        Try Widget Only Mode
                      </Button>
                    </div>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>💡 Your widget will work once installed on your site — you and your visitors can interact with it normally.</p>
                      <p>🔒 This restriction only affects the preview here due to iframe security policies.</p>
                    </div>
                  </div>
                </div>)}
            </> : (/* Widget-only preview */
        <div className="w-full h-full bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
              <div className="w-full max-w-md">
                {/* Debug info */}
                <div className="mb-2 p-2 bg-muted rounded text-xs font-mono">
                  <div>URL: {`${config.baseUrl}/preview/${assistant.id}?mode=widget-only`}</div>
                  <div>Assistant ID: {assistant.id}</div>
                  <div>Base URL: {config.baseUrl}</div>
                </div>
                <iframe 
                  src={`${config.baseUrl}/preview/${assistant.id}?mode=widget-only&preview=true`} 
                  className="w-full h-[500px] border border-border rounded-lg shadow-lg" 
                  title="Widget Preview" 
                  onError={(e) => {
                    console.error('Widget iframe failed to load:', e);
                    setPreviewError('Widget preview failed to load. Check console for details.');
                  }} 
                  onLoad={() => {
                    console.log('Widget iframe loaded successfully');
                    setPreviewError(null);
                  }}
                />
                {previewError && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                    {previewError}
                  </div>
                )}
              </div>
            </div>)}
        </div>
      </Card>

      {/* Embed Instructions - Hidden in widget-only mode */}
      {!isWidgetOnlyMode && <Card className="p-4">
          <div className="flex items-start gap-3">
            <Code className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold mb-2">How to Add to Your Website</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Copy and paste this code into your website's HTML, just before the closing &lt;/body&gt; tag:
              </p>
              <div className="bg-muted p-3 rounded font-mono text-xs overflow-auto">
                <pre>{embedCode}</pre>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                The widget will automatically appear on your website and provide AI assistance to your visitors.
              </p>
            </div>
          </div>
        </Card>}

      {/* Widget Floating Panel - For cross-origin demo */}
      {widgetOpen && <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-background border border-border rounded-lg shadow-2xl z-50 flex flex-col">
          <div className="p-3 border-b flex items-center justify-between bg-primary/5">
            <div>
              <h4 className="text-sm font-medium">Widget Demo</h4>
              <p className="text-xs text-muted-foreground">How your widget appears to visitors</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setWidgetOpen(false)} className="h-6 w-6 p-0">
              ✕
            </Button>
          </div>
          <div className="flex-1 p-3">
            <iframe 
              src={`${config.baseUrl}/preview/${assistant.id}?embedded=true&chat=true`} 
              className="w-full h-full border border-border rounded-lg" 
              title="Widget Demo" 
              onError={() => console.error('Floating widget iframe failed to load')} 
              onLoad={() => console.log('Floating widget iframe loaded successfully')} 
            />
          </div>
          <div className="p-3 border-t bg-muted/50">
            <p className="text-xs text-muted-foreground">
              💡 This is exactly how your widget will work when installed on your website. Visitors can interact with it normally.
            </p>
          </div>
        </div>}

    </div>;
};
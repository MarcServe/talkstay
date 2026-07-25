import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentConfig } from "@/config/environment";
interface PlatformDetectionResult {
  platform: string;
  confidence: number;
  technologyStack: any;
  cached: boolean;
}
interface WidgetDocumentationProps {
  assistantId?: string;
  platformId?: string;
  websiteUrl?: string;
}
export const WidgetDocumentation = ({
  assistantId = "YOUR_ASSISTANT_ID",
  platformId = "universal",
  websiteUrl
}: WidgetDocumentationProps) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState<PlatformDetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [activeTab, setActiveTab] = useState("universal");
  const { toast } = useToast();
  const config = getCurrentConfig();
  const embedCode = `<script src="${config.widgetUrl}" data-assistant="${assistantId}"></script>`;

  // Auto-detect platform if website URL is provided
  useEffect(() => {
    if (websiteUrl && websiteUrl.startsWith('http')) {
      detectPlatform();
    }
  }, [websiteUrl]);

  // Auto-select detected platform tab
  useEffect(() => {
    if (detectedPlatform && detectedPlatform.confidence > 0.3) {
      // Lowered threshold to 30%
      const platformMapping: {
        [key: string]: string;
      } = {
        'WordPress': 'wordpress',
        'Shopify': 'shopify',
        'Squarespace': 'squarespace',
        'Webflow': 'webflow',
        'Wix': 'wix',
        'React': 'custom',
        // Map React to custom HTML
        'Vue': 'custom',
        'Angular': 'custom'
      };
      const detectedTab = platformMapping[detectedPlatform.platform] || 'universal';
      setActiveTab(detectedTab);
    }
  }, [detectedPlatform]);
  const detectPlatform = async () => {
    if (!websiteUrl || !websiteUrl.startsWith('http')) return;
    setIsDetecting(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('platform-detection', {
        body: {
          websiteUrl
        }
      });
      if (error) throw new Error(error.message);
      setDetectedPlatform(data as PlatformDetectionResult);
    } catch (err) {
      console.error('Platform detection error:', err);
    } finally {
      setIsDetecting(false);
    }
  };
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast({
      title: "Copied to clipboard",
      description: "The embed code has been copied to your clipboard."
    });
  };
  const getTabVariant = (tabId: string) => {
    if (detectedPlatform && detectedPlatform.confidence > 0.3) {
      // Lowered threshold to 30%
      const platformMapping: {
        [key: string]: string;
      } = {
        'WordPress': 'wordpress',
        'Shopify': 'shopify',
        'Squarespace': 'squarespace',
        'Webflow': 'webflow',
        'Wix': 'wix',
        'React': 'custom',
        // Map React to custom HTML
        'Vue': 'custom',
        'Angular': 'custom'
      };
      const detectedTab = platformMapping[detectedPlatform.platform];
      if (detectedTab === tabId) {
        return "suggested";
      }
    }
    return "default";
  };
  const tabs = [{
    id: "universal",
    label: "Universal Embed Code",
    visible: true,
    content: <div className="space-y-4">
          <p>Simply paste this snippet into your site's HTML to activate the assistant:</p>
          
          <div className="relative">
            <pre className="bg-muted p-4 pr-12 rounded-lg overflow-x-auto">
              <code>{embedCode}</code>
            </pre>
            <Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={() => copyToClipboard(embedCode)}>
              {copiedCode ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Recommended placement: just before the closing <code className="bg-muted px-1 rounded">&lt;/body&gt;</code> or in the <code className="bg-muted px-1 rounded">&lt;head&gt;</code> section depending on your CMS.
          </p>
        </div>
  }, {
    id: "wordpress",
    label: "WordPress",
    visible: platformId === "wordpress" || platformId === "universal",
    content: <div className="space-y-4">
          <h3 className="text-lg font-semibold">Installation via CMS Plugin (recommended)</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Log into your WordPress dashboard.</li>
            <li>Go to <strong>Plugins → Add New</strong>, search for <strong>"Header and Footer Scripts"</strong> or <strong>WPCode</strong>.</li>
            <li>Install & activate the plugin.</li>
            <li>Navigate to the plugin settings, paste the script into the <strong>Header</strong> or <strong>Footer</strong> section.</li>
            <li>Save & refresh your site to see the widget in action.</li>
          </ol>
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <p className="text-sm text-slate-900"><strong>Alternate (Custom HTML):</strong> Use a "Custom HTML" block in the Gutenberg editor and paste the code there.</p>
          </div>
        </div>
  }, {
    id: "squarespace",
    label: "Squarespace",
    visible: platformId === "squarespace" || platformId === "universal",
    content: <div className="space-y-4">
          <h3 className="text-lg font-semibold">Add via Code Injection <Badge variant="secondary">requires Business plan+</Badge></h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Go to <strong>Home → Website → Website Tools → Code Injection</strong>.</li>
            <li>Paste your script into the <strong>Header</strong> or <strong>Footer</strong> section.</li>
            <li>Click <strong>Save</strong>.</li>
            <li>Publish and refresh your site—assistant should load.</li>
          </ol>
        </div>
  }, {
    id: "webflow",
    label: "Webflow",
    visible: platformId === "webflow" || platformId === "universal",
    content: <div className="space-y-4">
          <h3 className="text-lg font-semibold">Embed the script in Project Settings</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Log into Webflow → go to <strong>Project Settings → Custom Code</strong>.</li>
            <li>Paste the widget script into <strong>Head Code</strong> or <strong>Before <code className="bg-muted px-1 rounded">&lt;body&gt;</code></strong>.</li>
            <li>Save and Publish your website.</li>
            <li>Open your published site to test the widget loading.</li>
          </ol>
        </div>
  }, {
    id: "shopify",
    label: "Shopify",
    visible: platformId === "shopify" || platformId === "universal",
    content: <div className="space-y-4">
          <h3 className="text-lg font-semibold">Theme Code Injection</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>In your Shopify Admin, go to <strong>Online Store → Themes → Customize</strong>.</li>
            <li>Select <strong>Edit Code</strong> on your active theme.</li>
            <li>Locate <code className="bg-muted px-1 rounded">theme.liquid</code> (or relevant layout file).</li>
            <li>Paste the widget <code className="bg-muted px-1 rounded">&lt;script&gt;</code> just before <code className="bg-muted px-1 rounded">&lt;/body&gt;</code>.</li>
            <li>Save. Preview your store to ensure the assistant appears.</li>
          </ol>
        </div>
  }, {
    id: "wix",
    label: "Wix",
    visible: platformId === "wix" || platformId === "universal",
    content: <div className="space-y-4">
          <h3 className="text-lg font-semibold">Adding via Wix Custom Code</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Open your Wix Dashboard → <strong>Settings → Advanced → Custom Code</strong>.</li>
            <li>Click <strong>+ Add Custom Code</strong>, name it "TalkWeb Widget."</li>
            <li>Paste the script and select:
              <ul className="list-disc list-inside ml-4 mt-2">
                <li><strong>All Pages</strong></li>
                <li>Placement: <strong>End of Body</strong></li>
              </ul>
            </li>
            <li>Save and <strong>Publish</strong> your site.</li>
            <li>Preview the live site to confirm visibility.</li>
          </ol>
        </div>
  }, {
    id: "custom",
    label: "Custom HTML / Other",
    visible: platformId === "custom" || platformId === "universal",
    content: <div className="space-y-4">
          <h3 className="text-lg font-semibold">Manual HTML Installation <Badge variant="outline">~1 min</Badge></h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Open your site's HTML template or <code className="bg-muted px-1 rounded">index.html</code>.</li>
            <li>Paste the widget script before the closing <code className="bg-muted px-1 rounded">&lt;/body&gt;</code> tag:</li>
          </ol>
          
          <div className="relative">
            <pre className="bg-muted p-4 pr-12 rounded-lg overflow-x-auto">
              <code>{`<script src="${config.widgetUrl}" data-assistant="YOUR_ASSISTANT_ID"></script>`}</code>
            </pre>
          </div>
          
          <ol className="list-decimal list-inside space-y-2" start={3}>
            <li>Save and deploy your changes. Check your website to see the assistant load.</li>
          </ol>
        </div>
  }, {
    id: "troubleshooting",
    label: "Troubleshooting & FAQ",
    visible: true,
    content: <div className="space-y-4">
          <h3 className="text-lg font-semibold">If you're not seeing the widget:</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Double-check that the Assistant ID is correct.</li>
            <li>Clear your browser cache and hard-reload the page.</li>
            <li>If using caching plugins, purge them.</li>
            <li>CSP or iFrame restrictions may block script loading—try another browser or device to test.</li>
            <li>Contact support at <strong>support@talkweb.io</strong> if the issue persists.</li>
          </ul>
        </div>
  }];
  const visibleTabs = tabs.filter(tab => tab.visible);
  return <Card className="w-full max-w-4xl mx-auto isolate">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔧 Install Your Voice Assistant Widget Easily
          {isDetecting && <Zap className="w-5 h-5 animate-pulse text-primary" />}
        </CardTitle>
        <CardDescription>
          Follow these platform-specific guides to add your voice assistant to any website
        </CardDescription>
        
        {/* Platform Detection Banner */}
        {detectedPlatform && detectedPlatform.confidence > 0.3 && <div className="bg-gradient-to-r from-purple-500/10 via-purple-400/5 to-transparent border border-purple-500/20 rounded-lg p-4 mt-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                <span className="font-semibold text-purple-300">Platform Detected!</span>
              </div>
              <Badge variant="secondary" className="bg-purple-500/10 text-purple-300 border-purple-500/20">
                {detectedPlatform.platform} ({Math.round(detectedPlatform.confidence * 100)}% confidence)
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              We've automatically selected the best installation guide for your platform below. ↓
            </p>
          </div>}
      </CardHeader>
      
      <CardContent className="pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap gap-2">
            {visibleTabs.map(tab => {
            const isSuggested = getTabVariant(tab.id) === "suggested";
            return <TabsTrigger key={tab.id} value={tab.id} className={`text-xs relative ${isSuggested ? "bg-gradient-to-r from-purple-500/20 to-purple-400/10 border-purple-500/30 text-purple-300 font-semibold shadow-sm hover:from-purple-500/25 hover:to-purple-400/15" : ""}`}>
                  {isSuggested && <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-purple-400 animate-pulse" />}
                  {tab.label}
                </TabsTrigger>;
          })}
          </TabsList>
          
          {visibleTabs.map(tab => <TabsContent key={tab.id} value={tab.id} className="mt-6">
              <div className="space-y-4">
                {tab.content}
              </div>
            </TabsContent>)}
        </Tabs>
      </CardContent>
    </Card>;
};
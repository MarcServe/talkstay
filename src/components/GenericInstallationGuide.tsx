import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, ExternalLink, User, Code, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GenericInstallationGuideProps {
  embedCode: string;
  businessName: string;
}

export const GenericInstallationGuide = ({ embedCode, businessName }: GenericInstallationGuideProps) => {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard",
    });
  };

  return (
    <Card className="bg-glass border-glass backdrop-blur-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="w-5 h-5" />
          General Installation Guide
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert>
          <HelpCircle className="h-4 w-4" />
          <AlertDescription>
            We couldn't detect your specific platform, but you can still install your voice assistant using these general steps.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-3">Installation Steps:</h4>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div>
                  <strong>Copy the embed code below</strong>
                  <p className="text-muted-foreground">This code contains your personalized voice assistant</p>
                </div>
              </li>
              
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div>
                  <strong>Access your website's HTML</strong>
                  <p className="text-muted-foreground">Log into your website editor, CMS, or contact your developer</p>
                </div>
              </li>
              
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div>
                  <strong>Paste before closing &lt;/body&gt; tag</strong>
                  <p className="text-muted-foreground">Add the code just before the &lt;/body&gt; tag in your website's HTML</p>
                </div>
              </li>
              
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                  4
                </div>
                <div>
                  <strong>Save and publish</strong>
                  <p className="text-muted-foreground">Save your changes and visit your website to test the assistant</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Your Embed Code:</h4>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => copyToClipboard(embedCode)}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
            </div>
            
            <div className="p-4 bg-muted rounded-lg border">
              <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                {embedCode}
              </pre>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              <strong>Alternative installation location:</strong> If your platform doesn't allow editing before &lt;/body&gt;, 
              try placing the code in your site's footer, custom HTML section, or script injection area.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-background/50 border">
              <CardContent className="p-4">
                <h5 className="font-semibold mb-2 flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Common Platforms
                </h5>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• <strong>WordPress:</strong> Use "Insert Headers & Footers" plugin</li>
                  <li>• <strong>Shopify:</strong> Edit theme.liquid file</li>
                  <li>• <strong>Wix:</strong> Add HTML embed element</li>
                  <li>• <strong>Squarespace:</strong> Use Code Injection in settings</li>
                  <li>• <strong>Webflow:</strong> Add to site-wide footer code</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-background/50 border">
              <CardContent className="p-4">
                <h5 className="font-semibold mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  Need Help?
                </h5>
                <p className="text-sm text-muted-foreground mb-3">
                  Can't find where to add the code? We offer free installation assistance.
                </p>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    <User className="w-4 h-4 mr-2" />
                    Free Installation Service
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <h5 className="font-semibold text-green-800 dark:text-green-200 mb-2">
              ✅ Installation Complete!
            </h5>
            <p className="text-sm text-green-700 dark:text-green-300">
              Once installed, your voice assistant will appear on all pages where the code is present. 
              Visitors can click the voice icon to start interacting with your AI assistant.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
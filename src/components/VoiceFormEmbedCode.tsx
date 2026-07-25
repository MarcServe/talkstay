import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, Code2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceFormEmbedCodeProps {
  formId: string;
  formName: string;
}

export const VoiceFormEmbedCode: React.FC<VoiceFormEmbedCodeProps> = ({
  formId,
  formName,
}) => {
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'>('bottom-right');
  const [color, setColor] = useState('#3b82f6');
  const [buttonText, setButtonText] = useState('Open Form');
  const [showIcon, setShowIcon] = useState(true);
  const [copied, setCopied] = useState(false);

  const baseUrl = window.location.origin;
  const embedUrl = `${baseUrl}/embed/voice-form?formId=${formId}&position=${position}&color=${color.replace('#', '')}&buttonText=${encodeURIComponent(buttonText)}&buttonIcon=${showIcon}`;

  const iframeCode = `<!-- ${formName} Widget -->
<iframe 
  src="${embedUrl}"
  style="position: fixed; ${position.includes('bottom') ? 'bottom' : 'top'}: 0; ${position.includes('right') ? 'right' : 'left'}: 0; width: 100%; height: 100%; border: none; pointer-events: none; z-index: 9999;"
  allow="microphone"
></iframe>

<script>
  // Optional: Listen for form submission events
  window.addEventListener('message', function(event) {
    if (event.data.type === 'voice-form-submitted') {
      console.log('Form submitted:', event.data);
      // Your custom logic here
    }
  });
</script>`;

  const reactCode = `import { VoiceFormWidget } from '@/components/VoiceFormWidget';

function App() {
  return (
    <div>
      {/* Your app content */}
      
      <VoiceFormWidget
        formId="${formId}"
        position="${position}"
        primaryColor="${color}"
        buttonText="${buttonText}"
        buttonIcon={${showIcon}}
      />
    </div>
  );
}`;

  const wordpressCode = `<!-- Add this to your WordPress theme's footer.php or use a custom HTML block -->
<iframe 
  src="${embedUrl}"
  style="position: fixed; ${position.includes('bottom') ? 'bottom' : 'top'}: 0; ${position.includes('right') ? 'right' : 'left'}: 0; width: 100%; height: 100%; border: none; pointer-events: none; z-index: 9999;"
  allow="microphone"
></iframe>`;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Widget Configuration</CardTitle>
          <CardDescription>
            Customize how the form widget appears on your website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Position</Label>
              <Select value={position} onValueChange={(v: any) => setPosition(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="top-left">Top Left</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label>Button Text</Label>
              <Input
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="Open Form"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Show Icon</Label>
              <Switch checked={showIcon} onCheckedChange={setShowIcon} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            See how your widget will appear
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative border rounded-lg bg-muted/50 h-64 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              Your website content here
            </div>
            <div className={`absolute ${position.includes('bottom') ? 'bottom' : 'top'}-6 ${position.includes('right') ? 'right' : 'left'}-6`}>
              <Button
                style={{ backgroundColor: color, color: 'white' }}
                size="lg"
              >
                {showIcon && <span className="mr-2">💬</span>}
                {buttonText}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Embed Codes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Embed Code
          </CardTitle>
          <CardDescription>
            Copy and paste this code into your website
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="iframe">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="iframe">HTML/Iframe</TabsTrigger>
              <TabsTrigger value="react">React</TabsTrigger>
              <TabsTrigger value="wordpress">WordPress</TabsTrigger>
            </TabsList>

            <TabsContent value="iframe" className="space-y-4">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{iframeCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopy(iframeCode)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Instructions:</strong></p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Copy the code above</li>
                  <li>Paste it before the closing &lt;/body&gt; tag in your HTML</li>
                  <li>The widget will appear automatically on your page</li>
                </ol>
              </div>
            </TabsContent>

            <TabsContent value="react" className="space-y-4">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{reactCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopy(reactCode)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Instructions:</strong></p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Install the component in your React project</li>
                  <li>Import and use the VoiceFormWidget component</li>
                  <li>Customize the props as needed</li>
                </ol>
              </div>
            </TabsContent>

            <TabsContent value="wordpress" className="space-y-4">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{wordpressCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopy(wordpressCode)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Instructions:</strong></p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to Appearance → Theme File Editor</li>
                  <li>Open footer.php or use a Custom HTML block</li>
                  <li>Paste the code above</li>
                  <li>Save and refresh your site</li>
                </ol>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-2 text-sm">
              <ExternalLink className="h-4 w-4 mt-0.5 text-primary" />
              <div>
                <p className="font-medium">Direct Link</p>
                <a
                  href={embedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {embedUrl}
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Events */}
      <Card>
        <CardHeader>
          <CardTitle>JavaScript Events</CardTitle>
          <CardDescription>
            Listen to widget events in your application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium mb-2">Form Submitted Event</p>
              <pre className="bg-muted p-3 rounded-lg overflow-x-auto">
                <code>{`window.addEventListener('message', function(event) {
  if (event.data.type === 'voice-form-submitted') {
    // Handle form submission
    console.log('Form ID:', event.data.formId);
    console.log('Form Data:', event.data.data);
    
    // Your custom logic
    // e.g., show success message, trigger analytics, etc.
  }
});`}</code>
              </pre>
            </div>

            <div>
              <p className="font-medium mb-2">Widget Ready Event</p>
              <pre className="bg-muted p-3 rounded-lg overflow-x-auto">
                <code>{`window.addEventListener('message', function(event) {
  if (event.data.type === 'voice-form-widget-ready') {
    console.log('Widget ready for form:', event.data.formId);
  }
});`}</code>
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ExternalLink, 
  Code, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Globe, 
  TestTube,
  AlertTriangle,
  CheckCircle,
  Copy,
  Eye
} from "lucide-react";
import { getCurrentConfig, getEnvironment } from "@/config/environment";
import { toast } from "sonner";

interface TestScenario {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: React.ReactNode;
  assistantId?: string;
}

export const WidgetTestingDashboard = () => {
  const [environment, setEnvironment] = useState(getEnvironment());
  const [config, setConfig] = useState(getCurrentConfig());
  
  useEffect(() => {
    setEnvironment(getEnvironment());
    setConfig(getCurrentConfig());
  }, []);

  const testScenarios: TestScenario[] = [
    {
      id: 'staging-test',
      name: 'Staging Test Page',
      description: 'Comprehensive staging environment with all assistants',
      url: '/widget-test-staging.html',
      icon: <TestTube className="h-4 w-4" />,
    },
    {
      id: 'scenarios',
      name: 'Design Scenarios',
      description: 'Multiple design contexts and responsive testing',
      url: '/widget-test-scenarios.html',
      icon: <Monitor className="h-4 w-4" />,
    },
    {
      id: 'minimal',
      name: 'Minimal Test',
      description: 'Simple test page for basic functionality',
      url: '/test-widget.html',
      icon: <Globe className="h-4 w-4" />,
    }
  ];

  const assistantConfigs = [
    {
      id: 'd872e528-d39d-4d53-9f03-1eb7bd724048',
      name: 'TalkWeb',
      description: 'Main TalkWeb assistant'
    },
    {
      id: 'e7fa0f16-ba8e-4277-bd80-70f0aa25cbad',
      name: 'Biz Boosters',
      description: 'Business consulting assistant'
    },
    {
      id: '3e293468-05fe-4913-85d5-b560812a30c9',
      name: 'Diversity X',
      description: 'Diversity and inclusion specialist'
    },
    {
      id: 'd948f650-ca3e-4a3b-b3ac-cc938e4ff590',
      name: 'UK GOV',
      description: 'Government services assistant'
    },
    {
      id: '7e5f233c-b996-4afe-b603-92d77bbe9ab1',
      name: 'We Make Change',
      description: 'Social impact assistant'
    }
  ];

  const generateWidgetScript = (assistantId: string) => {
    let widgetUrl = config.widgetUrl;
    
    // Use staging widget for non-production environments
    if (environment !== 'production') {
      widgetUrl = widgetUrl.replace('/widget.js', '/widget-staging.js');
    }
    
    return `<script 
  data-assistant="${assistantId}" 
  data-base-url="${config.baseUrl}"
  src="${widgetUrl}">
</script>`;
  };

  const copyScript = async (assistantId: string) => {
    const script = generateWidgetScript(assistantId);
    try {
      await navigator.clipboard.writeText(script);
      toast.success("Widget script copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy script");
    }
  };

  const openTestPage = (url: string) => {
    window.open(url, '_blank');
  };

  const getEnvironmentBadgeColor = () => {
    switch (environment) {
      case 'development': return 'bg-blue-500';
      case 'staging': return 'bg-orange-500';
      case 'production': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Widget Testing Dashboard</h2>
          <p className="text-muted-foreground">
            Test widgets safely in {environment} environment
          </p>
        </div>
        <Badge className={`${getEnvironmentBadgeColor()} text-white`}>
          {environment.toUpperCase()}
        </Badge>
      </div>

      {environment === 'production' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Production Environment Detected:</strong> Widget changes will affect live client websites. 
            Consider testing in staging first.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="test-pages" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="test-pages">Test Pages</TabsTrigger>
          <TabsTrigger value="widget-scripts">Widget Scripts</TabsTrigger>
          <TabsTrigger value="environment">Environment Info</TabsTrigger>
        </TabsList>

        <TabsContent value="test-pages" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {testScenarios.map((scenario) => (
              <Card key={scenario.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {scenario.icon}
                    {scenario.name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {scenario.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => openTestPage(scenario.url)}
                    className="w-full"
                    size="sm"
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Open Test Page
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="widget-scripts" className="space-y-4">
          <div className="grid gap-4">
            {assistantConfigs.map((assistant) => (
              <Card key={assistant.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">{assistant.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {assistant.description}
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => copyScript(assistant.id)}
                      size="sm"
                      variant="outline"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                    <code>{generateWidgetScript(assistant.id)}</code>
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="environment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Current Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Environment:</span>
                  <p className="font-mono">{environment}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Base URL:</span>
                  <p className="font-mono text-xs break-all">{config.baseUrl}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Widget URL:</span>
                  <p className="font-mono text-xs break-all">
                    {environment !== 'production' 
                      ? config.widgetUrl.replace('/widget.js', '/widget-staging.js')
                      : config.widgetUrl
                    }
                  </p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Supabase URL:</span>
                  <p className="font-mono text-xs break-all">{config.supabaseUrl}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Safety Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Environment-aware widget URLs</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Staging indicators on non-production widgets</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Separate staging assistant configurations</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Protected production widget (public/widget.js)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, ExternalLink, Clock, User, Settings, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GenericInstallationGuide } from "./GenericInstallationGuide";

interface InstallationGuideProps {
  platform: string;
  confidence: number;
  embedCode: string;
  businessName: string;
}

interface GuideStep {
  title: string;
  description: string;
  code?: string;
  image?: string;
  warning?: string;
}

const platformGuides: Record<string, {
  title: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  steps: GuideStep[];
}> = {
  WordPress: {
    title: "WordPress Installation",
    difficulty: 'beginner',
    estimatedTime: 5,
    steps: [
      {
        title: "Access WordPress Admin",
        description: "Log in to your WordPress admin dashboard (usually yoursite.com/wp-admin)",
      },
      {
        title: "Install Custom HTML Plugin",
        description: "Go to Plugins → Add New → Search for 'Insert Headers and Footers' and install it",
      },
      {
        title: "Add the Code",
        description: "Go to Settings → Insert Headers and Footers → Paste the code in the 'Scripts in Footer' section",
        code: "// Your embed code will be pasted here"
      },
      {
        title: "Save Changes",
        description: "Click 'Save' and visit your website to see the voice assistant in action!",
      }
    ]
  },
  Shopify: {
    title: "Shopify Installation",
    difficulty: 'beginner',
    estimatedTime: 7,
    steps: [
      {
        title: "Access Theme Editor",
        description: "Go to Online Store → Themes → Actions → Edit Code",
      },
      {
        title: "Edit theme.liquid",
        description: "Find and click on 'theme.liquid' in the Layout folder",
      },
      {
        title: "Add Code Before </head>",
        description: "Scroll down and paste the code just before the closing </head> tag",
        code: "// Your embed code goes here",
        warning: "Make sure to paste it exactly before </head> to avoid breaking your theme"
      },
      {
        title: "Save and Test",
        description: "Click 'Save' and visit your storefront to test the voice assistant",
      }
    ]
  },
  Wix: {
    title: "Wix Installation",
    difficulty: 'intermediate',
    estimatedTime: 10,
    steps: [
      {
        title: "Open Wix Editor",
        description: "Go to your Wix dashboard and click 'Edit Site'",
      },
      {
        title: "Add HTML Element",
        description: "Click 'Add' → 'Embed Code' → 'HTML iframe'",
      },
      {
        title: "Paste Custom Code",
        description: "Double-click the HTML element and paste your embed code",
        code: "// Your embed code goes here"
      },
      {
        title: "Position and Publish",
        description: "Position the element (usually hidden) and publish your site",
      }
    ]
  },
  Squarespace: {
    title: "Squarespace Installation",
    difficulty: 'intermediate',
    estimatedTime: 8,
    steps: [
      {
        title: "Access Settings",
        description: "Go to Settings → Advanced → Code Injection",
      },
      {
        title: "Add to Footer",
        description: "Paste your embed code in the 'Footer' section",
        code: "// Your embed code goes here"
      },
      {
        title: "Save Changes",
        description: "Click 'Save' and the assistant will appear on all pages",
      }
    ]
  }
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'beginner': return 'bg-green-500';
    case 'intermediate': return 'bg-yellow-500';
    case 'advanced': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

export const InstallationGuide = ({ platform, confidence, embedCode, businessName }: InstallationGuideProps) => {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("guide");
  
  const guide = platformGuides[platform];
  const isLowConfidence = confidence < 0.5;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard",
    });
  };

  if (!guide || platform === "unknown") {
    return (
      <GenericInstallationGuide 
        embedCode={embedCode}
        businessName={businessName}
      />
    );
  }

  return (
    <Card className="bg-glass border-glass backdrop-blur-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {guide.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={getDifficultyColor(guide.difficulty)}>
              {guide.difficulty}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {guide.estimatedTime} min
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLowConfidence && (
          <Alert className="mb-4">
            <AlertDescription>
              Platform detection confidence is low ({Math.round(confidence * 100)}%). 
              These steps might not be accurate for your site. Consider manual installation or contact support.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="guide">Step-by-Step Guide</TabsTrigger>
            <TabsTrigger value="code">Embed Code</TabsTrigger>
          </TabsList>
          
          <TabsContent value="guide" className="space-y-4 mt-4">
            {guide.steps.map((step, index) => (
              <Card key={index} className="bg-background/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{step.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                      
                      {step.warning && (
                        <Alert className="mb-2">
                          <AlertDescription className="text-xs">{step.warning}</AlertDescription>
                        </Alert>
                      )}
                      
                      {step.code && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium">Code to paste:</span>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => copyToClipboard(embedCode)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
                            {embedCode}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Need Help?</h4>
              <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                If you encounter any issues or need assistance with the installation, we're here to help!
              </p>
              <Button variant="outline" size="sm" className="mr-2">
                <ExternalLink className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
              <Button variant="outline" size="sm">
                <User className="w-4 h-4 mr-2" />
                Free Installation Service
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="code" className="mt-4">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Your Embed Code</h4>
                  <Button 
                    variant="outline" 
                    onClick={() => copyToClipboard(embedCode)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Code
                  </Button>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                    {embedCode}
                  </pre>
                </div>
              </div>
              
              <Alert>
                <AlertDescription>
                  Paste this code in your website's HTML, preferably just before the closing &lt;/body&gt; tag.
                  The voice assistant will automatically appear on all pages where this code is present.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
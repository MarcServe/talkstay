import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Copy, ExternalLink, Clock, User, Settings, Code, Chrome, Monitor, Smartphone, Globe, Download, CheckCircle, AlertTriangle, BookOpen, Zap, ArrowDown, ArrowRight, Accessibility } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentConfig } from "@/config/environment";
import { Link } from "react-router-dom";
export const InstallationGuidePage = () => {
  const {
    toast
  } = useToast();
  const [selectedTab, setSelectedTab] = useState("overview");
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard"
    });
  };
  const config = getCurrentConfig();
  const sampleScript = `<script src="${config.widgetUrl}" data-assistant="YOUR_ASSISTANT_ID"></script>`;
  const platforms = [{
    name: "WordPress",
    difficulty: "Beginner",
    time: "5 min",
    description: "Most popular CMS platform",
    steps: ["Access WordPress Admin (yoursite.com/wp-admin)", "Install 'Insert Headers and Footers' plugin", "Go to Settings → Insert Headers and Footers", "Paste code in 'Scripts in Footer' section", "Save changes and test"]
  }, {
    name: "Shopify",
    difficulty: "Beginner",
    time: "7 min",
    description: "E-commerce platform",
    steps: ["Go to Online Store → Themes → Actions → Edit Code", "Find and click 'theme.liquid' in Layout folder", "Paste code before closing </head> tag", "Save and test on storefront"]
  }, {
    name: "Wix",
    difficulty: "Intermediate",
    time: "10 min",
    description: "Drag-and-drop website builder",
    steps: ["Open Wix Editor from dashboard", "Click Add → Embed Code → HTML iframe", "Paste embed code in HTML element", "Position element and publish site"]
  }, {
    name: "Squarespace",
    difficulty: "Intermediate",
    time: "8 min",
    description: "Professional website platform",
    steps: ["Go to Settings → Advanced → Code Injection", "Paste embed code in Footer section", "Save changes (appears on all pages)"]
  }, {
    name: "Webflow",
    difficulty: "Intermediate",
    time: "6 min",
    description: "Visual web development platform",
    steps: ["Open Webflow Designer", "Go to Project Settings → Custom Code", "Paste code in Footer Code section", "Publish site"]
  }];
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'intermediate':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'advanced':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };
  return <div className="min-h-screen bg-background">
      
      <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-6 py-3 rounded-full text-lg font-bold mb-6 animate-pulse">
            <ArrowDown className="w-6 h-6 animate-bounce" />
            START HERE - Follow The Steps Below
            <ArrowDown className="w-6 h-6 animate-bounce" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            TalkWeb Installation Guide
          </h1>
          <p className="text-2xl text-foreground font-semibold max-w-3xl mx-auto mb-4">
            Complete, copy-paste ready instructions for installing TalkWeb on any platform. 
            From instant testing to permanent deployment.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
            <Link to="/accessibility-statement">
              <Button variant="outline" size="lg" className="gap-2">
                <Accessibility className="w-5 h-5" />
                Accessibility Features
              </Button>
            </Link>
            <Button variant="default" size="lg" className="gap-2 animate-pulse" onClick={() => setSelectedTab("chrome-testing")}>
              <ArrowRight className="w-5 h-5" />
              Start Installation Now
            </Button>
          </div>
        </div>

        {/* Summary Card */}
        <Card className="mb-8 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">All Done! Complete Guide Available</h3>
                <p className="text-muted-foreground mb-4">
                  You now have a comprehensive, copy-paste ready TalkWeb Installation Guide that includes:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-500" />
                    Instant Chrome-based testing (no coding required)
                  </div>
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-blue-500" />
                    Platform-specific instructions (WordPress, Shopify, Wix, etc.)
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-purple-500" />
                    Mobile builder guidance
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-orange-500" />
                    Localization advice
                  </div>
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-indigo-500" />
                    Banner image & CTA tips
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-pink-500" />
                    Support instructions
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-8 gap-2 h-auto p-2">
            <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white border-2 border-emerald-500/30 text-emerald-400">
              Overview
            </TabsTrigger>
            <TabsTrigger value="chrome-testing" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white border-2 border-blue-500/30 text-blue-400">
              Chrome Testing
            </TabsTrigger>
            <TabsTrigger value="platforms" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white border-2 border-purple-500/30 text-purple-400">
              Platforms
            </TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white border-2 border-amber-500/30 text-amber-400">
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-3">
                <ArrowRight className="w-8 h-8 text-primary animate-pulse" />
                Choose Your Path Below
                <ArrowRight className="w-8 h-8 text-primary animate-pulse" />
              </h2>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Zap className="w-6 h-6" />
                  Quick Start Options
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="relative">
                  <div className="p-6 border-4 border-primary/50 rounded-lg text-center hover:border-primary hover:shadow-xl transition-all cursor-pointer bg-primary/5" onClick={() => setSelectedTab("chrome-testing")}>
                    <Chrome className="w-12 h-12 mx-auto mb-3 text-blue-500" />
                    <h4 className="font-bold text-lg mb-2">Instant Testing</h4>
                    <p className="text-sm text-muted-foreground mb-3">Test on any website using Chrome DevTools</p>
                    <Badge className="bg-blue-500 text-white">STEP 1</Badge>
                  </div>
                  <ArrowRight className="hidden md:block absolute -right-8 top-1/2 -translate-y-1/2 w-6 h-6 text-primary animate-pulse" />
                </div>
                
                <div className="relative">
                  <div className="p-6 border-4 border-accent/50 rounded-lg text-center hover:border-accent hover:shadow-xl transition-all cursor-pointer bg-accent/5" onClick={() => setSelectedTab("platforms")}>
                    <Settings className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <h4 className="font-bold text-lg mb-2">Platform Installation</h4>
                    <p className="text-sm text-muted-foreground mb-3">Step-by-step for WordPress, Shopify, etc.</p>
                    <Badge className="bg-green-500 text-white">STEP 2</Badge>
                  </div>
                  <ArrowRight className="hidden md:block absolute -right-8 top-1/2 -translate-y-1/2 w-6 h-6 text-primary animate-pulse" />
                </div>
                
                <div className="p-6 border-4 border-accent/50 rounded-lg text-center hover:border-accent hover:shadow-xl transition-all cursor-pointer bg-accent/5" onClick={() => setSelectedTab("advanced")}>
                  <Code className="w-12 h-12 mx-auto mb-3 text-purple-500" />
                  <h4 className="font-bold text-lg mb-2">Advanced Setup</h4>
                  <p className="text-sm text-muted-foreground mb-3">Custom implementations and integrations</p>
                  <Badge className="bg-purple-500 text-white">OPTIONAL</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Widget Script</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Replace <code className="bg-muted px-1 rounded">YOUR_ASSISTANT_ID</code> with your actual assistant ID from your dashboard.
                    </AlertDescription>
                  </Alert>
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">{sampleScript}</pre>
                    <Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={() => copyToClipboard(sampleScript)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chrome Testing Tab */}
          <TabsContent value="chrome-testing" className="space-y-6">
            <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Chrome className="w-6 h-6 text-blue-500" />
                  🎙️ Testing TalkWeb on Any Website via Chrome
                  <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">No Code Required</Badge>
                </CardTitle>
                <p className="text-muted-foreground">
                  Use this method to test how TalkWeb looks and works on a live website without touching the website's backend code.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert className="border-blue-500/20 bg-blue-500/5">
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                  <AlertDescription>
                    <strong>Purpose:</strong> Test TalkWeb on any live website instantly using Chrome DevTools.
                    Perfect for demos, testing, or live previews.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    What You'll Need
                  </h4>
                  <ul className="space-y-2 text-sm ml-6">
                    <li className="flex items-center gap-2">
                      <Chrome className="w-4 h-4 text-blue-500" />
                      Google Chrome browser
                    </li>
                    <li className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-green-500" />
                      Your TalkWeb Assistant ID
                    </li>
                    <li className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-purple-500" />
                      Target website to test on
                    </li>
                  </ul>
                </div>

                <Separator />

                <div className="space-y-6">
                  <h4 className="font-semibold">📷 Step-by-Step Instructions</h4>
                  
                  {[{
                  step: 1,
                  title: "Open the Target Website",
                  description: "Navigate to the website where you want to test TalkWeb.",
                  example: "https://example.com",
                  icon: <Globe className="w-4 h-4" />
                }, {
                  step: 2,
                  title: "Launch Chrome DevTools",
                  description: "Right-click anywhere on the page and select 'Inspect', or press:",
                  shortcuts: ["Ctrl + Shift + I (Windows)", "Cmd + Option + I (Mac)"],
                  icon: <Chrome className="w-4 h-4" />
                }, {
                  step: 3,
                  title: "Navigate to the Elements Tab",
                  description: "Click on the 'Elements' tab in the DevTools panel. Scroll and locate the <body> or <head> tag.",
                  icon: <Code className="w-4 h-4" />
                }, {
                  step: 4,
                  title: "Inject the TalkWeb Script",
                  description: "Right-click the <body> tag, choose 'Edit as HTML', and paste your widget script at the bottom:",
                  code: sampleScript,
                  note: "Replace YOUR_ASSISTANT_ID with your real ID.",
                  icon: <Settings className="w-4 h-4" />
                }, {
                  step: 5,
                  title: "See It Live!",
                  description: "Press Enter and close the DevTools panel. The TalkWeb assistant should now appear on the page.",
                  icon: <CheckCircle className="w-4 h-4 text-green-500" />
                }].map((step, index) => <div key={step.step}>
                      <Card className="relative border-2 hover:border-primary transition-all">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-lg font-bold shadow-lg">
                              {step.step}
                            </div>
                          <div className="flex-1">
                            <h5 className="font-bold text-xl mb-3 flex items-center gap-2">
                              {step.icon}
                              {step.title}
                            </h5>
                            <p className="text-base mb-3">{step.description}</p>
                            
                            {step.example && <div className="text-xs font-mono bg-muted p-2 rounded">
                                Example: {step.example}
                              </div>}
                            
                            {step.shortcuts && <div className="flex gap-2 mt-2">
                                {step.shortcuts.map((shortcut, i) => <Badge key={i} variant="outline" className="text-xs font-mono">
                                    {shortcut}
                                  </Badge>)}
                              </div>}
                            
                            {step.code && <div className="mt-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium">Code to paste:</span>
                                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(step.code)}>
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                                <pre className="p-3 bg-muted rounded text-xs font-mono overflow-x-auto">
                                  {step.code}
                                </pre>
                                {step.note && <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    {step.note}
                                  </p>}
                              </div>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    {index < 4 && (
                      <div className="flex justify-center py-4">
                        <ArrowDown className="w-10 h-10 text-primary animate-bounce" />
                      </div>
                    )}
                  </div>)}
                </div>

                <Alert className="border-amber-500/20 bg-amber-500/5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertDescription>
                    <strong>Important Notes:</strong>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>• This change only lasts while the page is open</li>
                      <li>• Refreshing the browser will remove the widget</li>
                      <li>• Perfect for demos, testing, or live previews</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <h5 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                      🧩 Next Step: Install Permanently
                    </h5>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Once you're satisfied with the testing, install it properly by pasting the script 
                      in your website code or using the platform-specific guides below.
                    </p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Platforms Tab */}
          <TabsContent value="platforms" className="space-y-6">
            {/* Custom Website Installation Guide */}
            <Card className="mb-6 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-6 h-6" />
                  Custom Website Installation
                </CardTitle>
                <p className="text-muted-foreground">
                  Follow these simple steps to install TalkWeb on any custom website
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center">
                  <img src="/lovable-uploads/7746715d-2024-42aa-b020-f8c3a2298fc2.png" alt="TalkWeb Installation Guide - Install the TalkWeb Voice Assistant in 4 easy steps" className="mx-auto rounded-lg shadow-lg max-w-full h-auto" />
                </div>
              </CardContent>
            </Card>

            <h3 className="text-2xl font-bold mb-4">Platform-Specific Guides</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {platforms.map(platform => <Card key={platform.name} className="relative hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{platform.name}</CardTitle>
                      <Badge className={getDifficultyColor(platform.difficulty)}>
                        {platform.difficulty}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {platform.time}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{platform.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm">Installation Steps:</h5>
                      <ol className="space-y-1 text-xs">
                        {platform.steps.map((step, index) => <li key={index} className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-4 h-4 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </span>
                            <span className="text-muted-foreground">{step}</span>
                          </li>)}
                      </ol>
                    </div>
                  </CardContent>
                </Card>)}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Additional Platform Support</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Need help with a platform not listed? We also support:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div className="p-2 bg-muted/50 rounded text-center">Ecwid</div>
                  <div className="p-2 bg-muted/50 rounded text-center">Instapage</div>
                  <div className="p-2 bg-muted/50 rounded text-center">Unbounce</div>
                  <div className="p-2 bg-muted/50 rounded text-center">Custom HTML</div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Link to="/contact">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Request Platform Guide
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('mailto:support@talkweb.io?subject=Free Installation Request&body=Hi, I would like to request free installation assistance for TalkWeb on my website.', '_blank')}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Free Installation Service
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    Mobile App Builders
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    For mobile app builders and hybrid platforms:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li>• Flutter WebView integration</li>
                    <li>• React Native WebView</li>
                    <li>• Ionic framework support</li>
                    <li>• PWA implementation</li>
                  </ul>
                  <Link to="/help-center">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download Mobile Guide
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Localization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Available language versions:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">English</Badge>
                    <Badge variant="outline">Arabic</Badge>
                    <Badge variant="outline">French</Badge>
                    <Badge variant="outline">Spanish</Badge>
                    <Badge variant="outline">German</Badge>
                  </div>
                  <Link to="/help-center">
                    <Button variant="outline" size="sm">
                      <Globe className="w-4 h-4 mr-2" />
                      Request Language Pack
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="w-5 h-5" />
                    Custom Integration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Advanced customization options:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li>• API-first integration</li>
                    <li>• Custom styling and branding</li>
                    <li>• White-label solutions</li>
                    <li>• Enterprise SSO integration</li>
                  </ul>
                  <Link to="/help-center">
                    <Button variant="outline" size="sm">
                      <Code className="w-4 h-4 mr-2" />
                      Developer Documentation
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Export Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Get this guide in different formats:
                  </p>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => {
                        window.print();
                        toast({
                          title: "Print Dialog Opened",
                          description: "Save as PDF from the print dialog"
                        });
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF Version
                    </Button>
                    <Link to="/help-center" className="block">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Webflow-styled HTML
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => {
                        const markdownContent = `# TalkWeb Installation Guide\n\n${sampleScript}\n\nFor full documentation, visit: ${window.location.href}`;
                        navigator.clipboard.writeText(markdownContent);
                        toast({
                          title: "Copied!",
                          description: "Installation guide copied in Markdown format"
                        });
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Markdown
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Additional Help Section Image */}
        <Card className="mt-8 mb-6">
          
        </Card>

        {/* Support Section */}
        <Card className="mt-8 bg-gradient-to-r from-green-500/5 to-blue-500/5 border-green-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Need Additional Help?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <ExternalLink className="w-6 h-6 text-green-500" />
                </div>
                <h4 className="font-semibold mb-2">Contact Support</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Get help from our technical team
                </p>
                <Link to="/contact">
                  <Button variant="outline" size="sm">
                    Contact Us
                  </Button>
                </Link>
              </div>
              
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <User className="w-6 h-6 text-blue-500" />
                </div>
                <h4 className="font-semibold mb-2">Free Installation</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Let us install it for you
                </p>
                <Button variant="outline" size="sm" onClick={() => window.open('mailto:support@talkweb.io?subject=Free Installation Request&body=Hi, I would like to request free installation assistance for TalkWeb on my website.', '_blank')}>
                  Request Service
                </Button>
              </div>
              
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-6 h-6 text-purple-500" />
                </div>
                <h4 className="font-semibold mb-2">Documentation</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Explore our developer docs
                </p>
                <Link to="/help-center">
                  <Button variant="outline" size="sm">
                    View Docs
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
};
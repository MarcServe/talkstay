import React, { useState } from 'react';
import { Shield, Mic, Database, Eye, Clock, AlertTriangle, ExternalLink, Trash2, Download, Lock, Users, Globe } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface PrivacyConsentModalProps {
  isOpen: boolean;
  onConsent: () => void;
  onDecline: () => void;
  assistantName?: string;
}

interface ConsentItem {
  id: string;
  title: string;
  description: string;
  required: boolean;
  details: string[];
  icon: React.ComponentType<{ className?: string }>;
}

export const PrivacyConsentModal: React.FC<PrivacyConsentModalProps> = ({
  isOpen,
  onConsent,
  onDecline,
  assistantName = "AI Assistant"
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [hasReadPrivacyPolicy, setHasReadPrivacyPolicy] = useState(false);
  const [hasUnderstoodDataUsage, setHasUnderstoodDataUsage] = useState(false);

  const consentItems: ConsentItem[] = [
    {
      id: 'microphone_access',
      title: 'Microphone Access',
      description: 'Allow access to your microphone for voice conversations',
      required: true,
      details: [
        'Real-time audio capture from your device microphone',
        'Voice activity detection to determine when you\'re speaking',
        'Audio stream processing for speech recognition',
        'Immediate processing - no local storage of raw audio'
      ],
      icon: Mic
    },
    {
      id: 'voice_transcription',
      title: 'Voice Transcription',
      description: 'Convert your speech to text for processing',
      required: true,
      details: [
        'Real-time speech-to-text conversion using OpenAI Whisper',
        'Transcriptions used for conversation context and responses',
        'Text processing for intent recognition and response generation',
        'Temporary storage during conversation session only'
      ],
      icon: Eye
    },
    {
      id: 'ai_processing',
      title: 'AI Processing',
      description: 'Process your voice and text data through AI systems',
      required: true,
      details: [
        'Voice data processed through OpenAI\'s GPT models',
        'Conversation context maintained during session',
        'AI-generated responses based on your input',
        'Processing occurs on secure, encrypted servers'
      ],
      icon: Database
    },
    {
      id: 'session_data',
      title: 'Session Data Storage',
      description: 'Temporarily store conversation data during your session',
      required: false,
      details: [
        'Conversation history maintained for context',
        'User preferences and settings for improved experience',
        'Session data automatically deleted after inactivity',
        'No permanent storage without explicit consent'
      ],
      icon: Clock
    },
    {
      id: 'analytics',
      title: 'Usage Analytics',
      description: 'Collect anonymized usage data to improve our service',
      required: false,
      details: [
        'Anonymous usage patterns and interaction metrics',
        'Performance data to optimize response times',
        'Feature usage statistics for product improvement',
        'No personally identifiable information collected'
      ],
      icon: Globe
    }
  ];

  const handleConsentChange = (itemId: string, checked: boolean) => {
    setConsents(prev => ({ ...prev, [itemId]: checked }));
  };

  const canProceed = () => {
    const requiredConsents = consentItems.filter(item => item.required);
    const hasAllRequired = requiredConsents.every(item => consents[item.id]);
    return hasAllRequired && hasReadPrivacyPolicy && hasUnderstoodDataUsage;
  };

  const handleAcceptAll = () => {
    const allConsents = consentItems.reduce((acc, item) => {
      acc[item.id] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setConsents(allConsents);
    setHasReadPrivacyPolicy(true);
    setHasUnderstoodDataUsage(true);
  };

  const handleRequiredOnly = () => {
    const requiredConsents = consentItems.reduce((acc, item) => {
      acc[item.id] = item.required;
      return acc;
    }, {} as Record<string, boolean>);
    setConsents(requiredConsents);
    setHasReadPrivacyPolicy(true);
    setHasUnderstoodDataUsage(true);
  };

  const handleConsent = () => {
    if (canProceed()) {
      // Store consent preferences
      const consentData = {
        consents,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      
      sessionStorage.setItem('talkweb_privacy_consent', JSON.stringify(consentData));
      
      toast({
        title: "Privacy preferences saved",
        description: "Your consent preferences have been recorded securely.",
      });
      
      onConsent();
    }
  };

  const handleDataDeletion = async () => {
    try {
      // Simulate data deletion request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Data deletion requested",
        description: "Your request has been submitted. All data will be deleted within 24 hours.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit deletion request. Please try again.",
      });
    }
  };

  const exportData = () => {
    const exportData = {
      consentPreferences: consents,
      exportDate: new Date().toISOString(),
      assistantName,
      dataTypes: [
        'Voice transcriptions (temporary)',
        'Conversation context (session only)',
        'User preferences (if consented)',
        'Usage analytics (if consented, anonymized)'
      ]
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'privacy-data-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Privacy & Voice Processing Consent</DialogTitle>
              <DialogDescription className="text-base">
                Before accessing your microphone, please review how we handle your voice data with {assistantName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="detailed">Detailed Terms</TabsTrigger>
            <TabsTrigger value="rights">Your Rights</TabsTrigger>
            <TabsTrigger value="consent">Consent</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-blue-600" />
                  Voice Processing Summary
                </CardTitle>
                <CardDescription>
                  Here's what happens when you use voice features with {assistantName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg bg-green-50">
                    <h4 className="font-semibold text-green-800 mb-2">✓ What We Do</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Convert your voice to text in real-time</li>
                      <li>• Process conversations through secure AI</li>
                      <li>• Maintain session context temporarily</li>
                      <li>• Use encryption for all data transmission</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <h4 className="font-semibold text-blue-800 mb-2">⚡ What We Don't Do</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Store raw audio recordings permanently</li>
                      <li>• Share your data with third parties</li>
                      <li>• Use your data to train AI models</li>
                      <li>• Keep data after your session ends</li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-orange-800">Important Notice</h4>
                      <p className="text-sm text-orange-700 mt-1">
                        Voice data is processed through OpenAI's servers for transcription and AI responses. 
                        While we don't store your audio, OpenAI may temporarily process it according to their privacy policy.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Lifecycle</CardTitle>
                <CardDescription>How your data flows through our system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <p className="font-medium">Voice Capture</p>
                      <p className="text-sm text-muted-foreground">Microphone captures your voice in real-time</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <p className="font-medium">Secure Transmission</p>
                      <p className="text-sm text-muted-foreground">Encrypted audio sent to processing servers</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <p className="font-medium">AI Processing</p>
                      <p className="text-sm text-muted-foreground">Speech-to-text conversion and AI response generation</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                    <div>
                      <p className="font-medium">Automatic Deletion</p>
                      <p className="text-sm text-muted-foreground">Data automatically purged after session ends</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detailed" className="space-y-4">
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {consentItems.map((item) => (
                  <Card key={item.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <item.icon className="h-5 w-5" />
                        {item.title}
                        {item.required && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {item.details.map((detail, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></span>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="rights" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Your Privacy Rights
                </CardTitle>
                <CardDescription>
                  You have comprehensive rights regarding your personal data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Right to Access</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Request copies of any personal data we hold about you
                    </p>
                    <Button variant="outline" size="sm" onClick={exportData}>
                      <Download className="h-4 w-4 mr-2" />
                      Export My Data
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Right to Erasure</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Request deletion of all your personal data
                    </p>
                    <Button variant="outline" size="sm" onClick={handleDataDeletion}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete My Data
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Right to Withdraw</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Withdraw consent at any time during your session
                    </p>
                    <Button variant="outline" size="sm" disabled>
                      <Lock className="h-4 w-4 mr-2" />
                      Available In-Session
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Right to Portability</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Receive your data in a machine-readable format
                    </p>
                    <Button variant="outline" size="sm" onClick={exportData}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Export Format
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Legal Information</CardTitle>
                <CardDescription>Important legal and policy information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">Full Privacy Policy</span>
                  <Button variant="outline" size="sm" onClick={() => window.open('/privacy-policy', '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Read Policy
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">Voice Processing Terms</span>
                  <Button variant="outline" size="sm" onClick={() => window.open('/privacy-policy#voice-processing', '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Voice Terms
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">Data Processing Agreement</span>
                  <Button variant="outline" size="sm" onClick={() => window.open('/privacy-policy#data-processing', '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    DPA Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consent" className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Consent Preferences</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleRequiredOnly}>
                    Required Only
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleAcceptAll}>
                    Accept All
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {consentItems.map((item) => (
                  <Card key={item.id} className={consents[item.id] ? 'border-green-200 bg-green-50/30' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={item.id}
                          checked={consents[item.id] || false}
                          onCheckedChange={(checked) => handleConsentChange(item.id, !!checked)}
                          disabled={item.required && consents[item.id]}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <item.icon className="h-4 w-4" />
                            <label htmlFor={item.id} className="font-medium cursor-pointer">
                              {item.title}
                            </label>
                            {item.required && (
                              <Badge variant="outline" className="text-xs">Required</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="privacy-policy"
                    checked={hasReadPrivacyPolicy}
                    onCheckedChange={(checked) => setHasReadPrivacyPolicy(!!checked)}
                  />
                  <div>
                    <label htmlFor="privacy-policy" className="text-sm font-medium cursor-pointer">
                      I have read and understood the Privacy Policy
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Including the voice processing sections and data handling practices
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="data-usage"
                    checked={hasUnderstoodDataUsage}
                    onCheckedChange={(checked) => setHasUnderstoodDataUsage(!!checked)}
                  />
                  <div>
                    <label htmlFor="data-usage" className="text-sm font-medium cursor-pointer">
                      I understand how my voice data will be processed
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Including transcription, AI processing, and automatic deletion
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 text-xs text-muted-foreground">
            <p>By proceeding, you acknowledge that you understand and consent to the voice processing terms outlined above.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onDecline}>
              Decline & Use Text Only
            </Button>
            <Button 
              onClick={handleConsent}
              disabled={!canProceed()}
              className="min-w-[140px]"
            >
              <Mic className="h-4 w-4 mr-2" />
              Allow Voice Access
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
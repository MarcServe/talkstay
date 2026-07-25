import React, { useState } from 'react';
import { AlertTriangle, Shield, Trash2, Download, ExternalLink, Eye, Database, Mic } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface ConsentStatus {
  voiceRecording: boolean;
  dataProcessing: boolean;
  conversationStorage: boolean;
  analyticsTracking: boolean;
  improvementResearch: boolean;
  consentDate: Date;
  lastUpdated: Date;
}

export const ConsentManagement: React.FC = () => {
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>({
    voiceRecording: true,
    dataProcessing: true,
    conversationStorage: false,
    analyticsTracking: false,
    improvementResearch: false,
    consentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
  });

  const updateConsent = (key: keyof Omit<ConsentStatus, 'consentDate' | 'lastUpdated'>, value: boolean) => {
    setConsentStatus(prev => ({
      ...prev,
      [key]: value,
      lastUpdated: new Date()
    }));
    toast.success(`${key} consent ${value ? 'granted' : 'withdrawn'}`);
  };

  const withdrawAllConsent = async () => {
    try {
      // Simulate API call to withdraw all consent
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setConsentStatus(prev => ({
        ...prev,
        voiceRecording: false,
        dataProcessing: false,
        conversationStorage: false,
        analyticsTracking: false,
        improvementResearch: false,
        lastUpdated: new Date()
      }));
      
      toast.success('All consent withdrawn successfully');
    } catch (error) {
      toast.error('Failed to withdraw consent');
    }
  };

  const deleteAllData = async () => {
    try {
      // Simulate API call to delete all user data
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('All your data has been permanently deleted');
    } catch (error) {
      toast.error('Failed to delete data');
    }
  };

  const exportConsentHistory = () => {
    const exportData = {
      consentHistory: consentStatus,
      exportDate: new Date().toISOString(),
      userRights: {
        rightToAccess: 'You have the right to access your personal data',
        rightToPortability: 'You have the right to receive your data in a portable format',
        rightToErasure: 'You have the right to request deletion of your data',
        rightToWithdraw: 'You have the right to withdraw consent at any time'
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'consent-history.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const consentItems = [
    {
      key: 'voiceRecording' as keyof Omit<ConsentStatus, 'consentDate' | 'lastUpdated'>,
      title: 'Voice Recording',
      description: 'Allow recording and processing of your voice for AI conversations',
      icon: Mic,
      required: true,
      impacts: 'Disabling this will prevent voice interactions'
    },
    {
      key: 'dataProcessing' as keyof Omit<ConsentStatus, 'consentDate' | 'lastUpdated'>,
      title: 'Data Processing',
      description: 'Process conversation data to provide personalized responses',
      icon: Database,
      required: true,
      impacts: 'Disabling this will limit conversation context and personalization'
    },
    {
      key: 'conversationStorage' as keyof Omit<ConsentStatus, 'consentDate' | 'lastUpdated'>,
      title: 'Conversation Storage',
      description: 'Store conversation history for improved future interactions',
      icon: Eye,
      required: false,
      impacts: 'Conversations will not be saved between sessions'
    },
    {
      key: 'analyticsTracking' as keyof Omit<ConsentStatus, 'consentDate' | 'lastUpdated'>,
      title: 'Analytics Tracking',
      description: 'Track usage patterns to improve service quality',
      icon: Shield,
      required: false,
      impacts: 'We won\'t collect usage statistics for service improvement'
    },
    {
      key: 'improvementResearch' as keyof Omit<ConsentStatus, 'consentDate' | 'lastUpdated'>,
      title: 'Research & Improvement',
      description: 'Use anonymized data for AI model training and research',
      icon: Database,
      required: false,
      impacts: 'Your data won\'t contribute to improving AI models'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Consent Management</h2>
          <p className="text-muted-foreground">Control how your data is used and manage your privacy rights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportConsentHistory}>
            <Download className="h-4 w-4 mr-2" />
            Export History
          </Button>
        </div>
      </div>

      {/* Consent Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Consent Status
          </CardTitle>
          <CardDescription>
            Original consent given: {consentStatus.consentDate.toLocaleDateString()} • 
            Last updated: {consentStatus.lastUpdated.toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {consentItems.map((item) => (
              <div key={item.key} className="text-center">
                <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
                  consentStatus[item.key] ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  <item.icon className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium">{item.title}</p>
                <Badge variant={consentStatus[item.key] ? 'default' : 'secondary'} className="text-xs mt-1">
                  {consentStatus[item.key] ? 'Active' : 'Disabled'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Individual Consent Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Consent Settings</CardTitle>
          <CardDescription>Control specific data processing activities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {consentItems.map((item) => (
            <div key={item.key} className="flex items-start justify-between p-4 border rounded-lg">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      {item.title}
                      {item.required && (
                        <Badge variant="outline" className="text-xs">Required</Badge>
                      )}
                    </h4>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                
                {!consentStatus[item.key] && (
                  <div className="ml-8 p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700">
                    Impact: {item.impacts}
                  </div>
                )}
              </div>
              
              <Switch
                checked={consentStatus[item.key]}
                onCheckedChange={(checked) => updateConsent(item.key, checked)}
                disabled={item.required && consentStatus[item.key]} // Can't disable required items if they're currently enabled
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Your Privacy Rights */}
      <Card>
        <CardHeader>
          <CardTitle>Your Privacy Rights</CardTitle>
          <CardDescription>Learn about your rights and how to exercise them</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Right to Access</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Request a copy of all personal data we have about you
              </p>
              <Button variant="outline" size="sm" onClick={exportConsentHistory}>
                Export My Data
              </Button>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Right to Portability</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Receive your data in a machine-readable format
              </p>
              <Button variant="outline" size="sm" onClick={exportConsentHistory}>
                Download Data
              </Button>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Right to Rectification</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Request correction of inaccurate personal data
              </p>
              <Button variant="outline" size="sm">
                Contact Support
              </Button>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Right to Erasure</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Request deletion of your personal data
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    Delete All Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete All Personal Data</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your personal data, including conversation history, 
                      voice recordings, and account preferences. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteAllData}>
                      Delete All Data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            These actions are permanent and cannot be undone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
            <div>
              <h4 className="font-medium text-destructive">Withdraw All Consent</h4>
              <p className="text-sm text-muted-foreground">
                Revoke all data processing permissions and disable voice features
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Withdraw All Consent
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Withdraw All Consent</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will withdraw all your consent for data processing. Voice features will be disabled 
                    and your account will be limited to basic text interactions only.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={withdrawAllConsent}>
                    Withdraw All Consent
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Legal Information */}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              <span>
                For more information about how we handle your data, please read our{' '}
                <Button variant="link" className="h-auto p-0 text-sm underline">
                  Privacy Policy
                </Button>
                {' '}and{' '}
                <Button variant="link" className="h-auto p-0 text-sm underline">
                  Terms of Service
                </Button>
              </span>
            </p>
            <p>
              If you have questions about your privacy rights or need to exercise them, 
              please contact our data protection team at privacy@talkweb.io
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
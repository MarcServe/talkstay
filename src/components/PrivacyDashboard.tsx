import React, { useState, useEffect } from 'react';
import { Shield, Database, History, Settings, Eye, Trash2, Download, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VoiceDataUsage } from './privacy/VoiceDataUsage';
import { SessionHistory } from './privacy/SessionHistory';
import { ConsentManagement } from './privacy/ConsentManagement';
import { PrivacySettings } from './privacy/PrivacySettings';

interface PrivacyDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyDashboard: React.FC<PrivacyDashboardProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            Privacy Dashboard
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Usage
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Sessions
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Privacy Status Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    Privacy Status
                  </CardTitle>
                  <CardDescription>Your current privacy settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Voice consent</span>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Data retention</span>
                    <span className="text-sm font-medium">Session only</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Privacy mode</span>
                    <span className="text-sm font-medium text-green-600">Enabled</span>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                  <CardDescription>Manage your privacy settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setActiveTab('history')}
                  >
                    <History className="h-4 w-4 mr-2" />
                    View Session History
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setActiveTab('usage')}
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Check Data Usage
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={() => setActiveTab('settings')}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All Data
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Privacy Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Data Processing Overview</CardTitle>
                <CardDescription>How we handle your voice and conversation data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Voice Processing</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Real-time processing only. Audio is not permanently stored.
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Transcriptions</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Temporary text for context. Deleted after session ends.
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-purple-600" />
                      <span className="font-medium">Encryption</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      All data transmitted using end-to-end encryption.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage">
            <VoiceDataUsage />
          </TabsContent>

          <TabsContent value="history">
            <SessionHistory />
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <PrivacySettings />
              <ConsentManagement />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

// Trigger component for opening the privacy dashboard
export const PrivacyDashboardTrigger: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {children || (
          <Button variant="ghost" size="sm">
            <Shield className="h-4 w-4 mr-2" />
            Privacy Dashboard
          </Button>
        )}
      </div>
      <PrivacyDashboard isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
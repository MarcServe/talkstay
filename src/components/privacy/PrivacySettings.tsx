import React, { useState } from 'react';
import { Shield, Clock, Database, Eye, Lock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PrivacyConfig {
  // Data Retention
  dataRetention: 'none' | 'session' | 'limited' | 'extended';
  autoDeleteDays: number; // 1-365 days
  
  // Voice Privacy
  voiceDataEncryption: boolean;
  realTimeProcessingOnly: boolean;
  voiceActivityDetection: boolean;
  backgroundRecordingPrevention: boolean;
  
  // Session Privacy
  sessionTimeoutMinutes: number; // 1-60 minutes
  autoLogoutOnIdle: boolean;
  clearDataOnClose: boolean;
  
  // Tracking & Analytics
  usageAnalytics: boolean;
  performanceMetrics: boolean;
  errorReporting: boolean;
  featureUsageTracking: boolean;
  
  // Third-Party Integrations
  thirdPartyDataSharing: boolean;
  anonymizedResearch: boolean;
  serviceImprovements: boolean;
  
  // Advanced Privacy
  ipAddressLogging: boolean;
  browserFingerprintPrevention: boolean;
  crossSessionTracking: boolean;
  cookieConsent: 'necessary' | 'functional' | 'all';
}

export const PrivacySettings: React.FC = () => {
  const [config, setConfig] = useState<PrivacyConfig>({
    // Privacy-first defaults
    dataRetention: 'session',
    autoDeleteDays: 7,
    
    voiceDataEncryption: true,
    realTimeProcessingOnly: true,
    voiceActivityDetection: true,
    backgroundRecordingPrevention: true,
    
    sessionTimeoutMinutes: 15,
    autoLogoutOnIdle: true,
    clearDataOnClose: true,
    
    usageAnalytics: false,
    performanceMetrics: true,
    errorReporting: true,
    featureUsageTracking: false,
    
    thirdPartyDataSharing: false,
    anonymizedResearch: false,
    serviceImprovements: false,
    
    ipAddressLogging: false,
    browserFingerprintPrevention: true,
    crossSessionTracking: false,
    cookieConsent: 'necessary'
  });

  const updateConfig = (updates: Partial<PrivacyConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    
    // Show feedback for critical privacy changes
    if (updates.dataRetention || updates.thirdPartyDataSharing !== undefined) {
      toast.success('Privacy settings updated');
    }
  };

  const resetToPrivacyFirst = () => {
    const privacyFirstConfig: PrivacyConfig = {
      dataRetention: 'none',
      autoDeleteDays: 1,
      
      voiceDataEncryption: true,
      realTimeProcessingOnly: true,
      voiceActivityDetection: true,
      backgroundRecordingPrevention: true,
      
      sessionTimeoutMinutes: 10,
      autoLogoutOnIdle: true,
      clearDataOnClose: true,
      
      usageAnalytics: false,
      performanceMetrics: false,
      errorReporting: false,
      featureUsageTracking: false,
      
      thirdPartyDataSharing: false,
      anonymizedResearch: false,
      serviceImprovements: false,
      
      ipAddressLogging: false,
      browserFingerprintPrevention: true,
      crossSessionTracking: false,
      cookieConsent: 'necessary'
    };
    
    setConfig(privacyFirstConfig);
    toast.success('Applied maximum privacy settings');
  };

  const getDataRetentionDescription = (value: string) => {
    switch (value) {
      case 'none': return 'No data stored after session ends';
      case 'session': return 'Data cleared when browser closes';
      case 'limited': return 'Data deleted automatically after set period';
      case 'extended': return 'Data retained for service improvement';
      default: return '';
    }
  };

  const getCookieDescription = (value: string) => {
    switch (value) {
      case 'necessary': return 'Only essential cookies for basic functionality';
      case 'functional': return 'Includes cookies for enhanced features';
      case 'all': return 'All cookies including analytics and marketing';
      default: return '';
    }
  };

  const getPrivacyScore = () => {
    let score = 0;
    const maxScore = 15;
    
    // Data retention (0-3 points)
    switch (config.dataRetention) {
      case 'none': score += 3; break;
      case 'session': score += 2; break;
      case 'limited': score += 1; break;
      case 'extended': score += 0; break;
    }
    
    // Voice privacy (0-4 points)
    if (config.voiceDataEncryption) score += 1;
    if (config.realTimeProcessingOnly) score += 1;
    if (config.voiceActivityDetection) score += 1;
    if (config.backgroundRecordingPrevention) score += 1;
    
    // Session privacy (0-3 points)
    if (config.sessionTimeoutMinutes <= 15) score += 1;
    if (config.autoLogoutOnIdle) score += 1;
    if (config.clearDataOnClose) score += 1;
    
    // Tracking (0-2 points)
    if (!config.usageAnalytics) score += 1;
    if (!config.featureUsageTracking) score += 1;
    
    // Third party (0-3 points)
    if (!config.thirdPartyDataSharing) score += 1;
    if (!config.anonymizedResearch) score += 1;
    if (!config.serviceImprovements) score += 1;
    
    return Math.round((score / maxScore) * 100);
  };

  const privacyScore = getPrivacyScore();
  const scoreColor = privacyScore >= 80 ? 'text-green-600' : privacyScore >= 60 ? 'text-yellow-600' : 'text-red-600';
  const scoreBg = privacyScore >= 80 ? 'bg-green-50 border-green-200' : privacyScore >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

  return (
    <div className="space-y-6">
      {/* Privacy Score */}
      <Card className={`${scoreBg}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className={`h-6 w-6 ${scoreColor}`} />
              <div>
                <h3 className="font-semibold">Privacy Score</h3>
                <p className="text-sm text-muted-foreground">
                  Based on your current privacy settings
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${scoreColor}`}>
                {privacyScore}%
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetToPrivacyFirst}
                className="mt-2"
              >
                Max Privacy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Retention
          </CardTitle>
          <CardDescription>Control how long your data is stored</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Data retention policy</Label>
            <Select
              value={config.dataRetention}
              onValueChange={(value: 'none' | 'session' | 'limited' | 'extended') => 
                updateConfig({ dataRetention: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700">Maximum Privacy</Badge>
                    <span>No Storage</span>
                  </div>
                </SelectItem>
                <SelectItem value="session">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">Recommended</Badge>
                    <span>Session Only</span>
                  </div>
                </SelectItem>
                <SelectItem value="limited">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Limited Time</Badge>
                    <span>Auto-Delete</span>
                  </div>
                </SelectItem>
                <SelectItem value="extended">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-gray-50 text-gray-700">Extended</Badge>
                    <span>Long-term</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {getDataRetentionDescription(config.dataRetention)}
            </p>
          </div>

          {config.dataRetention === 'limited' && (
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              <Label>Auto-delete after (days)</Label>
              <Slider
                value={[config.autoDeleteDays]}
                onValueChange={([value]) => updateConfig({ autoDeleteDays: value })}
                max={365}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 day</span>
                <span>{config.autoDeleteDays} days</span>
                <span>1 year</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Voice Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Voice Privacy
          </CardTitle>
          <CardDescription>Advanced voice data protection settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Voice data encryption</Label>
                <p className="text-sm text-muted-foreground">End-to-end encryption for voice data</p>
              </div>
              <Switch
                checked={config.voiceDataEncryption}
                onCheckedChange={(checked) => updateConfig({ voiceDataEncryption: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Real-time processing only</Label>
                <p className="text-sm text-muted-foreground">No voice data storage or caching</p>
              </div>
              <Switch
                checked={config.realTimeProcessingOnly}
                onCheckedChange={(checked) => updateConfig({ realTimeProcessingOnly: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Voice activity detection</Label>
                <p className="text-sm text-muted-foreground">Only record when speaking detected</p>
              </div>
              <Switch
                checked={config.voiceActivityDetection}
                onCheckedChange={(checked) => updateConfig({ voiceActivityDetection: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Background recording prevention</Label>
                <p className="text-sm text-muted-foreground">Block recording in background tabs</p>
              </div>
              <Switch
                checked={config.backgroundRecordingPrevention}
                onCheckedChange={(checked) => updateConfig({ backgroundRecordingPrevention: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Privacy
          </CardTitle>
          <CardDescription>Control session behavior and data cleanup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Session timeout (minutes)</Label>
            <Slider
              value={[config.sessionTimeoutMinutes]}
              onValueChange={([value]) => updateConfig({ sessionTimeoutMinutes: value })}
              max={60}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 min</span>
              <span>{config.sessionTimeoutMinutes} minutes</span>
              <span>60 min</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Auto-logout on idle</Label>
                <p className="text-sm text-muted-foreground">Automatically end session when inactive</p>
              </div>
              <Switch
                checked={config.autoLogoutOnIdle}
                onCheckedChange={(checked) => updateConfig({ autoLogoutOnIdle: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Clear data on close</Label>
                <p className="text-sm text-muted-foreground">Delete all data when browser closes</p>
              </div>
              <Switch
                checked={config.clearDataOnClose}
                onCheckedChange={(checked) => updateConfig({ clearDataOnClose: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tracking & Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Tracking & Analytics
          </CardTitle>
          <CardDescription>Control what usage data is collected</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Usage analytics</Label>
                <p className="text-sm text-muted-foreground">Track how you use the service</p>
              </div>
              <Switch
                checked={config.usageAnalytics}
                onCheckedChange={(checked) => updateConfig({ usageAnalytics: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Performance metrics</Label>
                <p className="text-sm text-muted-foreground">Monitor app performance and errors</p>
              </div>
              <Switch
                checked={config.performanceMetrics}
                onCheckedChange={(checked) => updateConfig({ performanceMetrics: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Error reporting</Label>
                <p className="text-sm text-muted-foreground">Send crash reports and error logs</p>
              </div>
              <Switch
                checked={config.errorReporting}
                onCheckedChange={(checked) => updateConfig({ errorReporting: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Feature usage tracking</Label>
                <p className="text-sm text-muted-foreground">Track which features you use</p>
              </div>
              <Switch
                checked={config.featureUsageTracking}
                onCheckedChange={(checked) => updateConfig({ featureUsageTracking: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Third-Party & Research */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Third-Party & Research
          </CardTitle>
          <CardDescription>Control data sharing and research participation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Third-party data sharing</Label>
                <p className="text-sm text-muted-foreground">Share data with partner services</p>
              </div>
              <Switch
                checked={config.thirdPartyDataSharing}
                onCheckedChange={(checked) => updateConfig({ thirdPartyDataSharing: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Anonymized research</Label>
                <p className="text-sm text-muted-foreground">Contribute anonymized data to research</p>
              </div>
              <Switch
                checked={config.anonymizedResearch}
                onCheckedChange={(checked) => updateConfig({ anonymizedResearch: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Service improvements</Label>
                <p className="text-sm text-muted-foreground">Use data to improve AI models</p>
              </div>
              <Switch
                checked={config.serviceImprovements}
                onCheckedChange={(checked) => updateConfig({ serviceImprovements: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Privacy</CardTitle>
          <CardDescription>Additional privacy and security controls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>IP address logging</Label>
                <p className="text-sm text-muted-foreground">Log IP addresses for security</p>
              </div>
              <Switch
                checked={config.ipAddressLogging}
                onCheckedChange={(checked) => updateConfig({ ipAddressLogging: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Fingerprint prevention</Label>
                <p className="text-sm text-muted-foreground">Block browser fingerprinting</p>
              </div>
              <Switch
                checked={config.browserFingerprintPrevention}
                onCheckedChange={(checked) => updateConfig({ browserFingerprintPrevention: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Cross-session tracking</Label>
                <p className="text-sm text-muted-foreground">Link sessions across devices</p>
              </div>
              <Switch
                checked={config.crossSessionTracking}
                onCheckedChange={(checked) => updateConfig({ crossSessionTracking: checked })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cookie consent level</Label>
            <Select
              value={config.cookieConsent}
              onValueChange={(value: 'necessary' | 'functional' | 'all') => 
                updateConfig({ cookieConsent: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="necessary">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700">Minimal</Badge>
                    <span>Necessary Only</span>
                  </div>
                </SelectItem>
                <SelectItem value="functional">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">Standard</Badge>
                    <span>Functional</span>
                  </div>
                </SelectItem>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-orange-50 text-orange-700">All</Badge>
                    <span>All Cookies</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {getCookieDescription(config.cookieConsent)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
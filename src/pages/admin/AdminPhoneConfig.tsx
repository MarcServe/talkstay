import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Settings, Save, Database, Zap, Shield } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';

interface PhoneConfig {
  cacheEnabled: boolean;
  cacheDuration: number;
  analyticsEnabled: boolean;
  performanceTrackingEnabled: boolean;
  maxPhoneCacheSize: number;
  defaultCountryCode: string;
  enableInternationalFormatting: boolean;
  voiceReadoutEnabled: boolean;
  emergencyBypassEnabled: boolean;
}

export default function AdminPhoneConfig() {
  const [config, setConfig] = useState<PhoneConfig>({
    cacheEnabled: true,
    cacheDuration: 5,
    analyticsEnabled: true,
    performanceTrackingEnabled: true,
    maxPhoneCacheSize: 100,
    defaultCountryCode: '+1',
    enableInternationalFormatting: true,
    voiceReadoutEnabled: true,
    emergencyBypassEnabled: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      // In a real implementation, this would load from a config table
      // For now, we'll use localStorage as a demo
      const saved = localStorage.getItem('phone_config');
      if (saved) {
        setConfig(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to localStorage (in production, save to Supabase config table)
      localStorage.setItem('phone_config', JSON.stringify(config));

      toast({
        title: 'Success',
        description: 'Phone configuration saved successfully'
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Phone Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Global settings for phone call features
          </p>
        </div>

        {/* Cache Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              <CardTitle>Cache Settings</CardTitle>
            </div>
            <CardDescription>
              Configure phone number caching for performance optimization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="cache-enabled">Enable Phone Number Cache</Label>
                <p className="text-sm text-muted-foreground">
                  Cache phone numbers to reduce API calls
                </p>
              </div>
              <Switch
                id="cache-enabled"
                checked={config.cacheEnabled}
                onCheckedChange={(checked) =>
                  setConfig(prev => ({ ...prev, cacheEnabled: checked }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cache-duration">Cache Duration (minutes)</Label>
              <Input
                id="cache-duration"
                type="number"
                value={config.cacheDuration}
                onChange={(e) =>
                  setConfig(prev => ({ ...prev, cacheDuration: parseInt(e.target.value) }))
                }
                min="1"
                max="60"
              />
              <p className="text-xs text-muted-foreground">
                How long to keep phone numbers in cache (1-60 minutes)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-cache-size">Maximum Cache Size</Label>
              <Input
                id="max-cache-size"
                type="number"
                value={config.maxPhoneCacheSize}
                onChange={(e) =>
                  setConfig(prev => ({ ...prev, maxPhoneCacheSize: parseInt(e.target.value) }))
                }
                min="10"
                max="1000"
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of phone numbers to cache
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <CardTitle>Analytics & Performance</CardTitle>
            </div>
            <CardDescription>
              Configure tracking and performance monitoring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="analytics-enabled">Enable Phone Analytics</Label>
                <p className="text-sm text-muted-foreground">
                  Track phone number interactions and user behavior
                </p>
              </div>
              <Switch
                id="analytics-enabled"
                checked={config.analyticsEnabled}
                onCheckedChange={(checked) =>
                  setConfig(prev => ({ ...prev, analyticsEnabled: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="performance-tracking">Performance Tracking</Label>
                <p className="text-sm text-muted-foreground">
                  Monitor performance metrics and load times
                </p>
              </div>
              <Switch
                id="performance-tracking"
                checked={config.performanceTrackingEnabled}
                onCheckedChange={(checked) =>
                  setConfig(prev => ({ ...prev, performanceTrackingEnabled: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Formatting Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              <CardTitle>Phone Formatting</CardTitle>
            </div>
            <CardDescription>
              Configure how phone numbers are displayed and formatted
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default-country">Default Country Code</Label>
              <Input
                id="default-country"
                value={config.defaultCountryCode}
                onChange={(e) =>
                  setConfig(prev => ({ ...prev, defaultCountryCode: e.target.value }))
                }
                placeholder="+1"
              />
              <p className="text-xs text-muted-foreground">
                Default country code for phone numbers without one
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="intl-formatting">International Formatting</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically format phone numbers with country codes
                </p>
              </div>
              <Switch
                id="intl-formatting"
                checked={config.enableInternationalFormatting}
                onCheckedChange={(checked) =>
                  setConfig(prev => ({ ...prev, enableInternationalFormatting: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="voice-readout">Voice Readout</Label>
                <p className="text-sm text-muted-foreground">
                  Enable voice reading of phone numbers
                </p>
              </div>
              <Switch
                id="voice-readout"
                checked={config.voiceReadoutEnabled}
                onCheckedChange={(checked) =>
                  setConfig(prev => ({ ...prev, voiceReadoutEnabled: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <CardTitle>Security & Privacy</CardTitle>
            </div>
            <CardDescription>
              Configure security and privacy settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="emergency-bypass">Emergency Bypass</Label>
                <p className="text-sm text-muted-foreground">
                  Allow emergency calls even when business is closed
                </p>
              </div>
              <Switch
                id="emergency-bypass"
                checked={config.emergencyBypassEnabled}
                onCheckedChange={(checked) =>
                  setConfig(prev => ({ ...prev, emergencyBypassEnabled: checked }))
                }
              />
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Privacy Notice</h4>
              <p className="text-sm text-muted-foreground">
                Phone numbers are masked in analytics (last 4 digits only). Full numbers are never stored in logs.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Phase 6</Badge>
            <span className="text-sm text-muted-foreground">
              Advanced phone configuration
            </span>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>
  );
}

import React, { useState } from 'react';
import { Settings, Volume2, Mic, Headphones, Zap, Shield, Clock, Timer, Database, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { audioFeedback } from '@/utils/audioFeedback';

export interface VoiceSettingsConfig {
  audioFeedbackEnabled: boolean;
  microphoneSensitivity: number;
  responseSpeed: 'slow' | 'normal' | 'fast';
  pushToTalkMode: boolean;
  autoReconnect: boolean;
  visualFeedback: boolean;
  
  // Enhanced Session Control
  idleTimeoutMinutes: number; // 1-10 minutes
  autoStopAfterSilence: boolean;
  silenceTimeoutSeconds: number; // 10-300 seconds
  privacyMode: boolean; // Privacy-first defaults
  explicitConsentRequired: boolean;
  dataPersistence: 'none' | 'session' | 'persistent';
  sessionAutoResume: boolean;
}

interface VoiceSettingsProps {
  config: VoiceSettingsConfig;
  onConfigChange: (config: VoiceSettingsConfig) => void;
  children?: React.ReactNode;
}

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  config,
  onConfigChange,
  children
}) => {
  const [testingAudio, setTestingAudio] = useState(false);

  const updateConfig = (updates: Partial<VoiceSettingsConfig>) => {
    const newConfig = { ...config, ...updates };
    onConfigChange(newConfig);
    
    // Apply audio feedback setting immediately
    if (updates.audioFeedbackEnabled !== undefined) {
      audioFeedback.setEnabled(updates.audioFeedbackEnabled);
    }
  };

  const testAudioFeedback = async () => {
    setTestingAudio(true);
    audioFeedback.playTestSound();
    setTimeout(() => setTestingAudio(false), 1000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Voice Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Audio Feedback */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  <Label>Audio Feedback</Label>
                </div>
                <Switch
                  checked={config.audioFeedbackEnabled}
                  onCheckedChange={(checked) => updateConfig({ audioFeedbackEnabled: checked })}
                />
              </div>
              
              {config.audioFeedbackEnabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testAudioFeedback}
                  disabled={testingAudio}
                  className="w-full"
                >
                  <Headphones className="h-4 w-4 mr-2" />
                  {testingAudio ? 'Testing...' : 'Test Audio'}
                </Button>
              )}
            </div>
          </Card>

          {/* Microphone Settings */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                <Label>Microphone Sensitivity</Label>
              </div>
              
              <div className="space-y-2">
                <Slider
                  value={[config.microphoneSensitivity]}
                  onValueChange={([value]) => updateConfig({ microphoneSensitivity: value })}
                  max={100}
                  min={0}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low</span>
                  <span>{config.microphoneSensitivity}%</span>
                  <span>High</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Push-to-Talk Mode</Label>
                <Switch
                  checked={config.pushToTalkMode}
                  onCheckedChange={(checked) => updateConfig({ pushToTalkMode: checked })}
                />
              </div>
            </div>
          </Card>

          {/* Response Settings */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <Label>Response Speed</Label>
              </div>
              
              <Select
                value={config.responseSpeed}
                onValueChange={(value: 'slow' | 'normal' | 'fast') => 
                  updateConfig({ responseSpeed: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slow">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Slow</Badge>
                      <span className="text-xs text-muted-foreground">More deliberate</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="normal">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Normal</Badge>
                      <span className="text-xs text-muted-foreground">Balanced</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="fast">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Fast</Badge>
                      <span className="text-xs text-muted-foreground">Quick responses</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Advanced Settings */}
          <Card className="p-4">
            <div className="space-y-4">
              <Label className="text-sm font-medium">Advanced</Label>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Auto-reconnect</Label>
                  <Switch
                    checked={config.autoReconnect}
                    onCheckedChange={(checked) => updateConfig({ autoReconnect: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Visual feedback</Label>
                  <Switch
                    checked={config.visualFeedback}
                    onCheckedChange={(checked) => updateConfig({ visualFeedback: checked })}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Session Control */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <Label>Session Control</Label>
              </div>
              
              <div className="space-y-4">
                {/* Idle Timeout */}
                <div className="space-y-2">
                  <Label className="text-sm">Idle Timeout (minutes)</Label>
                  <Slider
                    value={[config.idleTimeoutMinutes]}
                    onValueChange={([value]) => updateConfig({ idleTimeoutMinutes: value })}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 min</span>
                    <span>{config.idleTimeoutMinutes} minutes</span>
                    <span>10 min</span>
                  </div>
                </div>

                {/* Auto-stop after silence */}
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Auto-stop after silence</Label>
                  <Switch
                    checked={config.autoStopAfterSilence}
                    onCheckedChange={(checked) => updateConfig({ autoStopAfterSilence: checked })}
                  />
                </div>

                {config.autoStopAfterSilence && (
                  <div className="space-y-2 pl-4 border-l-2 border-muted">
                    <Label className="text-sm">Silence timeout (seconds)</Label>
                    <Slider
                      value={[config.silenceTimeoutSeconds]}
                      onValueChange={([value]) => updateConfig({ silenceTimeoutSeconds: value })}
                      max={300}
                      min={10}
                      step={10}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>10s</span>
                      <span>{config.silenceTimeoutSeconds}s</span>
                      <span>5min</span>
                    </div>
                  </div>
                )}

                {/* Session auto-resume */}
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Auto-resume session</Label>
                  <Switch
                    checked={config.sessionAutoResume}
                    onCheckedChange={(checked) => updateConfig({ sessionAutoResume: checked })}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Privacy Settings */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <Label>Privacy & Data</Label>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Privacy mode</Label>
                  <Switch
                    checked={config.privacyMode}
                    onCheckedChange={(checked) => updateConfig({ 
                      privacyMode: checked,
                      // Apply privacy-first defaults when enabling privacy mode
                      ...(checked && {
                        idleTimeoutMinutes: Math.min(config.idleTimeoutMinutes, 3),
                        autoStopAfterSilence: true,
                        silenceTimeoutSeconds: Math.min(config.silenceTimeoutSeconds, 60),
                        explicitConsentRequired: true,
                        dataPersistence: 'none' as const
                      })
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">Explicit consent required</Label>
                  <Switch
                    checked={config.explicitConsentRequired}
                    onCheckedChange={(checked) => updateConfig({ explicitConsentRequired: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Data persistence</Label>
                  <Select
                    value={config.dataPersistence}
                    onValueChange={(value: 'none' | 'session' | 'persistent') => 
                      updateConfig({ dataPersistence: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-50 text-green-700">None</Badge>
                          <span className="text-xs text-muted-foreground">No data stored</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="session">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Session</Badge>
                          <span className="text-xs text-muted-foreground">Until browser closes</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="persistent">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">Persistent</Badge>
                          <span className="text-xs text-muted-foreground">Saved locally</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {config.privacyMode && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center gap-2 text-sm text-green-800">
                      <Eye className="h-4 w-4" />
                      <span className="font-medium">Privacy Mode Active</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Enhanced privacy settings applied: shorter timeouts, no data persistence, explicit consent required.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Advanced Settings */}
          <Card className="p-4">
            <div className="space-y-4">
              <Label className="text-sm font-medium">Advanced</Label>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Auto-reconnect</Label>
                  <Switch
                    checked={config.autoReconnect}
                    onCheckedChange={(checked) => updateConfig({ autoReconnect: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Visual feedback</Label>
                  <Switch
                    checked={config.visualFeedback}
                    onCheckedChange={(checked) => updateConfig({ visualFeedback: checked })}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Default configuration with privacy-first defaults
export const defaultVoiceSettings: VoiceSettingsConfig = {
  audioFeedbackEnabled: true,
  microphoneSensitivity: 70,
  responseSpeed: 'normal',
  pushToTalkMode: false,
  autoReconnect: true,
  visualFeedback: true,
  
  // Enhanced privacy-first session defaults
  idleTimeoutMinutes: 2, // Reduced from 3 to 2 minutes for better privacy
  autoStopAfterSilence: true,
  silenceTimeoutSeconds: 30, // Reduced from 60 to 30 seconds for better privacy
  privacyMode: true, // Enable privacy mode by default
  explicitConsentRequired: true,
  dataPersistence: 'none', // No data persistence by default
  sessionAutoResume: false, // Require explicit action to resume - never auto-resume
};
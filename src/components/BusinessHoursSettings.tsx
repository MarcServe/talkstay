import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Clock, Save, MapPin } from 'lucide-react';

interface BusinessHours {
  enabled: boolean;
  timezone: string;
  hours: {
    [key: string]: {
      enabled: boolean;
      open: string;
      close: string;
    };
  };
}

interface BusinessHoursSettingsProps {
  assistantId: string;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS: { [key: string]: string } = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday'
};

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney'
];

const generateTimeOptions = () => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      options.push(`${hour}:${minute}`);
    }
  }
  return options;
};

export const BusinessHoursSettings = ({ assistantId }: BusinessHoursSettingsProps) => {
  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    enabled: false,
    timezone: 'UTC',
    hours: DAYS.reduce((acc, day) => ({
      ...acc,
      [day]: { enabled: true, open: '09:00', close: '17:00' }
    }), {})
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBusinessHours();
  }, [assistantId]);

  const detectTimezone = () => {
    try {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('Detected timezone:', detectedTimezone);
      return detectedTimezone;
    } catch (error) {
      console.error('Failed to detect timezone:', error);
      return 'UTC';
    }
  };

  const handleAutoDetectTimezone = () => {
    const detectedTimezone = detectTimezone();
    setBusinessHours(prev => ({ ...prev, timezone: detectedTimezone }));
    toast({
      title: 'Timezone Detected',
      description: `Automatically set to ${detectedTimezone}`,
    });
  };

  const loadBusinessHours = async () => {
    try {
      const { data, error } = await supabase
        .from('assistants')
        .select('business_hours')
        .eq('id', assistantId)
        .single();

      if (error) throw error;

      if (data?.business_hours) {
        const loadedHours = data.business_hours as BusinessHours;
        setBusinessHours(loadedHours);
        
        // Auto-detect timezone if still set to default UTC
        if (loadedHours.timezone === 'UTC') {
          const detectedTimezone = detectTimezone();
          if (detectedTimezone !== 'UTC') {
            setBusinessHours(prev => ({ ...prev, timezone: detectedTimezone }));
            toast({
              title: 'Timezone Auto-Detected',
              description: `Set to your local timezone: ${detectedTimezone}`,
            });
          }
        }
      } else {
        // No business hours set yet, auto-detect timezone for new setup
        const detectedTimezone = detectTimezone();
        setBusinessHours(prev => ({ ...prev, timezone: detectedTimezone }));
      }
    } catch (error) {
      console.error('Error loading business hours:', error);
      toast({
        title: 'Error',
        description: 'Failed to load business hours settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('assistants')
        .update({ business_hours: businessHours })
        .eq('id', assistantId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Business hours updated successfully'
      });
    } catch (error) {
      console.error('Error saving business hours:', error);
      toast({
        title: 'Error',
        description: 'Failed to save business hours',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateDayHours = (day: string, field: 'enabled' | 'open' | 'close', value: boolean | string) => {
    setBusinessHours(prev => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: {
          ...prev.hours[day],
          [field]: value
        }
      }
    }));
  };

  const timeOptions = generateTimeOptions();

  if (loading) {
    return <div>Loading business hours...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          <CardTitle>Business Hours</CardTitle>
        </div>
        <CardDescription>
          Configure your business hours. Calls outside these hours will redirect to WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Business Hours */}
        <div className="flex items-center justify-between">
          <Label htmlFor="business-hours-enabled">Enable Business Hours</Label>
          <Switch
            id="business-hours-enabled"
            checked={businessHours.enabled}
            onCheckedChange={(checked) => 
              setBusinessHours(prev => ({ ...prev, enabled: checked }))
            }
          />
        </div>

        {/* Timezone Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="timezone">Timezone</Label>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleAutoDetectTimezone}
              className="h-8"
            >
              <MapPin className="w-3 h-3 mr-1" />
              Auto-Detect
            </Button>
          </div>
          <Select
            value={businessHours.timezone}
            onValueChange={(value) => 
              setBusinessHours(prev => ({ ...prev, timezone: value }))
            }
          >
            <SelectTrigger id="timezone">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map(tz => (
                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Current timezone: {businessHours.timezone}
          </p>
        </div>

        {/* Day-by-Day Configuration */}
        <div className="space-y-4">
          <h3 className="font-medium">Weekly Schedule</h3>
          {DAYS.map(day => (
            <div key={day} className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="flex-1 flex items-center gap-4">
                <Switch
                  checked={businessHours.hours[day]?.enabled || false}
                  onCheckedChange={(checked) => updateDayHours(day, 'enabled', checked)}
                />
                <Label className="w-24">{DAY_LABELS[day]}</Label>
                
                {businessHours.hours[day]?.enabled && (
                  <div className="flex items-center gap-2">
                    <Select
                      value={businessHours.hours[day]?.open || '09:00'}
                      onValueChange={(value) => updateDayHours(day, 'open', value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map(time => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span>to</span>
                    <Select
                      value={businessHours.hours[day]?.close || '17:00'}
                      onValueChange={(value) => updateDayHours(day, 'close', value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map(time => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Business Hours'}
        </Button>
      </CardContent>
    </Card>
  );
};

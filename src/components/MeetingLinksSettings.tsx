import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Video, Loader2, CheckCircle2, Trash2 } from 'lucide-react';

interface MeetingLinksSettingsProps {
  assistantId: string;
}

interface MeetingLinks {
  google_meet?: string;
  zoom?: string;
  microsoft_teams?: string;
  custom?: string;
  default_platform?: 'google_meet' | 'zoom' | 'microsoft_teams' | 'custom';
}

type PlatformKey = 'google_meet' | 'zoom' | 'microsoft_teams' | 'custom';

const platformOptions = [
  { value: 'google_meet', label: 'Google Meet', placeholder: 'https://meet.google.com/xxx-xxxx-xxx' },
  { value: 'zoom', label: 'Zoom', placeholder: 'https://zoom.us/j/1234567890...' },
  { value: 'microsoft_teams', label: 'Microsoft Teams', placeholder: 'https://teams.microsoft.com/l/meetup-join/...' },
  { value: 'custom', label: 'Custom Meeting Link', placeholder: 'https://your-custom-meeting-platform.com' },
];

export const MeetingLinksSettings: React.FC<MeetingLinksSettingsProps> = ({ assistantId }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformKey>('google_meet');
  const [currentLink, setCurrentLink] = useState('');
  const [links, setLinks] = useState<MeetingLinks>({
    default_platform: 'google_meet'
  });

  useEffect(() => {
    loadMeetingLinks();
  }, [assistantId]);

  useEffect(() => {
    // Update current link when platform changes
    setCurrentLink(links[selectedPlatform] || '');
  }, [selectedPlatform, links]);

  const loadMeetingLinks = async () => {
    if (!assistantId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assistants')
        .select('meeting_links')
        .eq('id', assistantId)
        .single();

      if (error) throw error;

      if (data?.meeting_links) {
        setLinks({
          google_meet: data.meeting_links.google_meet || '',
          zoom: data.meeting_links.zoom || '',
          microsoft_teams: data.meeting_links.microsoft_teams || '',
          custom: data.meeting_links.custom || '',
          default_platform: data.meeting_links.default_platform || 'google_meet'
        });
      }
    } catch (error: any) {
      console.error('Error loading meeting links:', error);
      toast({
        title: 'Error',
        description: 'Failed to load meeting links',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLink = async () => {
    if (!assistantId) return;
    if (!currentLink.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a meeting link',
        variant: 'destructive'
      });
      return;
    }

    const updatedLinks = {
      ...links,
      [selectedPlatform]: currentLink.trim()
    };

    setSaving(true);
    try {
      const { error } = await supabase
        .from('assistants')
        .update({ meeting_links: updatedLinks })
        .eq('id', assistantId);

      if (error) throw error;

      setLinks(updatedLinks);
      toast({
        title: 'Success',
        description: `${platformOptions.find(p => p.value === selectedPlatform)?.label} link saved successfully`,
      });
    } catch (error: any) {
      console.error('Error saving meeting link:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save meeting link',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLink = async () => {
    if (!assistantId) return;

    const updatedLinks = { ...links };
    delete updatedLinks[selectedPlatform];

    setSaving(true);
    try {
      const { error } = await supabase
        .from('assistants')
        .update({ meeting_links: updatedLinks })
        .eq('id', assistantId);

      if (error) throw error;

      setLinks(updatedLinks);
      setCurrentLink('');
      toast({
        title: 'Success',
        description: `${platformOptions.find(p => p.value === selectedPlatform)?.label} link removed`,
      });
    } catch (error: any) {
      console.error('Error deleting meeting link:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove meeting link',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDefaultPlatform = async (platform: PlatformKey) => {
    if (!assistantId) return;
    
    // Check if the selected platform has a link configured
    if (!links[platform]) {
      toast({
        title: 'Error',
        description: 'Please configure a meeting link for this platform first',
        variant: 'destructive'
      });
      return;
    }

    const updatedLinks = {
      ...links,
      default_platform: platform
    };

    setSaving(true);
    try {
      const { error } = await supabase
        .from('assistants')
        .update({ meeting_links: updatedLinks })
        .eq('id', assistantId);

      if (error) throw error;

      setLinks(updatedLinks);
      toast({
        title: 'Success',
        description: 'Default platform updated',
      });
    } catch (error: any) {
      console.error('Error updating default platform:', error);
      toast({
        title: 'Error',
        description: 'Failed to update default platform',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const getConfiguredPlatforms = () => {
    return platformOptions.filter(p => links[p.value as PlatformKey]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPlatformData = platformOptions.find(p => p.value === selectedPlatform);

  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <Video className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">Video Meeting Links</p>
            <p className="text-blue-700 dark:text-blue-300">
              Configure your video meeting platform links. When a booking is confirmed, 
              the selected default platform link will be automatically included in the confirmation.
            </p>
          </div>
        </div>
      </div>

      {/* Platform Selector */}
      <div className="space-y-2">
        <Label htmlFor="platform-select">Select Video Platform</Label>
        <Select value={selectedPlatform} onValueChange={(value) => setSelectedPlatform(value as PlatformKey)}>
          <SelectTrigger id="platform-select" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {platformOptions.map((platform) => (
              <SelectItem key={platform.value} value={platform.value}>
                <div className="flex items-center gap-2">
                  {platform.label}
                  {links[platform.value as PlatformKey] && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Link Input */}
      <div className="space-y-2">
        <Label htmlFor="meeting-link">
          {currentPlatformData?.label} Link
          {links[selectedPlatform] && (
            <Badge variant="default" className="ml-2">Configured</Badge>
          )}
        </Label>
        <div className="flex gap-2">
          <Input
            id="meeting-link"
            type="url"
            placeholder={currentPlatformData?.placeholder}
            value={currentLink}
            onChange={(e) => setCurrentLink(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={handleSaveLink}
            disabled={saving || !currentLink.trim()}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Save'
            )}
          </Button>
          {links[selectedPlatform] && (
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDeleteLink}
              disabled={saving}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Configured Platforms List */}
      {getConfiguredPlatforms().length > 0 && (
        <div className="space-y-2">
          <Label>Configured Platforms</Label>
          <div className="space-y-2">
            {getConfiguredPlatforms().map((platform) => (
              <div
                key={platform.value}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="font-medium">{platform.label}</span>
                  {links.default_platform === platform.value && (
                    <Badge variant="default">Default</Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPlatform(platform.value as PlatformKey)}
                >
                  Edit
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Default Platform Selector */}
      {getConfiguredPlatforms().length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="default-platform">Default Video Platform</Label>
          <p className="text-sm text-muted-foreground mb-2">
            This video meeting link will be automatically included in booking confirmations
          </p>
          <Select 
            value={links.default_platform} 
            onValueChange={(value) => handleUpdateDefaultPlatform(value as PlatformKey)}
          >
            <SelectTrigger id="default-platform">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {getConfiguredPlatforms().map((platform) => (
                <SelectItem key={platform.value} value={platform.value}>
                  {platform.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
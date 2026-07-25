import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, User, Building2 } from 'lucide-react';

interface ProfileData {
  first_name: string;
  last_name: string;
  company_name: string;
  phone: string;
  business_type: string;
  business_description: string;
  website_url: string;
}

export const ProfileForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    first_name: '',
    last_name: '',
    company_name: '',
    phone: '',
    business_type: '',
    business_description: '',
    website_url: ''
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfileData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          company_name: data.company_name || '',
          phone: data.phone || '',
          business_type: data.business_type || '',
          business_description: data.business_description || '',
          website_url: data.website_url || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Validate required fields
      if (!profileData.first_name || !profileData.last_name || !profileData.company_name) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields (first name, last name, business name)",
          variant: "destructive"
        });
        setSaving(false);
        return;
      }

      // Validate phone number format if provided
      if (profileData.phone) {
        const phoneDigits = profileData.phone.replace(/\D/g, '');
        if (phoneDigits.length < 10) {
          toast({
            title: "Validation Error",
            description: "Please enter a valid phone number with at least 10 digits",
            variant: "destructive"
          });
          setSaving(false);
          return;
        }
      }

      // Check if profile exists first
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let error;
      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            ...profileData,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
        error = updateError;
      } else {
        // Insert new profile
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            email: user.email || '',
            ...profileData
          });
        error = insertError;
      }

      if (error) {
        console.error('Error saving profile:', error);
        toast({
          title: "Profile Save Error",
          description: `Database error: ${error.message}. Please try again or contact support.`,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Profile Saved Successfully",
        description: "Your profile information has been updated"
      });

      // Refresh profile data
      await fetchProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please check your connection and try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const normalizeUrl = (url: string): string => {
    if (!url) return url;
    
    // Remove any whitespace
    url = url.trim();
    
    // If it doesn't start with http:// or https://, add https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Remove trailing slash
    url = url.replace(/\/$/, '');
    
    return url;
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    // Normalize URL if it's the website_url field
    const normalizedValue = field === 'website_url' ? normalizeUrl(value) : value;
    
    setProfileData(prev => ({
      ...prev,
      [field]: normalizedValue
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-glass border-glass backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={profileData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                placeholder="Enter your first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={profileData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                placeholder="Enter your last name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-glass border-glass backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Business Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">Business Name *</Label>
            <Input
              id="company_name"
              value={profileData.company_name}
              onChange={(e) => handleInputChange('company_name', e.target.value)}
              placeholder="Enter your business name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="business_type">Business Type</Label>
            <Select
              value={profileData.business_type}
              onValueChange={(value) => handleInputChange('business_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your business type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="restaurant">Restaurant</SelectItem>
                <SelectItem value="healthcare">Healthcare</SelectItem>
                <SelectItem value="professional_services">Professional Services</SelectItem>
                <SelectItem value="real_estate">Real Estate</SelectItem>
                <SelectItem value="education">Education</SelectItem>
                <SelectItem value="technology">Technology</SelectItem>
                <SelectItem value="automotive">Automotive</SelectItem>
                <SelectItem value="fitness">Fitness & Wellness</SelectItem>
                <SelectItem value="hospitality">Hospitality</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website_url">Website URL</Label>
            <Input
              id="website_url"
              type="url"
              value={profileData.website_url}
              onChange={(e) => handleInputChange('website_url', e.target.value)}
              placeholder="https://yourwebsite.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="business_description">Business Description</Label>
            <Textarea
              id="business_description"
              value={profileData.business_description}
              onChange={(e) => handleInputChange('business_description', e.target.value)}
              placeholder="Describe your business and what services you offer..."
              rows={4}
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label htmlFor="phone">Business Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={profileData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+44 7471 245972 or +1 (555) 123-4567"
            />
            <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
              <p className="text-sm text-foreground/90">
                📞 <strong>Call Feature:</strong> This phone number is used when customers say 
                <em className="mx-1 text-primary">"I want to call"</em> or 
                <em className="mx-1 text-primary">"call now"</em> to your AI assistant.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Use international format with country code (e.g., +44 for UK, +1 for US/Canada)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="min-w-32">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Profile
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
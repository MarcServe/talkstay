import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Building2, User, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OnboardingData {
  firstName: string;
  lastName: string;
  companyName: string;
  businessType: string;
  websiteUrl: string;
  businessDescription: string;
  phone: string;
}

interface OnboardingWizardProps {
  plan: string;
  userEmail: string;
  userId: string;
  initialData?: Partial<OnboardingData>;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ plan, userEmail, userId, initialData }) => {
  const navigate = useNavigate();
  const [data, setData] = useState<OnboardingData>({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    companyName: initialData?.companyName || '',
    businessType: initialData?.businessType || '',
    websiteUrl: initialData?.websiteUrl || '',
    businessDescription: initialData?.businessDescription || '',
    phone: initialData?.phone || '',
  });

  // Auto-advance past completed steps when prefilled
  const initialStep = (() => {
    const step1Done = !!(initialData?.firstName && initialData?.lastName);
    const step2Done = !!(initialData?.companyName && initialData?.businessType);
    if (step1Done && step2Done) return 3;
    if (step1Done) return 2;
    return 1;
  })();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [loading, setLoading] = useState(false);

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;


  // Debug: Log userId on mount and attempt recovery if missing
  useEffect(() => {
    console.log('🔍 OnboardingWizard mounted with:', {
      userId,
      userEmail,
      plan,
      hasUserId: !!userId
    });

    const checkAndRecoverAuth = async () => {
      if (!userId) {
        console.warn('⚠️ WARNING: OnboardingWizard received empty or undefined userId');
        console.log('🔄 Attempting to recover userId from current auth session...');
        
        try {
          const { data: { user }, error } = await supabase.auth.getUser();
          
          if (error) {
            console.error('❌ Error fetching authenticated user:', error);
            toast.error('Authentication error. Please log in and try again.');
            navigate('/auth');
            return;
          }
          
          if (user) {
            console.log('✅ Authenticated user found, userId recovered:', user.id);
            toast.info('Authentication recovered. Please complete your setup.');
            // Note: We can't update parent state directly, but we can use this userId in handleComplete
            // Store it temporarily in a ref or state if needed
          } else {
            console.error('❌ No authenticated user found');
            toast.error('Please log in to complete setup');
            setTimeout(() => {
              navigate('/auth');
            }, 2000);
          }
        } catch (err) {
          console.error('❌ Unexpected error during auth recovery:', err);
          toast.error('Authentication check failed. Please log in again.');
          setTimeout(() => {
            navigate('/auth');
          }, 2000);
        }
      }
    };

    checkAndRecoverAuth();
  }, [userId, userEmail, plan, navigate]);

  const normalizeUrl = (url: string): string => {
    if (!url) return url;
    url = url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    return url.replace(/\/$/, '');
  };

  const handleInputChange = (field: keyof OnboardingData, value: string) => {
    const normalizedValue = field === 'websiteUrl' ? normalizeUrl(value) : value;
    setData(prev => ({ ...prev, [field]: normalizedValue }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(data.firstName && data.lastName);
      case 2:
        return !!(data.companyName && data.businessType);
      case 3:
        return true; // Optional step
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    } else {
      toast.error('Please fill in all required fields');
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleComplete = async () => {
    // Validation: Check if userId exists, attempt recovery if not
    let effectiveUserId = userId;
    
    if (!effectiveUserId) {
      console.warn('❌ No user ID in props, attempting final recovery...');
      
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          console.error('❌ Failed to recover user ID:', error);
          toast.error('Authentication error. Please log in and try again.');
          setTimeout(() => {
            navigate('/auth');
          }, 2000);
          return;
        }
        
        effectiveUserId = user.id;
        console.log('✅ User ID recovered in handleComplete:', effectiveUserId);
      } catch (err) {
        console.error('❌ Error recovering user ID:', err);
        toast.error('Authentication error. Please refresh the page and try again.');
        return;
      }
    }

    console.log('📤 Starting onboarding completion with data:', {
      effectiveUserId,
      userEmail,
      formData: data,
      timestamp: new Date().toISOString()
    });

    setLoading(true);
    try {
      // Save profile data
      const profileData = {
        user_id: effectiveUserId,
        email: userEmail,
        first_name: data.firstName,
        last_name: data.lastName,
        company_name: data.companyName,
        business_type: data.businessType,
        website_url: data.websiteUrl,
        business_description: data.businessDescription,
        phone: data.phone,
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      };

      console.log('💾 Attempting to save profile:', profileData);

      // First, check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Error checking for existing profile:', checkError);
        throw checkError;
      }

      console.log('🔍 Existing profile check:', { 
        existingProfile, 
        effectiveUserId,
        exists: !!existingProfile 
      });

      let result;
      if (existingProfile) {
        // Profile exists, UPDATE it
        console.log('📝 Updating existing profile for user:', effectiveUserId);
        result = await supabase
          .from('profiles')
          .update({
            first_name: data.firstName,
            last_name: data.lastName,
            company_name: data.companyName,
            business_type: data.businessType,
            website_url: data.websiteUrl,
            business_description: data.businessDescription,
            phone: data.phone,
            onboarding_completed: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', effectiveUserId)
          .select();
      } else {
        // Profile doesn't exist, INSERT it
        console.log('➕ Creating new profile for user:', effectiveUserId);
        result = await supabase
          .from('profiles')
          .insert(profileData)
          .select();
      }

      const { error, data: savedData } = result;

      if (error) {
        console.error('❌ Supabase error saving profile:', {
          error,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          profileData
        });
        
        // Show specific error message based on error type
        if (error.code === 'PGRST301') {
          toast.error('Permission denied. Please contact support.');
        } else if (error.message.includes('row-level security')) {
          toast.error('Security policy error. Please refresh and try again.');
        } else {
          toast.error(`Failed to save profile: ${error.message}`);
        }
        return;
      }

      console.log('✅ Profile saved successfully:', savedData);
      toast.success('Welcome to TalkWeb! Your account is ready.');
      navigate('/dashboard');
    } catch (error) {
      console.error('❌ Unexpected error completing onboarding:', {
        error,
        errorType: typeof error,
        errorString: String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      toast.error('Unexpected error. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <User className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Personal Information</h2>
              <p className="text-muted-foreground">Let's start with your basic information</p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={data.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={data.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={data.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter your phone number"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Building2 className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Business Information</h2>
              <p className="text-muted-foreground">Tell us about your business</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="companyName">Business Name *</Label>
                <Input
                  id="companyName"
                  value={data.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder="Enter your business name"
                />
              </div>

              <div>
                <Label htmlFor="businessType">Business Type *</Label>
                <Select
                  value={data.businessType}
                  onValueChange={(value) => handleInputChange('businessType', value)}
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

              <div>
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input
                  id="websiteUrl"
                  type="url"
                  value={data.websiteUrl}
                  onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Almost Done!</h2>
              <p className="text-muted-foreground">Add a business description to help us customize your experience</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="businessDescription">Business Description</Label>
                <Textarea
                  id="businessDescription"
                  value={data.businessDescription}
                  onChange={(e) => handleInputChange('businessDescription', e.target.value)}
                  placeholder="Describe your business and what services you offer..."
                  rows={4}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-lg">Welcome to TalkWeb {plan}</CardTitle>
          <Progress value={progress} className="mt-2" />
          <p className="text-sm text-muted-foreground">Step {currentStep} of {totalSteps}</p>
        </CardHeader>
        
        <CardContent>
          {renderStep()}
          
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            {currentStep < totalSteps ? (
              <Button onClick={handleNext} disabled={!validateStep(currentStep)}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={loading}>
                {loading ? 'Setting up...' : 'Complete Setup'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
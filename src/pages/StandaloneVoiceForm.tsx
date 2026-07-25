import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FormConversationInterface } from '@/components/FormConversationInterface';
import { FormDataCapturePanel } from '@/components/FormDataCapturePanel';
import { formMemory } from '@/utils/FormMemory';
import { SimplifiedFooter } from '@/components/SimplifiedFooter';
import bgVoiceForm from '@/assets/bg-voice-form.jpg';
import { applyVoiceFormTheme, isValidVoiceFormTheme } from '@/utils/voiceFormTheme';

interface VoiceForm {
  id: string;
  form_name: string;
  form_slug: string;
  description: string | null;
  conversation_objective: string | null;
  topics: any[];
  business_name: string | null;
  business_logo_url: string | null;
  notification_email: string;
  theme?: 'light' | 'dark' | 'auto';
}

export const StandaloneVoiceForm: React.FC = () => {
  const { formSlug } = useParams<{ formSlug: string }>();
  const navigate = useNavigate();
  const [formConfig, setFormConfig] = useState<VoiceForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => `form_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  console.log('🎯 StandaloneVoiceForm mounted with formSlug:', formSlug);

  useEffect(() => {
    loadFormConfig();
  }, [formSlug]);

  // Apply form-owner's chosen theme (light/dark/auto). Restores on unmount.
  useEffect(() => {
    const t = formConfig?.theme;
    if (!isValidVoiceFormTheme(t)) return;
    return applyVoiceFormTheme(t);
  }, [formConfig?.theme]);

  const loadFormConfig = async () => {
    try {
      console.log('📄 Loading form config for slug:', formSlug);
      setLoading(true);
      
      // Get form data with optional assistant data
      const { data: formData, error: formError } = await supabase
        .from('voice_forms')
        .select('*')
        .eq('form_slug', formSlug)
        .eq('is_active', true)
        .maybeSingle();
      
      console.log('📊 Form data loaded:', formData ? 'success' : 'not found', formError);

      if (formError) throw formError;

      if (!formData) {
        setError('Form not found');
        return;
      }

      // Get assistant data if form is linked to an assistant
      let businessName = formData.business_name;
      let businessLogo = null;
      
      if (formData.assistant_id) {
        const { data: assistantData } = await supabase
          .from('assistants')
          .select('business_name, logo_url')
          .eq('id', formData.assistant_id)
          .maybeSingle();

        if (assistantData) {
          businessName = assistantData.business_name || businessName;
          businessLogo = assistantData.logo_url;
        }
      }

      // Merge business branding into form config
      const formWithBusiness = {
        ...formData,
        business_name: businessName,
        business_logo_url: businessLogo
      };

      setFormConfig(formWithBusiness);
      console.log('✅ Form configured successfully:', formData.id);
      
      // Initialize form memory
      formMemory.initializeForm(formData.id, sessionId);
      console.log('✅ Form memory initialized');
    } catch (error: any) {
      console.error('Error loading form:', error);
      setError(error.message || 'Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <Card className="p-8">
          <p className="text-muted-foreground">Loading form...</p>
        </Card>
      </div>
    );
  }

  if (error || !formConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold mb-2">Form Not Found</h2>
          <p className="text-muted-foreground mb-4">
            {error || 'The form you are looking for does not exist or is no longer active.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="text-primary hover:underline"
          >
            Go to homepage
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background image */}
      <div
        className="absolute inset-0 z-0 opacity-[0.12] pointer-events-none"
        style={{
          backgroundImage: `url('/images/talkweb-widget-bg.webp')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      {/* Content wrapper */}
      <div className="relative z-10">
        {/* Header with glassmorphism */}
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-4">
              {formConfig.business_logo_url && (
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg" />
                  <img
                    src={formConfig.business_logo_url}
                    alt={formConfig.business_name || 'Logo'}
                    className="relative h-14 w-14 object-contain rounded-xl bg-background/50 p-1"
                  />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{formConfig.form_name}</h1>
                  <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20">
                    <Globe className="h-3 w-3" />
                    Speak any language
                  </Badge>
                </div>
                {formConfig.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {formConfig.description}
                  </p>
                )}
                {formConfig.business_name && (
                  <p className="text-xs text-muted-foreground/80 mt-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary/60" />
                    by {formConfig.business_name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Two Panel Layout */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-[2fr,1fr] gap-6">
            {/* Left: Conversational AI Interface */}
            <Card className="h-[calc(100vh-200px)] flex flex-col bg-background/40 backdrop-blur-sm border-border/50 shadow-xl shadow-primary/5 relative overflow-hidden">
              {/* Background image inside card */}
              <div
                className="absolute inset-0 z-0 opacity-[0.15] pointer-events-none"
                style={{
                  backgroundImage: `url('/images/talkweb-widget-bg.webp')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              <div className="relative z-10 flex flex-col h-full">
              <FormConversationInterface
                formConfig={formConfig}
                sessionId={sessionId}
              />
              </div>
            </Card>

            {/* Right: Real-time Data Capture Panel */}
            <Card className="h-[calc(100vh-200px)] overflow-y-auto bg-background/70 backdrop-blur-sm border-border/50 shadow-xl shadow-cyan-500/5">
              <FormDataCapturePanel
                formConfig={formConfig}
                sessionId={sessionId}
              />
            </Card>
          </div>
        </div>
        
        {/* Custom branded footer */}
        <SimplifiedFooter logoUrl={formConfig.business_logo_url} businessName={formConfig.business_name} />
      </div>
    </div>
  );
};

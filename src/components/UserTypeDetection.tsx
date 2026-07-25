import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, Code2, HelpCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UserTypeDetectionProps {
  onTypeSelected?: (type: 'technical' | 'non-technical') => void;
}

export const UserTypeDetection = ({ onTypeSelected }: UserTypeDetectionProps) => {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<'technical' | 'non-technical' | null>(null);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));

  useEffect(() => {
    // Track page view
    trackAnalytics('page_view', null);
  }, []);

  const trackAnalytics = async (eventType: string, userType: 'technical' | 'non-technical' | null) => {
    try {
      const existingData = await supabase
        .from('user_analytics')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (existingData.data) {
        // Update existing record
        const currentInteractionData = (existingData.data.interaction_data as Record<string, any>) || {};
        await supabase
          .from('user_analytics')
          .update({
            user_type: userType,
            page_views: (existingData.data.page_views || 0) + (eventType === 'page_view' ? 1 : 0),
            interaction_data: {
              ...currentInteractionData,
              [eventType]: new Date().toISOString()
            }
          })
          .eq('id', existingData.data.id);
      } else {
        // Create new record
        await supabase
          .from('user_analytics')
          .insert({
            user_id: user?.id,
            session_id: sessionId,
            user_type: userType,
            page_views: eventType === 'page_view' ? 1 : 0,
            interaction_data: {
              [eventType]: new Date().toISOString()
            }
          });
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  };

  const handleTypeSelection = async (type: 'technical' | 'non-technical') => {
    setSelectedType(type);
    await trackAnalytics('user_type_selected', type);
    onTypeSelected?.(type);
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 sm:py-8 px-4 sm:px-6">
      <div className="text-center mb-6 sm:mb-8">
        <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          <h2 className="text-xl sm:text-2xl font-bold">Let's Personalize Your Experience</h2>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground px-2">
          Help us provide you with the most relevant information and support
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        <Card 
          className={`p-4 sm:p-6 cursor-pointer transition-all duration-300 hover:shadow-lg border-2 ${
            selectedType === 'technical' 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
          }`}
          onClick={() => handleTypeSelection('technical')}
        >
          <div className="text-center space-y-3 sm:space-y-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Code2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">I'm Technical</h3>
              <p className="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4">
                Developer, IT professional, or technically savvy user
              </p>
              <ul className="text-left space-y-1 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li>• Advanced integration guides</li>
                <li>• API documentation</li>
                <li>• Custom implementation help</li>
                <li>• Technical troubleshooting</li>
              </ul>
            </div>
            <Button 
              variant={selectedType === 'technical' ? 'default' : 'outline'}
              className="w-full text-sm h-9 sm:h-10"
            >
              {selectedType === 'technical' ? 'Selected' : 'Select This Option'}
            </Button>
          </div>
        </Card>

        <Card 
          className={`p-4 sm:p-6 cursor-pointer transition-all duration-300 hover:shadow-lg border-2 ${
            selectedType === 'non-technical' 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
          }`}
          onClick={() => handleTypeSelection('non-technical')}
        >
          <div className="text-center space-y-3 sm:space-y-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto">
              <User className="w-6 h-6 sm:w-8 sm:h-8 text-secondary-foreground" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">I'm Non-Technical</h3>
              <p className="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4">
                Business owner, marketer, or prefer simple solutions
              </p>
              <ul className="text-left space-y-1 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li>• Step-by-step guides</li>
                <li>• Video tutorials</li>
                <li>• FREE installation support</li>
                <li>• Priority customer service</li>
              </ul>
            </div>
            <Button 
              variant={selectedType === 'non-technical' ? 'default' : 'outline'}
              className="w-full text-sm h-9 sm:h-10"
            >
              {selectedType === 'non-technical' ? 'Selected' : 'Select This Option'}
            </Button>
          </div>
        </Card>
      </div>

      {selectedType && (
        <div className="mt-6 sm:mt-8 text-center">
          <div className="bg-muted/50 rounded-lg p-4 sm:p-6">
            <HelpCircle className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto mb-2 sm:mb-3" />
            <h4 className="font-semibold mb-2 text-sm sm:text-base">
              {selectedType === 'technical' 
                ? 'Perfect! You\'ll see advanced options and documentation' 
                : 'Great! We\'ll provide simple guides and free installation help'
              }
            </h4>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {selectedType === 'technical'
                ? 'Access API docs, custom integrations, and technical resources'
                : 'Get step-by-step tutorials, video guides, and personal support'
              }
            </p>
            {selectedType === 'non-technical' && (
              <div className="mt-3 sm:mt-4 p-3 bg-primary/10 rounded-lg">
                <p className="text-xs sm:text-sm font-medium text-primary">
                  🎉 FREE Installation Support Available!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  We'll help you get TalkWeb set up on your website at no extra cost
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
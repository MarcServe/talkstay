import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Calendar, 
  Star, 
  CalendarCheck, 
  HelpCircle, 
  UserPlus,
  Sparkles,
  FileText,
  Lightbulb
} from 'lucide-react';
import { VoiceFormTemplate } from '@/types/voiceForm';
import { getAllTemplates } from '@/utils/voiceFormTemplates';

interface VoiceFormTemplateSelectorProps {
  onSelectTemplate: (template: VoiceFormTemplate) => void;
  onStartBlank: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  MessageSquare: <MessageSquare className="h-8 w-8" />,
  Calendar: <Calendar className="h-8 w-8" />,
  Star: <Star className="h-8 w-8" />,
  CalendarCheck: <CalendarCheck className="h-8 w-8" />,
  HelpCircle: <HelpCircle className="h-8 w-8" />,
  UserPlus: <UserPlus className="h-8 w-8" />,
  FileText: <FileText className="h-8 w-8" />
};

export const VoiceFormTemplateSelector: React.FC<VoiceFormTemplateSelectorProps> = ({
  onSelectTemplate,
  onStartBlank
}) => {
  const templates = getAllTemplates();

  return (
    <div className="container max-w-6xl mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Create a Voice Form</h1>
        <p className="text-muted-foreground">
          Start with a template or build from scratch
        </p>
      </div>

      <Alert className="border-primary/30 bg-primary/5">
        <Lightbulb className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          <strong>Tip:</strong> Keep your voice forms under 10 fields for the best completion rates. 
          Shorter forms feel more natural in conversation and lead to higher user engagement.
        </AlertDescription>
      </Alert>

      <Card className="border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer"
        onClick={onStartBlank}>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle>Start from Blank</CardTitle>
              <CardDescription>
                Build a custom voice form from scratch with full control
              </CardDescription>
            </div>
            <Button>Start Blank</Button>
          </div>
        </CardHeader>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-4">Or choose a template</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card 
              key={template.id}
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => onSelectTemplate(template)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {iconMap[template.icon]}
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {template.category}
                  </Badge>
                </div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  {template.name}
                </CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    {template.fields.length} fields
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTemplate(template);
                    }}
                  >
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

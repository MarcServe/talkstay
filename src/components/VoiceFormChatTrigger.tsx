import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ChevronRight } from 'lucide-react';
import { VoiceForm } from '@/types/voiceForm';

interface VoiceFormChatTriggerProps {
  forms: VoiceForm[];
  onSelectForm: (formId: string) => void;
}

export const VoiceFormChatTrigger: React.FC<VoiceFormChatTriggerProps> = ({
  forms,
  onSelectForm,
}) => {
  if (forms.length === 0) return null;

  return (
    <div className="space-y-3 p-4 border-t bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FileText className="h-4 w-4 text-primary" />
        <span>Available Forms</span>
      </div>
      <div className="space-y-2">
        {forms.map((form) => (
          <Card 
            key={form.id}
            className="hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => onSelectForm(form.id)}
          >
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-sm">{form.name}</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {form.description || `${form.fields.length} fields`}
                  </CardDescription>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
};

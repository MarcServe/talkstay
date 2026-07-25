import React, { useState } from 'react';
import { VoiceFormBuilder } from '@/components/VoiceFormBuilder';
import { VoiceFormManager } from '@/components/VoiceFormManager';
import { VoiceFormSubmissions } from '@/components/VoiceFormSubmissions';
import { VoiceFormTemplateSelector } from '@/components/VoiceFormTemplateSelector';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { VoiceFormTemplate } from '@/types/voiceForm';
import { createFormFromTemplate } from '@/utils/voiceFormTemplates';

const VoiceFormsPage = () => {
  const [view, setView] = useState<'list' | 'template-selector' | 'builder' | 'submissions'>('list');
  const [selectedFormId, setSelectedFormId] = useState<string | undefined>();
  const [selectedFormName, setSelectedFormName] = useState<string>('');
  const [templateData, setTemplateData] = useState<any>(null);
  
  // For demo purposes - replace with actual assistant ID from auth/context
  const assistantId = 'demo-assistant-id';

  const handleCreateNew = () => {
    setSelectedFormId(undefined);
    setTemplateData(null);
    setView('template-selector');
  };

  const handleSelectTemplate = (template: VoiceFormTemplate) => {
    const formData = createFormFromTemplate(template, assistantId);
    setTemplateData(formData);
    setSelectedFormId(undefined);
    setView('builder');
  };

  const handleStartBlank = () => {
    setTemplateData(null);
    setSelectedFormId(undefined);
    setView('builder');
  };

  const handleEdit = (formId: string) => {
    setSelectedFormId(formId);
    setView('builder');
  };

  const handleViewSubmissions = (formId: string, formName: string) => {
    setSelectedFormId(formId);
    setSelectedFormName(formName);
    setView('submissions');
  };

  const handleBack = () => {
    setView('list');
    setSelectedFormId(undefined);
  };

  return (
    <div className="min-h-screen bg-background">
      {view === 'list' ? (
        <div className="container mx-auto py-8">
          <VoiceFormManager
            assistantId={assistantId}
            onCreateNew={handleCreateNew}
            onEdit={handleEdit}
            onViewSubmissions={handleViewSubmissions}
          />
        </div>
      ) : view === 'template-selector' ? (
        <div>
          <div className="border-b bg-background px-6 py-4">
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Forms
            </Button>
          </div>
          <VoiceFormTemplateSelector
            onSelectTemplate={handleSelectTemplate}
            onStartBlank={handleStartBlank}
          />
        </div>
      ) : view === 'builder' ? (
        <div className="h-screen flex flex-col">
          <div className="border-b bg-background px-6 py-4">
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Forms
            </Button>
          </div>
          <div className="flex-1">
            <VoiceFormBuilder
              assistantId={assistantId}
              formId={selectedFormId}
              templateData={templateData}
              onSave={handleBack}
              onCancel={handleBack}
            />
          </div>
        </div>
      ) : (
        <div className="container mx-auto py-8">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Forms
          </Button>
          {selectedFormId && (
            <VoiceFormSubmissions
              formId={selectedFormId}
              formName={selectedFormName}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default VoiceFormsPage;

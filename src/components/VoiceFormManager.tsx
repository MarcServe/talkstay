import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, Copy, BarChart3, Code } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VoiceFormEmbedCode } from './VoiceFormEmbedCode';

interface VoiceForm {
  id: string;
  name: string;
  description: string;
  fields: any[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface VoiceFormManagerProps {
  assistantId: string;
  onCreateNew: () => void;
  onEdit: (formId: string) => void;
  onViewSubmissions: (formId: string, formName: string) => void;
}

export const VoiceFormManager: React.FC<VoiceFormManagerProps> = ({
  assistantId,
  onCreateNew,
  onEdit,
  onViewSubmissions
}) => {
  const [forms, setForms] = useState<VoiceForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteFormId, setDeleteFormId] = useState<string | null>(null);
  const [embedForm, setEmbedForm] = useState<VoiceForm | null>(null);

  useEffect(() => {
    loadForms();
  }, [assistantId]);

  const loadForms = async () => {
    try {
      const { data, error } = await supabase
        .from('voice_forms')
        .select('*')
        .eq('assistant_id', assistantId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setForms(data || []);
    } catch (error) {
      console.error('Error loading forms:', error);
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (formId: string) => {
    try {
      const { error } = await supabase
        .from('voice_forms')
        .delete()
        .eq('id', formId);

      if (error) throw error;

      toast.success('Form deleted successfully');
      loadForms();
    } catch (error) {
      console.error('Error deleting form:', error);
      toast.error('Failed to delete form');
    } finally {
      setDeleteFormId(null);
    }
  };

  const handleDuplicate = async (form: VoiceForm) => {
    try {
      const newForm = {
        ...form,
        id: crypto.randomUUID(),
        name: `${form.name} (Copy)`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      delete (newForm as any).created_at;

      const { error } = await supabase
        .from('voice_forms')
        .insert(newForm);

      if (error) throw error;

      toast.success('Form duplicated successfully');
      loadForms();
    } catch (error) {
      console.error('Error duplicating form:', error);
      toast.error('Failed to duplicate form');
    }
  };

  const toggleActive = async (formId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('voice_forms')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', formId);

      if (error) throw error;

      toast.success(`Form ${isActive ? 'activated' : 'deactivated'}`);
      loadForms();
    } catch (error) {
      console.error('Error updating form:', error);
      toast.error('Failed to update form');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading forms...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Voice Forms</h2>
          <p className="text-muted-foreground">
            Manage conversational forms for your assistant
          </p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create Form
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No voice forms yet</p>
            <Button onClick={onCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Form
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card key={form.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{form.name}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {form.description || 'No description'}
                    </CardDescription>
                  </div>
                  <Badge variant={form.is_active ? 'default' : 'secondary'}>
                    {form.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{form.fields?.length || 0} fields</span>
                  <span>Updated {new Date(form.updated_at).toLocaleDateString()}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(form.id)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewSubmissions(form.id, form.name)}
                  >
                    <BarChart3 className="mr-1 h-3 w-3" />
                    Stats
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEmbedForm(form)}
                  >
                    <Code className="mr-1 h-3 w-3" />
                    Embed
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(form)}
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Duplicate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(form.id, !form.is_active)}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    {form.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => setDeleteFormId(form.id)}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteFormId} onOpenChange={() => setDeleteFormId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Voice Form?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the form and all its submissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFormId && handleDelete(deleteFormId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Embed Code Dialog */}
      <Dialog open={!!embedForm} onOpenChange={() => setEmbedForm(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Embed {embedForm?.name}</DialogTitle>
          </DialogHeader>
          {embedForm && (
            <VoiceFormEmbedCode formId={embedForm.id} formName={embedForm.name} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

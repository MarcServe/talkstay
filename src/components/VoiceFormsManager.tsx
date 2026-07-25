import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Link as LinkIcon, QrCode, Edit, Trash2, Copy, ExternalLink, BarChart, Building2, Search, Filter, X, Files, CheckSquare, Square } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { VoiceFormTopicsBuilder } from './VoiceFormTopicsBuilder';
import { VoiceFormSubmissions } from './VoiceFormSubmissions';
import { VoiceFormAnalytics } from './VoiceFormAnalytics';
import { VoiceFormQRCode } from './VoiceFormQRCode';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VoiceForm {
  id: string;
  form_name: string;
  form_slug: string;
  description: string | null;
  topics: any[];
  is_active: boolean;
  created_at: string;
  notification_email: string;
  assistant_id: string | null;
  business_name: string | null;
  website_url: string | null;
}

interface VoiceFormsManagerProps {
  userId: string;
  assistantId?: string;
}

export const VoiceFormsManager: React.FC<VoiceFormsManagerProps> = ({ userId, assistantId }) => {
  const [forms, setForms] = useState<VoiceForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingForm, setEditingForm] = useState<VoiceForm | null>(null);
  const [viewingSubmissions, setViewingSubmissions] = useState<VoiceForm | null>(null);
  const [qrCodeForm, setQrCodeForm] = useState<VoiceForm | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [businessFilter, setBusinessFilter] = useState<string>('all');
  const [selectedForms, setSelectedForms] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Get unique businesses for filter
  const uniqueBusinesses = Array.from(
    new Set(forms.map(f => f.business_name).filter(Boolean))
  ) as string[];

  // Filter forms based on search and filters
  const filteredForms = forms.filter(form => {
    const matchesSearch = !searchQuery || 
      form.form_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      form.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      form.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      form.website_url?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && form.is_active) ||
      (statusFilter === 'inactive' && !form.is_active);
    
    const matchesBusiness = businessFilter === 'all' || 
      form.business_name === businessFilter;
    
    return matchesSearch && matchesStatus && matchesBusiness;
  });

  // Load user's voice forms
  useEffect(() => {
    loadForms();
  }, [userId, assistantId]);

  const loadForms = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('voice_forms')
        .select(`
          *,
          assistants:assistant_id!left (
            business_name,
            logo_url
          )
        `)
        .eq('user_id', userId);
      
      // Filter by assistantId if provided - only show forms for that specific assistant
      if (assistantId) {
        query = query.eq('assistant_id', assistantId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setForms(data || []);
    } catch (error) {
      console.error('Error loading forms:', error);
      toast({
        title: 'Error',
        description: 'Failed to load voice forms',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getShareableLink = (formSlug: string) => {
    return `${window.location.origin}/form/${formSlug}`;
  };

  const copyLink = (formSlug: string) => {
    const link = getShareableLink(formSlug);
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link copied!',
      description: 'Shareable link copied to clipboard',
    });
  };

  const toggleFormStatus = async (formId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('voice_forms')
        .update({ is_active: !currentStatus })
        .eq('id', formId);

      if (error) throw error;

      toast({
        title: 'Status updated',
        description: `Form ${!currentStatus ? 'activated' : 'deactivated'}`,
      });

      loadForms();
    } catch (error) {
      console.error('Error updating form status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update form status',
        variant: 'destructive',
      });
    }
  };

  const duplicateForm = async (form: VoiceForm) => {
    try {
      const newForm = {
        form_name: `${form.form_name} (Copy)`,
        form_slug: `${form.form_slug}-copy-${Date.now()}`,
        description: form.description,
        assistant_id: form.assistant_id,
        topics: form.topics,
        notification_email: form.notification_email,
        user_id: userId,
        is_active: false,
      };

      const { error } = await supabase
        .from('voice_forms')
        .insert(newForm);

      if (error) throw error;

      toast({
        title: 'Form duplicated',
        description: 'A copy of the form has been created',
      });

      loadForms();
    } catch (error) {
      console.error('Error duplicating form:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate form',
        variant: 'destructive',
      });
    }
  };

  const deleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('voice_forms')
        .delete()
        .eq('id', formId);

      if (error) throw error;

      toast({
        title: 'Form deleted',
        description: 'Voice form has been deleted',
      });

      loadForms();
    } catch (error) {
      console.error('Error deleting form:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete form',
        variant: 'destructive',
      });
    }
  };

  const handleFormSaved = () => {
    setShowCreateDialog(false);
    setEditingForm(null);
    loadForms();
  };

  const toggleFormSelection = (formId: string) => {
    const newSelected = new Set(selectedForms);
    if (newSelected.has(formId)) {
      newSelected.delete(formId);
    } else {
      newSelected.add(formId);
    }
    setSelectedForms(newSelected);
  };

  const toggleAllForms = () => {
    if (selectedForms.size === filteredForms.length) {
      setSelectedForms(new Set());
    } else {
      setSelectedForms(new Set(filteredForms.map(f => f.id)));
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedForms.size} form(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('voice_forms')
        .delete()
        .in('id', Array.from(selectedForms));

      if (error) throw error;

      toast({
        title: 'Forms deleted',
        description: `${selectedForms.size} form(s) have been deleted`,
      });

      setSelectedForms(new Set());
      loadForms();
    } catch (error) {
      console.error('Error deleting forms:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete forms',
        variant: 'destructive',
      });
    }
  };

  const bulkActivate = async () => {
    try {
      const { error } = await supabase
        .from('voice_forms')
        .update({ is_active: true })
        .in('id', Array.from(selectedForms));

      if (error) throw error;

      toast({
        title: 'Forms activated',
        description: `${selectedForms.size} form(s) have been activated`,
      });

      setSelectedForms(new Set());
      loadForms();
    } catch (error) {
      console.error('Error activating forms:', error);
      toast({
        title: 'Error',
        description: 'Failed to activate forms',
        variant: 'destructive',
      });
    }
  };

  const bulkDeactivate = async () => {
    try {
      const { error } = await supabase
        .from('voice_forms')
        .update({ is_active: false })
        .in('id', Array.from(selectedForms));

      if (error) throw error;

      toast({
        title: 'Forms deactivated',
        description: `${selectedForms.size} form(s) have been deactivated`,
      });

      setSelectedForms(new Set());
      loadForms();
    } catch (error) {
      console.error('Error deactivating forms:', error);
      toast({
        title: 'Error',
        description: 'Failed to deactivate forms',
        variant: 'destructive',
      });
    }
  };

  // Show submissions view
  if (viewingSubmissions) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => setViewingSubmissions(null)}
        >
          ← Back to Forms
        </Button>
        <Tabs defaultValue="submissions" className="w-full">
          <TabsList>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <TabsContent value="submissions">
            <VoiceFormSubmissions
              formId={viewingSubmissions.id}
              formName={viewingSubmissions.form_name}
              businessName={viewingSubmissions.business_name}
              websiteUrl={viewingSubmissions.website_url}
            />
          </TabsContent>
          <TabsContent value="analytics">
            <VoiceFormAnalytics
              formId={viewingSubmissions.id}
              formName={viewingSubmissions.form_name}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          Loading voice forms...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Voice Forms</CardTitle>
              <CardDescription>
                Create conversational forms that collect information through natural AI dialogue
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Voice Form
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingForm ? 'Edit Voice Form' : 'Create New Voice Form'}
                  </DialogTitle>
                  <DialogDescription>
                    Configure conversational topics and data collection for your form
                  </DialogDescription>
                </DialogHeader>
                <VoiceFormTopicsBuilder
                  userId={userId}
                  existingForm={editingForm}
                  defaultAssistantId={assistantId}
                  onSaved={handleFormSaved}
                  onCancel={() => {
                    setShowCreateDialog(false);
                    setEditingForm(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        {/* Bulk Actions Toolbar */}
        {selectedForms.size > 0 && (
          <div className="px-6 pt-4 pb-2">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {selectedForms.size} form{selectedForms.size !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={bulkActivate}
                  >
                    Activate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={bulkDeactivate}
                  >
                    Deactivate
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={bulkDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedForms(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Search and Filters */}
        {forms.length > 0 && (
          <div className="px-6 pb-4 space-y-3">
            <div className="flex gap-2 items-center">
              {filteredForms.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAllForms}
                  className="shrink-0"
                >
                  {selectedForms.size === filteredForms.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </Button>
              )}
              <div className="relative flex-1">
                <Input
                  placeholder="Search forms by name, description, or business..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filters:</span>
              </div>
              
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              
              {uniqueBusinesses.length > 0 && (
                <Select value={businessFilter} onValueChange={setBusinessFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Businesses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Businesses</SelectItem>
                    {uniqueBusinesses.map((business) => (
                      <SelectItem key={business} value={business}>
                        {business}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {(searchQuery || statusFilter !== 'all' || businessFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setBusinessFilter('all');
                  }}
                >
                  Clear All
                </Button>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground">
              Showing {filteredForms.length} of {forms.length} form{forms.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
        
        <CardContent>
          {forms.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-4">
                <div className="w-16 h-16 bg-muted rounded-full mx-auto flex items-center justify-center">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-lg font-medium mb-2">No voice forms yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first conversational form to start collecting information naturally
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Form
              </Button>
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No forms match your current filters.</p>
              <Button
                variant="link"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setBusinessFilter('all');
                }}
                className="mt-2"
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredForms.map((form) => (
                <Card key={form.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFormSelection(form.id)}
                          className="h-8 w-8 p-0"
                        >
                          {selectedForms.has(form.id) ? (
                            <CheckSquare className="h-5 w-5 text-primary" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 w-full">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h3 className="text-lg font-semibold">{form.form_name}</h3>
                              <Badge variant={form.is_active ? 'default' : 'secondary'}>
                                {form.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            {form.description && (
                              <p className="text-sm text-muted-foreground mb-3">
                                {form.description}
                              </p>
                            )}
                            {(form.business_name || form.website_url) && (
                              <div className="flex items-center gap-2 mb-2 text-sm">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{form.business_name || 'New Business'}</span>
                                {form.website_url && (
                                  <a 
                                    href={form.website_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline text-xs"
                                  >
                                    {form.website_url}
                                  </a>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                              <LinkIcon className="h-4 w-4 flex-shrink-0" />
                              <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-full">
                                /form/{form.form_slug}
                              </code>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <Label htmlFor={`active-${form.id}`} className="text-sm">
                                Active
                              </Label>
                              <Switch
                                id={`active-${form.id}`}
                                checked={form.is_active}
                                onCheckedChange={() => toggleFormStatus(form.id, form.is_active)}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap w-full sm:w-auto sm:justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewingSubmissions(form)}
                              title="View analytics"
                            >
                              <BarChart className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setQrCodeForm(form)}
                              title="Generate QR code"
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyLink(form.form_slug)}
                              title="Copy link"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(getShareableLink(form.form_slug), '_blank')}
                              title="Open form"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => duplicateForm(form)}
                              title="Duplicate form"
                            >
                              <Files className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingForm(form);
                                setShowCreateDialog(true);
                              }}
                              title="Edit form"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteForm(form.id)}
                              title="Delete form"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {forms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How to Share Your Forms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <LinkIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Direct Link</p>
                <p className="text-sm text-muted-foreground">
                  Copy and share the link on LinkedIn, email, or your website
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <QrCode className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">QR Code</p>
                <p className="text-sm text-muted-foreground">
                  Generate QR codes for print materials and offline sharing
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Code Modal */}
      {qrCodeForm && (
        <VoiceFormQRCode
          open={qrCodeForm !== null}
          onOpenChange={(open) => !open && setQrCodeForm(null)}
          formName={qrCodeForm.form_name}
          formSlug={qrCodeForm.form_slug}
        />
      )}
    </div>
  );
};

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Phone, Search, Edit, Save, X, ExternalLink } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { formatPhoneNumberInternational } from '@/utils/phoneFormatterEnhanced';

interface Assistant {
  id: string;
  business_name: string;
  website_url: string;
  scraped_content: any;
  user_id: string;
  created_at: string;
}

interface PhoneData {
  phone?: string;
  contact_phone?: string;
  phone_number?: string;
}

export default function AdminPhoneManagement() {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPhone, setEditPhone] = useState('');

  useEffect(() => {
    loadAssistants();
  }, []);

  const loadAssistants = async () => {
    try {
      const { data, error } = await supabase
        .from('assistants')
        .select('id, business_name, website_url, scraped_content, user_id, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssistants(data || []);
    } catch (error) {
      console.error('Error loading assistants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load assistants',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const extractPhoneNumber = (assistant: Assistant): string => {
    if (!assistant.scraped_content) return 'N/A';
    
    const content = assistant.scraped_content as PhoneData;
    return content.phone || content.contact_phone || content.phone_number || 'N/A';
  };

  const handleEdit = (assistant: Assistant) => {
    setEditingId(assistant.id);
    setEditPhone(extractPhoneNumber(assistant));
  };

  const handleSave = async (assistant: Assistant) => {
    try {
      const updatedContent = {
        ...(assistant.scraped_content as object || {}),
        phone: editPhone
      };

      const { error } = await supabase
        .from('assistants')
        .update({ scraped_content: updatedContent })
        .eq('id', assistant.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Phone number updated successfully'
      });

      setEditingId(null);
      loadAssistants();
    } catch (error) {
      console.error('Error updating phone:', error);
      toast({
        title: 'Error',
        description: 'Failed to update phone number',
        variant: 'destructive'
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditPhone('');
  };

  const filteredAssistants = assistants.filter(assistant =>
    assistant.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assistant.website_url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: assistants.length,
    withPhone: assistants.filter(a => extractPhoneNumber(a) !== 'N/A').length,
    withoutPhone: assistants.filter(a => extractPhoneNumber(a) === 'N/A').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Phone Number Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage phone numbers across all assistants
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Assistants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">With Phone Number</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.withPhone}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Missing Phone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.withoutPhone}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Search className="w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by business name or website..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardHeader>
        </Card>

        {/* Phone Numbers List */}
        <Card>
          <CardHeader>
            <CardTitle>Phone Numbers ({filteredAssistants.length})</CardTitle>
            <CardDescription>View and edit phone numbers for all assistants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredAssistants.map(assistant => {
                const phone = extractPhoneNumber(assistant);
                const isEditing = editingId === assistant.id;

                return (
                  <div
                    key={assistant.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Phone className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{assistant.business_name}</h3>
                        <a
                          href={assistant.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {assistant.website_url}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Input
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="Enter phone number"
                            className="w-48"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSave(assistant)}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {phone === 'N/A' ? (
                            <Badge variant="secondary">No Phone</Badge>
                          ) : (
                            <code className="px-2 py-1 bg-muted rounded text-sm">
                              {formatPhoneNumberInternational(phone)}
                            </code>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(assistant)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredAssistants.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No assistants found matching "{searchTerm}"
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
  );
}

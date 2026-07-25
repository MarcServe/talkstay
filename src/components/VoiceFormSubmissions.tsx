import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Download, Calendar, Clock, Mail, User, Building2 } from 'lucide-react';

interface Submission {
  id: string;
  session_id: string;
  data: Record<string, any>; // ✅ Correct column name from database
  field_collection_log: any[] | null; // ✅ Correct column name for transcript
  user_email: string | null;
  user_name: string | null;
  completion_time: number | null; // ✅ Correct column name
  submitted_at: string;
}

interface VoiceFormSubmissionsProps {
  formId: string;
  formName: string;
  businessName?: string | null;
  websiteUrl?: string | null;
}

export const VoiceFormSubmissions: React.FC<VoiceFormSubmissionsProps> = ({
  formId,
  formName,
  businessName,
  websiteUrl,
}) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSubmissions();
  }, [formId]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('voice_form_submissions')
        .select('*')
        .eq('form_id', formId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error loading submissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load form submissions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (submissions.length === 0) {
      toast({
        title: 'No data',
        description: 'There are no submissions to export',
        variant: 'destructive',
      });
      return;
    }

    // Get all unique field names
    const allFields = new Set<string>();
    submissions.forEach((sub) => {
      if (sub.data) {
        Object.keys(sub.data).forEach((key) => allFields.add(key));
      }
    });

    // Create CSV headers
    const headers = ['Submitted At', 'Name', 'Email', 'Completion Time (s)', ...Array.from(allFields)];
    const csvRows = [headers.join(',')];

    // Add data rows
    submissions.forEach((sub) => {
      const row = [
        `"${format(new Date(sub.submitted_at), 'yyyy-MM-dd HH:mm:ss')}"`,
        `"${sub.user_name || ''}"`,
        `"${sub.user_email || ''}"`,
        sub.completion_time || '',
        ...Array.from(allFields).map((field) => {
          const value = sub.data?.[field as string];
          return `"${value || ''}"`;
        }),
      ];
      csvRows.push(row.join(','));
    });

    // Download CSV
    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formName.replace(/\s+/g, '_')}_submissions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Export complete',
      description: 'Submissions have been exported to CSV',
    });
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          Loading submissions...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Form Submissions</CardTitle>
              <CardDescription>
                {submissions.length} total submission{submissions.length !== 1 ? 's' : ''}
                {businessName && (
                  <span className="flex items-center gap-1 mt-1">
                    <Building2 className="h-3 w-3" />
                    {businessName}
                    {websiteUrl && (
                      <span className="text-xs">• {websiteUrl}</span>
                    )}
                  </span>
                )}
              </CardDescription>
            </div>
            {submissions.length > 0 && (
              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No submissions yet. Share your form link to start collecting responses.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((submission) => (
                <Card key={submission.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-4 flex-wrap">
                          {submission.user_name && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{submission.user_name}</span>
                            </div>
                          )}
                          {submission.user_email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {submission.user_email}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(submission.submitted_at), 'MMM d, yyyy HH:mm')}
                          </div>
                          {submission.completion_time && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(submission.completion_time)}
                            </div>
                          )}
                           <Badge variant="secondary" className="text-xs">
                            {submission.data ? Object.keys(submission.data).length : 0} fields
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSubmission(submission)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submission Detail Modal */}
      <Dialog open={selectedSubmission !== null} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
            <DialogDescription>
              {selectedSubmission && format(new Date(selectedSubmission.submitted_at), 'MMMM d, yyyy at h:mm a')}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            {selectedSubmission && (
              <div className="space-y-6 pb-4">
                {/* Contact Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedSubmission.user_name && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Name:</span>
                        <span className="font-medium">{selectedSubmission.user_name}</span>
                      </div>
                    )}
                    {selectedSubmission.user_email && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Email:</span>
                        <span className="font-medium">{selectedSubmission.user_email}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                 {/* Collected Data */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Collected Data</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedSubmission.data && Object.entries(selectedSubmission.data).map(([key, value]) => (
                      <div key={key} className="flex items-start justify-between gap-4">
                        <span className="text-sm text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <span className="font-medium text-right flex-1">{String(value)}</span>
                      </div>
                    ))}
                    {(!selectedSubmission.data || Object.keys(selectedSubmission.data).length === 0) && (
                      <p className="text-sm text-muted-foreground">No data collected</p>
                    )}
                  </CardContent>
                </Card>

                 {/* Conversation Transcript */}
                {selectedSubmission.field_collection_log && selectedSubmission.field_collection_log.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Conversation Transcript</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedSubmission.field_collection_log.map((msg: any, idx: number) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg ${
                            msg.sender === 'user'
                              ? 'bg-primary/10 ml-8'
                              : 'bg-muted mr-8'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">
                              {msg.sender === 'user' ? 'User' : 'AI Assistant'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(msg.timestamp), 'HH:mm:ss')}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Metadata */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Metadata</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Session ID:</span>
                      <span className="text-xs font-mono">{selectedSubmission.session_id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Completion Time:</span>
                      <span className="font-medium">
                        {formatDuration(selectedSubmission.completion_time)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

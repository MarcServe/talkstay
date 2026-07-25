import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { 
  FileText, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Eye,
  ArrowRight,
  Download
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { exportToCSV, formatVoiceFormSubmissionsForExport } from '@/utils/exportAnalytics';

interface Submission {
  id: string;
  form_id: string;
  user_name: string | null;
  user_email: string | null;
  submitted_at: string;
  completion_time: number | null;
  voice_forms: {
    form_name: string;
  };
}

interface Stats {
  totalSubmissions: number;
  todaySubmissions: number;
  avgCompletionTime: number;
  completionRate: number;
}

interface VoiceFormSubmissionsDashboardProps {
  userId: string;
  assistantId: string;
}

export const VoiceFormSubmissionsDashboard: React.FC<VoiceFormSubmissionsDashboardProps> = ({ 
  userId,
  assistantId
}) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalSubmissions: 0,
    todaySubmissions: 0,
    avgCompletionTime: 0,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (assistantId) {
      loadData();
    }
  }, [userId, assistantId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get voice forms for the selected assistant only
      const { data: userForms, error: formsError } = await supabase
        .from('voice_forms')
        .select('id')
        .eq('assistant_id', assistantId);

      if (formsError) throw formsError;

      if (!userForms || userForms.length === 0) {
        setLoading(false);
        return;
      }

      const formIds = userForms.map(f => f.id);

      // Get recent submissions for display
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('voice_form_submissions')
        .select(`
          id,
          form_id,
          user_name,
          user_email,
          submitted_at,
          completion_time,
          voice_forms!inner (
            form_name
          )
        `)
        .in('form_id', formIds)
        .order('submitted_at', { ascending: false })
        .limit(5);

      if (submissionsError) throw submissionsError;

      // Get ALL submissions for export
      const { data: allSubmissionsData } = await supabase
        .from('voice_form_submissions')
        .select(`
          id,
          form_id,
          user_name,
          user_email,
          submitted_at,
          completion_time,
          voice_forms!inner (
            form_name
          )
        `)
        .in('form_id', formIds)
        .order('submitted_at', { ascending: false });

      // Transform the data to match our Submission type
      const transformedSubmissions: Submission[] = (submissionsData || []).map((item: any) => ({
        id: item.id,
        form_id: item.form_id,
        user_name: item.user_name,
        user_email: item.user_email,
        submitted_at: item.submitted_at,
        completion_time: item.completion_time,
        voice_forms: {
          form_name: item.voice_forms?.form_name || '',
        }
      }));

      setSubmissions(transformedSubmissions);
      setAllSubmissions(allSubmissionsData || []);

      // Calculate stats
      const { count: totalCount } = await supabase
        .from('voice_form_submissions')
        .select('*', { count: 'exact', head: true })
        .in('form_id', formIds);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: todayCount } = await supabase
        .from('voice_form_submissions')
        .select('*', { count: 'exact', head: true })
        .in('form_id', formIds)
        .gte('submitted_at', today.toISOString());

      // Get completion times
      const { data: completionData } = await supabase
        .from('voice_form_submissions')
        .select('completion_time')
        .in('form_id', formIds)
        .not('completion_time', 'is', null);

      let avgTime = 0;
      if (completionData && completionData.length > 0) {
        const sum = completionData.reduce((acc, curr) => acc + (curr.completion_time || 0), 0);
        avgTime = Math.round(sum / completionData.length);
      }

      // Calculate completion rate based on submissions vs total forms
      let completionRate = 0;
      if (userForms.length > 0 && totalCount) {
        completionRate = Math.min(100, Math.round((totalCount / (userForms.length * 10)) * 100));
      }

      setStats({
        totalSubmissions: totalCount || 0,
        todaySubmissions: todayCount || 0,
        avgCompletionTime: avgTime,
        completionRate,
      });

    } catch (error: any) {
      console.error('Error loading submissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load voice form submissions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExport = () => {
    if (allSubmissions.length === 0) {
      toast({
        title: "No data to export",
        description: "No submissions available for export",
        variant: "destructive",
      });
      return;
    }

    const exportData = formatVoiceFormSubmissionsForExport(allSubmissions);
    exportToCSV(exportData, `voice_form_submissions_${assistantId}`);
    
    toast({
      title: "Export successful",
      description: `${allSubmissions.length} submissions exported as CSV`,
    });
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
      {/* Header with Export Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Voice Form Submissions</h3>
          <p className="text-sm text-muted-foreground">Track and analyze voice form submissions</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total Submissions</p>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.totalSubmissions}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.todaySubmissions} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Avg. Time</p>
            </div>
            <p className="text-2xl font-bold mt-2">
              {stats.avgCompletionTime > 0 ? formatTime(stats.avgCompletionTime) : '--:--'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Per submission
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Completion Rate</p>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.completionRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              Of started forms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">This Week</p>
            </div>
            <p className="text-2xl font-bold mt-2">
              {submissions.filter(s => {
                const submittedDate = new Date(s.submitted_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return submittedDate >= weekAgo;
              }).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              New submissions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Submissions</CardTitle>
              <CardDescription>
                Latest voice form submissions from all your forms
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/dashboard?tab=voice-forms')}
            >
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No submissions yet</p>
              <p className="text-sm mt-1">
                Submissions will appear here once users complete your voice forms
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate('/dashboard?tab=voice-forms')}
              >
                Create a Voice Form
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">
                        {submission.user_name || 'Anonymous'}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {submission.voice_forms.form_name}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {submission.user_email && (
                        <span className="truncate">{submission.user_email}</span>
                      )}
                      <span>
                        {formatDistanceToNow(new Date(submission.submitted_at), {
                          addSuffix: true,
                        })}
                      </span>
                      {submission.completion_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(submission.completion_time)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/dashboard?tab=voice-forms')}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Clock, CheckCircle, XCircle, BarChart3 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface VoiceFormAnalyticsProps {
  formId: string;
  formName: string;
}

interface AnalyticsData {
  totalSubmissions: number;
  completedSubmissions: number;
  averageDuration: number;
  fieldSuccessRates: { [key: string]: number };
  completionRate: number;
}

export const VoiceFormAnalytics: React.FC<VoiceFormAnalyticsProps> = ({ formId, formName }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [formId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch all submissions for this form
      const { data: submissions, error } = await supabase
        .from('voice_form_submissions')
        .select('*')
        .eq('form_id', formId);

      if (error) throw error;

      if (!submissions || submissions.length === 0) {
        setAnalytics({
          totalSubmissions: 0,
          completedSubmissions: 0,
          averageDuration: 0,
          fieldSuccessRates: {},
          completionRate: 0,
        });
        return;
      }

      // Calculate analytics
      const totalSubmissions = submissions.length;
      const completedSubmissions = submissions.filter(s => s.completion_status === 'completed').length;
      const completionRate = (completedSubmissions / totalSubmissions) * 100;

      // Calculate average duration (in minutes)
      const durations = submissions
        .filter(s => s.completion_time)
        .map(s => s.completion_time);
      const averageDuration = durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : 0;

      // Calculate field success rates
      const fieldSuccessCounts: { [key: string]: { collected: number; total: number } } = {};
      submissions.forEach(submission => {
        if (submission.field_collection_log) {
          submission.field_collection_log.forEach((log: any) => {
            if (!fieldSuccessCounts[log.field_id]) {
              fieldSuccessCounts[log.field_id] = { collected: 0, total: 0 };
            }
            fieldSuccessCounts[log.field_id].total++;
            if (log.value) {
              fieldSuccessCounts[log.field_id].collected++;
            }
          });
        }
      });

      // Convert to percentages
      const fieldRates: { [key: string]: number } = {};
      Object.keys(fieldSuccessCounts).forEach(fieldId => {
        const data = fieldSuccessCounts[fieldId];
        fieldRates[fieldId] = (data.collected / data.total) * 100;
      });

      setAnalytics({
        totalSubmissions,
        completedSubmissions,
        averageDuration: Math.round(averageDuration / 60), // Convert to minutes
        fieldSuccessRates: fieldRates,
        completionRate,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          Loading analytics...
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No analytics data available
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Form Analytics</CardTitle>
          <CardDescription>{formName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Submissions */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Submissions</p>
                    <p className="text-2xl font-bold">{analytics.totalSubmissions}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            {/* Completion Rate */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                    <p className="text-2xl font-bold">{analytics.completionRate.toFixed(1)}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            {/* Average Duration */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Duration</p>
                    <p className="text-2xl font-bold">{analytics.averageDuration}m</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            {/* Completed vs Incomplete */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Completed
                    </span>
                    <span className="font-medium">{analytics.completedSubmissions}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Incomplete
                    </span>
                    <span className="font-medium">{analytics.totalSubmissions - analytics.completedSubmissions}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Field Collection Success Rates */}
      {Object.keys(analytics.fieldSuccessRates).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Field Collection Success Rates</CardTitle>
            <CardDescription>
              Percentage of submissions where each field was successfully collected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.fieldSuccessRates).map(([fieldId, rate]) => (
                <div key={fieldId} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{fieldId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    <span className="text-muted-foreground">{rate.toFixed(1)}%</span>
                  </div>
                  <Progress value={rate} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

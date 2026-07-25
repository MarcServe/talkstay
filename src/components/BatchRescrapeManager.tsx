import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock, Zap } from "lucide-react";

interface RescrapeCandidate {
  id: string;
  business_name: string;
  website_url: string;
  last_scraped_at: string | null;
  days_since_last_scrape: number;
  has_basic_content: boolean;
  needs_upgrade: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface BatchResult {
  assistant_id: string;
  business_name: string;
  website_url: string;
  status: 'success' | 'failed';
  pages_found?: number;
  enhanced_features?: {
    semantic_content: number;
    business_entities: number;
    content_quality_score: number;
  };
  error?: string;
}

export const BatchRescrapeManager: React.FC = () => {
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<RescrapeCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{
    summary?: any;
    detailed_results?: BatchResult[];
    errors?: string[];
  } | null>(null);

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('batch-rescrape-assistants', {
        body: { action: 'get_candidates' }
      });

      if (error) throw error;

      if (data.success) {
        setCandidates(data.candidates);
        // Auto-select high priority candidates
        setSelectedIds(data.candidates
          .filter((c: RescrapeCandidate) => c.priority === 'high')
          .map((c: RescrapeCandidate) => c.id)
        );
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to load candidates:', error);
      toast({
        title: "Error",
        description: "Failed to load rescrape candidates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startBatchRescrape = async () => {
    if (selectedIds.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one assistant to rescrape",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('batch-rescrape-assistants', {
        body: { 
          action: 'start_batch_rescrape',
          assistant_ids: selectedIds
        }
      });

      if (error) throw error;

      if (data.success) {
        setResults(data);
        toast({
          title: "Batch Rescrape Complete",
          description: `Successfully processed ${data.summary.successful}/${data.summary.total_processed} assistants`,
        });
        // Reload candidates to reflect updates
        await loadCandidates();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Batch rescrape failed:', error);
      toast({
        title: "Error",
        description: "Batch rescrape process failed",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  const selectByPriority = (priority: 'high' | 'medium' | 'low') => {
    const priorityIds = candidates
      .filter(c => c.priority === priority)
      .map(c => c.id);
    setSelectedIds(prev => [...new Set([...prev, ...priorityIds])]);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Batch Enhanced Re-scraping
          </CardTitle>
          <CardDescription>
            Upgrade all your assistants with the new enhanced scraping system for deeper, more accurate content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading assistants...
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Found {candidates.length} assistants • {selectedIds.length} selected
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectByPriority('high')}
                  >
                    Select High Priority
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedIds(candidates.map(c => c.id))}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedIds([])}
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50"
                  >
                    <Checkbox
                      checked={selectedIds.includes(candidate.id)}
                      onCheckedChange={() => toggleSelection(candidate.id)}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium truncate">
                          {candidate.business_name}
                        </div>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${getPriorityColor(candidate.priority)} text-white`}
                        >
                          {candidate.priority}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {candidate.website_url}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        {candidate.has_basic_content && (
                          <div className="flex items-center gap-1 text-xs text-orange-600">
                            <AlertTriangle className="h-3 w-3" />
                            Basic content only
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {candidate.days_since_last_scrape > 999 
                            ? 'Never scraped' 
                            : `${candidate.days_since_last_scrape} days ago`
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={startBatchRescrape}
                  disabled={selectedIds.length === 0 || isProcessing}
                  className="min-w-32"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    `Rescrape ${selectedIds.length} Assistant${selectedIds.length !== 1 ? 's' : ''}`
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Batch Rescrape Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {results.summary.successful}
                </div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {results.summary.failed}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {results.summary.enhanced_features_summary.avg_pages_per_assistant}
                </div>
                <div className="text-sm text-muted-foreground">Avg Pages</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {Math.round(results.summary.enhanced_features_summary.avg_quality_score * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Avg Quality</div>
              </div>
            </div>

            {results.errors && results.errors.length > 0 && (
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Errors occurred:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {results.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="text-sm text-muted-foreground">
              Processing completed in {results.summary.duration_seconds} seconds
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
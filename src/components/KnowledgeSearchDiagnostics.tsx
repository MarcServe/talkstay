import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Loader2, Search, BarChart3, Lightbulb, Clock, Database, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SearchResult {
  id: string;
  content: string;
  title: string;
  url?: string;
  score: number;
  source_type: string;
  metadata: any;
  quality_score: number;
  relevance_explanation: string;
  composite_score?: number;
}

interface SearchDiagnostics {
  total_sources_searched: number;
  sources_by_type: Record<string, number>;
  search_strategy: string;
  quality_distribution: {
    high: number;
    medium: number;
    low: number;
  };
  processing_time_ms: number;
  perplexity_enhanced: boolean;
}

interface KnowledgeSearchDiagnosticsProps {
  assistantId: string;
}

export default function KnowledgeSearchDiagnostics({ assistantId }: KnowledgeSearchDiagnosticsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [includePerplexity, setIncludePerplexity] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [diagnostics, setDiagnostics] = useState<SearchDiagnostics | null>(null);
  const { toast } = useToast();

  const performEnhancedSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a search query",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-knowledge-search', {
        body: {
          query: searchQuery,
          assistantId,
          includePerplexity,
          maxResults: 10
        }
      });

      if (error) throw error;

      setSearchResults(data.results || []);
      setDiagnostics(data.diagnostics);

      toast({
        title: "Search Complete",
        description: `Found ${data.results?.length || 0} results in ${data.diagnostics?.processing_time_ms || 0}ms`,
      });

    } catch (error) {
      console.error('Enhanced search error:', error);
      toast({
        title: "Search Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const getSourceTypeIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'semantic_enhanced': return <Lightbulb className="h-4 w-4" />;
      case 'perplexity_enhanced': return <Globe className="h-4 w-4" />;
      case 'knowledge_vectors': return <Database className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.7) return 'bg-green-500';
    if (score >= 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getQualityLabel = (score: number) => {
    if (score >= 0.7) return 'High';
    if (score >= 0.4) return 'Medium';
    return 'Low';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <CardTitle>Knowledge Search Diagnostics</CardTitle>
          </div>
          <CardDescription>
            Test and analyze the enhanced knowledge search system for this assistant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search-query">Search Query</Label>
              <Input
                id="search-query"
                placeholder="Enter your search query..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && performEnhancedSearch()}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="perplexity-mode"
                  checked={includePerplexity}
                  onCheckedChange={setIncludePerplexity}
                />
                <Label htmlFor="perplexity-mode">Include Real-time Search (Perplexity)</Label>
              </div>
            </div>
          </div>

          <Button
            onClick={performEnhancedSearch}
            disabled={isSearching}
            className="w-full"
          >
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Run Enhanced Search
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {diagnostics && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>Search Performance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{diagnostics.total_sources_searched}</div>
                <div className="text-sm text-muted-foreground">Sources Searched</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold flex items-center justify-center gap-1">
                  <Clock className="h-4 w-4" />
                  {diagnostics.processing_time_ms}ms
                </div>
                <div className="text-sm text-muted-foreground">Processing Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{diagnostics.quality_distribution.high}</div>
                <div className="text-sm text-muted-foreground">High Quality</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{diagnostics.perplexity_enhanced ? '✓' : '✗'}</div>
                <div className="text-sm text-muted-foreground">Real-time Enhanced</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Quality Distribution</span>
              </div>
              <div className="flex gap-1 h-3 bg-muted rounded">
                <div 
                  className="bg-green-500 rounded-l" 
                  style={{ width: `${(diagnostics.quality_distribution.high / (diagnostics.total_sources_searched || 1)) * 100}%` }}
                />
                <div 
                  className="bg-yellow-500" 
                  style={{ width: `${(diagnostics.quality_distribution.medium / (diagnostics.total_sources_searched || 1)) * 100}%` }}
                />
                <div 
                  className="bg-red-500 rounded-r" 
                  style={{ width: `${(diagnostics.quality_distribution.low / (diagnostics.total_sources_searched || 1)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>High ({diagnostics.quality_distribution.high})</span>
                <span>Medium ({diagnostics.quality_distribution.medium})</span>
                <span>Low ({diagnostics.quality_distribution.low})</span>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="font-medium mb-2">Sources by Type</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(diagnostics.sources_by_type).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      {getSourceTypeIcon(type)}
                      <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                    </div>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>
              Showing {searchResults.length} prioritized results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="results" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="results">Results</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
              </TabsList>
              
              <TabsContent value="results" className="space-y-4">
                {searchResults.map((result, index) => (
                  <Card key={result.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getSourceTypeIcon(result.source_type)}
                        <h4 className="font-medium">{result.title}</h4>
                        <Badge variant="outline">#{index + 1}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={result.quality_score >= 0.7 ? "default" : result.quality_score >= 0.4 ? "secondary" : "destructive"}
                        >
                          {getQualityLabel(result.quality_score)}
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          Score: {(result.score * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Progress 
                        value={result.quality_score * 100} 
                        className="w-full h-2"
                      />
                      <p className="text-sm text-muted-foreground">
                        {result.relevance_explanation}
                      </p>
                      <div className="text-sm bg-muted p-3 rounded max-h-32 overflow-y-auto">
                        {result.content.substring(0, 300)}
                        {result.content.length > 300 && '...'}
                      </div>
                      {result.url && (
                        <a 
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          {result.url}
                        </a>
                      )}
                    </div>
                  </Card>
                ))}
              </TabsContent>
              
              <TabsContent value="analysis" className="space-y-4">
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Search Quality Analysis:</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {diagnostics?.quality_distribution.high === 0 && (
                          <li>No high-quality results found - consider improving content indexing</li>
                        )}
                        {diagnostics?.processing_time_ms > 2000 && (
                          <li>Search performance is slow - consider optimizing vector indexes</li>
                        )}
                        {!diagnostics?.perplexity_enhanced && (
                          <li>Real-time search not used - enable for current information</li>
                        )}
                        {diagnostics?.total_sources_searched < 5 && (
                          <li>Limited sources available - consider expanding knowledge base</li>
                        )}
                        {searchResults.every(r => r.source_type === 'semantic_enhanced') && (
                          <li>Results are primarily from enhanced content - good semantic coverage</li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
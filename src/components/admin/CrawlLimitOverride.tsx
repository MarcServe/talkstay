import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Search, Save, RotateCcw, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AssistantOption {
  id: string;
  business_name: string;
  website_url: string;
  crawl_limit_override: number | null;
}

export const CrawlLimitOverride: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [assistants, setAssistants] = useState<AssistantOption[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<AssistantOption | null>(null);
  const [crawlLimit, setCrawlLimit] = useState(500);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchAssistants(searchQuery);
    } else {
      setAssistants([]);
    }
  }, [searchQuery]);

  const searchAssistants = async (query: string) => {
    const { data, error } = await supabase
      .from('assistants')
      .select('id, business_name, website_url, crawl_limit_override')
      .ilike('business_name', `%${query}%`)
      .limit(10);

    if (!error && data) {
      setAssistants(data as AssistantOption[]);
    }
  };

  const selectAssistant = (assistant: AssistantOption) => {
    setSelectedAssistant(assistant);
    setCrawlLimit(assistant.crawl_limit_override || 500);
    setSearchQuery('');
    setAssistants([]);
  };

  const handleSave = async () => {
    if (!selectedAssistant) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('assistants')
        .update({ crawl_limit_override: crawlLimit })
        .eq('id', selectedAssistant.id);

      if (error) throw error;

      setSelectedAssistant({ ...selectedAssistant, crawl_limit_override: crawlLimit });
      toast.success(`Crawl limit set to ${crawlLimit} pages for "${selectedAssistant.business_name}"`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save override');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!selectedAssistant) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('assistants')
        .update({ crawl_limit_override: null })
        .eq('id', selectedAssistant.id);

      if (error) throw error;

      setSelectedAssistant({ ...selectedAssistant, crawl_limit_override: null });
      setCrawlLimit(500);
      toast.success(`Override cleared for "${selectedAssistant.business_name}"`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear override');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Crawl Limit Override
        </CardTitle>
        <CardDescription>
          Set a custom crawl page limit for specific assistants (overrides the default 500 max)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="space-y-2">
          <Label>Search Assistant</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Type assistant name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {assistants.length > 0 && (
            <div className="border rounded-md max-h-48 overflow-y-auto">
              {assistants.map((a) => (
                <button
                  key={a.id}
                  onClick={() => selectAssistant(a)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between text-sm border-b last:border-b-0"
                >
                  <span className="font-medium">{a.business_name}</span>
                  {a.crawl_limit_override && (
                    <Badge variant="secondary">{a.crawl_limit_override} pages</Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected assistant */}
        {selectedAssistant && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedAssistant.business_name}</p>
                <p className="text-sm text-muted-foreground">{selectedAssistant.website_url}</p>
              </div>
              <Badge variant={selectedAssistant.crawl_limit_override ? "default" : "outline"}>
                {selectedAssistant.crawl_limit_override
                  ? `Override: ${selectedAssistant.crawl_limit_override} pages`
                  : 'Using default'}
              </Badge>
            </div>

            <div className="space-y-3">
              <Label>Custom Crawl Limit: {crawlLimit} pages</Label>
              <Slider
                value={[crawlLimit]}
                onValueChange={(v) => setCrawlLimit(v[0])}
                min={100}
                max={2000}
                step={50}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>100</span>
                <span>500</span>
                <span>1000</span>
                <span>1500</span>
                <span>2000</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save Override
              </Button>
              <Button onClick={handleClear} disabled={saving} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear Override
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const DiagnosticPreview = () => {
  const { assistantId } = useParams();
  const [diagnostics, setDiagnostics] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runDiagnostics = async () => {
      const results: any = {
        timestamp: new Date().toISOString(),
        assistantId,
        urlInfo: {
          hostname: window.location.hostname,
          pathname: window.location.pathname,
          href: window.location.href
        }
      };

      try {
        // Test 1: Basic parameter extraction
        results.parameterTest = {
          assistantId,
          hasAssistantId: !!assistantId,
          assistantIdType: typeof assistantId
        };

        // Test 2: Database connectivity
        try {
          const { data, error } = await supabase
            .from('assistants')
            .select('id, business_name, is_trial, trial_expires_at, embed_code')
            .limit(1);
          
          results.databaseTest = {
            connected: !error,
            error: error?.message,
            sampleDataCount: data?.length || 0
          };
        } catch (e: any) {
          results.databaseTest = {
            connected: false,
            error: e.message
          };
        }

        // Test 3: Specific assistant query
        if (assistantId) {
          try {
            const { data, error } = await supabase
              .from('assistants')
              .select('id, business_name, is_trial, trial_expires_at, embed_code')
              .eq('id', assistantId)
              .maybeSingle();
            
            results.assistantQuery = {
              found: !!data,
              error: error?.message,
              data: data ? {
                id: data.id,
                business_name: data.business_name,
                is_trial: data.is_trial,
                trial_expires_at: data.trial_expires_at,
                has_embed_code: !!(data.embed_code && data.embed_code.trim()),
                trial_active: data.is_trial && data.trial_expires_at && new Date(data.trial_expires_at) > new Date()
              } : null
            };
          } catch (e: any) {
            results.assistantQuery = {
              found: false,
              error: e.message
            };
          }
        }

        // Test 4: Environment info
        results.environment = {
          userAgent: navigator.userAgent,
          location: window.location.toString(),
          referrer: document.referrer
        };

      } catch (e: any) {
        results.generalError = e.message;
      }

      setDiagnostics(results);
      setLoading(false);
    };

    runDiagnostics();
  }, [assistantId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Running diagnostics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>🔍 Preview Diagnostics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Basic Info</h3>
                <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                  {JSON.stringify(diagnostics.urlInfo, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Parameter Test</h3>
                <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                  {JSON.stringify(diagnostics.parameterTest, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Database Test</h3>
                <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                  {JSON.stringify(diagnostics.databaseTest, null, 2)}
                </pre>
              </div>

              {diagnostics.assistantQuery && (
                <div>
                  <h3 className="font-semibold mb-2">Assistant Query</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(diagnostics.assistantQuery, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Environment</h3>
                <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                  {JSON.stringify(diagnostics.environment, null, 2)}
                </pre>
              </div>

              {diagnostics.generalError && (
                <div>
                  <h3 className="font-semibold mb-2 text-red-600">General Error</h3>
                  <pre className="bg-red-50 p-3 rounded text-sm text-red-800">
                    {diagnostics.generalError}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
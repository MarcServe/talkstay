import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { runProductionDiagnostics, EnvironmentDiagnostics } from '@/utils/productionDiagnostics';
import { getEnvironment } from '@/config/environment';

interface ProductionDebugPanelProps {
  assistantId?: string;
  show: boolean;
  onClose: () => void;
}

export const ProductionDebugPanel = ({ assistantId, show, onClose }: ProductionDebugPanelProps) => {
  const [diagnostics, setDiagnostics] = useState<EnvironmentDiagnostics | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (show && assistantId) {
      runDiagnostics();
    }
  }, [show, assistantId]);

  const runDiagnostics = async () => {
    setIsRunning(true);
    try {
      const results = await runProductionDiagnostics(assistantId);
      setDiagnostics(results);
    } catch (error) {
      console.error('Failed to run diagnostics:', error);
    } finally {
      setIsRunning(false);
    }
  };

  if (!show) return null;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      error: 'destructive',
      warning: 'secondary',
      info: 'outline'
    } as const;
    
    return variants[severity as keyof typeof variants] || 'outline';
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full max-h-[80vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Production Environment Diagnostics</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {isRunning ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full mx-auto mb-4"></div>
              <p>Running diagnostics...</p>
            </div>
          ) : diagnostics ? (
            <div className="space-y-4">
              {/* Environment Info */}
              <Card className="p-4">
                <h3 className="font-medium mb-3">Environment Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Environment:</span>
                    <Badge className="ml-2">{diagnostics.environment}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hostname:</span>
                    <span className="ml-2 font-mono text-xs">{diagnostics.hostname}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Base URL:</span>
                    <span className="ml-2 font-mono text-xs">{diagnostics.config.baseUrl}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Widget URL:</span>
                    <span className="ml-2 font-mono text-xs">{diagnostics.config.widgetUrl}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Assistant Accessible:</span>
                    {diagnostics.assistantLoadable ? (
                      <CheckCircle className="w-4 h-4 text-green-500 inline ml-2" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-500 inline ml-2" />
                    )}
                  </div>
                </div>
              </Card>

              {/* Issues */}
              {diagnostics.issues.length > 0 ? (
                <Card className="p-4">
                  <h3 className="font-medium mb-3">Issues Detected</h3>
                  <div className="space-y-3">
                    {diagnostics.issues.map((issue, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-start gap-2 mb-2">
                          {getSeverityIcon(issue.severity)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{issue.issue}</span>
                              <Badge variant={getSeverityBadge(issue.severity)} className="text-xs">
                                {issue.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{issue.details}</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                              💡 {issue.suggestion}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : (
                <Card className="p-4">
                  <div className="text-center py-4">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <h3 className="font-medium text-green-700 dark:text-green-400">All Good!</h3>
                    <p className="text-sm text-muted-foreground">No issues detected in the current environment.</p>
                  </div>
                </Card>
              )}

              <div className="flex gap-2">
                <Button onClick={runDiagnostics} variant="outline" size="sm">
                  Run Again
                </Button>
                <Button onClick={onClose} size="sm">
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Click to run production diagnostics</p>
              <Button onClick={runDiagnostics}>Run Diagnostics</Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

// Quick debug trigger for development
export const ProductionDebugTrigger = ({ assistantId }: { assistantId?: string }) => {
  const [showPanel, setShowPanel] = useState(false);
  const environment = getEnvironment();

  // Only show in development or staging
  if (environment === 'production') return null;

  return (
    <>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setShowPanel(true)}
        className="fixed bottom-4 left-4 z-40 bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
      >
        🔧 Debug
      </Button>
      <ProductionDebugPanel 
        assistantId={assistantId}
        show={showPanel}
        onClose={() => setShowPanel(false)}
      />
    </>
  );
};
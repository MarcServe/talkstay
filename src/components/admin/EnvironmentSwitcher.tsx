import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Globe, TestTube, Wrench } from 'lucide-react';
import { getEnvironment, getCurrentConfig, ENVIRONMENT_CONFIG } from '@/config/environment';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const EnvironmentSwitcher = () => {
  const currentEnv = getEnvironment();
  const currentConfig = getCurrentConfig();
  const [selectedEnv, setSelectedEnv] = useState(currentEnv);

  const envDetails = {
    production: {
      icon: Globe,
      color: 'bg-green-500',
      description: 'Live environment - affects real users',
      warning: true
    },
    staging: {
      icon: TestTube,
      color: 'bg-orange-500',
      description: 'Testing environment - safe for experiments',
      warning: false
    },
    development: {
      icon: Wrench,
      color: 'bg-blue-500',
      description: 'Local development environment',
      warning: false
    }
  };

  const handleEnvironmentSwitch = (env: string) => {
    if (env === 'production') {
      window.open('https://talkweb.io', '_blank');
    } else if (env === 'staging') {
      window.open('https://staging.talkweb.io', '_blank');
    } else {
      window.open('http://localhost:8080', '_blank');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Environment Control
          <Badge variant="outline" className="ml-auto">
            Current: {currentEnv.toUpperCase()}
          </Badge>
        </CardTitle>
        <CardDescription>
          Manage different environments for safe development and testing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentEnv === 'production' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You are currently in PRODUCTION. Changes may affect live user experiences.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3">
          {Object.entries(envDetails).map(([env, details]) => {
            const Icon = details.icon;
            const isActive = env === currentEnv;
            const config = ENVIRONMENT_CONFIG[env as keyof typeof ENVIRONMENT_CONFIG];

            return (
              <div 
                key={env}
                className={`p-4 border rounded-lg transition-all ${
                  isActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${details.color} text-white`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-medium capitalize">{env}</h3>
                      <p className="text-sm text-muted-foreground">{details.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{config.baseUrl}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <Badge variant="secondary">Active</Badge>
                    )}
                    {!isActive && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEnvironmentSwitch(env)}
                      >
                        Switch
                      </Button>
                    )}
                  </div>
                </div>

                {details.warning && env === 'production' && (
                  <div className="mt-3 p-2 bg-destructive/10 text-destructive text-xs rounded border border-destructive/20">
                    ⚠️ Production environment - changes affect live users
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Current Configuration</h4>
          <div className="space-y-1 text-sm">
            <div><strong>Base URL:</strong> {currentConfig.baseUrl}</div>
            <div><strong>Widget URL:</strong> {currentConfig.widgetUrl}</div>
            <div><strong>Supabase:</strong> {currentConfig.supabaseUrl}</div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Widget Testing Script</h4>
          <p className="text-sm text-blue-700 mb-2">Use this script to test widgets in staging:</p>
          <code className="block p-2 bg-blue-100 rounded text-xs font-mono text-blue-800 break-all">
            {`<script data-assistant="staging-d872e528-d39d-4d53-9f03-1eb7bd724048" data-base-url="https://staging.talkweb.io" src="https://staging.talkweb.io/widget-staging.js"></script>`}
          </code>
        </div>
      </CardContent>
    </Card>
  );
};
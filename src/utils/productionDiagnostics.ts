// Production Environment Diagnostic Utilities
import { getEnvironment, getCurrentConfig } from '@/config/environment';

export interface DiagnosticResult {
  issue: string;
  severity: 'error' | 'warning' | 'info';
  details: string;
  suggestion: string;
}

export interface EnvironmentDiagnostics {
  environment: string;
  hostname: string;
  url: string;
  config: any;
  issues: DiagnosticResult[];
  assistantLoadable: boolean;
}

export const runProductionDiagnostics = async (assistantId?: string): Promise<EnvironmentDiagnostics> => {
  const environment = getEnvironment();
  const config = getCurrentConfig();
  const hostname = window.location.hostname;
  const url = window.location.href;
  const issues: DiagnosticResult[] = [];
  
  console.log('🔍 Running production diagnostics...');
  console.log('Environment:', environment);
  console.log('Hostname:', hostname);
  console.log('Config:', config);
  
  // Check environment detection
  if (environment === 'production' && hostname.includes('lovable.app')) {
    issues.push({
      issue: 'Environment Detection Mismatch',
      severity: 'warning',
      details: 'Lovable.app domains are being detected as production',
      suggestion: 'Consider treating lovable.app domains as staging for better debugging'
    });
  }
  
  // Check widget URL consistency
  if (environment === 'production' && config.widgetUrl !== config.baseUrl + '/widget.js') {
    issues.push({
      issue: 'Widget URL Inconsistency',
      severity: 'warning',
      details: `Widget URL (${config.widgetUrl}) doesn't match base URL pattern`,
      suggestion: 'Ensure widget URL is consistent with base URL'
    });
  }
  
  // Check CORS configuration
  const corsIssue = await checkCorsConfiguration(config.baseUrl);
  if (corsIssue) {
    issues.push(corsIssue);
  }
  
  // Check assistant accessibility if ID provided
  let assistantLoadable = true;
  if (assistantId) {
    const assistantCheck = await checkAssistantAccessibility(assistantId);
    assistantLoadable = assistantCheck.accessible;
    if (!assistantCheck.accessible) {
      issues.push({
        issue: 'Assistant Not Accessible',
        severity: 'error',
        details: assistantCheck.reason || 'Assistant cannot be loaded',
        suggestion: 'Check assistant configuration and trial/embed status'
      });
    }
  }
  
  return {
    environment,
    hostname,
    url,
    config,
    issues,
    assistantLoadable
  };
};

const checkCorsConfiguration = async (baseUrl: string): Promise<DiagnosticResult | null> => {
  try {
    // Simple fetch test to check CORS
    const response = await fetch(`${baseUrl}/preview/test`, { method: 'HEAD' });
    return null; // No CORS issues
  } catch (error) {
    if (error instanceof Error && error.message.includes('CORS')) {
      return {
        issue: 'CORS Configuration Error',
        severity: 'error',
        details: 'Cross-origin requests are being blocked',
        suggestion: 'Check CORS settings in edge functions and server configuration'
      };
    }
    return null;
  }
};

const checkAssistantAccessibility = async (assistantId: string) => {
  try {
    const response = await fetch(`https://oujqkygfmyapmrgxmhvt.supabase.co/rest/v1/assistants?id=eq.${assistantId}&select=id,is_trial,trial_expires_at,embed_code`, {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91anFreWdmbXlhcG1yZ3htaHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNzE4NjEsImV4cCI6MjA2Nzc0Nzg2MX0.QIbZhxQTXqPQhNhlLqBVGYtgsq4gpjgE5ZCa3VY7pKg',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      return { 
        accessible: false, 
        reason: `HTTP ${response.status}: Failed to fetch assistant data` 
      };
    }
    
    const data = await response.json();
    if (!data || data.length === 0) {
      return { 
        accessible: false, 
        reason: 'Assistant not found in database' 
      };
    }
    
    const assistant = data[0];
    const isTrialActive = assistant.is_trial && assistant.trial_expires_at && new Date(assistant.trial_expires_at) > new Date();
    const hasEmbedCode = assistant.embed_code && assistant.embed_code.trim() !== '';
    
    if (!isTrialActive && !hasEmbedCode) {
      return { 
        accessible: false, 
        reason: 'Assistant is not publicly accessible (trial expired and no embed code)' 
      };
    }
    
    return { accessible: true };
  } catch (error) {
    return { 
      accessible: false, 
      reason: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};

export const logDiagnostics = (diagnostics: EnvironmentDiagnostics) => {
  console.group('🏥 Environment Diagnostics');
  console.log('Environment:', diagnostics.environment);
  console.log('Hostname:', diagnostics.hostname);
  console.log('Config:', diagnostics.config);
  console.log('Assistant Loadable:', diagnostics.assistantLoadable);
  
  if (diagnostics.issues.length > 0) {
    console.group('⚠️ Issues Found');
    diagnostics.issues.forEach(issue => {
      const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`${icon} ${issue.issue}`);
      console.log(`   Details: ${issue.details}`);
      console.log(`   Suggestion: ${issue.suggestion}`);
    });
    console.groupEnd();
  } else {
    console.log('✅ No issues detected');
  }
  
  console.groupEnd();
};
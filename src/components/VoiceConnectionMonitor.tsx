import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { voiceFlowTracker, FlowState } from '@/utils/VoiceFlowTracker';

interface VoiceConnectionMonitorProps {
  enabled: boolean;
}

export const VoiceConnectionMonitor: React.FC<VoiceConnectionMonitorProps> = ({ enabled }) => {
  const [flowState, setFlowState] = useState<FlowState>(voiceFlowTracker.getFlowState());
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({});
  const [issues, setIssues] = useState<string[]>([]);

  useEffect(() => {
    if (!enabled) return;

    // Subscribe to flow state changes
    const unsubscribe = voiceFlowTracker.subscribe((newState) => {
      setFlowState(newState);
    });

    // Update data every second
    const interval = setInterval(() => {
      setRecentEvents(voiceFlowTracker.getRecentEvents(undefined, 10));
      setPerformanceMetrics(voiceFlowTracker.getPerformanceMetrics());
      setIssues(voiceFlowTracker.diagnoseFlow());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [enabled]);

  if (!enabled) return null;

  const getConnectionBadge = (health: FlowState['connectionHealth']) => {
    const variants = {
      HEALTHY: 'default',
      DEGRADED: 'secondary', 
      DISCONNECTED: 'destructive'
    } as const;

    const colors = {
      HEALTHY: 'text-green-400',
      DEGRADED: 'text-yellow-400',
      DISCONNECTED: 'text-red-400'
    } as const;

    return (
      <Badge variant={variants[health]} className={colors[health]}>
        {health}
      </Badge>
    );
  };

  const getAudioBadge = (health: FlowState['audioHealth']) => {
    const variants = {
      GOOD: 'default',
      POOR: 'secondary',
      SILENT: 'outline'
    } as const;

    const colors = {
      GOOD: 'text-green-400',
      POOR: 'text-yellow-400', 
      SILENT: 'text-gray-400'
    } as const;

    return (
      <Badge variant={variants[health]} className={colors[health]}>
        🎤 {health}
      </Badge>
    );
  };

  return (
    <div className="fixed top-4 right-4 w-80 z-[9998]">
      <Card className="bg-black/95 border-green-500 text-white p-4">
        <div className="text-green-400 font-bold mb-3 text-sm">
          🔍 PHASE 3: VOICE FLOW MONITOR
        </div>

        {/* Connection Status */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs">Connection:</span>
            {getConnectionBadge(flowState.connectionHealth)}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">Audio:</span>
            {getAudioBadge(flowState.audioHealth)}
          </div>
        </div>

        {/* Flow State Indicators */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
          <div className={`text-center p-1 rounded ${flowState.isRecording ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>
            🎤 {flowState.isRecording ? 'REC' : 'OFF'}
          </div>
          <div className={`text-center p-1 rounded ${flowState.isProcessing ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
            🧠 {flowState.isProcessing ? 'PROC' : 'IDLE'}
          </div>
          <div className={`text-center p-1 rounded ${flowState.isStreaming ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
            📡 {flowState.isStreaming ? 'STRM' : 'OFF'}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mb-4 text-xs space-y-1">
          <div className="text-green-300 font-semibold">Performance:</div>
          <div>Audio→Text: {performanceMetrics.avgAudioToTranscript || 0}ms</div>
          <div>Text→UI: {performanceMetrics.avgTranscriptToUI || 0}ms</div>
          <div>Success Rate: {performanceMetrics.successRate || 0}%</div>
          <div>Chunks: {performanceMetrics.totalAudioChunks || 0}</div>
        </div>

        {/* Issues */}
        {issues.length > 0 && (
          <div className="mb-4">
            <div className="text-red-400 font-semibold text-xs mb-1">Issues:</div>
            {issues.map((issue, i) => (
              <div key={i} className="text-red-300 text-xs">⚠️ {issue}</div>
            ))}
          </div>
        )}

        {/* Recent Events */}
        <div className="max-h-32 overflow-y-auto">
          <div className="text-green-300 font-semibold text-xs mb-1">Recent Events:</div>
          {recentEvents.slice(0, 5).map((event, i) => (
            <div key={event.id} className="text-xs text-gray-300 mb-1">
              <span className="text-blue-400">{event.phase.split('_')[0]}</span>: {event.event}
              {event.latency && <span className="text-yellow-400 ml-1">({event.latency.toFixed(0)}ms)</span>}
            </div>
          ))}
        </div>

        {/* Timing Info */}
        <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
          Last Speech: {flowState.lastUserSpeech ? `${Math.round((performance.now() - flowState.lastUserSpeech) / 1000)}s ago` : 'Never'}
        </div>
      </Card>
    </div>
  );
};
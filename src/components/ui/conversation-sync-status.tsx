import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw as Sync, 
  MessageCircle, 
  Mic, 
  ArrowRightLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Zap,
  Users,
  Settings
} from 'lucide-react';
import { conversationSynchronizer } from '@/utils/conversationSynchronizer';
import { cn } from '@/lib/utils';

interface ConversationSyncStatusProps {
  className?: string;
  compact?: boolean;
  showHistory?: boolean;
}

export const ConversationSyncStatus: React.FC<ConversationSyncStatusProps> = ({
  className,
  compact = false,
  showHistory = true
}) => {
  const [syncState, setSyncState] = useState(conversationSynchronizer.getSyncState());
  const [syncHistory, setSyncHistory] = useState(conversationSynchronizer.getSyncHistory());
  const [pendingOps, setPendingOps] = useState(conversationSynchronizer.getPendingOperations());
  const [isExpanded, setIsExpanded] = useState(!compact);

  useEffect(() => {
    const unsubscribe = conversationSynchronizer.subscribe((newState) => {
      setSyncState(newState);
      setSyncHistory(conversationSynchronizer.getSyncHistory());
      setPendingOps(conversationSynchronizer.getPendingOperations());
    });

    return unsubscribe;
  }, []);

  const handleForceSync = () => {
    conversationSynchronizer.forceSyncAll();
  };

  const handleClearSync = () => {
    conversationSynchronizer.clearSync();
  };

  const getSyncStatusColor = () => {
    if (syncState.pendingSync && pendingOps.length > 5) return 'text-amber-600';
    if (syncState.pendingSync) return 'text-blue-600';
    return 'text-emerald-600';
  };

  const getSyncStatusIcon = () => {
    if (syncState.pendingSync) return <RefreshCw className="w-4 h-4 animate-spin" />;
    return <CheckCircle2 className="w-4 h-4" />;
  };

  const formatTimestamp = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 1000) return 'just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'voice_to_text':
        return <div className="flex items-center gap-1"><Mic className="w-3 h-3" /><ArrowRightLeft className="w-2 h-2" /><MessageCircle className="w-3 h-3" /></div>;
      case 'text_to_voice':
        return <div className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /><ArrowRightLeft className="w-2 h-2" /><Mic className="w-3 h-3" /></div>;
      case 'state_sync':
        return <Users className="w-4 h-4" />;
      case 'conflict_resolution':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Sync className="w-4 h-4" />;
    }
  };

  if (compact && !isExpanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className={cn("gap-2", className)}
      >
        <Sync className="w-4 h-4" />
        Sync: {pendingOps.length} ops
        {getSyncStatusIcon()}
      </Button>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sync className="w-5 h-5" />
            Conversation Sync
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant={syncState.pendingSync ? 'secondary' : 'default'}
              className={cn("px-3 py-1", getSyncStatusColor())}
            >
              {getSyncStatusIcon()}
              {syncState.pendingSync ? `${pendingOps.length} pending` : 'Synchronized'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Sync Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mic className="w-4 h-4" />
              Voice Messages
            </div>
            <div className="text-lg font-bold">
              {syncHistory.filter(s => s.source === 'voice').length}
            </div>
            <div className="text-xs text-muted-foreground">Synced</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageCircle className="w-4 h-4" />
              Text Messages
            </div>
            <div className="text-lg font-bold">
              {syncHistory.filter(s => s.source === 'text').length}
            </div>
            <div className="text-xs text-muted-foreground">Synced</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="w-4 h-4" />
              Queue Size
            </div>
            <div className="text-lg font-bold">
              {pendingOps.length}
            </div>
            <div className="text-xs text-muted-foreground">Operations</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings className="w-4 h-4" />
              Conflict Mode
            </div>
            <div className="text-sm font-medium capitalize">
              {syncState.conflictResolution.replace('_', ' ')}
            </div>
            <div className="text-xs text-muted-foreground">Resolution</div>
          </div>
        </div>

        {/* Sync Progress */}
        {syncState.pendingSync && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Sync Progress</span>
              <span className="font-medium">{pendingOps.length} operations pending</span>
            </div>
            <Progress 
              value={Math.max(10, 100 - (pendingOps.length * 10))} 
              className="h-2"
            />
          </div>
        )}

        {/* Pending Operations */}
        {pendingOps.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Pending Operations ({pendingOps.length})
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {pendingOps.slice(0, 5).map((op, index) => (
                <div key={op.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-xs">
                  {getOperationIcon(op.type)}
                  <span className="capitalize flex-1">{op.type.replace('_', ' ')}</span>
                  <Badge variant="outline" className="text-xs py-0">
                    Priority {op.priority}
                  </Badge>
                  <span className="text-muted-foreground">
                    {formatTimestamp(op.timestamp)}
                  </span>
                </div>
              ))}
              {pendingOps.length > 5 && (
                <div className="text-xs text-muted-foreground text-center py-1">
                  + {pendingOps.length - 5} more operations
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Sync History */}
        {showHistory && syncHistory.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Recent Syncs ({syncHistory.length})
            </h4>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {syncHistory.slice(-5).reverse().map((sync, index) => (
                <div key={sync.messageId} className="flex items-center gap-2 text-xs">
                  <div className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    sync.source === 'voice' ? 'bg-blue-500' : 'bg-green-500'
                  )} />
                  <span className="capitalize">{sync.source} message</span>
                  <span className="text-muted-foreground truncate flex-1">
                    {sync.content.substring(0, 30)}{sync.content.length > 30 ? '...' : ''}
                  </span>
                  <span className="text-muted-foreground">
                    {formatTimestamp(sync.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleForceSync}
            disabled={pendingOps.length === 0}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Force Sync
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearSync}
            className="gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            Clear Queue
          </Button>

          {compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="ml-auto"
            >
              Collapse
            </Button>
          )}
        </div>

        {/* Sync Configuration */}
        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
          <div className="font-medium mb-1">Sync Configuration:</div>
          <div>• Conflict Resolution: {syncState.conflictResolution.replace('_', ' ')}</div>
          <div>• Auto-sync enabled with 2s intervals</div>
          <div>• Max retry attempts: 3 per operation</div>
        </div>
      </CardContent>
    </Card>
  );
};
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Mail, Webhook, MessageSquare, Send, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface NotificationLog {
  id: string;
  notification_type: 'email' | 'webhook' | 'slack' | 'discord' | 'realtime';
  status: 'pending' | 'sent' | 'failed';
  recipient: string | null;
  error_message: string | null;
  sent_at: string;
  metadata: any;
}

interface VoiceFormNotificationLogsProps {
  formId: string;
}

export const VoiceFormNotificationLogs: React.FC<VoiceFormNotificationLogsProps> = ({
  formId
}) => {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`notification-logs-${formId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'form_notification_logs',
          filter: `form_id=eq.${formId}`,
        },
        (payload) => {
          setLogs((current) => [payload.new as NotificationLog, ...current]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [formId]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('form_notification_logs')
        .select('*')
        .eq('form_id', formId)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading notification logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'webhook': return <Webhook className="w-4 h-4" />;
      case 'slack': return <MessageSquare className="w-4 h-4" />;
      case 'discord': return <Send className="w-4 h-4" />;
      case 'realtime': return <Bell className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-500">Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification History</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification History</CardTitle>
        <CardDescription>
          Recent notification delivery status and logs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No notifications sent yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    {getIcon(log.notification_type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium capitalize">
                        {log.notification_type}
                      </span>
                      {getStatusBadge(log.status)}
                    </div>

                    {log.recipient && (
                      <p className="text-sm text-muted-foreground truncate mb-1">
                        To: {log.recipient}
                      </p>
                    )}

                    {log.error_message && (
                      <p className="text-sm text-destructive mt-2 p-2 rounded bg-destructive/10">
                        {log.error_message}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      {getStatusIcon(log.status)}
                      <span>
                        {formatDistanceToNow(new Date(log.sent_at), { addSuffix: true })}
                      </span>
                      {log.metadata?.statusCode && (
                        <Badge variant="outline" className="text-xs">
                          HTTP {log.metadata.statusCode}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

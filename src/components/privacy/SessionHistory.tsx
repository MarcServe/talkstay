import React, { useState, useEffect } from 'react';
import { History, Trash2, Download, Calendar, Clock, Mic, MessageCircle, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface VoiceSession {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  messageCount: number;
  voiceMessageCount: number;
  textMessageCount: number;
  assistantId: string;
  assistantName: string;
  sessionType: 'voice' | 'mixed' | 'text';
  dataStored: boolean;
  canDelete: boolean;
}

export const SessionHistory: React.FC = () => {
  const [sessions, setSessions] = useState<VoiceSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<VoiceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'voice' | 'mixed' | 'text'>('all');
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSessionHistory();
  }, []);

  useEffect(() => {
    filterSessions();
  }, [sessions, searchTerm, filterType]);

  const loadSessionHistory = async () => {
    setLoading(true);
    
    // Simulate API call - replace with actual data fetching
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockSessions: VoiceSession[] = [
      {
        id: '1',
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        endTime: new Date(Date.now() - 2 * 60 * 60 * 1000 + 8 * 60 * 1000), // 8 minutes later
        duration: 8,
        messageCount: 12,
        voiceMessageCount: 8,
        textMessageCount: 4,
        assistantId: 'assistant-1',
        assistantName: 'TalkWeb Assistant',
        sessionType: 'mixed',
        dataStored: false,
        canDelete: true
      },
      {
        id: '2',
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        endTime: new Date(Date.now() - 24 * 60 * 60 * 1000 + 15 * 60 * 1000), // 15 minutes later
        duration: 15,
        messageCount: 23,
        voiceMessageCount: 23,
        textMessageCount: 0,
        assistantId: 'assistant-1',
        assistantName: 'TalkWeb Assistant',
        sessionType: 'voice',
        dataStored: false,
        canDelete: true
      },
      {
        id: '3',
        startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000), // 5 minutes later
        duration: 5,
        messageCount: 7,
        voiceMessageCount: 0,
        textMessageCount: 7,
        assistantId: 'assistant-2',
        assistantName: 'Support Assistant',
        sessionType: 'text',
        dataStored: true,
        canDelete: true
      }
    ];

    setSessions(mockSessions);
    setLoading(false);
  };

  const filterSessions = () => {
    let filtered = sessions;

    if (searchTerm) {
      filtered = filtered.filter(session => 
        session.assistantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(session => session.sessionType === filterType);
    }

    setFilteredSessions(filtered);
  };

  const handleSessionSelect = (sessionId: string, checked: boolean) => {
    const newSelected = new Set(selectedSessions);
    if (checked) {
      newSelected.add(sessionId);
    } else {
      newSelected.delete(sessionId);
    }
    setSelectedSessions(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSessions(new Set(filteredSessions.map(s => s.id)));
    } else {
      setSelectedSessions(new Set());
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      // Simulate API call to delete session
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setSelectedSessions(prev => {
        const newSelected = new Set(prev);
        newSelected.delete(sessionId);
        return newSelected;
      });
      
      toast.success('Session deleted successfully');
    } catch (error) {
      toast.error('Failed to delete session');
    }
  };

  const deleteSelectedSessions = async () => {
    try {
      // Simulate API call to delete multiple sessions
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSessions(prev => prev.filter(s => !selectedSessions.has(s.id)));
      setSelectedSessions(new Set());
      
      toast.success(`${selectedSessions.size} sessions deleted successfully`);
    } catch (error) {
      toast.error('Failed to delete sessions');
    }
  };

  const deleteAllSessions = async () => {
    try {
      // Simulate API call to delete all sessions
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSessions([]);
      setSelectedSessions(new Set());
      
      toast.success('All sessions deleted successfully');
    } catch (error) {
      toast.error('Failed to delete all sessions');
    }
  };

  const exportSession = (session: VoiceSession) => {
    const exportData = {
      sessionId: session.id,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime.toISOString(),
      duration: session.duration,
      messageCount: session.messageCount,
      voiceMessageCount: session.voiceMessageCount,
      textMessageCount: session.textMessageCount,
      assistantName: session.assistantName,
      sessionType: session.sessionType,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${session.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than an hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  const getSessionTypeIcon = (type: 'voice' | 'mixed' | 'text') => {
    switch (type) {
      case 'voice': return <Mic className="h-4 w-4 text-blue-600" />;
      case 'mixed': return <MessageCircle className="h-4 w-4 text-purple-600" />;
      case 'text': return <MessageCircle className="h-4 w-4 text-green-600" />;
    }
  };

  const getSessionTypeBadge = (type: 'voice' | 'mixed' | 'text') => {
    const colors = {
      voice: 'bg-blue-50 text-blue-700 border-blue-200',
      mixed: 'bg-purple-50 text-purple-700 border-purple-200',
      text: 'bg-green-50 text-green-700 border-green-200'
    };
    return (
      <Badge variant="outline" className={colors[type]}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Session History</h2>
          <p className="text-muted-foreground">Manage your voice interaction sessions</p>
        </div>
        <div className="flex gap-2">
          {selectedSessions.size > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedSessions.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Selected Sessions</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedSessions.size} selected sessions? 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteSelectedSessions}>
                    Delete Sessions
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete All Sessions</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete all your session history? 
                  This will permanently remove all voice interaction records and cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAllSessions}>
                  Delete All Sessions
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sessions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={(value: 'all' | 'voice' | 'mixed' | 'text') => setFilterType(value)}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="voice">Voice Only</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
                <SelectItem value="text">Text Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Sessions</CardTitle>
              <CardDescription>
                {filteredSessions.length} of {sessions.length} sessions
              </CardDescription>
            </div>
            {filteredSessions.length > 0 && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedSessions.size === filteredSessions.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">Select all</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No sessions found</p>
              {searchTerm || filterType !== 'all' ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterType('all');
                  }}
                  className="mt-2"
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map((session) => (
                <div key={session.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50">
                  <Checkbox
                    checked={selectedSessions.has(session.id)}
                    onCheckedChange={(checked) => handleSessionSelect(session.id, !!checked)}
                  />
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getSessionTypeIcon(session.sessionType)}
                        <span className="font-medium">{session.assistantName}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatRelativeTime(session.startTime)}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{formatDuration(session.duration)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {session.startTime.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })} - {session.endTime.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-sm font-medium">{session.messageCount} messages</span>
                      <div className="flex gap-1">
                        {session.voiceMessageCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {session.voiceMessageCount} voice
                          </Badge>
                        )}
                        {session.textMessageCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {session.textMessageCount} text
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getSessionTypeBadge(session.sessionType)}
                      {session.dataStored && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          Stored
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => exportSession(session)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    
                    {session.canDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Session</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this session? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteSession(session.id)}>
                              Delete Session
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
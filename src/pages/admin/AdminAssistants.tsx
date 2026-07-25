import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Bot, Activity, Clock, Search, Power, PowerOff, CalendarClock, ExternalLink, RefreshCw, User, ArrowRightLeft, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface AssistantRow {
  id: string;
  business_name: string;
  website_url: string;
  is_trial: boolean | null;
  trial_expires_at: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  language: string;
  voice_type: string;
  tone: string;
  embed_code: string | null;
  owner_email?: string;
}

interface UsageRow {
  assistant_id: string;
  conversations_30d: number;
  bookings_30d: number;
  leads_30d: number;
  clicks_30d: number;
  last_activity_at: string | null;
}

export function AdminAssistants() {
  const [assistants, setAssistants] = useState<AssistantRow[]>([]);
  const [usage, setUsage] = useState<Record<string, UsageRow>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expired" | "trial" | "idle">("all");
  const [selectedAssistant, setSelectedAssistant] = useState<AssistantRow | null>(null);
  const [expiryDialogOpen, setExpiryDialogOpen] = useState(false);
  const [newExpiryDays, setNewExpiryDays] = useState("30");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");

  const stats = {
    total: assistants.length,
    active: assistants.filter(a => !a.is_trial || (a.is_trial && a.trial_expires_at && new Date(a.trial_expires_at) > new Date())).length,
    expired: assistants.filter(a => a.is_trial && a.trial_expires_at && new Date(a.trial_expires_at) <= new Date()).length,
    trial: assistants.filter(a => a.is_trial && a.trial_expires_at && new Date(a.trial_expires_at) > new Date()).length,
  };

  useEffect(() => {
    fetchAssistants();
  }, []);

  const fetchAssistants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('assistants')
        .select('id, business_name, website_url, is_trial, trial_expires_at, created_at, updated_at, user_id, language, voice_type, tone, embed_code')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch owner emails
      const userIds = [...new Set((data || []).filter(a => a.user_id).map(a => a.user_id!))];
      let emailMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, email')
          .in('user_id', userIds);
        
        if (profiles) {
          profiles.forEach(p => { emailMap[p.user_id] = p.email; });
        }
      }

      setAssistants((data || []).map(a => ({
        ...a,
        owner_email: a.user_id ? emailMap[a.user_id] || 'Unknown' : 'No owner (trial)',
      })));

      // Fetch usage metrics (best-effort; do not block on failure)
      try {
        const { data: session } = await supabase.auth.getSession();
        const { data: usageRes } = await supabase.functions.invoke('admin-assistants-usage', {
          body: {},
          headers: session.session ? { Authorization: `Bearer ${session.session.access_token}` } : {},
        });
        const map: Record<string, UsageRow> = {};
        ((usageRes as any)?.usage ?? []).forEach((u: UsageRow) => { map[u.assistant_id] = u; });
        setUsage(map);
      } catch (e) {
        console.warn('usage fetch failed', e);
      }
    } catch (error) {
      console.error('Error fetching assistants:', error);
      toast.error('Failed to load assistants');
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (a: AssistantRow) => {
    if (!a.is_trial) return 'active';
    if (!a.trial_expires_at) return 'active';
    return new Date(a.trial_expires_at) > new Date() ? 'trial' : 'expired';
  };

  const activateAssistant = async (assistant: AssistantRow) => {
    setActionLoading(assistant.id);
    try {
      const { error } = await supabase
        .from('assistants')
        .update({ 
          is_trial: false, 
          trial_expires_at: null 
        })
        .eq('id', assistant.id);

      if (error) throw error;
      toast.success(`${assistant.business_name} activated permanently`);
      fetchAssistants();
    } catch (error) {
      console.error('Error activating assistant:', error);
      toast.error('Failed to activate assistant');
    } finally {
      setActionLoading(null);
    }
  };

  const deactivateAssistant = async (assistant: AssistantRow) => {
    setActionLoading(assistant.id);
    try {
      const { error } = await supabase
        .from('assistants')
        .update({ 
          is_trial: true, 
          trial_expires_at: new Date(Date.now() - 1000).toISOString() // Set expired
        })
        .eq('id', assistant.id);

      if (error) throw error;
      toast.success(`${assistant.business_name} deactivated`);
      fetchAssistants();
    } catch (error) {
      console.error('Error deactivating assistant:', error);
      toast.error('Failed to deactivate assistant');
    } finally {
      setActionLoading(null);
    }
  };

  const setExpiry = async () => {
    if (!selectedAssistant) return;
    setActionLoading(selectedAssistant.id);
    try {
      const days = parseInt(newExpiryDays);
      if (isNaN(days) || days < 1) {
        toast.error('Enter a valid number of days');
        return;
      }
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('assistants')
        .update({ 
          is_trial: true, 
          trial_expires_at: expiresAt 
        })
        .eq('id', selectedAssistant.id);

      if (error) throw error;
      toast.success(`${selectedAssistant.business_name} expiry set to ${days} days`);
      setExpiryDialogOpen(false);
      fetchAssistants();
    } catch (error) {
      console.error('Error setting expiry:', error);
      toast.error('Failed to set expiry');
    } finally {
      setActionLoading(null);
    }
  };

  const transferAssistant = async () => {
    if (!selectedAssistant || !transferEmail.trim()) return;
    setActionLoading(selectedAssistant.id);
    try {
      // Look up user_id from profiles by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', transferEmail.trim().toLowerCase())
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        toast.error(`No account found with email: ${transferEmail}`);
        return;
      }

      const { error } = await supabase
        .from('assistants')
        .update({ user_id: profile.user_id })
        .eq('id', selectedAssistant.id);

      if (error) throw error;
      toast.success(`${selectedAssistant.business_name} transferred to ${transferEmail}`);
      setTransferDialogOpen(false);
      setTransferEmail("");
      fetchAssistants();
    } catch (error) {
      console.error('Error transferring assistant:', error);
      toast.error('Failed to transfer assistant');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredAssistants = assistants.filter(a => {
    const status = getStatus(a);
    if (filter === 'idle') {
      const u = usage[a.id];
      const last = u?.last_activity_at ? new Date(u.last_activity_at).getTime() : 0;
      if (last && Date.now() - last < 30 * 86400000) return false;
    } else if (filter !== 'all' && status !== filter) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.business_name.toLowerCase().includes(q) ||
        a.website_url.toLowerCase().includes(q) ||
        (a.owner_email || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assistant Management</h1>
          <p className="text-muted-foreground">Activate, deactivate, and manage all voice assistants</p>
        </div>
        <Button onClick={fetchAssistants} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilter('all')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.total}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilter('active')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{loading ? "..." : stats.active}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilter('trial')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Trial</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{loading ? "..." : stats.trial}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilter('expired')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <PowerOff className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{loading ? "..." : stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, URL, or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'trial', 'expired', 'idle'] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* Assistants Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assistant</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Conv (30d)</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading assistants...</TableCell>
                </TableRow>
              ) : filteredAssistants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No assistants found</TableCell>
                </TableRow>
              ) : (
                filteredAssistants.map((a) => {
                  const status = getStatus(a);
                  const u = usage[a.id];
                  const last = u?.last_activity_at ? new Date(u.last_activity_at) : null;
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div>
                          <Link to={`/admin/assistants/${a.id}/activity`} className="font-medium text-foreground hover:text-primary">
                            {a.business_name}
                          </Link>
                          <a href={a.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                            {a.website_url.replace(/^https?:\/\//, '').slice(0, 40)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="truncate max-w-[160px]">{a.owner_email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          status === 'active' ? 'default' :
                          status === 'trial' ? 'secondary' :
                          'destructive'
                        }>
                          {status === 'active' ? 'Active' : status === 'trial' ? 'Trial' : 'Expired'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{u?.conversations_30d ?? 0}</TableCell>
                      <TableCell className="text-right tabular-nums">{u?.bookings_30d ?? 0}</TableCell>
                      <TableCell className="text-right tabular-nums">{u?.leads_30d ?? 0}</TableCell>
                      <TableCell>
                        {last ? (
                          <span className="text-xs text-muted-foreground">{last.toLocaleDateString()} {last.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No activity</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button asChild variant="outline" size="sm" className="gap-1">
                            <Link to={`/admin/assistants/${a.id}/activity`}>
                              <BarChart3 className="h-3 w-3" />
                              Activity
                            </Link>
                          </Button>
                          {status === 'active' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deactivateAssistant(a)}
                              disabled={actionLoading === a.id}
                              className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <PowerOff className="h-3 w-3" />
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => activateAssistant(a)}
                              disabled={actionLoading === a.id}
                              className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Power className="h-3 w-3" />
                              Activate
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAssistant(a);
                              setTransferEmail("");
                              setTransferDialogOpen(true);
                            }}
                            disabled={actionLoading === a.id}
                            className="gap-1"
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                            Transfer
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAssistant(a);
                              setExpiryDialogOpen(true);
                            }}
                            disabled={actionLoading === a.id}
                            className="gap-1"
                          >
                            <CalendarClock className="h-3 w-3" />
                            Set Expiry
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Set Expiry Dialog */}
      <Dialog open={expiryDialogOpen} onOpenChange={setExpiryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Expiry for {selectedAssistant?.business_name}</DialogTitle>
            <DialogDescription>
              Set the number of days from now when this assistant's trial will expire. The assistant will be locked after expiry.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Days from now</Label>
              <Input
                type="number"
                min="1"
                value={newExpiryDays}
                onChange={(e) => setNewExpiryDays(e.target.value)}
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground">
                Expires: {newExpiryDays && !isNaN(parseInt(newExpiryDays)) 
                  ? new Date(Date.now() + parseInt(newExpiryDays) * 86400000).toLocaleDateString()
                  : 'Enter valid days'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpiryDialogOpen(false)}>Cancel</Button>
            <Button onClick={setExpiry} disabled={actionLoading === selectedAssistant?.id}>
              Set Expiry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Ownership Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer {selectedAssistant?.business_name}</DialogTitle>
            <DialogDescription>
              Enter the email address of the new owner. They must already have an account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New owner email</Label>
              <Input
                type="email"
                value={transferEmail}
                onChange={(e) => setTransferEmail(e.target.value)}
                placeholder="newowner@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
            <Button onClick={transferAssistant} disabled={actionLoading === selectedAssistant?.id || !transferEmail.trim()}>
              Transfer Ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
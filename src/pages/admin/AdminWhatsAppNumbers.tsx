import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, MessageCircle, Trash2, CheckCircle2 } from 'lucide-react';

const COUNTRIES = [
  { code: 'GB', label: 'United Kingdom (+44)' },
  { code: 'US', label: 'United States (+1)' },
  { code: 'CA', label: 'Canada (+1)' },
  { code: 'AU', label: 'Australia (+61)' },
  { code: 'IE', label: 'Ireland (+353)' },
  { code: 'DE', label: 'Germany (+49)' },
  { code: 'FR', label: 'France (+33)' },
  { code: 'ES', label: 'Spain (+34)' },
  { code: 'NL', label: 'Netherlands (+31)' },
];

export default function AdminWhatsAppNumbers() {
  const [requests, setRequests] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [provDialog, setProvDialog] = useState<any>(null);
  const [provCountry, setProvCountry] = useState('GB');
  const [provAreaCode, setProvAreaCode] = useState('');
  const [provBusy, setProvBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: reqs }, { data: chs }] = await Promise.all([
      supabase
        .from('whatsapp_number_requests')
        .select('*, assistants:assistant_id (business_name, user_id)')
        .order('created_at', { ascending: false }),
      supabase
        .from('whatsapp_channels')
        .select('*, assistants:assistant_id (business_name)')
        .eq('owned_by_platform', true)
        .order('created_at', { ascending: false }),
    ]);
    setRequests(reqs || []);
    setChannels(chs || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openProvision = (req: any) => {
    setProvDialog(req);
    setProvCountry(req?.requested_country || 'GB');
    setProvAreaCode(req?.requested_area_code || '');
  };

  const provision = async () => {
    if (!provDialog) return;
    setProvBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-provision-number', {
        body: {
          assistantId: provDialog.assistant_id,
          countryCode: provCountry,
          areaCode: provAreaCode || undefined,
          requestId: provDialog.id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Provisioned ${data.e164}`);
      setProvDialog(null);
      load();
    } catch (err: any) {
      toast.error('Provision failed: ' + (err?.message || String(err)));
    } finally {
      setProvBusy(false);
    }
  };

  const reject = async (id: string) => {
    if (!confirm('Reject this request?')) return;
    await supabase.from('whatsapp_number_requests').update({ status: 'rejected' }).eq('id', id);
    load();
  };

  const markActive = async (channelId: string) => {
    const { error } = await supabase.functions.invoke('whatsapp-mark-sender-active', {
      body: { channelId, active: true },
    });
    if (error) toast.error(error.message);
    else { toast.success('Marked active'); load(); }
  };

  const release = async (channelId: string) => {
    if (!confirm('Release this number? It will be removed from Twilio and the customer.')) return;
    const { error } = await supabase.functions.invoke('whatsapp-release-number', {
      body: { channelId },
    });
    if (error) toast.error(error.message);
    else { toast.success('Released'); load(); }
  };

  return (
    <>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageCircle className="w-7 h-7 text-primary" />
            WhatsApp Numbers
          </h1>
          <p className="text-muted-foreground">Provision and manage dedicated WhatsApp numbers for customers.</p>
        </div>

        <Tabs defaultValue="requests">
          <TabsList>
            <TabsTrigger value="requests">
              Requests {requests.filter(r => r.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {requests.filter(r => r.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="channels">Provisioned ({channels.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-3 pt-4">
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : requests.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">No requests yet.</CardContent></Card>
            ) : (
              requests.map(r => (
                <Card key={r.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{r.assistants?.business_name || r.assistant_id}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.requested_country} · requested {new Date(r.created_at).toLocaleString()}
                      </div>
                      {r.notes && <div className="text-xs italic mt-1">"{r.notes}"</div>}
                    </div>
                    <Badge variant={r.status === 'pending' ? 'default' : 'outline'}>{r.status}</Badge>
                    {r.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => openProvision(r)}>Provision</Button>
                        <Button size="sm" variant="ghost" onClick={() => reject(r.id)}>Reject</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="channels" className="space-y-3 pt-4">
            {channels.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">No provisioned numbers.</CardContent></Card>
            ) : (
              channels.map(c => (
                <Card key={c.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono font-semibold">{c.twilio_number?.replace(/^whatsapp:/, '')}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {c.assistants?.business_name} · SID: {c.twilio_sid || '—'}
                      </div>
                    </div>
                    <Badge variant={c.provisioning_status === 'active' ? 'default' : 'outline'}>
                      {c.provisioning_status}
                    </Badge>
                    <div className="flex gap-2">
                      {c.provisioning_status !== 'active' && c.provisioning_status !== 'released' && (
                        <Button size="sm" onClick={() => markActive(c.id)}>
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Mark Active
                        </Button>
                      )}
                      {c.provisioning_status !== 'released' && (
                        <Button size="sm" variant="destructive" onClick={() => release(c.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!provDialog} onOpenChange={(o) => !o && setProvDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provision WhatsApp Number</DialogTitle>
            <CardDescription>
              This will purchase a Twilio number on your master account and link it to{' '}
              <strong>{provDialog?.assistants?.business_name}</strong>.
            </CardDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Country</Label>
              <Select value={provCountry} onValueChange={setProvCountry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Area code (optional)</Label>
              <Input value={provAreaCode} onChange={(e) => setProvAreaCode(e.target.value)} placeholder="e.g. 207" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setProvDialog(null)}>Cancel</Button>
            <Button onClick={provision} disabled={provBusy}>
              {provBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Purchase Number
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

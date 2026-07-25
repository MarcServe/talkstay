import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, CheckCircle, Clock, XCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BookingRow {
  id: string;
  user_name: string | null;
  user_email: string;
  user_phone: string | null;
  preferred_date: string;
  preferred_time: string | null;
  service_type: string | null;
  status: string;
  created_at: string;
  assistant_id: string;
  assistant_name?: string;
}

export function AdminBookings() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ total: 0, confirmed: 0, pending: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { fetchBookings(); }, []);

  useEffect(() => {
    let result = bookings;
    if (statusFilter !== "all") {
      result = result.filter(b => b.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(b =>
        (b.user_name || '').toLowerCase().includes(q) ||
        b.user_email.toLowerCase().includes(q) ||
        (b.service_type || '').toLowerCase().includes(q) ||
        (b.assistant_name || '').toLowerCase().includes(q)
      );
    }
    setFilteredBookings(result);
  }, [search, statusFilter, bookings]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, user_name, user_email, user_phone, preferred_date, preferred_time, service_type, status, created_at, assistant_id')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) { console.error('Error fetching bookings:', error); return; }

      // Get assistant names
      const assistantIds = [...new Set((data || []).map(b => b.assistant_id))];
      const { data: assistants } = await supabase
        .from('assistants')
        .select('id, business_name')
        .in('id', assistantIds);

      const assistantMap = new Map((assistants || []).map(a => [a.id, a.business_name]));

      const enriched = (data || []).map(b => ({
        ...b,
        assistant_name: assistantMap.get(b.assistant_id) || 'Unknown'
      }));

      setBookings(enriched);
      setStats({
        total: enriched.length,
        confirmed: enriched.filter(b => b.status === 'confirmed').length,
        pending: enriched.filter(b => b.status === 'pending').length,
        cancelled: enriched.filter(b => b.status === 'cancelled').length
      });
    } catch (error) {
      console.error('Error in fetchBookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', id);
    if (error) {
      toast({ title: "Error", description: "Failed to update booking status", variant: "destructive" });
    } else {
      toast({ title: "Updated", description: `Booking marked as ${newStatus}` });
      fetchBookings();
    }
  };

  const statusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      confirmed: { variant: "default", label: "Confirmed" },
      pending: { variant: "secondary", label: "Pending" },
      cancelled: { variant: "destructive", label: "Cancelled" },
      completed: { variant: "outline", label: "Completed" },
    };
    const c = config[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Booking Management</h1>
        <p className="text-muted-foreground">Monitor and manage appointment bookings</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>Search and filter bookings across all assistants</CardDescription>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, service..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading bookings...</p>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Assistant</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {search || statusFilter !== 'all' ? "No bookings match your filters" : "No bookings found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.user_name || '—'}</TableCell>
                        <TableCell>{b.user_email}</TableCell>
                        <TableCell>{b.preferred_date} {b.preferred_time || ''}</TableCell>
                        <TableCell>{b.service_type || '—'}</TableCell>
                        <TableCell className="text-xs">{b.assistant_name}</TableCell>
                        <TableCell>{statusBadge(b.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {b.status === 'pending' && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, 'confirmed')}>Confirm</Button>
                                <Button size="sm" variant="ghost" onClick={() => updateStatus(b.id, 'cancelled')}>Cancel</Button>
                              </>
                            )}
                            {b.status === 'confirmed' && (
                              <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, 'completed')}>Complete</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

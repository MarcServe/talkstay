import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, Calendar as CalendarIcon, Clock, Search, Download, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format, isValid } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const safeFormatDate = (dateString: string | null | undefined, formatStr: string = "PPP"): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (!isValid(date)) return "Invalid date";
  return format(date, formatStr);
};

interface Booking {
  id: string;
  user_name: string | null;
  user_email: string;
  user_phone: string | null;
  preferred_date: string;
  preferred_time: string | null;
  service_type: string | null;
  status: string;
  calendly_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ConsultationBookingsManagerProps {
  assistantId: string;
}

export const ConsultationBookingsManager = ({ assistantId }: ConsultationBookingsManagerProps) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    if (assistantId) {
      loadBookings();
    }
  }, [assistantId]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("assistant_id", assistantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading bookings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: newStatus })
        .eq("id", bookingId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: "Booking status has been updated successfully.",
      });

      loadBookings();
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    try {
      const csvContent = [
        ["Name", "Email", "Phone", "Date", "Time", "Service", "Status", "Created At"],
        ...filteredBookings.map((b) => [
          b.user_name || "N/A",
          b.user_email,
          b.user_phone || "N/A",
          safeFormatDate(b.preferred_date),
          b.preferred_time || "N/A",
          b.service_type || "N/A",
          b.status,
          safeFormatDate(b.created_at),
        ]),
      ]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookings_${statusFilter}_${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Exported ${filteredBookings.length} bookings to CSV`,
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      (booking.user_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      booking.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booking.service_type?.toLowerCase() || "").includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      pending: { variant: "outline", icon: AlertCircle },
      confirmed: { variant: "default", icon: CheckCircle },
      completed: { variant: "secondary", icon: CheckCircle },
      cancelled: { variant: "destructive", icon: XCircle },
    };
    
    const { variant, icon: Icon } = config[status] || { variant: "outline" as const, icon: AlertCircle };
    
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    completed: bookings.filter((b) => b.status === "completed").length,
  };

  if (!assistantId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Consultation Bookings</CardTitle>
          <CardDescription>Please select an assistant to view bookings</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Consultation Bookings</h2>
        <p className="text-muted-foreground">
          Manage consultation appointment bookings from clients
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bookings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleExportCSV} disabled={filteredBookings.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading bookings...
          </CardContent>
        </Card>
      ) : filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No bookings found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {booking.user_name || "Anonymous"}
                      {getStatusBadge(booking.status)}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Booked {safeFormatDate(booking.created_at)}
                    </CardDescription>
                  </div>
                  <Select
                    value={booking.status}
                    onValueChange={(value) => updateStatus(booking.id, value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${booking.user_email}`} className="hover:underline">
                        {booking.user_email}
                      </a>
                    </div>
                    {booking.user_phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${booking.user_phone}`} className="hover:underline">
                          {booking.user_phone}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span>Date: {safeFormatDate(booking.preferred_date)}</span>
                    </div>
                    {booking.preferred_time && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Time: {booking.preferred_time}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {booking.service_type && (
                      <div className="text-sm">
                        <span className="font-medium">Service: </span>
                        <Badge variant="secondary">{booking.service_type}</Badge>
                      </div>
                    )}
                    {booking.calendly_url && (
                      <div className="text-sm">
                        <a 
                          href={booking.calendly_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          View Calendly Event
                          <CalendarIcon className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
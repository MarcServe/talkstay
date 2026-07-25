import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarIcon, Trash2, Plus, AlertCircle, List, CalendarDays } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useSubscription } from '@/hooks/useSubscription';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Booking {
  id: string;
  assistant_id: string;
  user_name: string;
  user_email: string;
  user_phone?: string;
  service_type?: string;
  preferred_date: string;
  preferred_time: string;
  status: string;
  created_at: string;
}

interface TimeSlotManagerProps {
  assistantId: string;
}

export const TimeSlotManager = ({ assistantId }: TimeSlotManagerProps) => {
  const { subscription } = useSubscription();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [bookingForm, setBookingForm] = useState({
    user_name: '',
    user_email: '',
    user_phone: '',
    service_type: '',
    preferred_date: '',
    preferred_time: ''
  });

  useEffect(() => {
    if (assistantId) {
      fetchBookings();
    }
  }, [assistantId]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('assistant_id', assistantId)
        .order('preferred_date', { ascending: true })
        .order('preferred_time', { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    }
  };

  const openBookingModal = () => {
    setIsBookingModalOpen(true);
  };

  const closeBookingModal = () => {
    setIsBookingModalOpen(false);
    setBookingForm({
      user_name: '',
      user_email: '',
      user_phone: '',
      service_type: '',
      preferred_date: '',
      preferred_time: ''
    });
  };

  const handleCreateBooking = async () => {
    if (!bookingForm.user_name || !bookingForm.user_email || 
        !bookingForm.preferred_date || !bookingForm.preferred_time) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .insert([{
          assistant_id: assistantId,
          user_name: bookingForm.user_name,
          user_email: bookingForm.user_email,
          user_phone: bookingForm.user_phone || null,
          service_type: bookingForm.service_type || 'General Consultation',
          preferred_date: bookingForm.preferred_date,
          preferred_time: bookingForm.preferred_time,
          status: 'confirmed'
        }]);

      if (error) throw error;

      toast.success('Booking created successfully');
      closeBookingModal();
      fetchBookings();
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast.error(error.message || 'Failed to create booking');
    } finally {
      setIsLoading(false);
    }
  };

  const updateBookingStatus = async (id: string, newStatus: string) => {
    try {
      // Get the current booking to know the old status
      const currentBooking = bookings.find(b => b.id === id);
      const oldStatus = currentBooking?.status || 'unknown';
      
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Send status update email for confirmed, completed, or cancelled bookings
      // Always confirm the status update first
      toast.success(`Booking status updated to ${newStatus}`);

      // Try sending email notification (non-blocking)
      if (newStatus === 'confirmed' || newStatus === 'completed' || newStatus === 'cancelled') {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-booking-status-update', {
            body: {
              bookingId: id,
              newStatus: newStatus,
              oldStatus: oldStatus
            }
          });

          if (emailError) {
            console.error('Email notification failed (non-critical):', emailError);
            // Only show a subtle info toast — don't alarm the user
            toast.info('Email notification could not be sent. To enable email notifications, verify a custom domain in your Resend account.', {
              duration: 5000
            });
          } else {
            toast.success('Email notification sent to customer');
          }
        } catch (emailErr) {
          console.error('Email sending error (non-critical):', emailErr);
        }
      }

      fetchBookings();
    } catch (error: any) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update booking status');
    }
  };

  const deleteBooking = async (id: string) => {
    if (!confirm('Are you sure you want to delete this booking?')) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Booking deleted successfully');
      fetchBookings();
    } catch (error: any) {
      console.error('Error deleting booking:', error);
      toast.error('Failed to delete booking');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getBookedDates = () => {
    return bookings.map(booking => new Date(booking.preferred_date));
  };

  const getBookingsForDate = (date: Date | undefined) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(booking => booking.preferred_date === dateStr);
  };

  const selectedDateBookings = getBookingsForDate(selectedDate);

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          All times within your business hours are automatically available for booking. 
          Only booked appointments are shown below. You can manually add bookings or they will appear when visitors book through your AI assistant.
        </AlertDescription>
      </Alert>

      {!subscription?.subscribed && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Manual booking management is a premium feature. Please upgrade your subscription to use this feature.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Booked Appointments
            </span>
            <Button
              onClick={openBookingModal}
              disabled={!subscription?.subscribed}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Manual Booking
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No bookings yet. All times within your business hours are available. 
              Bookings will appear here when created manually or through your assistant.
            </div>
          ) : (
            <Tabs defaultValue="list" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  List View
                </TabsTrigger>
                <TabsTrigger value="calendar" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Calendar View
                </TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="mt-6">
                <div className="space-y-3">
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="p-4 border rounded-lg bg-muted/50"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{formatDate(booking.preferred_date)}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatTime(booking.preferred_time)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={booking.status}
                            onChange={(e) => updateBookingStatus(booking.id, e.target.value)}
                            disabled={!subscription?.subscribed}
                            className="text-sm border rounded px-2 py-1 bg-background"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteBooking(booking.id)}
                            disabled={!subscription?.subscribed}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid gap-2 text-sm pl-8">
                        <div>
                          <span className="font-medium">Customer:</span> {booking.user_name}
                        </div>
                        <div>
                          <span className="font-medium">Email:</span> {booking.user_email}
                        </div>
                        {booking.user_phone && (
                          <div>
                            <span className="font-medium">Phone:</span> {booking.user_phone}
                          </div>
                        )}
                        {booking.service_type && (
                          <div>
                            <span className="font-medium">Service:</span> {booking.service_type}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="calendar" className="mt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      modifiers={{
                        booked: getBookedDates()
                      }}
                      modifiersStyles={{
                        booked: {
                          fontWeight: 'bold',
                          backgroundColor: 'hsl(var(--primary))',
                          color: 'hsl(var(--primary-foreground))',
                          borderRadius: '0.5rem'
                        }
                      }}
                      className="rounded-md border"
                    />
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-4">
                      {selectedDate ? formatDate(selectedDate.toISOString()) : 'Select a date'}
                    </h3>
                    {selectedDateBookings.length === 0 ? (
                      <div className="text-muted-foreground text-sm">
                        No bookings for this date
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedDateBookings.map((booking) => (
                          <div
                            key={booking.id}
                            className="p-4 border rounded-lg bg-muted/50"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">
                                    {formatTime(booking.preferred_time)}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {booking.user_name}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <select
                                  value={booking.status}
                                  onChange={(e) => updateBookingStatus(booking.id, e.target.value)}
                                  disabled={!subscription?.subscribed}
                                  className="text-sm border rounded px-2 py-1 bg-background"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="confirmed">Confirmed</option>
                                  <option value="completed">Completed</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteBooking(booking.id)}
                                  disabled={!subscription?.subscribed}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="grid gap-2 text-sm pl-8">
                              <div>
                                <span className="font-medium">Email:</span> {booking.user_email}
                              </div>
                              {booking.user_phone && (
                                <div>
                                  <span className="font-medium">Phone:</span> {booking.user_phone}
                                </div>
                              )}
                              {booking.service_type && (
                                <div>
                                  <span className="font-medium">Service:</span> {booking.service_type}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Manual Booking Creation Modal */}
      <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Manual Booking</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="booking-name">Customer Name *</Label>
                <Input
                  id="booking-name"
                  value={bookingForm.user_name}
                  onChange={(e) => setBookingForm({ ...bookingForm, user_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="booking-email">Email *</Label>
                <Input
                  id="booking-email"
                  type="email"
                  value={bookingForm.user_email}
                  onChange={(e) => setBookingForm({ ...bookingForm, user_email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="booking-phone">Phone (Optional)</Label>
                <Input
                  id="booking-phone"
                  type="tel"
                  value={bookingForm.user_phone}
                  onChange={(e) => setBookingForm({ ...bookingForm, user_phone: e.target.value })}
                  placeholder="+44 123 456 7890"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="booking-service">Service Type (Optional)</Label>
                <Input
                  id="booking-service"
                  value={bookingForm.service_type}
                  onChange={(e) => setBookingForm({ ...bookingForm, service_type: e.target.value })}
                  placeholder="General Consultation"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="booking-date">Date *</Label>
                <Input
                  id="booking-date"
                  type="date"
                  value={bookingForm.preferred_date}
                  onChange={(e) => setBookingForm({ ...bookingForm, preferred_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="booking-time">Time *</Label>
                <Input
                  id="booking-time"
                  type="time"
                  value={bookingForm.preferred_time}
                  onChange={(e) => setBookingForm({ ...bookingForm, preferred_time: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeBookingModal}>
              Cancel
            </Button>
            <Button onClick={handleCreateBooking} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

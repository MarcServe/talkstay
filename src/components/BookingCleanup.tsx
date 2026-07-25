import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2, Calendar, RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface BookingCleanupProps {
  assistantId: string;
}

export const BookingCleanup = ({ assistantId }: BookingCleanupProps) => {
  const [isClearing, setIsClearing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const clearOldBookings = async () => {
    setIsClearing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Delete all pending/confirmed bookings with dates in the past
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('assistant_id', assistantId)
        .in('status', ['pending', 'confirmed'])
        .lt('preferred_date', today);

      if (error) throw error;

      toast.success('Old bookings cleared successfully');
    } catch (error: any) {
      console.error('Error clearing bookings:', error);
      toast.error('Failed to clear old bookings');
    } finally {
      setIsClearing(false);
    }
  };

  const resetAllBookings = async () => {
    setIsResetting(true);
    try {
      // Delete ALL bookings for this assistant to make all slots available
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('assistant_id', assistantId);

      if (error) throw error;

      toast.success('All bookings cleared - all time slots are now available');
    } catch (error: any) {
      console.error('Error resetting bookings:', error);
      toast.error('Failed to reset bookings');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card variant="dashboardCard" className="border-ai-cyan/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-ai-cyan" />
          Booking System Management
        </CardTitle>
        <CardDescription>
          Manage and reset your booking slots
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          onClick={clearOldBookings}
          disabled={isClearing || isResetting}
          variant="outline"
          className="w-full border-ai-cyan/40 hover:bg-ai-cyan/10"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {isClearing ? 'Clearing...' : 'Clear Past Bookings'}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              disabled={isClearing || isResetting}
              variant="outline"
              className="w-full border-orange-500/40 hover:bg-orange-500/10 text-orange-600 hover:text-orange-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {isResetting ? 'Resetting...' : 'Reset All Bookings'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset All Bookings?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete ALL bookings (past, present, and future) for this assistant.
                All time slots will become available again. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={resetAllBookings}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Reset All Bookings
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

import { useEffect, useState, useRef } from 'react';
import { conversationMemory } from '@/utils/ConversationMemory';

export const useBookingSync = () => {
  const [bookingModal, setBookingModal] = useState<any>(null);
  const autoConfirmationTriggeredRef = useRef(false);

  useEffect(() => {
    const unsubscribe = conversationMemory.subscribe((state) => {
      const pendingBooking = state.context.pendingBooking || {};
      const hasPendingValues = Object.values(pendingBooking).some(value =>
        typeof value === 'string' ? value.trim().length > 0 : Boolean(value)
      );

      if (hasPendingValues && conversationMemory.isBookingStale()) {
        console.warn('useBookingSync: Detected stale booking info, clearing before showing modal');
        autoConfirmationTriggeredRef.current = false;
        if (state.booking?.showConfirmation) {
          conversationMemory.hideBookingConfirmation();
        } else {
          setBookingModal(null);
        }
        conversationMemory.clearBookingInfo('chat');
        return;
      }

      const bookingIsComplete = Boolean(
        pendingBooking.userName &&
        pendingBooking.userEmail &&
        pendingBooking.userPhone &&
        pendingBooking.preferredDate &&
        pendingBooking.preferredTime
      );

      if (!bookingIsComplete) {
        autoConfirmationTriggeredRef.current = false;
        return;
      }

      const contextSnapshot = conversationMemory.getCurrentContext();
      const contextUpdates: Partial<typeof contextSnapshot> = {};

      if (contextSnapshot.collectingInfo) {
        contextUpdates.collectingInfo = null;
      }

      if (contextSnapshot.nextField) {
        contextUpdates.nextField = undefined;
      }

      if (contextSnapshot.conversationPhase !== 'confirming') {
        contextUpdates.conversationPhase = 'confirming';
      }

      if (Object.keys(contextUpdates).length > 0) {
        conversationMemory.setContext(contextUpdates);
      }

      if (state.booking?.showConfirmation || autoConfirmationTriggeredRef.current) {
        return;
      }

      autoConfirmationTriggeredRef.current = true;
      setTimeout(() => {
        const latestPending = conversationMemory.getCurrentContext().pendingBooking || {};
        const latestIsComplete = Boolean(
          latestPending.userName &&
          latestPending.userEmail &&
          latestPending.userPhone &&
          latestPending.preferredDate &&
          latestPending.preferredTime
        );

        if (!latestIsComplete || conversationMemory.isBookingStale()) {
          autoConfirmationTriggeredRef.current = false;
          return;
        }

        conversationMemory.showBookingConfirmation(latestPending, 'chat');
      }, 100);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = conversationMemory.subscribeToBookingEvents((event) => {
      console.log('BookingSync: Received event:', event);
      
      switch (event.type) {
        case 'show_confirmation':
          console.log('BookingSync: Showing confirmation modal');
          // Merge with existing booking info from conversation memory
          const contextBooking = conversationMemory.getCurrentContext().pendingBooking;
          setBookingModal({
            isOpen: true,
            details: {
              ...event.data,
              // Use captured email/phone from conversation memory if available
              userEmail: event.data.userEmail || contextBooking?.userEmail || '',
              userPhone: event.data.userPhone || contextBooking?.userPhone || '',
            },
            source: event.source
          });
          break;
          
        case 'hide_confirmation':
          console.log('BookingSync: Hiding confirmation modal');
          setBookingModal(null);
          break;
          
        case 'loading_changed':
          setBookingModal(prev => prev ? { 
            ...prev, 
            isLoading: event.data.isLoading 
          } : null);
          break;
          
        case 'data_updated':
          console.log('BookingSync: Updating booking data');
          setBookingModal(prev => prev ? {
            ...prev,
            details: {
              ...prev.details,
              ...event.data
            }
          } : null);
          break;
      }
    });

    return unsubscribe;
  }, []);

  const closeModal = () => {
    setBookingModal(null);
    conversationMemory.hideBookingConfirmation();
    autoConfirmationTriggeredRef.current = false;
  };

  return {
    bookingModal,
    closeModal
  };
};
import { useState, useCallback, useEffect, useMemo } from 'react';
import { conversationMemory, type AlternativeSlot } from '@/utils/ConversationMemory';

interface BookingInfo {
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  service?: string;
  preferredDate?: string;
  preferredTime?: string;
  message?: string;
}

export const useVoiceBooking = () => {
  const [bookingInfo, setBookingInfo] = useState<BookingInfo>({});
  const [isComplete, setIsComplete] = useState(false);
  const [alternativeSlots, setAlternativeSlots] = useState<AlternativeSlot[]>([]);

  const requiredFields = useMemo<Array<keyof BookingInfo>>(
    () => ['userName', 'userEmail', 'userPhone'],
    []
  );

  const isInfoComplete = useCallback((info: BookingInfo) => {
    return requiredFields.every(field => {
      const value = info[field];
      return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
    });
  }, [requiredFields]);

  const shallowEqual = (a: BookingInfo, b: BookingInfo) => {
    const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    for (const key of keys) {
      if ((a as any)?.[key] !== (b as any)?.[key]) {
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    const context = conversationMemory.getCurrentContext();
    const pending = context.pendingBooking || {};

    if (conversationMemory.isBookingStale() && Object.keys(pending).length > 0) {
      console.warn('useVoiceBooking: Detected stale booking info, clearing before syncing');
      conversationMemory.clearBookingInfo('chat');
      setBookingInfo({});
      setIsComplete(false);
    } else {
      setBookingInfo(prev => (shallowEqual(prev, pending) ? prev : { ...pending }));
      setIsComplete(isInfoComplete(pending));
    }

    const unsubscribe = conversationMemory.subscribe((state) => {
      const nextInfo = state.context.pendingBooking || {};
      const hasBooking = Object.keys(nextInfo).length > 0;

      if (hasBooking && conversationMemory.isBookingStale()) {
        console.warn('useVoiceBooking: Clearing stale booking info from subscription update');
        conversationMemory.clearBookingInfo('chat');
        setBookingInfo({});
        setIsComplete(false);
        return;
      }

      setBookingInfo(prev => (shallowEqual(prev, nextInfo) ? prev : { ...nextInfo }));
      setIsComplete(isInfoComplete(nextInfo));
      // Alternative slots functionality removed - not currently in use
    });

    return unsubscribe;
  }, [isInfoComplete]);

  const updateBookingInfo = useCallback((newInfo: Partial<BookingInfo>) => {
    setBookingInfo(prev => {
      const updated = { ...prev, ...newInfo };

      // Sync with conversation memory
      conversationMemory.updateBookingInfo({
        userName: updated.userName,
        userEmail: updated.userEmail,
        userPhone: updated.userPhone,
        service: updated.service,
        preferredDate: updated.preferredDate,
        preferredTime: updated.preferredTime,
        message: updated.message
      }, 'chat');

      // Check if all required fields are complete
      setIsComplete(isInfoComplete(updated));

      return updated;
    });
  }, [isInfoComplete]);

  const resetBooking = useCallback(() => {
    setBookingInfo({});
    setIsComplete(false);
    // Reset conversation memory booking info
    conversationMemory.clearBookingInfo('chat');
  }, []);

  const getBookingStatus = useCallback(() => {
    const missingFields = requiredFields.filter(field => !bookingInfo[field]);

    return {
      isComplete,
      missingFields,
      completedFields: requiredFields.filter(field => bookingInfo[field as keyof BookingInfo])
    };
  }, [bookingInfo, isComplete, requiredFields]);

  const selectAlternative = useCallback((index: number) => {
    const selected = conversationMemory.selectAlternativeSlot(index);
    if (selected) {
      // Update local state immediately
      setBookingInfo(prev => ({
        ...prev,
        preferredDate: selected.date,
        preferredTime: selected.start_time
      }));
    }
    return selected;
  }, []);

  return {
    bookingInfo,
    updateBookingInfo,
    resetBooking,
    getBookingStatus,
    isComplete,
    alternativeSlots,
    selectAlternative
  };
};
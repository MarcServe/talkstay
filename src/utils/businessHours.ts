/**
 * Business Hours Validation Utilities
 * Checks if current time is within configured business hours
 */

interface BusinessHours {
  enabled: boolean;
  timezone: string;
  hours: {
    [key: string]: {
      enabled: boolean;
      open: string;
      close: string;
    };
  };
}

/**
 * Check if business is currently open based on configured hours
 */
export const isBusinessOpen = (businessHours: BusinessHours): boolean => {
  // If business hours feature is disabled, assume always open
  if (!businessHours?.enabled) {
    return true;
  }

  try {
    // Get current time in business timezone
    const now = new Date();
    const timezone = businessHours.timezone || 'UTC';
    
    // Convert to timezone-aware time
    const timeInZone = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);

    // Extract day and time
    const [dayName, timeString] = timeInZone.split(', ');
    const currentDay = dayName.toLowerCase();
    const currentTime = timeString;

    // Check if day is enabled
    const dayConfig = businessHours.hours[currentDay];
    if (!dayConfig || !dayConfig.enabled) {
      return false;
    }

    // Compare times
    const { open, close } = dayConfig;
    const isOpen = currentTime >= open && currentTime < close;

    console.log('📊 Business Hours Check:', {
      timezone,
      currentDay,
      currentTime,
      openTime: open,
      closeTime: close,
      isOpen
    });

    return isOpen;
  } catch (error) {
    console.error('❌ Error checking business hours:', error);
    // On error, assume open to prevent blocking calls
    return true;
  }
};

/**
 * Get next available time slot
 */
export const getNextAvailableTime = (businessHours: BusinessHours): string => {
  if (!businessHours?.enabled) {
    return 'We are available now!';
  }

  const timezone = businessHours.timezone || 'UTC';
  const now = new Date();
  
  try {
    // Find next available day
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() + i);
      
      const dayName = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'long'
      }).format(checkDate).toLowerCase();

      const dayConfig = businessHours.hours[dayName];
      if (dayConfig?.enabled) {
        const dayLabel = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        if (i === 0) {
          return `Available today from ${dayConfig.open} to ${dayConfig.close}`;
        } else if (i === 1) {
          return `Available tomorrow from ${dayConfig.open} to ${dayConfig.close}`;
        } else {
          return `Available ${dayLabel} from ${dayConfig.open} to ${dayConfig.close}`;
        }
      }
    }

    return 'Please check our business hours';
  } catch (error) {
    console.error('Error getting next available time:', error);
    return 'Please contact us for availability';
  }
};

/**
 * Format business hours for display
 */
export const formatBusinessHours = (businessHours: BusinessHours): string => {
  if (!businessHours?.enabled) {
    return 'Open 24/7';
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const schedule: string[] = [];

  days.forEach(day => {
    const config = businessHours.hours[day];
    if (config?.enabled) {
      const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
      schedule.push(`${dayLabel}: ${config.open} - ${config.close}`);
    }
  });

  return schedule.join('\n');
};

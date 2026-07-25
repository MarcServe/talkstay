/**
 * Utility functions for generating calendar invite (.ics) files
 */

interface CalendarEvent {
  title: string;
  description: string;
  location?: string;
  startDate: string;  // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime?: string;   // HH:MM (optional, defaults to 1 hour after start)
  organizerName: string;
  organizerEmail: string;
  attendeeEmail: string;
  attendeeName?: string;
  videoMeetingUrl?: string;
}

/**
 * Format a date/time for ICS format (YYYYMMDDTHHMMSSZ)
 */
function formatICSDateTime(date: string, time: string): string {
  const [year, month, day] = date.split('-');
  const [hours, minutes] = time.split(':');
  return `${year}${month}${day}T${hours}${minutes}00Z`;
}

/**
 * Calculate end time (1 hour after start if not provided)
 */
function calculateEndTime(startTime: string, endTime?: string): string {
  if (endTime) return endTime;
  
  const [hours, minutes] = startTime.split(':').map(Number);
  const endHours = (hours + 1) % 24;
  return `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Escape special characters for ICS format
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate a unique ID for the calendar event
 */
function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@talkweb.ai`;
}

/**
 * Generate ICS file content for a calendar invite
 */
export function generateICSFile(event: CalendarEvent): string {
  const endTime = calculateEndTime(event.startTime, event.endTime);
  const startDateTime = formatICSDateTime(event.startDate, event.startTime);
  const endDateTime = formatICSDateTime(event.startDate, endTime);
  const now = formatICSDateTime(
    new Date().toISOString().split('T')[0],
    new Date().toTimeString().split(' ')[0].substring(0, 5)
  );

  let description = escapeICSText(event.description);
  
  // Add video meeting link to description if provided
  if (event.videoMeetingUrl) {
    description += `\\n\\nJoin Video Meeting: ${escapeICSText(event.videoMeetingUrl)}`;
  }

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TalkWeb//Booking System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${generateUID()}`,
    `DTSTAMP:${now}`,
    `DTSTART:${startDateTime}`,
    `DTEND:${endDateTime}`,
    `SUMMARY:${escapeICSText(event.title)}`,
    `DESCRIPTION:${description}`,
    event.location ? `LOCATION:${escapeICSText(event.location)}` : '',
    `ORGANIZER;CN=${escapeICSText(event.organizerName)}:mailto:${event.organizerEmail}`,
    `ATTENDEE;CN=${escapeICSText(event.attendeeName || event.attendeeEmail)};RSVP=TRUE:mailto:${event.attendeeEmail}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Appointment in 24 hours',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Appointment in 1 hour',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');

  return icsContent;
}

/**
 * Convert ICS content to base64 for email attachment
 */
export function icsToBase64(icsContent: string): string {
  return Buffer.from(icsContent, 'utf-8').toString('base64');
}

/**
 * Create attachment object for Resend email
 */
export function createICSAttachment(event: CalendarEvent) {
  const icsContent = generateICSFile(event);
  const base64Content = icsToBase64(icsContent);
  
  return {
    filename: 'appointment.ics',
    content: base64Content,
    type: 'text/calendar',
    disposition: 'attachment'
  };
}
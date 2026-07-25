/**
 * Natural Language Date/Time Parser
 * Parses relative dates ("next Tuesday", "tomorrow") and descriptive times ("half past 3", "2 o'clock")
 * into ISO date (YYYY-MM-DD) and 24h time (HH:MM) strings.
 */

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function nextDayOfWeek(dayIndex: number, fromDate: Date): Date {
  const result = new Date(fromDate);
  const diff = (dayIndex - fromDate.getDay() + 7) % 7 || 7;
  result.setDate(result.getDate() + diff);
  return result;
}

function stripOrdinal(s: string): string {
  return s.replace(/(st|nd|rd|th)$/i, '');
}

/**
 * Parse a natural language date string into YYYY-MM-DD format.
 * Returns null if the input cannot be parsed.
 */
export function parseNaturalDate(text: string): string | null {
  const normalized = text.toLowerCase().replace(/[.,!?]+$/g, '').trim();
  if (!normalized) return null;

  const now = new Date();

  // "today"
  if (/^today$/.test(normalized)) return toISO(now);

  // "tomorrow"
  if (/^tomorrow$/.test(normalized)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return toISO(d);
  }

  // "yesterday"
  if (/^yesterday$/.test(normalized)) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return toISO(d);
  }

  // "in N days/weeks"
  const inNMatch = normalized.match(/^in\s+(\d+)\s+(day|days|week|weeks)$/);
  if (inNMatch) {
    const n = parseInt(inNMatch[1]);
    const unit = inNMatch[2].startsWith('week') ? 7 : 1;
    const d = new Date(now);
    d.setDate(d.getDate() + n * unit);
    return toISO(d);
  }

  // "next <day>" e.g. "next tuesday"
  const nextDayMatch = normalized.match(/^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
  if (nextDayMatch) {
    const dayIdx = DAY_NAMES.indexOf(nextDayMatch[1]);
    return toISO(nextDayOfWeek(dayIdx, now));
  }

  // "<day> next week" e.g. "tuesday next week"
  const dayNextWeekMatch = normalized.match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+next\s+week$/);
  if (dayNextWeekMatch) {
    const dayIdx = DAY_NAMES.indexOf(dayNextWeekMatch[1]);
    const nextMonday = new Date(now);
    const daysUntilNextMonday = (1 - now.getDay() + 7) % 7 || 7;
    nextMonday.setDate(now.getDate() + daysUntilNextMonday);
    const result = new Date(nextMonday);
    const offset = (dayIdx - 1 + 7) % 7;
    result.setDate(nextMonday.getDate() + offset);
    return toISO(result);
  }

  // "this <day>" e.g. "this friday"
  const thisDayMatch = normalized.match(/^this\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
  if (thisDayMatch) {
    const dayIdx = DAY_NAMES.indexOf(thisDayMatch[1]);
    const diff = (dayIdx - now.getDay() + 7) % 7;
    if (diff === 0) return toISO(now);
    const d = new Date(now);
    d.setDate(d.getDate() + diff);
    return toISO(d);
  }

  // Just a day name: "tuesday" — treat as next occurrence
  const justDayMatch = normalized.match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
  if (justDayMatch) {
    const dayIdx = DAY_NAMES.indexOf(justDayMatch[1]);
    return toISO(nextDayOfWeek(dayIdx, now));
  }

  // "<month> <day>" or "<month> <day>, <year>" or "<month> <dayth> <year>"
  const monthDayMatch = normalized.match(
    /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?$/
  );
  if (monthDayMatch) {
    const monthIdx = MONTH_NAMES.indexOf(monthDayMatch[1]);
    const day = parseInt(monthDayMatch[2]);
    const year = monthDayMatch[3] ? parseInt(monthDayMatch[3]) : now.getFullYear();
    const d = new Date(year, monthIdx, day);
    // If the date is in the past this year and no year was specified, use next year
    if (!monthDayMatch[3] && d < now) {
      d.setFullYear(d.getFullYear() + 1);
    }
    return toISO(d);
  }

  // "<day> of <month>" or "<dayth> of <month>" or "<dayth> <month>"
  const dayOfMonthMatch = normalized.match(
    /^(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s*,?\s*(\d{4}))?$/
  );
  if (dayOfMonthMatch) {
    const day = parseInt(dayOfMonthMatch[1]);
    const monthIdx = MONTH_NAMES.indexOf(dayOfMonthMatch[2]);
    const year = dayOfMonthMatch[3] ? parseInt(dayOfMonthMatch[3]) : now.getFullYear();
    const d = new Date(year, monthIdx, day);
    if (!dayOfMonthMatch[3] && d < now) {
      d.setFullYear(d.getFullYear() + 1);
    }
    return toISO(d);
  }

  // "the <day>th" — assumes current or next month
  const theNthMatch = normalized.match(/^(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)$/);
  if (theNthMatch) {
    const day = parseInt(theNthMatch[1]);
    const d = new Date(now.getFullYear(), now.getMonth(), day);
    if (d <= now) {
      d.setMonth(d.getMonth() + 1);
    }
    return toISO(d);
  }

  return null;
}

/**
 * Parse a natural language time string into HH:MM (24h) format.
 * Returns null if the input cannot be parsed.
 */
export function parseNaturalTime(text: string): string | null {
  const normalized = text.toLowerCase().replace(/[.,!?]+$/g, '').trim();
  if (!normalized) return null;

  // "half past <N>"
  const halfPastMatch = normalized.match(/^half\s+past\s+(\d{1,2})$/);
  if (halfPastMatch) {
    const hour = inferBusinessHour(parseInt(halfPastMatch[1]));
    return `${String(hour).padStart(2, '0')}:30`;
  }

  // "quarter past <N>"
  const quarterPastMatch = normalized.match(/^quarter\s+past\s+(\d{1,2})$/);
  if (quarterPastMatch) {
    const hour = inferBusinessHour(parseInt(quarterPastMatch[1]));
    return `${String(hour).padStart(2, '0')}:15`;
  }

  // "quarter to <N>"
  const quarterToMatch = normalized.match(/^quarter\s+to\s+(\d{1,2})$/);
  if (quarterToMatch) {
    let hour = inferBusinessHour(parseInt(quarterToMatch[1]));
    hour = hour === 0 ? 23 : hour - 1;
    return `${String(hour).padStart(2, '0')}:45`;
  }

  // "<N> o'clock" or "<N> oclock"
  const oclockMatch = normalized.match(/^(\d{1,2})\s*o['']?\s*clock$/);
  if (oclockMatch) {
    const hour = inferBusinessHour(parseInt(oclockMatch[1]));
    return `${String(hour).padStart(2, '0')}:00`;
  }

  // "noon" / "midday"
  if (/^(noon|midday)$/.test(normalized)) return '12:00';

  // "midnight"
  if (/^midnight$/.test(normalized)) return '00:00';

  // Descriptive periods: "in the morning", "afternoon", "evening"
  if (/morning/.test(normalized)) return '09:00';
  if (/afternoon/.test(normalized)) return '14:00';
  if (/evening/.test(normalized)) return '18:00';

  return null;
}

/**
 * For ambiguous 12h values (1-12 without AM/PM), default to business hours (8-17).
 * E.g., "3 o'clock" → 15:00 (3 PM), "9 o'clock" → 09:00 (9 AM)
 */
function inferBusinessHour(hour: number): number {
  if (hour >= 1 && hour <= 7) return hour + 12; // 1-7 → 13:00-19:00
  if (hour >= 8 && hour <= 12) return hour;      // 8-12 → 08:00-12:00
  return hour; // already 24h
}

/**
 * Format an ISO date string to a human-readable string.
 * E.g. "2026-03-10" → "Tuesday, March 10, 2026"
 */
export function formatDateHuman(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

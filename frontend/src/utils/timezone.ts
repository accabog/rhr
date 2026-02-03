import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Extend dayjs with timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Get the user's timezone from their employee profile, or fall back to browser timezone.
 */
export function getUserTimezone(employeeTimezone?: string): string {
  if (employeeTimezone) {
    return employeeTimezone;
  }
  // Fall back to browser's timezone
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Convert a UTC time string (HH:mm:ss) to local time for display.
 * Combines with a date to handle timezone conversion correctly.
 */
export function utcTimeToLocal(
  date: string,
  time: string | null,
  timezone: string
): string | null {
  if (!time) return null;

  // Combine date and time as UTC, then convert to local timezone
  const utcDateTime = dayjs.utc(`${date}T${time}`);
  const localDateTime = utcDateTime.tz(timezone);

  return localDateTime.format('HH:mm');
}

/**
 * Convert a local time to UTC for storage.
 * Used when submitting time entries.
 */
export function localTimeToUtc(
  date: string,
  time: string,
  tz: string
): string {
  // Parse the time as being in the user's timezone
  const localDateTime = dayjs.tz(`${date}T${time}`, tz);
  // Convert to UTC
  const utcDateTime = localDateTime.utc();

  return utcDateTime.format('HH:mm:ss');
}

/**
 * Get the current time in the user's timezone.
 */
export function getCurrentLocalTime(tz: string): dayjs.Dayjs {
  return dayjs().tz(tz);
}

/**
 * Format a UTC time for display in a specific timezone.
 * Returns the time portion only (HH:mm).
 */
export function formatTimeInTimezone(
  date: string,
  time: string | null,
  tz: string
): string {
  if (!time) return '-';
  const localTime = utcTimeToLocal(date, time, tz);
  return localTime || '-';
}

// Re-export dayjs with plugins for use in components
export { dayjs };

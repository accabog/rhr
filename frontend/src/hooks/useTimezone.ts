import { useMemo } from 'react';
import { useCurrentEmployee } from './useEmployees';
import {
  getUserTimezone,
  utcTimeToLocal,
  localTimeToUtc,
  formatTimeInTimezone,
  getCurrentLocalTime,
} from '@/utils/timezone';

/**
 * Hook that provides timezone utilities based on the current employee's timezone.
 * Falls back to browser timezone if employee timezone is not set.
 */
export function useTimezone() {
  const { data: employee } = useCurrentEmployee();

  const timezone = useMemo(
    () => getUserTimezone(employee?.timezone),
    [employee?.timezone]
  );

  return {
    /** The user's timezone (IANA format, e.g., "America/New_York") */
    timezone,

    /** Convert UTC time to local time for display */
    toLocal: (date: string, time: string | null) =>
      utcTimeToLocal(date, time, timezone),

    /** Convert local time to UTC for storage */
    toUtc: (date: string, time: string) =>
      localTimeToUtc(date, time, timezone),

    /** Format a UTC time for display in user's timezone */
    formatTime: (date: string, time: string | null) =>
      formatTimeInTimezone(date, time, timezone),

    /** Get current time in user's timezone */
    getCurrentTime: () => getCurrentLocalTime(timezone),
  };
}

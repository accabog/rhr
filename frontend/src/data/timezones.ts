// IANA timezone database entries grouped by region
export const TIMEZONES = [
  // Americas
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)', offset: 'UTC-5' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)', offset: 'UTC-6' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)', offset: 'UTC-7' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)', offset: 'UTC-8' },
  { value: 'America/Anchorage', label: 'Alaska', offset: 'UTC-9' },
  { value: 'Pacific/Honolulu', label: 'Hawaii', offset: 'UTC-10' },
  { value: 'America/Toronto', label: 'Toronto', offset: 'UTC-5' },
  { value: 'America/Vancouver', label: 'Vancouver', offset: 'UTC-8' },
  { value: 'America/Mexico_City', label: 'Mexico City', offset: 'UTC-6' },
  { value: 'America/Sao_Paulo', label: 'Sao Paulo', offset: 'UTC-3' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires', offset: 'UTC-3' },
  { value: 'America/Lima', label: 'Lima', offset: 'UTC-5' },
  { value: 'America/Bogota', label: 'Bogota', offset: 'UTC-5' },
  { value: 'America/Santiago', label: 'Santiago', offset: 'UTC-4' },

  // Europe
  { value: 'Europe/London', label: 'London', offset: 'UTC+0' },
  { value: 'Europe/Dublin', label: 'Dublin', offset: 'UTC+0' },
  { value: 'Europe/Paris', label: 'Paris', offset: 'UTC+1' },
  { value: 'Europe/Berlin', label: 'Berlin', offset: 'UTC+1' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam', offset: 'UTC+1' },
  { value: 'Europe/Brussels', label: 'Brussels', offset: 'UTC+1' },
  { value: 'Europe/Vienna', label: 'Vienna', offset: 'UTC+1' },
  { value: 'Europe/Zurich', label: 'Zurich', offset: 'UTC+1' },
  { value: 'Europe/Madrid', label: 'Madrid', offset: 'UTC+1' },
  { value: 'Europe/Rome', label: 'Rome', offset: 'UTC+1' },
  { value: 'Europe/Stockholm', label: 'Stockholm', offset: 'UTC+1' },
  { value: 'Europe/Oslo', label: 'Oslo', offset: 'UTC+1' },
  { value: 'Europe/Copenhagen', label: 'Copenhagen', offset: 'UTC+1' },
  { value: 'Europe/Helsinki', label: 'Helsinki', offset: 'UTC+2' },
  { value: 'Europe/Warsaw', label: 'Warsaw', offset: 'UTC+1' },
  { value: 'Europe/Prague', label: 'Prague', offset: 'UTC+1' },
  { value: 'Europe/Budapest', label: 'Budapest', offset: 'UTC+1' },
  { value: 'Europe/Athens', label: 'Athens', offset: 'UTC+2' },
  { value: 'Europe/Bucharest', label: 'Bucharest', offset: 'UTC+2' },
  { value: 'Europe/Kiev', label: 'Kyiv', offset: 'UTC+2' },
  { value: 'Europe/Moscow', label: 'Moscow', offset: 'UTC+3' },
  { value: 'Europe/Istanbul', label: 'Istanbul', offset: 'UTC+3' },

  // Asia
  { value: 'Asia/Dubai', label: 'Dubai', offset: 'UTC+4' },
  { value: 'Asia/Riyadh', label: 'Riyadh', offset: 'UTC+3' },
  { value: 'Asia/Tel_Aviv', label: 'Tel Aviv', offset: 'UTC+2' },
  { value: 'Asia/Kolkata', label: 'Mumbai / New Delhi', offset: 'UTC+5:30' },
  { value: 'Asia/Karachi', label: 'Karachi', offset: 'UTC+5' },
  { value: 'Asia/Dhaka', label: 'Dhaka', offset: 'UTC+6' },
  { value: 'Asia/Bangkok', label: 'Bangkok', offset: 'UTC+7' },
  { value: 'Asia/Jakarta', label: 'Jakarta', offset: 'UTC+7' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Ho Chi Minh City', offset: 'UTC+7' },
  { value: 'Asia/Singapore', label: 'Singapore', offset: 'UTC+8' },
  { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur', offset: 'UTC+8' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong', offset: 'UTC+8' },
  { value: 'Asia/Taipei', label: 'Taipei', offset: 'UTC+8' },
  { value: 'Asia/Shanghai', label: 'Shanghai / Beijing', offset: 'UTC+8' },
  { value: 'Asia/Manila', label: 'Manila', offset: 'UTC+8' },
  { value: 'Asia/Seoul', label: 'Seoul', offset: 'UTC+9' },
  { value: 'Asia/Tokyo', label: 'Tokyo', offset: 'UTC+9' },

  // Australia & Pacific
  { value: 'Australia/Perth', label: 'Perth', offset: 'UTC+8' },
  { value: 'Australia/Adelaide', label: 'Adelaide', offset: 'UTC+9:30' },
  { value: 'Australia/Darwin', label: 'Darwin', offset: 'UTC+9:30' },
  { value: 'Australia/Brisbane', label: 'Brisbane', offset: 'UTC+10' },
  { value: 'Australia/Sydney', label: 'Sydney', offset: 'UTC+10' },
  { value: 'Australia/Melbourne', label: 'Melbourne', offset: 'UTC+10' },
  { value: 'Pacific/Auckland', label: 'Auckland', offset: 'UTC+12' },

  // Africa
  { value: 'Africa/Cairo', label: 'Cairo', offset: 'UTC+2' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg', offset: 'UTC+2' },
  { value: 'Africa/Lagos', label: 'Lagos', offset: 'UTC+1' },
  { value: 'Africa/Nairobi', label: 'Nairobi', offset: 'UTC+3' },

  // UTC
  { value: 'UTC', label: 'UTC', offset: 'UTC' },
] as const;

export type Timezone = (typeof TIMEZONES)[number]['value'];

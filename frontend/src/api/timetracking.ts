import { apiClient } from './client';
import type { PaginatedResponse } from '@/types';

export interface TimeEntryType {
  id: number;
  name: string;
  code: string;
  is_paid: boolean;
  multiplier: number;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: number;
  employee: number;
  employee_name: string;
  entry_type: number;
  entry_type_name: string;
  entry_type_color: string;
  date: string;
  start_time: string;
  end_time: string | null;
  break_minutes: number;
  notes: string;
  project: string;
  task: string;
  is_approved: boolean;
  approved_by: number | null;
  approved_at: string | null;
  duration_hours: number;
  duration_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface DailySummary {
  date: string;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  break_hours: number;
  entries_count: number;
}

export interface WeeklySummary {
  week_start: string;
  week_end: string;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  daily_breakdown: DailySummary[];
}

export interface ClockInData {
  entry_type?: number;
  notes?: string;
  project?: string;
  task?: string;
}

export interface ClockOutData {
  break_minutes?: number;
  notes?: string;
}

export interface TimeEntryFilters {
  employee?: number;
  entry_type?: number;
  start_date?: string;
  end_date?: string;
  is_approved?: boolean;
  page?: number;
  page_size?: number;
}

export const timetrackingApi = {
  // Time Entry Types
  listTypes: async (): Promise<TimeEntryType[]> => {
    const response = await apiClient.get<TimeEntryType[]>('/time-entries/types/');
    return response.data;
  },

  createType: async (data: Partial<TimeEntryType>): Promise<TimeEntryType> => {
    const response = await apiClient.post<TimeEntryType>('/time-entries/types/', data);
    return response.data;
  },

  // Time Entries
  list: async (filters?: TimeEntryFilters): Promise<PaginatedResponse<TimeEntry>> => {
    const response = await apiClient.get<PaginatedResponse<TimeEntry>>('/time-entries/', {
      params: filters,
    });
    return response.data;
  },

  getMyEntries: async (filters?: TimeEntryFilters): Promise<PaginatedResponse<TimeEntry>> => {
    const response = await apiClient.get<PaginatedResponse<TimeEntry>>(
      '/time-entries/my_entries/',
      { params: filters }
    );
    return response.data;
  },

  get: async (id: number): Promise<TimeEntry> => {
    const response = await apiClient.get<TimeEntry>(`/time-entries/${id}/`);
    return response.data;
  },

  create: async (data: Partial<TimeEntry>): Promise<TimeEntry> => {
    const response = await apiClient.post<TimeEntry>('/time-entries/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<TimeEntry>): Promise<TimeEntry> => {
    const response = await apiClient.patch<TimeEntry>(`/time-entries/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/time-entries/${id}/`);
  },

  // Clock actions
  getCurrent: async (): Promise<TimeEntry | null> => {
    const response = await apiClient.get<TimeEntry | null>('/time-entries/current/');
    return response.data;
  },

  clockIn: async (data?: ClockInData): Promise<TimeEntry> => {
    const response = await apiClient.post<TimeEntry>('/time-entries/clock_in/', data || {});
    return response.data;
  },

  clockOut: async (data?: ClockOutData): Promise<TimeEntry> => {
    const response = await apiClient.post<TimeEntry>('/time-entries/clock_out/', data || {});
    return response.data;
  },

  // Summary
  getSummary: async (startDate?: string, endDate?: string): Promise<WeeklySummary> => {
    const response = await apiClient.get<WeeklySummary>('/time-entries/summary/', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  // Approval
  approve: async (id: number): Promise<TimeEntry> => {
    const response = await apiClient.post<TimeEntry>(`/time-entries/${id}/approve/`);
    return response.data;
  },
};

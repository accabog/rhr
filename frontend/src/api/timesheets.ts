/**
 * Timesheets API client
 */

import apiClient from './client';

export interface TimesheetComment {
  id: number;
  author: number;
  author_name: string;
  content: string;
  created_at: string;
}

export interface TimeEntry {
  id: number;
  date: string;
  start_time: string;
  end_time: string | null;
  entry_type_name: string;
  entry_type_color: string;
  duration_minutes: number;
  break_minutes: number;
  project: string | null;
  task: string | null;
  is_approved: boolean;
}

export interface Timesheet {
  id: number;
  employee: number;
  employee_name: string;
  period_start: string;
  period_end: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  total_regular_hours: string;
  total_overtime_hours: string;
  total_break_hours: string;
  total_hours: number;
  submitted_at: string | null;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejection_reason: string;
  time_entries?: TimeEntry[];
  comments?: TimesheetComment[];
  created_at: string;
  updated_at: string;
}

export interface TimesheetListItem {
  id: number;
  employee: number;
  employee_name: string;
  period_start: string;
  period_end: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  total_regular_hours: string;
  total_overtime_hours: string;
  total_hours: number;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface GenerateTimesheetParams {
  period_start: string;
  period_end: string;
  employee_id?: number;
}

// Fetch user's timesheets
export async function fetchMyTimesheets(
  status?: string
): Promise<PaginatedResponse<TimesheetListItem>> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);

  const query = params.toString();
  const response = await apiClient.get(`/timesheets/my_timesheets/${query ? `?${query}` : ''}`);
  return response.data;
}

// Fetch all timesheets (for managers)
export async function fetchTimesheets(params?: {
  status?: string;
  employee?: number;
}): Promise<PaginatedResponse<TimesheetListItem>> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.append('status', params.status);
  if (params?.employee) searchParams.append('employee', params.employee.toString());

  const response = await apiClient.get(`/timesheets/?${searchParams}`);
  return response.data;
}

// Fetch timesheets pending approval
export async function fetchPendingApproval(): Promise<PaginatedResponse<TimesheetListItem>> {
  const response = await apiClient.get('/timesheets/pending_approval/');
  return response.data;
}

// Fetch single timesheet
export async function fetchTimesheet(id: number): Promise<Timesheet> {
  const response = await apiClient.get(`/timesheets/${id}/`);
  return response.data;
}

// Generate a timesheet from time entries
export async function generateTimesheet(
  params: GenerateTimesheetParams
): Promise<Timesheet> {
  const response = await apiClient.post('/timesheets/generate/', params);
  return response.data;
}

// Submit timesheet for approval
export async function submitTimesheet(
  id: number,
  notes?: string
): Promise<Timesheet> {
  const response = await apiClient.post(`/timesheets/${id}/submit/`, { notes });
  return response.data;
}

// Approve timesheet
export async function approveTimesheet(id: number): Promise<Timesheet> {
  const response = await apiClient.post(`/timesheets/${id}/approve/`);
  return response.data;
}

// Reject timesheet
export async function rejectTimesheet(
  id: number,
  reason: string
): Promise<Timesheet> {
  const response = await apiClient.post(`/timesheets/${id}/reject/`, { reason });
  return response.data;
}

// Reopen rejected timesheet
export async function reopenTimesheet(id: number): Promise<Timesheet> {
  const response = await apiClient.post(`/timesheets/${id}/reopen/`);
  return response.data;
}

// Add comment to timesheet
export async function addTimesheetComment(
  id: number,
  content: string
): Promise<TimesheetComment> {
  const response = await apiClient.post(`/timesheets/${id}/comments/`, { content });
  return response.data;
}

// Fetch timesheet comments
export async function fetchTimesheetComments(
  id: number
): Promise<TimesheetComment[]> {
  const response = await apiClient.get(`/timesheets/${id}/comments/`);
  return response.data;
}

// Delete timesheet
export async function deleteTimesheet(id: number): Promise<void> {
  await apiClient.delete(`/timesheets/${id}/`);
}

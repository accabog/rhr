/**
 * Leave Management API client
 */

import apiClient from './client';

export interface LeaveType {
  id: number;
  name: string;
  code: string;
  is_paid: boolean;
  requires_approval: boolean;
  max_consecutive_days: number | null;
  color: string;
  is_active: boolean;
}

export interface LeaveBalance {
  id: number;
  employee: number;
  employee_name: string;
  leave_type: number;
  leave_type_name: string;
  leave_type_color: string;
  year: number;
  entitled_days: string;
  used_days: string;
  carried_over: string;
  remaining_days: number;
}

export interface LeaveBalanceSummary {
  leave_type_id: number;
  leave_type_name: string;
  leave_type_color: string;
  entitled_days: string;
  used_days: string;
  remaining_days: string;
  pending_days: string;
}

export interface LeaveRequest {
  id: number;
  employee: number;
  employee_name: string;
  leave_type: number;
  leave_type_name: string;
  leave_type_color: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  half_day_period: 'morning' | 'afternoon' | '';
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_notes: string;
  days_requested: number;
  created_at: string;
}

export interface Holiday {
  id: number;
  name: string;
  date: string;
  is_recurring: boolean;
  applies_to_all: boolean;
  departments: number[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CreateLeaveRequestParams {
  leave_type: number;
  start_date: string;
  end_date: string;
  is_half_day?: boolean;
  half_day_period?: 'morning' | 'afternoon';
  reason?: string;
}

// Leave Types
export async function fetchLeaveTypes(): Promise<LeaveType[]> {
  const response = await apiClient.get('/leave/types/');
  return response.data;
}

// Leave Balances
export async function fetchMyBalances(year?: number): Promise<LeaveBalance[]> {
  const params = new URLSearchParams();
  if (year) params.append('year', year.toString());
  const response = await apiClient.get(`/leave/balances/my_balances/?${params}`);
  return response.data;
}

export async function fetchBalanceSummary(year?: number): Promise<LeaveBalanceSummary[]> {
  const params = new URLSearchParams();
  if (year) params.append('year', year.toString());
  const response = await apiClient.get(`/leave/balances/summary/?${params}`);
  return response.data;
}

// Leave Requests
export async function fetchMyLeaveRequests(
  status?: string
): Promise<PaginatedResponse<LeaveRequest>> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  const response = await apiClient.get(`/leave/requests/my_requests/?${params}`);
  return response.data;
}

export async function fetchPendingLeaveRequests(): Promise<
  PaginatedResponse<LeaveRequest>
> {
  const response = await apiClient.get('/leave/requests/pending_approval/');
  return response.data;
}

export async function fetchLeaveRequest(id: number): Promise<LeaveRequest> {
  const response = await apiClient.get(`/leave/requests/${id}/`);
  return response.data;
}

export async function createLeaveRequest(
  params: CreateLeaveRequestParams
): Promise<LeaveRequest> {
  const response = await apiClient.post('/leave/requests/', params);
  return response.data;
}

export async function approveLeaveRequest(
  id: number,
  notes?: string
): Promise<LeaveRequest> {
  const response = await apiClient.post(`/leave/requests/${id}/approve/`, { notes });
  return response.data;
}

export async function rejectLeaveRequest(
  id: number,
  notes?: string
): Promise<LeaveRequest> {
  const response = await apiClient.post(`/leave/requests/${id}/reject/`, { notes });
  return response.data;
}

export async function cancelLeaveRequest(id: number): Promise<LeaveRequest> {
  const response = await apiClient.post(`/leave/requests/${id}/cancel/`);
  return response.data;
}

export async function fetchLeaveCalendar(
  startDate: string,
  endDate: string
): Promise<LeaveRequest[]> {
  const response = await apiClient.get(
    `/leave/requests/calendar/?start_date=${startDate}&end_date=${endDate}`
  );
  return response.data;
}

// Holidays
export async function fetchHolidays(year?: number): Promise<Holiday[]> {
  const params = new URLSearchParams();
  if (year) params.append('year', year.toString());
  const response = await apiClient.get(`/leave/holidays/?${params}`);
  return response.data;
}

export async function fetchUpcomingHolidays(): Promise<Holiday[]> {
  const response = await apiClient.get('/leave/holidays/upcoming/');
  return response.data;
}

export async function createHoliday(
  params: Omit<Holiday, 'id'>
): Promise<Holiday> {
  const response = await apiClient.post('/leave/holidays/', params);
  return response.data;
}

export async function deleteHoliday(id: number): Promise<void> {
  await apiClient.delete(`/leave/holidays/${id}/`);
}

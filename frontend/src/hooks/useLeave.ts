/**
 * Leave Management React Query hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  fetchLeaveTypes,
  fetchMyBalances,
  fetchBalanceSummary,
  fetchMyLeaveRequests,
  fetchPendingLeaveRequests,
  fetchLeaveRequest,
  createLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
  fetchLeaveCalendar,
  fetchHolidays,
  fetchUpcomingHolidays,
  syncHolidays,
  fetchAvailableCountries,
  fetchTenantCountries,
  type CreateLeaveRequestParams,
} from '@/api/leave';

// Query keys
export const leaveKeys = {
  all: ['leave'] as const,
  types: () => [...leaveKeys.all, 'types'] as const,
  balances: () => [...leaveKeys.all, 'balances'] as const,
  myBalances: (year?: number) => [...leaveKeys.balances(), 'my', year] as const,
  summary: (year?: number) => [...leaveKeys.balances(), 'summary', year] as const,
  requests: () => [...leaveKeys.all, 'requests'] as const,
  myRequests: (status?: string) =>
    [...leaveKeys.requests(), 'my', status] as const,
  pendingRequests: () => [...leaveKeys.requests(), 'pending'] as const,
  request: (id: number) => [...leaveKeys.requests(), id] as const,
  calendar: (start: string, end: string) =>
    [...leaveKeys.all, 'calendar', start, end] as const,
  holidays: (year?: number, country?: string) => [...leaveKeys.all, 'holidays', year, country] as const,
  upcomingHolidays: () => [...leaveKeys.all, 'holidays', 'upcoming'] as const,
  availableCountries: () => [...leaveKeys.all, 'holidays', 'available-countries'] as const,
  tenantCountries: () => [...leaveKeys.all, 'holidays', 'tenant-countries'] as const,
};

// Leave Types
export function useLeaveTypes() {
  return useQuery({
    queryKey: leaveKeys.types(),
    queryFn: fetchLeaveTypes,
  });
}

// Leave Balances
export function useMyBalances(year?: number) {
  return useQuery({
    queryKey: leaveKeys.myBalances(year),
    queryFn: () => fetchMyBalances(year),
  });
}

export function useBalanceSummary(year?: number) {
  return useQuery({
    queryKey: leaveKeys.summary(year),
    queryFn: () => fetchBalanceSummary(year),
  });
}

// Leave Requests
export function useMyLeaveRequests(status?: string) {
  return useQuery({
    queryKey: leaveKeys.myRequests(status),
    queryFn: () => fetchMyLeaveRequests(status),
  });
}

export function usePendingLeaveRequests() {
  return useQuery({
    queryKey: leaveKeys.pendingRequests(),
    queryFn: fetchPendingLeaveRequests,
  });
}

export function useLeaveRequest(id: number) {
  return useQuery({
    queryKey: leaveKeys.request(id),
    queryFn: () => fetchLeaveRequest(id),
    enabled: !!id,
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateLeaveRequestParams) => createLeaveRequest(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.requests() });
      queryClient.invalidateQueries({ queryKey: leaveKeys.balances() });
      message.success('Leave request submitted');
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      message.error(
        error.response?.data?.detail || 'Failed to submit leave request'
      );
    },
  });
}

export function useApproveLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      approveLeaveRequest(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.requests() });
      queryClient.invalidateQueries({ queryKey: leaveKeys.balances() });
      message.success('Leave request approved');
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      message.error(
        error.response?.data?.detail || 'Failed to approve leave request'
      );
    },
  });
}

export function useRejectLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      rejectLeaveRequest(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.requests() });
      message.success('Leave request rejected');
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      message.error(
        error.response?.data?.detail || 'Failed to reject leave request'
      );
    },
  });
}

export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => cancelLeaveRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.requests() });
      queryClient.invalidateQueries({ queryKey: leaveKeys.balances() });
      message.success('Leave request cancelled');
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      message.error(
        error.response?.data?.detail || 'Failed to cancel leave request'
      );
    },
  });
}

// Leave Calendar
export function useLeaveCalendar(startDate: string, endDate: string) {
  return useQuery({
    queryKey: leaveKeys.calendar(startDate, endDate),
    queryFn: () => fetchLeaveCalendar(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

// Holidays
export function useHolidays(year?: number, country?: string) {
  return useQuery({
    queryKey: leaveKeys.holidays(year, country),
    queryFn: () => fetchHolidays(year, country),
  });
}

export function useUpcomingHolidays() {
  return useQuery({
    queryKey: leaveKeys.upcomingHolidays(),
    queryFn: fetchUpcomingHolidays,
  });
}

export function useSyncHolidays() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ country, year }: { country?: string; year?: number } = {}) =>
      syncHolidays(country, year),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
      message.success(`Synced ${data.created} new holidays`);
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      message.error(
        error.response?.data?.detail || 'Failed to sync holidays'
      );
    },
  });
}

export function useAvailableCountries() {
  return useQuery({
    queryKey: leaveKeys.availableCountries(),
    queryFn: fetchAvailableCountries,
  });
}

export function useTenantCountries() {
  return useQuery({
    queryKey: leaveKeys.tenantCountries(),
    queryFn: fetchTenantCountries,
  });
}

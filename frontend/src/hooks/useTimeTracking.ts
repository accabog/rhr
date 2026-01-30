import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import {
  timetrackingApi,
  type ClockInData,
  type ClockOutData,
  type TimeEntry,
  type TimeEntryFilters,
} from '@/api/timetracking';

export function useTimeEntryTypes() {
  return useQuery({
    queryKey: ['time-entry-types'],
    queryFn: timetrackingApi.listTypes,
  });
}

export function useMyTimeEntries(filters?: TimeEntryFilters) {
  return useQuery({
    queryKey: ['time-entries', 'my', filters],
    queryFn: () => timetrackingApi.getMyEntries(filters),
  });
}

export function useTimeEntries(filters?: TimeEntryFilters) {
  return useQuery({
    queryKey: ['time-entries', filters],
    queryFn: () => timetrackingApi.list(filters),
  });
}

export function useCurrentTimeEntry() {
  return useQuery({
    queryKey: ['time-entries', 'current'],
    queryFn: timetrackingApi.getCurrent,
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useWeeklySummary(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['time-entries', 'summary', startDate, endDate],
    queryFn: () => timetrackingApi.getSummary(startDate, endDate),
  });
}

export function useClockIn() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (data?: ClockInData) => timetrackingApi.clockIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      message.success('Clocked in successfully');
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      message.error(error.response?.data?.detail || 'Failed to clock in');
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (data?: ClockOutData) => timetrackingApi.clockOut(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      message.success('Clocked out successfully');
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      message.error(error.response?.data?.detail || 'Failed to clock out');
    },
  });
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (data: Partial<TimeEntry>) => timetrackingApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      message.success('Time entry created successfully');
    },
    onError: () => {
      message.error('Failed to create time entry');
    },
  });
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TimeEntry> }) =>
      timetrackingApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      message.success('Time entry updated successfully');
    },
    onError: () => {
      message.error('Failed to update time entry');
    },
  });
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: timetrackingApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      message.success('Time entry deleted successfully');
    },
    onError: () => {
      message.error('Failed to delete time entry');
    },
  });
}

export function useApproveTimeEntry() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: timetrackingApi.approve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      message.success('Time entry approved');
    },
    onError: () => {
      message.error('Failed to approve time entry');
    },
  });
}

/**
 * Timesheet React Query hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  fetchMyTimesheets,
  fetchTimesheets,
  fetchPendingApproval,
  fetchTimesheet,
  generateTimesheet,
  submitTimesheet,
  approveTimesheet,
  rejectTimesheet,
  reopenTimesheet,
  addTimesheetComment,
  deleteTimesheet,
  type GenerateTimesheetParams,
} from '@/api/timesheets';

// Query keys
export const timesheetKeys = {
  all: ['timesheets'] as const,
  lists: () => [...timesheetKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...timesheetKeys.lists(), filters] as const,
  myTimesheets: (status?: string) =>
    [...timesheetKeys.all, 'my', status] as const,
  pendingApproval: () => [...timesheetKeys.all, 'pending'] as const,
  details: () => [...timesheetKeys.all, 'detail'] as const,
  detail: (id: number) => [...timesheetKeys.details(), id] as const,
};

// Fetch user's timesheets
export function useMyTimesheets(status?: string) {
  return useQuery({
    queryKey: timesheetKeys.myTimesheets(status),
    queryFn: () => fetchMyTimesheets(status),
  });
}

// Fetch all timesheets
export function useTimesheets(params?: { status?: string; employee?: number }) {
  return useQuery({
    queryKey: timesheetKeys.list(params || {}),
    queryFn: () => fetchTimesheets(params),
  });
}

// Fetch pending approval timesheets
export function usePendingApproval() {
  return useQuery({
    queryKey: timesheetKeys.pendingApproval(),
    queryFn: fetchPendingApproval,
  });
}

// Fetch single timesheet
export function useTimesheet(id: number) {
  return useQuery({
    queryKey: timesheetKeys.detail(id),
    queryFn: () => fetchTimesheet(id),
    enabled: !!id,
  });
}

// Generate timesheet mutation
export function useGenerateTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: GenerateTimesheetParams) => generateTimesheet(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
      message.success('Timesheet generated successfully');
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      message.error(error.response?.data?.detail || 'Failed to generate timesheet');
    },
  });
}

// Submit timesheet mutation
export function useSubmitTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      submitTimesheet(id, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
      queryClient.setQueryData(timesheetKeys.detail(data.id), data);
      message.success('Timesheet submitted for approval');
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      message.error(error.response?.data?.detail || 'Failed to submit timesheet');
    },
  });
}

// Approve timesheet mutation
export function useApproveTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => approveTimesheet(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
      queryClient.setQueryData(timesheetKeys.detail(data.id), data);
      message.success('Timesheet approved');
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      message.error(error.response?.data?.detail || 'Failed to approve timesheet');
    },
  });
}

// Reject timesheet mutation
export function useRejectTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      rejectTimesheet(id, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
      queryClient.setQueryData(timesheetKeys.detail(data.id), data);
      message.success('Timesheet rejected');
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      message.error(error.response?.data?.detail || 'Failed to reject timesheet');
    },
  });
}

// Reopen timesheet mutation
export function useReopenTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => reopenTimesheet(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
      queryClient.setQueryData(timesheetKeys.detail(data.id), data);
      message.success('Timesheet reopened for editing');
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      message.error(error.response?.data?.detail || 'Failed to reopen timesheet');
    },
  });
}

// Add comment mutation
export function useAddTimesheetComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      addTimesheetComment(id, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: timesheetKeys.detail(variables.id),
      });
      message.success('Comment added');
    },
    onError: () => {
      message.error('Failed to add comment');
    },
  });
}

// Delete timesheet mutation
export function useDeleteTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteTimesheet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
      message.success('Timesheet deleted');
    },
    onError: () => {
      message.error('Failed to delete timesheet');
    },
  });
}

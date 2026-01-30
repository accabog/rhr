import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { employeesApi, type EmployeeFilters } from '@/api/employees';
import type { Employee } from '@/types';

export function useCurrentEmployee() {
  return useQuery({
    queryKey: ['employees', 'me'],
    queryFn: () => employeesApi.getMe(),
  });
}

export function useUpdateCurrentEmployee() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (data: Partial<Employee>) => employeesApi.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', 'me'] });
      message.success('Employee record updated');
    },
    onError: () => {
      message.error('Failed to update employee record');
    },
  });
}

export function useEmployees(filters?: EmployeeFilters) {
  return useQuery({
    queryKey: ['employees', filters],
    queryFn: () => employeesApi.list(filters),
  });
}

export function useEmployee(id: number | undefined) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: () => employeesApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (data: Partial<Employee>) => employeesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      message.success('Employee created successfully');
    },
    onError: () => {
      message.error('Failed to create employee');
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Employee> }) =>
      employeesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees', id] });
      message.success('Employee updated successfully');
    },
    onError: () => {
      message.error('Failed to update employee');
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: number) => employeesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      message.success('Employee deleted successfully');
    },
    onError: () => {
      message.error('Failed to delete employee');
    },
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => employeesApi.listDepartments(),
  });
}

export function usePositions() {
  return useQuery({
    queryKey: ['positions'],
    queryFn: () => employeesApi.listPositions(),
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: employeesApi.createDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      message.success('Department created successfully');
    },
    onError: () => {
      message.error('Failed to create department');
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<import('@/types').Department> }) =>
      employeesApi.updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      message.success('Department updated successfully');
    },
    onError: () => {
      message.error('Failed to update department');
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: employeesApi.deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      message.success('Department deleted successfully');
    },
    onError: () => {
      message.error('Failed to delete department');
    },
  });
}

export function useCreatePosition() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: employeesApi.createPosition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      message.success('Position created successfully');
    },
    onError: () => {
      message.error('Failed to create position');
    },
  });
}

export function useUpdatePosition() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<import('@/types').Position> }) =>
      employeesApi.updatePosition(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      message.success('Position updated successfully');
    },
    onError: () => {
      message.error('Failed to update position');
    },
  });
}

export function useDeletePosition() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: employeesApi.deletePosition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      message.success('Position deleted successfully');
    },
    onError: () => {
      message.error('Failed to delete position');
    },
  });
}

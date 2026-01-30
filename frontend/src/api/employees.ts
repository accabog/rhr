import { apiClient } from './client';
import type { Department, Employee, PaginatedResponse, Position } from '@/types';

export interface EmployeeFilters {
  status?: string;
  department?: number;
  search?: string;
  page?: number;
  page_size?: number;
}

export const employeesApi = {
  // Current user's employee record
  getMe: async (): Promise<Employee> => {
    const response = await apiClient.get<Employee>('/employees/me/');
    return response.data;
  },

  updateMe: async (data: Partial<Employee>): Promise<Employee> => {
    const response = await apiClient.patch<Employee>('/employees/me/', data);
    return response.data;
  },

  // Employees
  list: async (filters?: EmployeeFilters): Promise<PaginatedResponse<Employee>> => {
    const response = await apiClient.get<PaginatedResponse<Employee>>('/employees/', {
      params: filters,
    });
    return response.data;
  },

  get: async (id: number): Promise<Employee> => {
    const response = await apiClient.get<Employee>(`/employees/${id}/`);
    return response.data;
  },

  create: async (data: Partial<Employee>): Promise<Employee> => {
    const response = await apiClient.post<Employee>('/employees/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Employee>): Promise<Employee> => {
    const response = await apiClient.patch<Employee>(`/employees/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/employees/${id}/`);
  },

  // Departments
  listDepartments: async (): Promise<PaginatedResponse<Department>> => {
    const response = await apiClient.get<PaginatedResponse<Department>>(
      '/employees/departments/'
    );
    return response.data;
  },

  getDepartment: async (id: number): Promise<Department> => {
    const response = await apiClient.get<Department>(`/employees/departments/${id}/`);
    return response.data;
  },

  createDepartment: async (data: Partial<Department>): Promise<Department> => {
    const response = await apiClient.post<Department>('/employees/departments/', data);
    return response.data;
  },

  updateDepartment: async (id: number, data: Partial<Department>): Promise<Department> => {
    const response = await apiClient.patch<Department>(`/employees/departments/${id}/`, data);
    return response.data;
  },

  deleteDepartment: async (id: number): Promise<void> => {
    await apiClient.delete(`/employees/departments/${id}/`);
  },

  // Positions
  listPositions: async (): Promise<PaginatedResponse<Position>> => {
    const response = await apiClient.get<PaginatedResponse<Position>>('/employees/positions/');
    return response.data;
  },

  getPosition: async (id: number): Promise<Position> => {
    const response = await apiClient.get<Position>(`/employees/positions/${id}/`);
    return response.data;
  },

  createPosition: async (data: Partial<Position>): Promise<Position> => {
    const response = await apiClient.post<Position>('/employees/positions/', data);
    return response.data;
  },

  updatePosition: async (id: number, data: Partial<Position>): Promise<Position> => {
    const response = await apiClient.patch<Position>(`/employees/positions/${id}/`, data);
    return response.data;
  },

  deletePosition: async (id: number): Promise<void> => {
    await apiClient.delete(`/employees/positions/${id}/`);
  },
};

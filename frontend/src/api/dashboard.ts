import { apiClient } from './client';

export interface DashboardStats {
  total_employees: number;
  active_employees: number;
  on_leave_employees: number;
  departments_count: number;
  positions_count: number;
  pending_leave_requests: number;
  expiring_contracts: number;
  recent_hires: number;
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<DashboardStats>('/dashboard/stats/');
    return response.data;
  },
};

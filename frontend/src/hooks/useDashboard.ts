import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/dashboard';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardApi.getStats,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
  });
}

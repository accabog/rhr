/**
 * Tenant API functions.
 */

import apiClient from './client';
import type { Tenant } from '@/types';

export const tenantsApi = {
  /**
   * Get the current tenant details.
   */
  getCurrent: async (): Promise<Tenant> => {
    const response = await apiClient.get<Tenant>('/tenants/current/');
    return response.data;
  },

  /**
   * Update tenant details (admin/owner only).
   */
  update: async (tenantId: number, data: Partial<Tenant>): Promise<Tenant> => {
    const response = await apiClient.patch<Tenant>(`/tenants/${tenantId}/`, data);
    return response.data;
  },

  /**
   * Upload tenant logo (admin/owner only).
   */
  uploadLogo: async (tenantId: number, file: File): Promise<Tenant> => {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await apiClient.patch<Tenant>(`/tenants/${tenantId}/`, formData);
    return response.data;
  },

  /**
   * Remove tenant logo (admin/owner only).
   */
  removeLogo: async (tenantId: number): Promise<Tenant> => {
    const response = await apiClient.patch<Tenant>(`/tenants/${tenantId}/`, { logo: null });
    return response.data;
  },

  /**
   * Upload tenant logo icon/compact version (admin/owner only).
   */
  uploadLogoIcon: async (tenantId: number, file: File): Promise<Tenant> => {
    const formData = new FormData();
    formData.append('logo_icon', file);
    const response = await apiClient.patch<Tenant>(`/tenants/${tenantId}/`, formData);
    return response.data;
  },

  /**
   * Remove tenant logo icon (admin/owner only).
   */
  removeLogoIcon: async (tenantId: number): Promise<Tenant> => {
    const response = await apiClient.patch<Tenant>(`/tenants/${tenantId}/`, { logo_icon: null });
    return response.data;
  },
};

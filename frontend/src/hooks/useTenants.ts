/**
 * Hooks for tenant management.
 */

import { useMutation } from '@tanstack/react-query';
import { App } from 'antd';
import { tenantsApi } from '@/api/tenants';
import { useAuthStore } from '@/stores/authStore';

/**
 * Hook to upload tenant logo.
 */
export function useUploadTenantLogo() {
  const { message } = App.useApp();
  const setCurrentTenant = useAuthStore((state) => state.setCurrentTenant);
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: (file: File) => {
      if (!currentTenant) {
        throw new Error('No tenant selected');
      }
      return tenantsApi.uploadLogo(currentTenant.id, file);
    },
    onSuccess: (updatedTenant) => {
      setCurrentTenant(updatedTenant);
      message.success('Company logo updated');
    },
    onError: (error: unknown) => {
      console.error('Logo upload error:', error);
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to upload logo';
      message.error(errorMessage);
    },
  });
}

/**
 * Hook to remove tenant logo.
 */
export function useRemoveTenantLogo() {
  const { message } = App.useApp();
  const setCurrentTenant = useAuthStore((state) => state.setCurrentTenant);
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: () => {
      if (!currentTenant) {
        throw new Error('No tenant selected');
      }
      return tenantsApi.removeLogo(currentTenant.id);
    },
    onSuccess: (updatedTenant) => {
      setCurrentTenant(updatedTenant);
      message.success('Company logo removed');
    },
    onError: () => {
      message.error('Failed to remove logo');
    },
  });
}

/**
 * Hook to upload tenant logo icon (compact version).
 */
export function useUploadTenantLogoIcon() {
  const { message } = App.useApp();
  const setCurrentTenant = useAuthStore((state) => state.setCurrentTenant);
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: (file: File) => {
      if (!currentTenant) {
        throw new Error('No tenant selected');
      }
      return tenantsApi.uploadLogoIcon(currentTenant.id, file);
    },
    onSuccess: (updatedTenant) => {
      setCurrentTenant(updatedTenant);
      message.success('Company icon updated');
    },
    onError: (error: unknown) => {
      console.error('Logo icon upload error:', error);
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to upload icon';
      message.error(errorMessage);
    },
  });
}

/**
 * Hook to remove tenant logo icon.
 */
export function useRemoveTenantLogoIcon() {
  const { message } = App.useApp();
  const setCurrentTenant = useAuthStore((state) => state.setCurrentTenant);
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: () => {
      if (!currentTenant) {
        throw new Error('No tenant selected');
      }
      return tenantsApi.removeLogoIcon(currentTenant.id);
    },
    onSuccess: (updatedTenant) => {
      setCurrentTenant(updatedTenant);
      message.success('Company icon removed');
    },
    onError: () => {
      message.error('Failed to remove icon');
    },
  });
}

/**
 * Hook to update tenant details.
 */
export function useUpdateTenant() {
  const { message } = App.useApp();
  const setCurrentTenant = useAuthStore((state) => state.setCurrentTenant);
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: (data: { name?: string }) => {
      if (!currentTenant) {
        throw new Error('No tenant selected');
      }
      return tenantsApi.update(currentTenant.id, data);
    },
    onSuccess: (updatedTenant) => {
      setCurrentTenant(updatedTenant);
      message.success('Company settings updated');
    },
    onError: () => {
      message.error('Failed to update company settings');
    },
  });
}

import { useMutation } from '@tanstack/react-query';
import { App } from 'antd';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types';

export function useUpdateProfile() {
  const { message } = App.useApp();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (data: Partial<User>) => authApi.updateMe(data),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      message.success('Profile updated successfully');
    },
    onError: () => {
      message.error('Failed to update profile');
    },
  });
}

export function useChangePassword() {
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) =>
      authApi.changePassword(oldPassword, newPassword),
    onSuccess: () => {
      message.success('Password changed successfully');
    },
    onError: () => {
      message.error('Failed to change password. Please check your current password.');
    },
  });
}

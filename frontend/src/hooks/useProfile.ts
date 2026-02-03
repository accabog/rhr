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

export function useUploadAvatar() {
  const { message } = App.useApp();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (file: File) => authApi.uploadAvatar(file),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      message.success('Profile photo updated');
    },
    onError: (error: unknown) => {
      console.error('Avatar upload error:', error);
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to upload photo';
      message.error(errorMessage);
    },
  });
}

export function useRemoveAvatar() {
  const { message } = App.useApp();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: () => authApi.removeAvatar(),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      message.success('Profile photo removed');
    },
    onError: () => {
      message.error('Failed to remove photo');
    },
  });
}

export function useConnectGoogle() {
  const { message } = App.useApp();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (credential: string) => authApi.connectGoogle(credential),
    onSuccess: () => {
      // Refetch user to get the updated google_account
      authApi.getMe().then((updatedUser) => {
        setUser(updatedUser);
      });
      message.success('Google account connected successfully');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { status?: number; data?: { detail?: string } } };
      if (err.response?.status === 409) {
        message.error('This Google account is already linked to another user');
      } else if (err.response?.status === 400) {
        message.error(err.response?.data?.detail || 'Failed to connect Google account');
      } else {
        message.error('Failed to connect Google account');
      }
    },
  });
}

export function useDisconnectGoogle() {
  const { message } = App.useApp();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: () => authApi.disconnectGoogle(),
    onSuccess: () => {
      // Refetch user to get the updated state
      authApi.getMe().then((updatedUser) => {
        setUser(updatedUser);
      });
      message.success('Google account disconnected');
    },
    onError: () => {
      message.error('Failed to disconnect Google account');
    },
  });
}

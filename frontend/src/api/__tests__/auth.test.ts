/**
 * Tests for auth API module.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { authApi } from '../auth';
import { createAuthResponse, createUser } from '@/test/mocks/data';

describe('authApi', () => {
  describe('login', () => {
    it('sends credentials and returns auth response', async () => {
      const mockResponse = createAuthResponse();

      server.use(
        http.post('/api/v1/auth/login/', () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await authApi.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.access).toBe(mockResponse.access);
      expect(result.refresh).toBe(mockResponse.refresh);
      expect(result.user.email).toBe(mockResponse.user.email);
    });

    it('throws on invalid credentials', async () => {
      server.use(
        http.post('/api/v1/auth/login/', () => {
          return HttpResponse.json(
            { detail: 'Invalid credentials' },
            { status: 401 }
          );
        })
      );

      await expect(
        authApi.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow();
    });
  });

  describe('register', () => {
    it('sends registration data and returns auth response', async () => {
      const mockResponse = createAuthResponse();

      server.use(
        http.post('/api/v1/auth/register/', () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await authApi.register({
        email: 'new@example.com',
        password: 'password123',
        first_name: 'New',
        last_name: 'User',
      });

      expect(result.access).toBeDefined();
      expect(result.user).toBeDefined();
    });

    it('throws on validation error', async () => {
      server.use(
        http.post('/api/v1/auth/register/', () => {
          return HttpResponse.json(
            { email: ['This email is already registered.'] },
            { status: 400 }
          );
        })
      );

      await expect(
        authApi.register({
          email: 'existing@example.com',
          password: 'password123',
          first_name: 'Test',
          last_name: 'User',
        })
      ).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('sends refresh token to logout endpoint', async () => {
      let receivedBody: { refresh: string } | undefined;

      server.use(
        http.post('/api/v1/auth/logout/', async ({ request }) => {
          receivedBody = await request.json() as { refresh: string };
          return HttpResponse.json({ detail: 'Logged out' });
        })
      );

      await authApi.logout('refresh-token-123');

      expect(receivedBody?.refresh).toBe('refresh-token-123');
    });
  });

  describe('refreshToken', () => {
    it('sends refresh token and returns new tokens', async () => {
      server.use(
        http.post('/api/v1/auth/refresh/', () => {
          return HttpResponse.json({
            access: 'new-access-token',
            refresh: 'new-refresh-token',
          });
        })
      );

      const result = await authApi.refreshToken('old-refresh-token');

      expect(result.access).toBe('new-access-token');
      expect(result.refresh).toBe('new-refresh-token');
    });
  });

  describe('getMe', () => {
    it('returns current user data', async () => {
      const mockUser = createUser();

      server.use(
        http.get('/api/v1/users/me/', () => {
          return HttpResponse.json(mockUser);
        })
      );

      const result = await authApi.getMe();

      expect(result.email).toBe(mockUser.email);
      expect(result.first_name).toBe(mockUser.first_name);
    });
  });

  describe('updateMe', () => {
    it('sends patch request with user data', async () => {
      const mockUser = createUser({ first_name: 'Updated' });

      server.use(
        http.patch('/api/v1/users/me/', () => {
          return HttpResponse.json(mockUser);
        })
      );

      const result = await authApi.updateMe({ first_name: 'Updated' });

      expect(result.first_name).toBe('Updated');
    });
  });

  describe('changePassword', () => {
    it('sends password change request', async () => {
      let receivedBody: { old_password: string; new_password: string } | undefined;

      server.use(
        http.post('/api/v1/users/me/change-password/', async ({ request }) => {
          receivedBody = await request.json() as { old_password: string; new_password: string };
          return HttpResponse.json({ detail: 'Password changed' });
        })
      );

      await authApi.changePassword('oldpass', 'newpass');

      expect(receivedBody?.old_password).toBe('oldpass');
      expect(receivedBody?.new_password).toBe('newpass');
    });
  });
});

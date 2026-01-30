/**
 * Tests for API client interceptors.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { apiClient } from '../client';
import { useAuthStore } from '@/stores/authStore';

describe('apiClient', () => {
  beforeEach(() => {
    // Reset auth store
    useAuthStore.getState().logout();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('request interceptor', () => {
    it('adds Authorization header when token exists', async () => {
      let capturedHeaders: Headers | undefined;

      server.use(
        http.get('/api/v1/employees/', ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({ results: [] });
        })
      );

      // Set token
      useAuthStore.getState().setTokens('test-access-token', 'test-refresh-token');

      await apiClient.get('/employees/');

      expect(capturedHeaders?.get('Authorization')).toBe('Bearer test-access-token');
    });

    it('does not add Authorization header when no token', async () => {
      let capturedHeaders: Headers | undefined;

      server.use(
        http.get('/api/v1/employees/', ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({ results: [] });
        })
      );

      await apiClient.get('/employees/');

      expect(capturedHeaders?.get('Authorization')).toBeNull();
    });

    it('adds X-Tenant-ID header when tenant is selected', async () => {
      let capturedHeaders: Headers | undefined;

      server.use(
        http.get('/api/v1/employees/', ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({ results: [] });
        })
      );

      // Set tenant
      useAuthStore.getState().setCurrentTenant({
        id: 123,
        name: 'Test Company',
        slug: 'test-company',
        is_active: true,
        plan: 'professional',
        max_employees: 100,
      });

      await apiClient.get('/employees/');

      expect(capturedHeaders?.get('X-Tenant-ID')).toBe('123');
    });
  });

  describe('response interceptor', () => {
    it('triggers token refresh on 401 and retries request', async () => {
      let requestCount = 0;

      server.use(
        http.get('/api/v1/employees/', () => {
          requestCount++;
          if (requestCount === 1) {
            return HttpResponse.json(
              { detail: 'Token expired' },
              { status: 401 }
            );
          }
          return HttpResponse.json({ results: [{ id: 1 }] });
        }),
        http.post('/api/v1/auth/refresh/', () => {
          return HttpResponse.json({
            access: 'new-access-token',
            refresh: 'new-refresh-token',
          });
        })
      );

      // Set initial tokens
      useAuthStore.getState().setTokens('old-token', 'refresh-token');

      const response = await apiClient.get('/employees/');

      expect(requestCount).toBe(2); // Original + retry
      expect(response.data.results).toHaveLength(1);
      expect(useAuthStore.getState().accessToken).toBe('new-access-token');
    });

    it('triggers logout when refresh fails', async () => {
      const logoutSpy = vi.spyOn(useAuthStore.getState(), 'logout');

      server.use(
        http.get('/api/v1/employees/', () => {
          return HttpResponse.json(
            { detail: 'Token expired' },
            { status: 401 }
          );
        }),
        http.post('/api/v1/auth/refresh/', () => {
          return HttpResponse.json(
            { detail: 'Invalid refresh token' },
            { status: 401 }
          );
        })
      );

      // Set initial tokens
      useAuthStore.getState().setTokens('old-token', 'refresh-token');

      await expect(apiClient.get('/employees/')).rejects.toThrow();

      expect(logoutSpy).toHaveBeenCalled();
    });

    it('does not retry on 401 if no refresh token', async () => {
      let requestCount = 0;

      server.use(
        http.get('/api/v1/employees/', () => {
          requestCount++;
          return HttpResponse.json(
            { detail: 'Authentication required' },
            { status: 401 }
          );
        })
      );

      // No tokens set

      await expect(apiClient.get('/employees/')).rejects.toThrow();

      expect(requestCount).toBe(1); // Only original request
    });
  });
});

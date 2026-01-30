import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore, selectIsAuthenticated } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      tenantMemberships: [],
      currentTenant: null,
    });
  });

  it('should start with unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(selectIsAuthenticated(state)).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it('should set auth state correctly', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      full_name: 'Test User',
      is_active: true,
      tenants: [],
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };
    const mockTenant = {
      id: 1,
      name: 'Test Company',
      slug: 'test-company',
      is_active: true,
      plan: 'free' as const,
      max_employees: 10,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };
    const mockMembership = {
      id: 1,
      tenant: mockTenant,
      role: 'owner' as const,
      is_default: true,
      created_at: '2024-01-01',
    };

    useAuthStore.getState().setAuth(
      mockUser,
      'access-token',
      'refresh-token',
      [mockMembership]
    );

    const state = useAuthStore.getState();
    expect(selectIsAuthenticated(state)).toBe(true);
    expect(state.user?.email).toBe('test@example.com');
    expect(state.accessToken).toBe('access-token');
    expect(state.currentTenant?.name).toBe('Test Company');
  });

  it('should logout correctly', () => {
    // First, set some auth state
    useAuthStore.setState({
      user: { id: 1, email: 'test@example.com' } as never,
      accessToken: 'token',
      refreshToken: 'refresh',
      tenantMemberships: [],
      currentTenant: null,
    });

    // Then logout
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(selectIsAuthenticated(state)).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });
});

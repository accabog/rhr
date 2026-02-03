import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tenant, TenantMembership, User } from '@/types';

interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  tenantMemberships: TenantMembership[];
  currentTenant: Tenant | null;

  // Actions
  setAuth: (
    user: User,
    accessToken: string,
    refreshToken: string,
    tenants: TenantMembership[]
  ) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  setCurrentTenant: (tenant: Tenant) => void;
  logout: () => void;
}

// Helper selector for computed isAuthenticated
export const selectIsAuthenticated = (state: AuthState) => !!state.accessToken;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      tenantMemberships: [],
      currentTenant: null,

      // Actions
      setAuth: (user, accessToken, refreshToken, tenants) => {
        const defaultMembership = tenants.find((m) => m.is_default) || tenants[0];
        set({
          user,
          accessToken,
          refreshToken,
          tenantMemberships: tenants,
          currentTenant: defaultMembership?.tenant || null,
        });
      },

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
      },

      setUser: (user) => {
        set({ user });
      },

      setCurrentTenant: (tenant) => {
        set({ currentTenant: tenant });
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          tenantMemberships: [],
          currentTenant: null,
        });
      },
    }),
    {
      name: 'rhr-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        tenantMemberships: state.tenantMemberships,
        currentTenant: state.currentTenant,
      }),
    }
  )
);

// Convenience hook that includes computed isAuthenticated
export const useAuth = () => {
  const state = useAuthStore();
  return {
    ...state,
    isAuthenticated: !!state.accessToken,
  };
};

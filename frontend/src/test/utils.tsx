/**
 * Test utilities and wrappers.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { App as AntApp } from 'antd';
import { ReactNode } from 'react';

/**
 * Create a fresh QueryClient for testing.
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface WrapperProps {
  children: ReactNode;
}

/**
 * Test wrapper that provides QueryClient, Google OAuth, and Ant Design App context.
 */
export function createWrapper() {
  const queryClient = createTestQueryClient();

  return function Wrapper({ children }: WrapperProps) {
    return (
      <GoogleOAuthProvider clientId="test-client-id">
        <QueryClientProvider client={queryClient}>
          <AntApp>{children}</AntApp>
        </QueryClientProvider>
      </GoogleOAuthProvider>
    );
  };
}

/**
 * Wrapper with a specific QueryClient instance.
 */
export function createWrapperWithClient(queryClient: QueryClient) {
  return function Wrapper({ children }: WrapperProps) {
    return (
      <GoogleOAuthProvider clientId="test-client-id">
        <QueryClientProvider client={queryClient}>
          <AntApp>{children}</AntApp>
        </QueryClientProvider>
      </GoogleOAuthProvider>
    );
  };
}

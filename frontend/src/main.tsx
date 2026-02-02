import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntApp } from 'antd';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const theme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
  },
};

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={theme}>
          <AntApp>
            <App />
          </AntApp>
        </ConfigProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </StrictMode>
);

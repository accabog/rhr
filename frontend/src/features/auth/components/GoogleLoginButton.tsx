import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { App } from 'antd';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';

interface GoogleLoginButtonProps {
  disabled?: boolean;
  onLoadingChange?: (loading: boolean) => void;
}

export default function GoogleLoginButton({ disabled, onLoadingChange }: GoogleLoginButtonProps) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const setAuth = useAuthStore((state) => state.setAuth);

  const updateLoading = (isLoading: boolean) => {
    setLoading(isLoading);
    onLoadingChange?.(isLoading);
  };

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      message.error('No credential received from Google');
      return;
    }

    updateLoading(true);
    try {
      const response = await authApi.googleLogin(credentialResponse.credential);
      setAuth(
        response.user as never,
        response.access,
        response.refresh,
        response.tenants
      );
      message.success('Login successful!');
      navigate('/');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string; code?: string } } };
      if (err.response?.data?.code === 'user_not_found') {
        message.error('No account found with this email address. Please register first.');
      } else {
        message.error(err.response?.data?.detail || 'Google login failed. Please try again.');
      }
    } finally {
      updateLoading(false);
    }
  };

  const handleError = () => {
    message.error('Google login failed. Please try again.');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        useOneTap={false}
        type="standard"
        theme="outline"
        size="large"
        text="signin_with"
        shape="rectangular"
        width={350}
        logo_alignment="left"
      />
      {(loading || disabled) && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.5)',
            cursor: 'not-allowed',
          }}
        />
      )}
    </div>
  );
}

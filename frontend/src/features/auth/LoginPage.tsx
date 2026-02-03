import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, App, Divider } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';
import GoogleLoginButton from './components/GoogleLoginButton';
import type { LoginCredentials } from '@/types';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const setAuth = useAuthStore((state) => state.setAuth);

  const isLoading = loading || googleLoading;

  const handleSubmit = async (values: LoginCredentials) => {
    setLoading(true);
    try {
      const response = await authApi.login(values);
      setAuth(
        response.user as never,
        response.access,
        response.refresh,
        response.tenants
      );
      message.success('Login successful!');
      navigate('/');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      message.error(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 24,
      }}
    >
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            Raptor HR
          </Title>
          <Text type="secondary">Sign in to your account</Text>
        </div>

        <GoogleLoginButton
          disabled={isLoading}
          onLoadingChange={setGoogleLoading}
        />

        <Divider plain>
          <Text type="secondary">or sign in with email</Text>
        </Divider>

        <Form
          name="login"
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
          requiredMark={false}
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email address" disabled={isLoading} />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" disabled={isLoading} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} disabled={googleLoading} block>
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">
            Don't have an account?{' '}
            <Link to="/register">Create one</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}

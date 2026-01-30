import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, App, Divider } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined, BankOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';
import type { RegisterData } from '@/types';

const { Title, Text } = Typography;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (values: RegisterData) => {
    setLoading(true);
    try {
      const response = await authApi.register(values);
      setAuth(
        response.user as never,
        response.access,
        response.refresh,
        response.tenants
      );
      message.success('Account created successfully!');
      navigate('/');
    } catch (error: unknown) {
      const err = error as { response?: { data?: Record<string, string[]> } };
      const errors = err.response?.data;
      if (errors) {
        const errorMsg = Object.entries(errors)
          .map(([key, msgs]) => `${key}: ${(msgs as string[]).join(', ')}`)
          .join('; ');
        message.error(errorMsg);
      } else {
        message.error('Registration failed. Please try again.');
      }
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
      <Card style={{ width: 450, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            Create Account
          </Title>
          <Text type="secondary">Start your HR management journey</Text>
        </div>

        <Form
          name="register"
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
          requiredMark={false}
        >
          <Form.Item
            name="tenant_name"
            rules={[{ required: true, message: 'Please enter your company name' }]}
          >
            <Input prefix={<BankOutlined />} placeholder="Company name" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="first_name" style={{ flex: 1 }}>
              <Input prefix={<UserOutlined />} placeholder="First name" />
            </Form.Item>
            <Form.Item name="last_name" style={{ flex: 1 }}>
              <Input prefix={<UserOutlined />} placeholder="Last name" />
            </Form.Item>
          </div>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email address" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Please enter a password' },
              { min: 8, message: 'Password must be at least 8 characters' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Form.Item
            name="password_confirm"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Confirm password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Create Account
            </Button>
          </Form.Item>
        </Form>

        <Divider plain>
          <Text type="secondary">or</Text>
        </Divider>

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}

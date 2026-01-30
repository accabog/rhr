import { Card, Tabs, Typography, Form, Input, Button, Space, Descriptions } from 'antd';
import { LockOutlined, UserOutlined, SafetyOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useChangePassword } from '@/hooks/useProfile';

const { Title, Text } = Typography;

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function AccountTab() {
  const user = useAuthStore((state) => state.user);

  return (
    <div>
      <Title level={5} style={{ marginBottom: 16 }}>
        Account Information
      </Title>

      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Name">
          {user?.full_name || 'Not set'}
        </Descriptions.Item>
        <Descriptions.Item label="Email">
          {user?.email}
        </Descriptions.Item>
        <Descriptions.Item label="Account Status">
          <Text type={user?.is_active ? 'success' : 'danger'}>
            {user?.is_active ? 'Active' : 'Inactive'}
          </Text>
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 24 }}>
        <Link to="/profile">
          <Button icon={<UserOutlined />}>
            Edit Profile
          </Button>
        </Link>
      </div>
    </div>
  );
}

function SecurityTab() {
  const [form] = Form.useForm<PasswordFormValues>();
  const changePassword = useChangePassword();

  const handleSubmit = (values: PasswordFormValues) => {
    changePassword.mutate(
      {
        oldPassword: values.currentPassword,
        newPassword: values.newPassword,
      },
      {
        onSuccess: () => {
          form.resetFields();
        },
      }
    );
  };

  return (
    <div>
      <Title level={5} style={{ marginBottom: 16 }}>
        Change Password
      </Title>

      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Choose a strong password that you don't use for other accounts.
      </Text>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark={false}
        style={{ maxWidth: 400 }}
      >
        <Form.Item
          name="currentPassword"
          label="Current Password"
          rules={[{ required: true, message: 'Please enter your current password' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Current password" />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label="New Password"
          rules={[
            { required: true, message: 'Please enter a new password' },
            { min: 8, message: 'Password must be at least 8 characters' },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="New password" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm New Password"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Please confirm your new password' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Passwords do not match'));
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Confirm new password" />
        </Form.Item>

        <Form.Item style={{ marginTop: 24 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={changePassword.isPending}
          >
            Update Password
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

export default function SettingsPage() {
  const items = [
    {
      key: 'account',
      label: (
        <Space>
          <UserOutlined />
          Account
        </Space>
      ),
      children: <AccountTab />,
    },
    {
      key: 'security',
      label: (
        <Space>
          <SafetyOutlined />
          Security
        </Space>
      ),
      children: <SecurityTab />,
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Settings
      </Title>

      <Card>
        <Tabs items={items} />
      </Card>
    </div>
  );
}

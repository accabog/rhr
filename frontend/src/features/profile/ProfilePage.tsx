import { useEffect } from 'react';
import { Card, Form, Input, Button, Avatar, Typography, Space, Spin } from 'antd';
import { UserOutlined, MailOutlined, CalendarOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { useUpdateProfile } from '@/hooks/useProfile';

const { Title, Text } = Typography;

interface ProfileFormValues {
  first_name: string;
  last_name: string;
}

export default function ProfilePage() {
  const [form] = Form.useForm<ProfileFormValues>();
  const user = useAuthStore((state) => state.user);
  const updateProfile = useUpdateProfile();

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        first_name: user.first_name,
        last_name: user.last_name,
      });
    }
  }, [user, form]);

  const handleSubmit = (values: ProfileFormValues) => {
    updateProfile.mutate(values);
  };

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 24 }}>
        My Profile
      </Title>

      <Card>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Avatar
            size={96}
            icon={<UserOutlined />}
            src={user.avatar}
            style={{ marginBottom: 16 }}
          />
          <div>
            <Title level={5} style={{ margin: 0 }}>
              {user.full_name || user.email}
            </Title>
            <Text type="secondary">{user.email}</Text>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
        >
          <Form.Item
            name="first_name"
            label="First Name"
            rules={[{ required: true, message: 'Please enter your first name' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="First name" />
          </Form.Item>

          <Form.Item
            name="last_name"
            label="Last Name"
            rules={[{ required: true, message: 'Please enter your last name' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Last name" />
          </Form.Item>

          <Form.Item label="Email">
            <Input
              prefix={<MailOutlined />}
              value={user.email}
              disabled
              style={{ backgroundColor: '#f5f5f5' }}
            />
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              Email cannot be changed
            </Text>
          </Form.Item>

          <Form.Item label="Member Since">
            <Space>
              <CalendarOutlined />
              <Text>{memberSince}</Text>
            </Space>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={updateProfile.isPending}
              block
            >
              Save Changes
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

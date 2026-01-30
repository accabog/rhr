import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Avatar, Typography, Space, Spin, Upload, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  CalendarOutlined,
  CameraOutlined,
  DeleteOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { useUpdateProfile, useUploadAvatar, useRemoveAvatar } from '@/hooks/useProfile';

const { Title, Text } = Typography;

interface ProfileFormValues {
  first_name: string;
  last_name: string;
}

export default function ProfilePage() {
  const [form] = Form.useForm<ProfileFormValues>();
  const user = useAuthStore((state) => state.user);
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        first_name: user.first_name,
        last_name: user.last_name,
      });
      setPreviewUrl(user.avatar || null);
    }
  }, [user, form]);

  const handleSubmit = (values: ProfileFormValues) => {
    updateProfile.mutate(values);
  };

  const handleRemoveAvatar = () => {
    removeAvatar.mutate();
    setPreviewUrl(null);
  };

  const avatarMenuItems: MenuProps['items'] = [
    {
      key: 'upload',
      icon: <UploadOutlined />,
      label: (
        <Upload
          accept="image/*"
          showUploadList={false}
          beforeUpload={(file) => {
            uploadAvatar.mutate(file);
            return false;
          }}
        >
          <span>Upload photo</span>
        </Upload>
      ),
    },
    ...(user?.avatar
      ? [
          {
            key: 'remove',
            icon: <DeleteOutlined />,
            label: 'Remove photo',
            danger: true,
            onClick: handleRemoveAvatar,
          },
        ]
      : []),
  ];

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

  const isUploading = uploadAvatar.isPending || removeAvatar.isPending;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 24 }}>
        My Profile
      </Title>

      <Card>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Dropdown menu={{ items: avatarMenuItems }} trigger={['click']} disabled={isUploading}>
            <div
              style={{
                position: 'relative',
                display: 'inline-block',
                cursor: 'pointer',
                marginBottom: 16,
              }}
            >
              <Avatar
                size={96}
                icon={<UserOutlined />}
                src={previewUrl || user.avatar}
                style={{ border: '2px solid #f0f0f0' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  background: '#1890ff',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid white',
                }}
              >
                {isUploading ? (
                  <Spin size="small" />
                ) : (
                  <CameraOutlined style={{ color: 'white', fontSize: 14 }} />
                )}
              </div>
            </div>
          </Dropdown>
          <div>
            <Title level={5} style={{ margin: 0 }}>
              {user.full_name || user.email}
            </Title>
            <Text type="secondary">{user.email}</Text>
          </div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
            Click the photo to change
          </Text>
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

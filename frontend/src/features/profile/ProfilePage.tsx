import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Avatar, Typography, Space, Spin, Upload, Dropdown, Select, Divider, Modal } from 'antd';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  CalendarOutlined,
  CameraOutlined,
  DeleteOutlined,
  UploadOutlined,
  GlobalOutlined,
  LinkOutlined,
  GoogleOutlined,
  CheckCircleOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuthStore } from '@/stores/authStore';
import { useUpdateProfile, useUploadAvatar, useRemoveAvatar, useConnectGoogle, useDisconnectGoogle } from '@/hooks/useProfile';
import { useCurrentEmployee, useUpdateCurrentEmployee } from '@/hooks/useEmployees';
import { COUNTRIES } from '@/data/countries';
import { TIMEZONES } from '@/data/timezones';

const { Title, Text } = Typography;

interface ProfileFormValues {
  first_name: string;
  last_name: string;
}

interface LocationFormValues {
  timezone: string;
}

export default function ProfilePage() {
  const [form] = Form.useForm<ProfileFormValues>();
  const [locationForm] = Form.useForm<LocationFormValues>();
  const user = useAuthStore((state) => state.user);
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();
  const connectGoogle = useConnectGoogle();
  const disconnectGoogle = useDisconnectGoogle();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [disconnectModalVisible, setDisconnectModalVisible] = useState(false);

  const { data: employee, isLoading: employeeLoading } = useCurrentEmployee();
  const updateEmployee = useUpdateCurrentEmployee();

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        first_name: user.first_name,
        last_name: user.last_name,
      });
      setPreviewUrl(user.avatar || null);
    }
  }, [user, form]);

  useEffect(() => {
    if (employee) {
      locationForm.setFieldsValue({
        timezone: employee.timezone || '',
      });
    }
  }, [employee, locationForm]);

  const handleSubmit = (values: ProfileFormValues) => {
    updateProfile.mutate(values);
  };

  const handleLocationSubmit = (values: LocationFormValues) => {
    updateEmployee.mutate(values);
  };

  const handleRemoveAvatar = () => {
    removeAvatar.mutate();
    setPreviewUrl(null);
  };

  const handleGoogleConnect = (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      connectGoogle.mutate(credentialResponse.credential);
    }
  };

  const handleGoogleDisconnect = () => {
    setDisconnectModalVisible(false);
    disconnectGoogle.mutate();
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

        {employee && (
          <>
            <Divider />
            <Title level={5} style={{ marginBottom: 16 }}>
              <GlobalOutlined style={{ marginRight: 8 }} />
              Work Location
            </Title>
            <Form
              form={locationForm}
              layout="vertical"
              onFinish={handleLocationSubmit}
              requiredMark={false}
            >
              <Form.Item label="Country">
                <Input
                  value={
                    employee.department_country
                      ? COUNTRIES.find((c) => c.code === employee.department_country)?.name || employee.department_country
                      : 'Not set (assign via department)'
                  }
                  disabled
                  style={{ backgroundColor: '#f5f5f5' }}
                />
                <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                  Country is set at the department level
                </Text>
              </Form.Item>

              <Form.Item name="timezone" label="Timezone">
                <Select
                  showSearch
                  placeholder="Select your timezone"
                  optionFilterProp="label"
                  allowClear
                  options={TIMEZONES.map((tz) => ({
                    value: tz.value,
                    label: `${tz.label} (${tz.offset})`,
                  }))}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={updateEmployee.isPending}
                  block
                >
                  Save Location
                </Button>
              </Form.Item>
            </Form>
          </>
        )}

        {employeeLoading && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin size="small" />
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              Loading work location...
            </Text>
          </div>
        )}

        <Divider />
        <Title level={5} style={{ marginBottom: 16 }}>
          <LinkOutlined style={{ marginRight: 8 }} />
          Connected Accounts
        </Title>

        <div
          style={{
            border: '1px solid #f0f0f0',
            borderRadius: 8,
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Space>
            <GoogleOutlined style={{ fontSize: 24, color: '#4285F4' }} />
            <div>
              <Text strong>Google</Text>
              {user.google_account ? (
                <div>
                  <Space size={4}>
                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Connected as {user.google_account.google_email}
                    </Text>
                  </Space>
                </div>
              ) : (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Not connected
                  </Text>
                </div>
              )}
            </div>
          </Space>

          {user.google_account ? (
            <Button
              danger
              icon={<DisconnectOutlined />}
              onClick={() => setDisconnectModalVisible(true)}
              loading={disconnectGoogle.isPending}
            >
              Disconnect
            </Button>
          ) : (
            <div style={{ position: 'relative' }}>
              <GoogleLogin
                onSuccess={handleGoogleConnect}
                onError={() => {}}
                useOneTap={false}
                type="standard"
                theme="outline"
                size="medium"
                text="signin_with"
                shape="rectangular"
              />
              {connectGoogle.isPending && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(255, 255, 255, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Spin size="small" />
                </div>
              )}
            </div>
          )}
        </div>

        <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
          Connect your Google account to sign in with Google
        </Text>

        <Modal
          title="Disconnect Google Account"
          open={disconnectModalVisible}
          onOk={handleGoogleDisconnect}
          onCancel={() => setDisconnectModalVisible(false)}
          okText="Disconnect"
          okButtonProps={{ danger: true }}
          confirmLoading={disconnectGoogle.isPending}
        >
          <p>
            Are you sure you want to disconnect your Google account ({user.google_account?.google_email})?
          </p>
          <p>
            You will no longer be able to sign in with Google. You can reconnect at any time.
          </p>
        </Modal>
      </Card>
    </div>
  );
}

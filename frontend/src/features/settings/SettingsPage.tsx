import { useState } from 'react';
import { Card, Tabs, Typography, Form, Input, Button, Space, Descriptions, Upload, Spin, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { LockOutlined, UserOutlined, SafetyOutlined, ShopOutlined, CameraOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useChangePassword } from '@/hooks/useProfile';
import { useUploadTenantLogo, useRemoveTenantLogo, useUploadTenantLogoIcon, useRemoveTenantLogoIcon, useUpdateTenant } from '@/hooks/useTenants';

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

interface CompanyFormValues {
  name: string;
}

interface LogoUploadBoxProps {
  label: string;
  description: string;
  currentUrl?: string;
  previewUrl: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  isUploading: boolean;
  width?: number;
  height?: number;
  shape?: 'rectangle' | 'circle';
}

function LogoUploadBox({
  label,
  description,
  currentUrl,
  previewUrl,
  onUpload,
  onRemove,
  isUploading,
  width = 120,
  height = 120,
  shape = 'rectangle',
}: LogoUploadBoxProps) {
  const menuItems: MenuProps['items'] = [
    {
      key: 'upload',
      icon: <UploadOutlined />,
      label: (
        <Upload
          accept="image/*"
          showUploadList={false}
          beforeUpload={(file) => {
            onUpload(file);
            return false;
          }}
        >
          <span>Upload {label.toLowerCase()}</span>
        </Upload>
      ),
    },
    ...(currentUrl
      ? [
          {
            key: 'remove',
            icon: <DeleteOutlined />,
            label: `Remove ${label.toLowerCase()}`,
            danger: true,
            onClick: onRemove,
          },
        ]
      : []),
  ];

  return (
    <div>
      <Text strong style={{ display: 'block', marginBottom: 12 }}>
        {label}
      </Text>
      <Dropdown menu={{ items: menuItems }} trigger={['click']} disabled={isUploading}>
        <div
          style={{
            width,
            height,
            border: '2px dashed #d9d9d9',
            borderRadius: shape === 'circle' ? '50%' : 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            background: '#fafafa',
          }}
        >
          {previewUrl || currentUrl ? (
            <img
              src={previewUrl || currentUrl}
              alt={label}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#999' }}>
              <CameraOutlined style={{ fontSize: 24 }} />
              <div style={{ marginTop: 8, fontSize: 12 }}>Upload</div>
            </div>
          )}
          {isUploading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(255,255,255,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Spin />
            </div>
          )}
        </div>
      </Dropdown>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8, maxWidth: 200 }}>
        {description}
      </Text>
    </div>
  );
}

function CompanyTab() {
  const [form] = Form.useForm<CompanyFormValues>();
  const currentTenant = useAuthStore((state) => state.currentTenant);
  const uploadLogo = useUploadTenantLogo();
  const removeLogo = useRemoveTenantLogo();
  const uploadLogoIcon = useUploadTenantLogoIcon();
  const removeLogoIcon = useRemoveTenantLogoIcon();
  const updateTenant = useUpdateTenant();
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null);

  const handleSubmit = (values: CompanyFormValues) => {
    updateTenant.mutate(values);
  };

  const handleLogoUpload = (file: File) => {
    setLogoPreviewUrl(URL.createObjectURL(file));
    uploadLogo.mutate(file);
  };

  const handleLogoRemove = () => {
    setLogoPreviewUrl(null);
    removeLogo.mutate();
  };

  const handleIconUpload = (file: File) => {
    setIconPreviewUrl(URL.createObjectURL(file));
    uploadLogoIcon.mutate(file);
  };

  const handleIconRemove = () => {
    setIconPreviewUrl(null);
    removeLogoIcon.mutate();
  };

  return (
    <div>
      <Title level={5} style={{ marginBottom: 16 }}>
        Company Branding
      </Title>

      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Customize your company's appearance in the sidebar.
      </Text>

      <div style={{ display: 'flex', gap: 32, marginBottom: 32, flexWrap: 'wrap' }}>
        <LogoUploadBox
          label="Full Logo"
          description="Shown when sidebar is expanded. Recommended: 200x50 pixels, horizontal."
          currentUrl={currentTenant?.logo}
          previewUrl={logoPreviewUrl}
          onUpload={handleLogoUpload}
          onRemove={handleLogoRemove}
          isUploading={uploadLogo.isPending || removeLogo.isPending}
          width={200}
          height={60}
        />

        <LogoUploadBox
          label="Icon"
          description="Shown when sidebar is collapsed. Square or circular."
          currentUrl={currentTenant?.logo_icon}
          previewUrl={iconPreviewUrl}
          onUpload={handleIconUpload}
          onRemove={handleIconRemove}
          isUploading={uploadLogoIcon.isPending || removeLogoIcon.isPending}
          width={60}
          height={60}
          shape="circle"
        />
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark={false}
        style={{ maxWidth: 400 }}
        initialValues={{ name: currentTenant?.name || '' }}
      >
        <Form.Item
          name="name"
          label="Company Name"
          rules={[{ required: true, message: 'Please enter company name' }]}
        >
          <Input placeholder="Enter company name" />
        </Form.Item>

        <Form.Item style={{ marginTop: 24 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={updateTenant.isPending}
          >
            Save Changes
          </Button>
        </Form.Item>
      </Form>

      <Descriptions column={1} bordered size="small" style={{ marginTop: 32 }}>
        <Descriptions.Item label="Plan">
          <Text style={{ textTransform: 'capitalize' }}>{currentTenant?.plan || 'Free'}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Max Employees">
          {currentTenant?.max_employees || 10}
        </Descriptions.Item>
      </Descriptions>
    </div>
  );
}

export default function SettingsPage() {
  const tenantMemberships = useAuthStore((state) => state.tenantMemberships);
  const currentTenant = useAuthStore((state) => state.currentTenant);

  // Check if current user is admin or owner of the current tenant
  const currentMembership = tenantMemberships.find(
    (m) => m.tenant.id === currentTenant?.id
  );
  const isAdminOrOwner = currentMembership?.role === 'admin' || currentMembership?.role === 'owner';

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
    // Only show Company tab for admins/owners
    ...(isAdminOrOwner
      ? [
          {
            key: 'company',
            label: (
              <Space>
                <ShopOutlined />
                Company
              </Space>
            ),
            children: <CompanyTab />,
          },
        ]
      : []),
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

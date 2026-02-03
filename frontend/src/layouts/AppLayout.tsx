import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Dropdown, Avatar, Space, Typography, theme } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  CalendarOutlined,
  ScheduleOutlined,
  FileProtectOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: 'Dashboard',
  },
  {
    key: '/employees',
    icon: <TeamOutlined />,
    label: 'Employees',
  },
  {
    key: '/organization',
    icon: <ApartmentOutlined />,
    label: 'Organization',
  },
  {
    key: '/time-tracking',
    icon: <ClockCircleOutlined />,
    label: 'Time Tracking',
  },
  {
    key: '/timesheets',
    icon: <FileTextOutlined />,
    label: 'Timesheets',
  },
  {
    key: '/leave',
    icon: <CalendarOutlined />,
    label: 'Leave',
  },
  {
    key: '/calendar',
    icon: <ScheduleOutlined />,
    label: 'Calendar',
  },
  {
    key: '/contracts',
    icon: <FileProtectOutlined />,
    label: 'Contracts',
  },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [iconError, setIconError] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const { user, currentTenant, refreshToken, logout } = useAuthStore();

  // Reset error states when tenant logos change
  useEffect(() => {
    setLogoError(false);
  }, [currentTenant?.logo]);

  useEffect(() => {
    setIconError(false);
  }, [currentTenant?.logo_icon]);

  const handleLogout = async () => {
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Ignore errors on logout
      }
    }
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        style={{
          borderRight: '1px solid #f0f0f0',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: collapsed ? '0 8px' : '0 16px',
            borderBottom: '1px solid #f0f0f0',
            overflow: 'hidden',
          }}
        >
          {collapsed ? (
            // Collapsed: Show icon, fall back to logo, then text
            currentTenant?.logo_icon && !iconError ? (
              <img
                src={currentTenant.logo_icon}
                alt={currentTenant.name}
                onError={() => setIconError(true)}
                style={{
                  height: 36,
                  width: 36,
                  objectFit: 'contain',
                  borderRadius: '50%',
                }}
              />
            ) : currentTenant?.logo && !logoError ? (
              <img
                src={currentTenant.logo}
                alt={currentTenant.name}
                onError={() => setLogoError(true)}
                style={{
                  height: 32,
                  maxWidth: 48,
                  objectFit: 'contain',
                }}
              />
            ) : (
              <Text
                strong
                style={{
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 48,
                }}
                title={currentTenant?.name}
              >
                {currentTenant?.name?.substring(0, 3).toUpperCase() || 'RHR'}
              </Text>
            )
          ) : (
            // Expanded: Show full logo, fall back to text
            currentTenant?.logo && !logoError ? (
              <img
                src={currentTenant.logo}
                alt={currentTenant.name}
                onError={() => setLogoError(true)}
                style={{
                  height: 40,
                  maxWidth: 168,
                  objectFit: 'contain',
                }}
              />
            ) : (
              <Text
                strong
                style={{
                  fontSize: 18,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 168,
                }}
                title={currentTenant?.name}
              >
                {currentTenant?.name || 'Raptor HR'}
              </Text>
            )
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Space>
            {collapsed ? (
              <MenuUnfoldOutlined
                onClick={() => setCollapsed(false)}
                style={{ fontSize: 18, cursor: 'pointer' }}
              />
            ) : (
              <MenuFoldOutlined
                onClick={() => setCollapsed(true)}
                style={{ fontSize: 18, cursor: 'pointer' }}
              />
            )}
            {currentTenant && (
              <Text type="secondary" style={{ marginLeft: 16 }}>
                {currentTenant.name}
              </Text>
            )}
          </Space>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} src={user?.avatar} />
              <Text>{user?.full_name || user?.email}</Text>
            </Space>
          </Dropdown>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

import { Card, Col, Row, Statistic, Typography, Spin, List, Empty } from 'antd';
import {
  TeamOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  FileProtectOutlined,
  RiseOutlined,
  ApartmentOutlined,
  IdcardOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { useDashboardStats } from '@/hooks/useDashboard';

const { Title, Text } = Typography;

export default function DashboardPage() {
  const { user, currentTenant } = useAuthStore();
  const { data: stats, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  const showNoTenantMessage = error || !stats;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ marginBottom: 4 }}>
          Welcome back, {user?.first_name || user?.email}!
        </Title>
        <Text type="secondary">
          Here's what's happening at {currentTenant?.name || 'your organization'} today.
        </Text>
      </div>

      {showNoTenantMessage ? (
        <Card>
          <Empty
            description={
              <span>
                No data available. Make sure you have a tenant set up and some employees added.
              </span>
            }
          />
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card hoverable>
                <Statistic
                  title="Total Employees"
                  value={stats.total_employees}
                  prefix={<TeamOutlined />}
                  styles={{ content: { color: '#1890ff' } }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {stats.active_employees} active
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card hoverable>
                <Statistic
                  title="On Leave Today"
                  value={stats.on_leave_employees}
                  prefix={<CalendarOutlined />}
                  styles={{ content: { color: '#faad14' } }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card hoverable>
                <Statistic
                  title="Pending Leave Requests"
                  value={stats.pending_leave_requests}
                  prefix={<ClockCircleOutlined />}
                  styles={{ content: { color: stats.pending_leave_requests > 0 ? '#fa8c16' : '#52c41a' } }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card hoverable>
                <Statistic
                  title="Expiring Contracts"
                  value={stats.expiring_contracts}
                  prefix={<FileProtectOutlined />}
                  styles={{ content: { color: stats.expiring_contracts > 0 ? '#ff4d4f' : '#52c41a' } }}
                  suffix={<Text type="secondary" style={{ fontSize: 12 }}>in 30 days</Text>}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Departments"
                  value={stats.departments_count}
                  prefix={<ApartmentOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Positions"
                  value={stats.positions_count}
                  prefix={<IdcardOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="New Hires"
                  value={stats.recent_hires}
                  prefix={<UserAddOutlined />}
                  styles={{ content: { color: '#52c41a' } }}
                  suffix={<Text type="secondary" style={{ fontSize: 12 }}>last 30 days</Text>}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Growth"
                  value={
                    stats.total_employees > 0
                      ? Math.round((stats.recent_hires / stats.total_employees) * 100)
                      : 0
                  }
                  prefix={<RiseOutlined />}
                  suffix="%"
                  styles={{ content: { color: '#52c41a' } }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            <Col xs={24} lg={12}>
              <Card title="Quick Actions">
                <List
                  size="small"
                  dataSource={[
                    { title: 'Add new employee', link: '/employees' },
                    { title: 'Review leave requests', link: '/leave' },
                    { title: 'View timesheets', link: '/timesheets' },
                    { title: 'Manage departments', link: '/organization' },
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <a href={item.link}>{item.title}</a>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Upcoming Events">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No upcoming events"
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}

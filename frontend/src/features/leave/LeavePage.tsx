import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Tabs,
  Row,
  Col,
  Progress,
  Modal,
  Form,
  Input,
  Empty,
  Popconfirm,
  List,
} from 'antd';
import {
  PlusOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  GiftOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  useMyLeaveRequests,
  usePendingLeaveRequests,
  useBalanceSummary,
  useUpcomingHolidays,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
  useCancelLeaveRequest,
} from '@/hooks/useLeave';
import type { LeaveRequest, LeaveBalanceSummary, Holiday } from '@/api/leave';
import LeaveRequestFormModal from './LeaveRequestFormModal';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STATUS_COLORS: Record<string, string> = {
  pending: 'processing',
  approved: 'success',
  rejected: 'error',
  cancelled: 'default',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <ClockCircleOutlined />,
  approved: <CheckCircleOutlined />,
  rejected: <CloseCircleOutlined />,
  cancelled: <CloseCircleOutlined />,
};

export default function LeavePage() {
  const [activeTab, setActiveTab] = useState('requests');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [form] = Form.useForm();

  const { data: myRequests, isLoading: requestsLoading } = useMyLeaveRequests();
  const { data: pendingRequests, isLoading: pendingLoading } =
    usePendingLeaveRequests();
  const { data: balanceSummary } = useBalanceSummary(dayjs().year());
  const { data: upcomingHolidays } = useUpcomingHolidays();

  const approveMutation = useApproveLeaveRequest();
  const rejectMutation = useRejectLeaveRequest();
  const cancelMutation = useCancelLeaveRequest();

  const handleApprove = async (id: number) => {
    await approveMutation.mutateAsync({ id });
  };

  const handleRejectClick = (request: LeaveRequest) => {
    setSelectedRequest(request);
    form.resetFields();
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    const values = await form.validateFields();
    await rejectMutation.mutateAsync({
      id: selectedRequest.id,
      notes: values.notes,
    });
    setRejectModalOpen(false);
  };

  const handleCancel = async (id: number) => {
    await cancelMutation.mutateAsync(id);
  };

  const requestColumns: ColumnsType<LeaveRequest> = [
    {
      title: 'Type',
      key: 'type',
      width: 140,
      render: (_, record) => (
        <Tag color={record.leave_type_color}>{record.leave_type_name}</Tag>
      ),
    },
    {
      title: 'Dates',
      key: 'dates',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>
            {dayjs(record.start_date).format('MMM D')}
            {record.start_date !== record.end_date &&
              ` - ${dayjs(record.end_date).format('MMM D, YYYY')}`}
            {record.start_date === record.end_date &&
              `, ${dayjs(record.start_date).format('YYYY')}`}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.days_requested} day{record.days_requested !== 1 ? 's' : ''}
            {record.is_half_day && ` (${record.half_day_period})`}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (reason: string) => reason || '-',
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, record) => (
        <Tag color={STATUS_COLORS[record.status]} icon={STATUS_ICONS[record.status]}>
          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) =>
        record.status === 'pending' ? (
          <Popconfirm
            title="Cancel this leave request?"
            onConfirm={() => handleCancel(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger size="small">
              Cancel
            </Button>
          </Popconfirm>
        ) : null,
    },
  ];

  const pendingColumns: ColumnsType<LeaveRequest> = [
    {
      title: 'Employee',
      dataIndex: 'employee_name',
      key: 'employee_name',
      width: 160,
    },
    {
      title: 'Type',
      key: 'type',
      width: 120,
      render: (_, record) => (
        <Tag color={record.leave_type_color}>{record.leave_type_name}</Tag>
      ),
    },
    {
      title: 'Dates',
      key: 'dates',
      render: (_, record) => (
        <span>
          {dayjs(record.start_date).format('MMM D')} -{' '}
          {dayjs(record.end_date).format('MMM D')} ({record.days_requested} days)
        </span>
      ),
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={() => handleApprove(record.id)}
            loading={approveMutation.isPending}
          >
            Approve
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={() => handleRejectClick(record)}
          >
            Reject
          </Button>
        </Space>
      ),
    },
  ];

  const myRequestData = myRequests?.results || [];
  const pendingData = pendingRequests?.results || [];
  const balances = balanceSummary || [];
  const holidays = upcomingHolidays || [];

  const tabItems = [
    {
      key: 'requests',
      label: (
        <span>
          <CalendarOutlined /> My Requests
        </span>
      ),
      children: (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: 16,
            }}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setFormModalOpen(true)}
            >
              Request Leave
            </Button>
          </div>
          {myRequestData.length > 0 ? (
            <Table
              columns={requestColumns}
              dataSource={myRequestData}
              loading={requestsLoading}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No leave requests"
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setFormModalOpen(true)}
              >
                Submit Your First Request
              </Button>
            </Empty>
          )}
        </>
      ),
    },
    {
      key: 'pending',
      label: (
        <span>
          <ClockCircleOutlined /> Pending Approval
          {pendingData.length > 0 && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              {pendingData.length}
            </Tag>
          )}
        </span>
      ),
      children: pendingData.length > 0 ? (
        <Table
          columns={pendingColumns}
          dataSource={pendingData}
          loading={pendingLoading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No requests pending approval"
        />
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Leave Management
      </Title>

      <Row gutter={[24, 24]}>
        {/* Leave Balances */}
        <Col xs={24} lg={8}>
          <Card title="Leave Balances">
            {balances.length > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                {balances.map((balance: LeaveBalanceSummary) => {
                  const entitled = parseFloat(balance.entitled_days);
                  const remaining = parseFloat(balance.remaining_days);
                  const pending = parseFloat(balance.pending_days);
                  const used = parseFloat(balance.used_days);
                  const percent = entitled > 0 ? (used / entitled) * 100 : 0;

                  return (
                    <div key={balance.leave_type_id}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <Text strong style={{ color: balance.leave_type_color }}>
                          {balance.leave_type_name}
                        </Text>
                        <Text>
                          {remaining.toFixed(1)} / {entitled.toFixed(0)} days
                        </Text>
                      </div>
                      <Progress
                        percent={Math.round(percent)}
                        showInfo={false}
                        strokeColor={balance.leave_type_color}
                        trailColor="#f0f0f0"
                        size="small"
                      />
                      {pending > 0 && (
                        <Text type="warning" style={{ fontSize: 12 }}>
                          {pending.toFixed(1)} days pending
                        </Text>
                      )}
                    </div>
                  );
                })}
              </Space>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No leave balances configured"
              />
            )}
          </Card>

          {/* Upcoming Holidays */}
          <Card
            title={
              <span>
                <GiftOutlined /> Upcoming Holidays
              </span>
            }
            style={{ marginTop: 16 }}
          >
            {holidays.length > 0 ? (
              <List
                size="small"
                dataSource={holidays}
                renderItem={(holiday: Holiday) => (
                  <List.Item>
                    <Space>
                      <Text type="secondary">
                        {dayjs(holiday.date).format('MMM D')}
                      </Text>
                      <Text>{holiday.name}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            ) : (
              <Text type="secondary">No upcoming holidays</Text>
            )}
          </Card>
        </Col>

        {/* Leave Requests */}
        <Col xs={24} lg={16}>
          <Card>
            <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
          </Card>
        </Col>
      </Row>

      <LeaveRequestFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
      />

      {/* Reject Modal */}
      <Modal
        title="Reject Leave Request"
        open={rejectModalOpen}
        onCancel={() => setRejectModalOpen(false)}
        onOk={handleReject}
        okText="Reject"
        okButtonProps={{ danger: true }}
        confirmLoading={rejectMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="notes" label="Reason for rejection">
            <TextArea rows={3} placeholder="Explain why this request is rejected..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

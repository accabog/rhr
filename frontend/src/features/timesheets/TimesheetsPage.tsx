import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Tabs,
  DatePicker,
  Modal,
  Form,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  useMyTimesheets,
  usePendingApproval,
  useGenerateTimesheet,
} from '@/hooks/useTimesheets';
import type { TimesheetListItem } from '@/api/timesheets';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  submitted: 'processing',
  approved: 'success',
  rejected: 'error',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  draft: <FileTextOutlined />,
  submitted: <SendOutlined />,
  approved: <CheckCircleOutlined />,
  rejected: <CloseCircleOutlined />,
};

export default function TimesheetsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('my');
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: myTimesheets, isLoading: myLoading } = useMyTimesheets();
  const { data: pendingTimesheets, isLoading: pendingLoading } = usePendingApproval();
  const generateMutation = useGenerateTimesheet();

  const handleViewTimesheet = (id: number) => {
    navigate(`/timesheets/${id}`);
  };

  const handleGenerateTimesheet = async () => {
    const values = await form.validateFields();
    const [start, end] = values.period;

    await generateMutation.mutateAsync({
      period_start: start.format('YYYY-MM-DD'),
      period_end: end.format('YYYY-MM-DD'),
    });

    setGenerateModalOpen(false);
    form.resetFields();
  };

  const columns: ColumnsType<TimesheetListItem> = [
    {
      title: 'Period',
      key: 'period',
      render: (_: unknown, record: TimesheetListItem) => (
        <Space orientation="vertical" size={0}>
          <Text strong>
            {dayjs(record.period_start).format('MMM D')} -{' '}
            {dayjs(record.period_end).format('MMM D, YYYY')}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(record.period_end).diff(dayjs(record.period_start), 'day') + 1} days
          </Text>
        </Space>
      ),
    },
    {
      title: 'Employee',
      dataIndex: 'employee_name',
      key: 'employee_name',
      hidden: activeTab === 'my',
    },
    {
      title: 'Hours',
      key: 'hours',
      width: 140,
      render: (_: unknown, record: TimesheetListItem) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.total_hours.toFixed(1)}h total</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {parseFloat(record.total_regular_hours).toFixed(1)}h regular
            {parseFloat(record.total_overtime_hours) > 0 &&
              ` + ${parseFloat(record.total_overtime_hours).toFixed(1)}h OT`}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_: unknown, record: TimesheetListItem) => (
        <Tag color={STATUS_COLORS[record.status]} icon={STATUS_ICONS[record.status]}>
          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Submitted',
      key: 'submitted_at',
      width: 130,
      render: (_: unknown, record: TimesheetListItem) =>
        record.submitted_at ? (
          <Text type="secondary">
            {dayjs(record.submitted_at).format('MMM D, h:mm A')}
          </Text>
        ) : (
          '-'
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: TimesheetListItem) => (
        <Button type="link" onClick={() => handleViewTimesheet(record.id)}>
          View
        </Button>
      ),
    },
  ].filter((col) => !col.hidden);

  const myTimesheetData = myTimesheets?.results || [];
  const pendingData = pendingTimesheets?.results || [];

  const tabItems = [
    {
      key: 'my',
      label: (
        <span>
          <ClockCircleOutlined /> My Timesheets
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
              onClick={() => setGenerateModalOpen(true)}
            >
              Generate Timesheet
            </Button>
          </div>
          {myTimesheetData.length > 0 ? (
            <Table
              columns={columns}
              dataSource={myTimesheetData}
              loading={myLoading}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No timesheets yet"
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setGenerateModalOpen(true)}
              >
                Generate Your First Timesheet
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
          <SendOutlined /> Pending Approval
          {pendingData.length > 0 && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              {pendingData.length}
            </Tag>
          )}
        </span>
      ),
      children: pendingData.length > 0 ? (
        <Table
          columns={columns}
          dataSource={pendingData}
          loading={pendingLoading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No timesheets pending approval"
        />
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Timesheets
      </Title>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>

      <Modal
        title="Generate Timesheet"
        open={generateModalOpen}
        onCancel={() => setGenerateModalOpen(false)}
        onOk={handleGenerateTimesheet}
        okText="Generate"
        confirmLoading={generateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="period"
            label="Period"
            rules={[{ required: true, message: 'Please select a period' }]}
            help="Select the date range for the timesheet"
          >
            <RangePicker
              style={{ width: '100%' }}
              presets={[
                {
                  label: 'This Week',
                  value: [dayjs().startOf('week'), dayjs().endOf('week')],
                },
                {
                  label: 'Last Week',
                  value: [
                    dayjs().subtract(1, 'week').startOf('week'),
                    dayjs().subtract(1, 'week').endOf('week'),
                  ],
                },
                {
                  label: 'This Month',
                  value: [dayjs().startOf('month'), dayjs().endOf('month')],
                },
                {
                  label: 'Last Month',
                  value: [
                    dayjs().subtract(1, 'month').startOf('month'),
                    dayjs().subtract(1, 'month').endOf('month'),
                  ],
                },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

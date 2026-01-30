import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Select,
  Modal,
  Form,
  Input,
  DatePicker,
  InputNumber,
  Empty,
  Popconfirm,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  FileTextOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  useContracts,
  useContractTypes,
  useContractStats,
  useExpiringContracts,
  useCreateContract,
  useActivateContract,
  useTerminateContract,
  useDeleteContract,
} from '@/hooks/useContracts';
import { useEmployees } from '@/hooks/useEmployees';
import type { ContractListItem } from '@/api/contracts';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  active: 'success',
  expired: 'error',
  terminated: 'warning',
};

const SALARY_PERIOD_LABELS: Record<string, string> = {
  hourly: '/hr',
  daily: '/day',
  weekly: '/wk',
  monthly: '/mo',
  yearly: '/yr',
};

export default function ContractsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: contracts, isLoading } = useContracts({
    status: statusFilter || undefined,
  });
  const { data: contractTypes } = useContractTypes();
  const { data: stats } = useContractStats();
  const { data: expiringContracts } = useExpiringContracts();
  const { data: employees } = useEmployees();

  const createMutation = useCreateContract();
  const activateMutation = useActivateContract();
  const terminateMutation = useTerminateContract();
  const deleteMutation = useDeleteContract();

  const handleCreateContract = async () => {
    const values = await form.validateFields();

    await createMutation.mutateAsync({
      employee: values.employee,
      contract_type: values.contract_type,
      title: values.title,
      start_date: values.start_date.format('YYYY-MM-DD'),
      end_date: values.end_date?.format('YYYY-MM-DD'),
      status: values.status || 'draft',
      salary: values.salary,
      salary_currency: values.salary_currency || 'USD',
      salary_period: values.salary_period || 'monthly',
      hours_per_week: values.hours_per_week || 40,
      probation_end_date: values.probation_end_date?.format('YYYY-MM-DD'),
      notice_period_days: values.notice_period_days || 30,
      notes: values.notes || '',
    });

    setFormModalOpen(false);
    form.resetFields();
  };

  const handleActivate = async (id: number) => {
    await activateMutation.mutateAsync(id);
  };

  const handleTerminate = async (id: number) => {
    await terminateMutation.mutateAsync(id);
  };

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync(id);
  };

  const columns: ColumnsType<ContractListItem> = [
    {
      title: 'Employee',
      dataIndex: 'employee_name',
      key: 'employee_name',
      width: 160,
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Contract',
      key: 'contract',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.title}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.contract_type_name}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Period',
      key: 'period',
      width: 180,
      render: (_, record) => (
        <span>
          {dayjs(record.start_date).format('MMM D, YYYY')}
          {record.end_date
            ? ` - ${dayjs(record.end_date).format('MMM D, YYYY')}`
            : ' - Ongoing'}
        </span>
      ),
    },
    {
      title: 'Salary',
      key: 'salary',
      width: 140,
      render: (_, record) =>
        record.salary ? (
          <Text>
            {record.salary_currency} {parseFloat(record.salary).toLocaleString()}
            <Text type="secondary">
              {SALARY_PERIOD_LABELS[record.salary_period]}
            </Text>
          </Text>
        ) : (
          '-'
        ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Tag color={STATUS_COLORS[record.status]}>
            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
          </Tag>
          {record.is_expiring_soon && (
            <Tag color="warning" icon={<WarningOutlined />}>
              Expiring
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          {record.status === 'draft' && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleActivate(record.id)}
            >
              Activate
            </Button>
          )}
          {record.status === 'active' && (
            <Popconfirm
              title="Terminate this contract?"
              onConfirm={() => handleTerminate(record.id)}
              okText="Terminate"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<CloseCircleOutlined />}
              >
                Terminate
              </Button>
            </Popconfirm>
          )}
          {record.status === 'draft' && (
            <Popconfirm
              title="Delete this contract?"
              onConfirm={() => handleDelete(record.id)}
              okText="Delete"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger>
                Delete
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const contractData = contracts?.results || [];
  const expiring = expiringContracts || [];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Contracts
      </Title>

      <Row gutter={[24, 24]}>
        {/* Stats */}
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Contracts"
              value={stats?.total || 0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Active"
              value={stats?.active || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Draft"
              value={stats?.draft || 0}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Expiring Soon"
              value={stats?.expiring_soon || 0}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>

        {/* Expiring Alert */}
        {expiring.length > 0 && (
          <Col span={24}>
            <Alert
              type="warning"
              message={`${expiring.length} contract${expiring.length > 1 ? 's' : ''} expiring within 30 days`}
              description={
                <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                  {expiring.slice(0, 3).map((c) => (
                    <li key={c.id}>
                      {c.employee_name} - {c.title} (expires{' '}
                      {dayjs(c.end_date).format('MMM D')})
                    </li>
                  ))}
                  {expiring.length > 3 && <li>... and {expiring.length - 3} more</li>}
                </ul>
              }
              showIcon
            />
          </Col>
        )}

        {/* Contracts Table */}
        <Col span={24}>
          <Card>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Space>
                <Select
                  placeholder="Filter by status"
                  allowClear
                  style={{ width: 160 }}
                  value={statusFilter || undefined}
                  onChange={(value) => setStatusFilter(value || '')}
                  options={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'active', label: 'Active' },
                    { value: 'expired', label: 'Expired' },
                    { value: 'terminated', label: 'Terminated' },
                  ]}
                />
              </Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setFormModalOpen(true)}
              >
                New Contract
              </Button>
            </div>

            {contractData.length > 0 ? (
              <Table
                columns={columns}
                dataSource={contractData}
                loading={isLoading}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                size="small"
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No contracts found"
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setFormModalOpen(true)}
                >
                  Create First Contract
                </Button>
              </Empty>
            )}
          </Card>
        </Col>
      </Row>

      {/* Create Contract Modal */}
      <Modal
        title="Create Contract"
        open={formModalOpen}
        onCancel={() => setFormModalOpen(false)}
        onOk={handleCreateContract}
        okText="Create"
        confirmLoading={createMutation.isPending}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'draft',
            salary_currency: 'USD',
            salary_period: 'monthly',
            hours_per_week: 40,
            notice_period_days: 30,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="employee"
                label="Employee"
                rules={[{ required: true, message: 'Please select an employee' }]}
              >
                <Select
                  placeholder="Select employee"
                  showSearch
                  optionFilterProp="label"
                  options={employees?.results?.map((emp) => ({
                    value: emp.id,
                    label: `${emp.first_name} ${emp.last_name}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="contract_type"
                label="Contract Type"
                rules={[{ required: true, message: 'Please select a type' }]}
              >
                <Select
                  placeholder="Select type"
                  options={contractTypes?.map((type) => ({
                    value: type.id,
                    label: type.name,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="title"
            label="Contract Title"
            rules={[{ required: true, message: 'Please enter a title' }]}
          >
            <Input placeholder="e.g., Employment Agreement - Software Engineer" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="start_date"
                label="Start Date"
                rules={[{ required: true, message: 'Please select start date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="end_date" label="End Date (optional)">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="salary" label="Salary">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Amount"
                  min={0}
                  prefix={<DollarOutlined />}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="salary_currency" label="Currency">
                <Select
                  options={[
                    { value: 'USD', label: 'USD' },
                    { value: 'EUR', label: 'EUR' },
                    { value: 'GBP', label: 'GBP' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="salary_period" label="Period">
                <Select
                  options={[
                    { value: 'hourly', label: 'Hourly' },
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'yearly', label: 'Yearly' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="hours_per_week" label="Hours/Week">
                <InputNumber style={{ width: '100%' }} min={0} max={168} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="probation_end_date" label="Probation End">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="notice_period_days" label="Notice Period (days)">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Additional notes..." />
          </Form.Item>

          <Form.Item name="status" label="Initial Status">
            <Select
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'active', label: 'Active' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

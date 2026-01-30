import {
  Drawer,
  Descriptions,
  Avatar,
  Tag,
  Typography,
  Space,
  Button,
  Popconfirm,
  Spin,
  Tabs,
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useEmployee, useDeleteEmployee } from '@/hooks/useEmployees';

const { Title, Text } = Typography;

interface EmployeeDetailDrawerProps {
  employeeId: number | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: number) => void;
}

const statusColors: Record<string, string> = {
  active: 'green',
  on_leave: 'orange',
  terminated: 'red',
  suspended: 'volcano',
};

export default function EmployeeDetailDrawer({
  employeeId,
  open,
  onClose,
  onEdit,
}: EmployeeDetailDrawerProps) {
  const { data: employee, isLoading } = useEmployee(employeeId ?? undefined);
  const deleteMutation = useDeleteEmployee();

  const handleDelete = async () => {
    if (employeeId) {
      await deleteMutation.mutateAsync(employeeId);
      onClose();
    }
  };

  const handleEdit = () => {
    if (employeeId) {
      onEdit(employeeId);
    }
  };

  const tabItems = [
    {
      key: 'info',
      label: 'Information',
      children: employee ? (
        <div>
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="Employee ID">
              {employee.employee_id}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={statusColors[employee.status] || 'default'}>
                {employee.status.replace('_', ' ').toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              <Space>
                <MailOutlined />
                {employee.email}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Phone">
              <Space>
                <PhoneOutlined />
                {employee.phone || '-'}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Department">
              {employee.department_name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Position">
              {employee.position_title || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Reports To">
              {employee.manager_name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Hire Date">
              <Space>
                <CalendarOutlined />
                {employee.hire_date}
              </Space>
            </Descriptions.Item>
          </Descriptions>

          <Title level={5} style={{ marginTop: 24 }}>
            Personal Information
          </Title>
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="Date of Birth">
              {employee.date_of_birth || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Address" span={2}>
              {employee.address || '-'}
            </Descriptions.Item>
          </Descriptions>

          <Title level={5} style={{ marginTop: 24 }}>
            Emergency Contact
          </Title>
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="Name">
              {employee.emergency_contact_name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Phone">
              {employee.emergency_contact_phone || '-'}
            </Descriptions.Item>
          </Descriptions>
        </div>
      ) : null,
    },
    {
      key: 'time',
      label: 'Time & Attendance',
      children: (
        <Text type="secondary">
          Time tracking information will appear here.
        </Text>
      ),
    },
    {
      key: 'leave',
      label: 'Leave',
      children: (
        <Text type="secondary">Leave balance and requests will appear here.</Text>
      ),
    },
    {
      key: 'contracts',
      label: 'Contracts',
      children: (
        <Text type="secondary">Employment contracts will appear here.</Text>
      ),
    },
  ];

  return (
    <Drawer
      title={null}
      placement="right"
      width={640}
      onClose={onClose}
      open={open}
      extra={
        <Space>
          <Button icon={<EditOutlined />} onClick={handleEdit}>
            Edit
          </Button>
          <Popconfirm
            title="Delete Employee"
            description="Are you sure you want to delete this employee?"
            onConfirm={handleDelete}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      }
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : employee ? (
        <>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Avatar size={80} icon={<UserOutlined />} src={employee.avatar} />
            <Title level={4} style={{ marginTop: 12, marginBottom: 4 }}>
              {employee.full_name}
            </Title>
            <Text type="secondary">
              {employee.position_title || 'No position'} •{' '}
              {employee.department_name || 'No department'}
            </Text>
          </div>

          <Tabs items={tabItems} defaultActiveKey="info" />
        </>
      ) : (
        <Text type="secondary">Employee not found</Text>
      )}
    </Drawer>
  );
}

import { useState } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  Avatar,
  Typography,
  Card,
  Select,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useEmployees, useDepartments } from '@/hooks/useEmployees';
import type { Employee } from '@/types';
import EmployeeFormModal from './EmployeeFormModal';
import EmployeeDetailDrawer from './EmployeeDetailDrawer';

const { Title } = Typography;

const statusColors: Record<string, string> = {
  active: 'green',
  on_leave: 'orange',
  terminated: 'red',
  suspended: 'volcano',
};

export default function EmployeesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [departmentFilter, setDepartmentFilter] = useState<number | undefined>();

  // Modal/drawer state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [viewingEmployeeId, setViewingEmployeeId] = useState<number | null>(null);

  const { data, isLoading } = useEmployees({
    search,
    page,
    page_size: 10,
    status: statusFilter,
    department: departmentFilter,
  });
  const { data: departmentsData } = useDepartments();

  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setFormModalOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormModalOpen(true);
    setDetailDrawerOpen(false);
  };

  const handleViewEmployee = (employee: Employee) => {
    setViewingEmployeeId(employee.id);
    setDetailDrawerOpen(true);
  };

  const handleEditFromDrawer = (id: number) => {
    const employee = data?.results.find((e) => e.id === id);
    if (employee) {
      handleEditEmployee(employee);
    }
  };

  const columns: ColumnsType<Employee> = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_, record) => (
        <Space
          style={{ cursor: 'pointer' }}
          onClick={() => handleViewEmployee(record)}
        >
          <Avatar icon={<UserOutlined />} src={record.avatar} />
          <div>
            <div style={{ fontWeight: 500 }}>{record.full_name}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Employee ID',
      dataIndex: 'employee_id',
      key: 'employee_id',
      width: 120,
    },
    {
      title: 'Department',
      dataIndex: 'department_name',
      key: 'department',
      render: (text) => text || <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: 'Position',
      dataIndex: 'position_title',
      key: 'position',
      render: (text) => text || <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {status.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Hire Date',
      dataIndex: 'hire_date',
      key: 'hire_date',
      width: 120,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleViewEmployee(record)}>
            View
          </Button>
          <Button type="link" size="small" onClick={() => handleEditEmployee(record)}>
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  const departments = departmentsData?.results || [];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Employees
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddEmployee}>
          Add Employee
        </Button>
      </div>

      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Input
              placeholder="Search employees..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ width: 300 }}
              allowClear
            />
          </Col>
          <Col>
            <Space>
              <FilterOutlined style={{ color: '#888' }} />
              <Select
                placeholder="Status"
                style={{ width: 130 }}
                allowClear
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'on_leave', label: 'On Leave' },
                  { value: 'suspended', label: 'Suspended' },
                  { value: 'terminated', label: 'Terminated' },
                ]}
              />
              <Select
                placeholder="Department"
                style={{ width: 180 }}
                allowClear
                showSearch
                optionFilterProp="label"
                value={departmentFilter}
                onChange={(value) => {
                  setDepartmentFilter(value);
                  setPage(1);
                }}
                options={departments.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
              />
            </Space>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={data?.results}
          loading={isLoading}
          rowKey="id"
          pagination={{
            current: page,
            total: data?.count || 0,
            pageSize: 10,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (total) => `Total ${total} employees`,
          }}
        />
      </Card>

      <EmployeeFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        employee={selectedEmployee}
      />

      <EmployeeDetailDrawer
        employeeId={viewingEmployeeId}
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        onEdit={handleEditFromDrawer}
      />
    </div>
  );
}

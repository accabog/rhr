import { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Popconfirm,
  Tag,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useEmployees,
} from '@/hooks/useEmployees';
import type { Department } from '@/types';

export default function DepartmentsTab() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useDepartments();
  const { data: employeesData } = useEmployees({ status: 'active' });
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();

  const handleAdd = () => {
    setEditingDepartment(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true });
    setModalOpen(true);
  };

  const handleEdit = (dept: Department) => {
    setEditingDepartment(dept);
    form.setFieldsValue(dept);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync(id);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingDepartment) {
        await updateMutation.mutateAsync({
          id: editingDepartment.id,
          data: values,
        });
      } else {
        await createMutation.mutateAsync(values);
      }
      setModalOpen(false);
    } catch {
      // Form validation error
    }
  };

  const departments = data?.results || [];
  const employees = employeesData?.results || [];

  const columns: ColumnsType<Department> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          {text}
          {record.code && (
            <Tag color="blue">{record.code}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Parent Department',
      key: 'parent',
      render: (_, record) => {
        const parent = departments.find((d) => d.id === record.parent);
        return parent?.name || '-';
      },
    },
    {
      title: 'Manager',
      key: 'manager',
      render: (_, record) => {
        const manager = employees.find((e) => e.id === record.manager);
        return manager?.full_name || '-';
      },
    },
    {
      title: 'Employees',
      dataIndex: 'employees_count',
      key: 'employees_count',
      width: 100,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'default'}>
          {active ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete Department"
            description="Are you sure? This will not delete employees."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Department
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={departments}
        loading={isLoading}
        rowKey="id"
        pagination={false}
      />

      <Modal
        title={editingDepartment ? 'Edit Department' : 'Add Department'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Department Name"
            rules={[{ required: true, message: 'Please enter department name' }]}
          >
            <Input placeholder="e.g., Engineering" />
          </Form.Item>

          <Form.Item name="code" label="Code">
            <Input placeholder="e.g., ENG" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Department description" />
          </Form.Item>

          <Form.Item name="parent" label="Parent Department">
            <Select
              placeholder="Select parent department"
              allowClear
              options={departments
                .filter((d) => d.id !== editingDepartment?.id)
                .map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
            />
          </Form.Item>

          <Form.Item name="manager" label="Department Manager">
            <Select
              placeholder="Select manager"
              allowClear
              showSearch
              optionFilterProp="label"
              options={employees.map((e) => ({
                value: e.id,
                label: e.full_name,
              }))}
            />
          </Form.Item>

          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

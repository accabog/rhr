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
  InputNumber,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  usePositions,
  useDepartments,
  useCreatePosition,
  useUpdatePosition,
  useDeletePosition,
} from '@/hooks/useEmployees';
import type { Position } from '@/types';

const levelLabels: Record<number, string> = {
  1: 'Entry',
  2: 'Junior',
  3: 'Mid',
  4: 'Senior',
  5: 'Lead',
};

export default function PositionsTab() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = usePositions();
  const { data: departmentsData } = useDepartments();
  const createMutation = useCreatePosition();
  const updateMutation = useUpdatePosition();
  const deleteMutation = useDeletePosition();

  const handleAdd = () => {
    setEditingPosition(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true, level: 1 });
    setModalOpen(true);
  };

  const handleEdit = (position: Position) => {
    setEditingPosition(position);
    form.setFieldsValue(position);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync(id);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingPosition) {
        await updateMutation.mutateAsync({
          id: editingPosition.id,
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

  const positions = data?.results || [];
  const departments = departmentsData?.results || [];

  const columns: ColumnsType<Position> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <Space>
          {text}
          {record.code && <Tag color="blue">{record.code}</Tag>}
        </Space>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'department_name',
      key: 'department',
      render: (text) => text || '-',
    },
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: number) => (
        <Tag color="purple">{levelLabels[level] || `Level ${level}`}</Tag>
      ),
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
            title="Delete Position"
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
          Add Position
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={positions}
        loading={isLoading}
        rowKey="id"
        pagination={false}
      />

      <Modal
        title={editingPosition ? 'Edit Position' : 'Add Position'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Position Title"
            rules={[{ required: true, message: 'Please enter position title' }]}
          >
            <Input placeholder="e.g., Software Engineer" />
          </Form.Item>

          <Form.Item name="code" label="Code">
            <Input placeholder="e.g., SWE" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Position description" />
          </Form.Item>

          <Form.Item name="department" label="Department">
            <Select
              placeholder="Select department"
              allowClear
              options={departments.map((d) => ({
                value: d.id,
                label: d.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="level"
            label="Seniority Level"
            rules={[{ required: true }]}
          >
            <InputNumber
              min={1}
              max={10}
              style={{ width: '100%' }}
              suffix={
                <span style={{ minWidth: 60, display: 'inline-block', color: '#888' }}>
                  {levelLabels[form.getFieldValue('level')] || ''}
                </span>
              }
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

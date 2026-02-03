import { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Divider,
} from 'antd';
import dayjs from 'dayjs';
import {
  useCreateEmployee,
  useUpdateEmployee,
  useDepartments,
  usePositions,
  useEmployees,
} from '@/hooks/useEmployees';
import type { Employee } from '@/types';

interface EmployeeFormModalProps {
  open: boolean;
  onClose: () => void;
  employee?: Employee | null;
}

interface FormValues {
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department?: number;
  position?: number;
  manager?: number;
  hire_date: dayjs.Dayjs;
  status: 'active' | 'on_leave' | 'terminated' | 'suspended';
  date_of_birth?: dayjs.Dayjs;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export default function EmployeeFormModal({
  open,
  onClose,
  employee,
}: EmployeeFormModalProps) {
  const [form] = Form.useForm<FormValues>();
  const isEditing = !!employee;

  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const { data: departmentsData } = useDepartments();
  const { data: positionsData } = usePositions();
  const { data: employeesData } = useEmployees({ status: 'active' });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      if (employee) {
        form.setFieldsValue({
          ...employee,
          hire_date: dayjs(employee.hire_date),
          date_of_birth: employee.date_of_birth
            ? dayjs(employee.date_of_birth)
            : undefined,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          status: 'active',
          hire_date: dayjs(),
        });
      }
    }
  }, [open, employee, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        hire_date: values.hire_date.format('YYYY-MM-DD'),
        date_of_birth: values.date_of_birth?.format('YYYY-MM-DD'),
      };

      if (isEditing && employee) {
        await updateMutation.mutateAsync({ id: employee.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }

      onClose();
    } catch {
      // Form validation error, handled by antd
    }
  };

  const departments = departmentsData?.results || [];
  const positions = positionsData?.results || [];
  const managers = (employeesData?.results || []).filter(
    (e) => e.id !== employee?.id
  );

  return (
    <Modal
      title={isEditing ? 'Edit Employee' : 'Add Employee'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={isEditing ? 'Save Changes' : 'Add Employee'}
      confirmLoading={isLoading}
      width={800}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        <Divider titlePlacement="left" plain>
          Basic Information
        </Divider>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="employee_id"
              label="Employee ID"
              rules={[{ required: true, message: 'Please enter employee ID' }]}
            >
              <Input placeholder="e.g., EMP001" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="first_name"
              label="First Name"
              rules={[{ required: true, message: 'Please enter first name' }]}
            >
              <Input placeholder="First name" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="last_name"
              label="Last Name"
              rules={[{ required: true, message: 'Please enter last name' }]}
            >
              <Input placeholder="Last name" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Please enter email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input placeholder="email@company.com" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="phone" label="Phone">
              <Input placeholder="+1 (555) 123-4567" />
            </Form.Item>
          </Col>
        </Row>

        <Divider titlePlacement="left" plain>
          Employment Details
        </Divider>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="department" label="Department">
              <Select
                placeholder="Select department"
                allowClear
                showSearch
                optionFilterProp="label"
                options={departments.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="position" label="Position">
              <Select
                placeholder="Select position"
                allowClear
                showSearch
                optionFilterProp="label"
                options={positions.map((p) => ({
                  value: p.id,
                  label: p.title,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="manager" label="Reports To">
              <Select
                placeholder="Select manager"
                allowClear
                showSearch
                optionFilterProp="label"
                options={managers.map((e) => ({
                  value: e.id,
                  label: e.full_name,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="hire_date"
              label="Hire Date"
              rules={[{ required: true, message: 'Please select hire date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="status"
              label="Status"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'on_leave', label: 'On Leave' },
                  { value: 'suspended', label: 'Suspended' },
                  { value: 'terminated', label: 'Terminated' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="date_of_birth" label="Date of Birth">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider titlePlacement="left" plain>
          Additional Information
        </Divider>

        <Form.Item name="address" label="Address">
          <Input.TextArea rows={2} placeholder="Home address" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="emergency_contact_name" label="Emergency Contact Name">
              <Input placeholder="Contact name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="emergency_contact_phone" label="Emergency Contact Phone">
              <Input placeholder="Contact phone" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

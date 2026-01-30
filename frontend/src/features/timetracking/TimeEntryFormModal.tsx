import { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, TimePicker, InputNumber, Row, Col } from 'antd';
import dayjs from 'dayjs';
import {
  useTimeEntryTypes,
  useCreateTimeEntry,
  useUpdateTimeEntry,
} from '@/hooks/useTimeTracking';
import { useEmployees } from '@/hooks/useEmployees';
import type { TimeEntry } from '@/api/timetracking';

interface TimeEntryFormModalProps {
  open: boolean;
  onClose: () => void;
  entry?: TimeEntry | null;
  defaultEmployeeId?: number;
}

interface FormValues {
  employee: number;
  entry_type: number;
  date: dayjs.Dayjs;
  start_time: dayjs.Dayjs;
  end_time: dayjs.Dayjs;
  break_minutes: number;
  notes?: string;
  project?: string;
  task?: string;
}

export default function TimeEntryFormModal({
  open,
  onClose,
  entry,
  defaultEmployeeId,
}: TimeEntryFormModalProps) {
  const [form] = Form.useForm<FormValues>();
  const isEditing = !!entry;

  const { data: entryTypes } = useTimeEntryTypes();
  const { data: employeesData } = useEmployees({ status: 'active' });
  const createMutation = useCreateTimeEntry();
  const updateMutation = useUpdateTimeEntry();

  const isLoading = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      if (entry) {
        form.setFieldsValue({
          employee: entry.employee,
          entry_type: entry.entry_type,
          date: dayjs(entry.date),
          start_time: dayjs(entry.start_time, 'HH:mm:ss'),
          end_time: entry.end_time ? dayjs(entry.end_time, 'HH:mm:ss') : undefined,
          break_minutes: entry.break_minutes,
          notes: entry.notes,
          project: entry.project,
          task: entry.task,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          employee: defaultEmployeeId,
          date: dayjs(),
          break_minutes: 0,
        });
      }
    }
  }, [open, entry, form, defaultEmployeeId]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        employee: values.employee,
        entry_type: values.entry_type,
        date: values.date.format('YYYY-MM-DD'),
        start_time: values.start_time.format('HH:mm:ss'),
        end_time: values.end_time?.format('HH:mm:ss'),
        break_minutes: values.break_minutes || 0,
        notes: values.notes || '',
        project: values.project || '',
        task: values.task || '',
      };

      if (isEditing && entry) {
        await updateMutation.mutateAsync({ id: entry.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }

      onClose();
    } catch {
      // Form validation error
    }
  };

  const employees = employeesData?.results || [];
  const types = entryTypes || [];

  return (
    <Modal
      title={isEditing ? 'Edit Time Entry' : 'Add Time Entry'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={isEditing ? 'Save Changes' : 'Add Entry'}
      confirmLoading={isLoading}
      width={600}
    >
      <Form form={form} layout="vertical" requiredMark="optional">
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
                options={employees.map((e) => ({
                  value: e.id,
                  label: e.full_name,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="entry_type"
              label="Entry Type"
              rules={[{ required: true, message: 'Please select entry type' }]}
            >
              <Select
                placeholder="Select type"
                options={types.map((t) => ({
                  value: t.id,
                  label: t.name,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="date"
              label="Date"
              rules={[{ required: true, message: 'Please select date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="start_time"
              label="Start Time"
              rules={[{ required: true, message: 'Please select start time' }]}
            >
              <TimePicker format="HH:mm" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="end_time"
              label="End Time"
              rules={[{ required: true, message: 'Please select end time' }]}
            >
              <TimePicker format="HH:mm" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="break_minutes" label="Break (minutes)">
          <InputNumber min={0} max={480} style={{ width: '100%' }} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="project" label="Project">
              <Input placeholder="Project name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="task" label="Task">
              <Input placeholder="Task description" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={2} placeholder="Additional notes" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

import { useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  DatePicker,
  Switch,
  Input,
  Space,
  Typography,
  Alert,
} from 'antd';
import dayjs from 'dayjs';
import { useLeaveTypes, useBalanceSummary, useCreateLeaveRequest } from '@/hooks/useLeave';

const { TextArea } = Input;
const { Text } = Typography;
const { RangePicker } = DatePicker;

interface LeaveRequestFormModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LeaveRequestFormModal({
  open,
  onClose,
}: LeaveRequestFormModalProps) {
  const [form] = Form.useForm();
  const { data: leaveTypes } = useLeaveTypes();
  const { data: balances } = useBalanceSummary(dayjs().year());
  const createMutation = useCreateLeaveRequest();

  const isHalfDay = Form.useWatch('is_half_day', form);
  const selectedLeaveType = Form.useWatch('leave_type', form);
  const dateRange = Form.useWatch('date_range', form);

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();

    const startDate = values.is_half_day
      ? values.single_date.format('YYYY-MM-DD')
      : values.date_range[0].format('YYYY-MM-DD');

    const endDate = values.is_half_day
      ? values.single_date.format('YYYY-MM-DD')
      : values.date_range[1].format('YYYY-MM-DD');

    await createMutation.mutateAsync({
      leave_type: values.leave_type,
      start_date: startDate,
      end_date: endDate,
      is_half_day: values.is_half_day || false,
      half_day_period: values.half_day_period,
      reason: values.reason || '',
    });

    onClose();
  };

  // Calculate days requested
  const getDaysRequested = () => {
    if (isHalfDay) return 0.5;
    if (!dateRange || !dateRange[0] || !dateRange[1]) return 0;
    return dateRange[1].diff(dateRange[0], 'day') + 1;
  };

  // Find selected leave type balance
  const getSelectedBalance = () => {
    if (!selectedLeaveType || !balances) return null;
    return balances.find((b) => b.leave_type_id === selectedLeaveType);
  };

  const selectedBalance = getSelectedBalance();
  const daysRequested = getDaysRequested();

  return (
    <Modal
      title="Request Leave"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="Submit Request"
      confirmLoading={createMutation.isPending}
      width={500}
    >
      <Form form={form} layout="vertical" initialValues={{ is_half_day: false }}>
        <Form.Item
          name="leave_type"
          label="Leave Type"
          rules={[{ required: true, message: 'Please select a leave type' }]}
        >
          <Select
            placeholder="Select leave type"
            options={leaveTypes?.map((type) => ({
              value: type.id,
              label: (
                <Space>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: type.color,
                    }}
                  />
                  {type.name}
                </Space>
              ),
            }))}
          />
        </Form.Item>

        {selectedBalance && (
          <Alert
            type="info"
            message={
              <Space>
                <Text>
                  Available: <strong>{parseFloat(selectedBalance.remaining_days).toFixed(1)}</strong> days
                </Text>
                {parseFloat(selectedBalance.pending_days) > 0 && (
                  <Text type="warning">
                    ({parseFloat(selectedBalance.pending_days).toFixed(1)} pending)
                  </Text>
                )}
              </Space>
            }
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item name="is_half_day" valuePropName="checked" label="Half Day">
          <Switch />
        </Form.Item>

        {isHalfDay ? (
          <>
            <Form.Item
              name="single_date"
              label="Date"
              rules={[{ required: true, message: 'Please select a date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="half_day_period"
              label="Period"
              rules={[{ required: true, message: 'Please select a period' }]}
            >
              <Select
                placeholder="Select period"
                options={[
                  { value: 'morning', label: 'Morning' },
                  { value: 'afternoon', label: 'Afternoon' },
                ]}
              />
            </Form.Item>
          </>
        ) : (
          <Form.Item
            name="date_range"
            label="Dates"
            rules={[{ required: true, message: 'Please select dates' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
        )}

        {daysRequested > 0 && (
          <Alert
            type={
              selectedBalance &&
              daysRequested > parseFloat(selectedBalance.remaining_days)
                ? 'warning'
                : 'success'
            }
            message={
              <Text>
                Requesting: <strong>{daysRequested}</strong> day
                {daysRequested !== 1 ? 's' : ''}
              </Text>
            }
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item name="reason" label="Reason (optional)">
          <TextArea rows={3} placeholder="Enter reason for leave..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}

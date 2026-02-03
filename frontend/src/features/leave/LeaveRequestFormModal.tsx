import { useEffect, useMemo } from 'react';
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
  Tag,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { useLeaveTypes, useBalanceSummary, useCreateLeaveRequest, useHolidays } from '@/hooks/useLeave';
import { useCurrentEmployee } from '@/hooks/useEmployees';
import type { Holiday } from '@/api/leave';

dayjs.extend(isBetween);

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
  const { data: currentEmployee } = useCurrentEmployee();

  const isHalfDay = Form.useWatch('is_half_day', form);
  const selectedLeaveType = Form.useWatch('leave_type', form);
  const dateRange = Form.useWatch('date_range', form);
  const singleDate = Form.useWatch('single_date', form);

  // Get employee's country for holiday filtering
  const employeeCountry = currentEmployee?.department_country || '';

  // Fetch holidays for the employee's country (current and next year)
  const currentYear = dayjs().year();
  const { data: currentYearHolidays } = useHolidays(currentYear, employeeCountry);
  const { data: nextYearHolidays } = useHolidays(currentYear + 1, employeeCountry);

  // Combine holidays from both years
  const allHolidays = useMemo(() => {
    const combined: Holiday[] = [];
    if (currentYearHolidays) combined.push(...currentYearHolidays);
    if (nextYearHolidays) combined.push(...nextYearHolidays);
    return combined;
  }, [currentYearHolidays, nextYearHolidays]);

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

  // Find holidays that fall within a date range
  const getExcludedHolidays = (startDate: Dayjs, endDate: Dayjs): Holiday[] => {
    if (!allHolidays.length) return [];

    return allHolidays.filter((holiday) => {
      const holidayDate = dayjs(holiday.date);
      return holidayDate.isBetween(startDate, endDate, 'day', '[]');
    });
  };

  // Calculate days requested (with holiday exclusion info)
  const getLeaveCalculation = (): { totalDays: number; excludedHolidays: Holiday[]; workingDays: number } => {
    const emptyResult = { totalDays: 0, excludedHolidays: [] as Holiday[], workingDays: 0 };

    if (isHalfDay) {
      if (!singleDate) return emptyResult;
      const excludedHolidays = getExcludedHolidays(singleDate, singleDate);
      // For half-day, check if the single date is a holiday
      if (excludedHolidays.length > 0) {
        return { totalDays: 0.5, excludedHolidays, workingDays: 0 };
      }
      return { totalDays: 0.5, excludedHolidays: [], workingDays: 0.5 };
    }

    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      return emptyResult;
    }

    const startDate: Dayjs = dateRange[0];
    const endDate: Dayjs = dateRange[1];
    const totalDays = endDate.diff(startDate, 'day') + 1;
    const excludedHolidays = getExcludedHolidays(startDate, endDate);
    const workingDays = Math.max(0, totalDays - excludedHolidays.length);

    return { totalDays, excludedHolidays, workingDays };
  };

  const leaveCalc = getLeaveCalculation();

  // Find selected leave type balance
  const getSelectedBalance = () => {
    if (!selectedLeaveType || !balances) return null;
    return balances.find((b) => b.leave_type_id === selectedLeaveType);
  };

  const selectedBalance = getSelectedBalance();

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

        {leaveCalc.totalDays > 0 && (
          <Alert
            type={
              selectedBalance &&
              leaveCalc.workingDays > parseFloat(selectedBalance.remaining_days)
                ? 'warning'
                : 'success'
            }
            message={
              <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                <Text>
                  Requesting: <strong>{leaveCalc.workingDays}</strong> working day
                  {leaveCalc.workingDays !== 1 ? 's' : ''}
                  {leaveCalc.excludedHolidays.length > 0 && (
                    <Text type="secondary">
                      {' '}(from {leaveCalc.totalDays} calendar day{leaveCalc.totalDays !== 1 ? 's' : ''})
                    </Text>
                  )}
                </Text>
                {leaveCalc.excludedHolidays.length > 0 && (
                  <Space size={[0, 4]} wrap>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Holidays not counted:
                    </Text>
                    {leaveCalc.excludedHolidays.map((holiday) => (
                      <Tag key={holiday.id} color="blue" style={{ margin: 0 }}>
                        {holiday.name} ({dayjs(holiday.date).format('MMM D')})
                      </Tag>
                    ))}
                  </Space>
                )}
              </Space>
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

import { useState, useMemo } from 'react';
import { Calendar, Badge, Card, Typography, Spin, Tooltip, Tag } from 'antd';
import type { CalendarProps } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useLeaveCalendar, useHolidays } from '@/hooks/useLeave';
import type { LeaveRequest, Holiday } from '@/api/leave';

const { Title, Text } = Typography;

type BadgeStatus = 'success' | 'processing' | 'default' | 'error' | 'warning';

const statusBadgeMap: Record<string, BadgeStatus> = {
  approved: 'success',
  pending: 'processing',
  rejected: 'error',
  cancelled: 'default',
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());

  // Calculate date range for the current month view (with buffer for adjacent months)
  const startDate = currentDate.startOf('month').subtract(7, 'day').format('YYYY-MM-DD');
  const endDate = currentDate.endOf('month').add(7, 'day').format('YYYY-MM-DD');

  const { data: leaveRequests, isLoading: isLoadingLeave } = useLeaveCalendar(startDate, endDate);
  const { data: holidays, isLoading: isLoadingHolidays } = useHolidays(currentDate.year());

  // Group leave requests by date for efficient lookup
  const leaveByDate = useMemo(() => {
    const map = new Map<string, LeaveRequest[]>();
    if (!leaveRequests) return map;

    leaveRequests.forEach((request) => {
      // Only show approved or pending leaves on calendar
      if (request.status !== 'approved' && request.status !== 'pending') return;

      const start = dayjs(request.start_date);
      const end = dayjs(request.end_date);
      let current = start;

      while (current.isBefore(end) || current.isSame(end, 'day')) {
        const dateKey = current.format('YYYY-MM-DD');
        const existing = map.get(dateKey) || [];
        existing.push(request);
        map.set(dateKey, existing);
        current = current.add(1, 'day');
      }
    });

    return map;
  }, [leaveRequests]);

  // Group holidays by date
  const holidaysByDate = useMemo(() => {
    const map = new Map<string, Holiday[]>();
    if (!holidays) return map;

    holidays.forEach((holiday) => {
      const existing = map.get(holiday.date) || [];
      existing.push(holiday);
      map.set(holiday.date, existing);
    });

    return map;
  }, [holidays]);

  const dateCellRender = (date: Dayjs) => {
    const dateKey = date.format('YYYY-MM-DD');
    const dayLeaves = leaveByDate.get(dateKey) || [];
    const dayHolidays = holidaysByDate.get(dateKey) || [];

    if (dayLeaves.length === 0 && dayHolidays.length === 0) {
      return null;
    }

    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {dayHolidays.map((holiday) => (
          <li key={`holiday-${holiday.id}`}>
            <Tooltip title={holiday.name}>
              <Badge status="error" text={<Text ellipsis style={{ fontSize: 12 }}>{holiday.name}</Text>} />
            </Tooltip>
          </li>
        ))}
        {dayLeaves.slice(0, 3).map((leave) => (
          <li key={leave.id}>
            <Tooltip
              title={
                <div>
                  <div><strong>{leave.employee_name}</strong></div>
                  <div>{leave.leave_type_name}</div>
                  <div>{leave.start_date} → {leave.end_date}</div>
                  <Tag color={statusBadgeMap[leave.status]}>{leave.status}</Tag>
                </div>
              }
            >
              <Badge
                status={statusBadgeMap[leave.status]}
                text={
                  <Text
                    ellipsis
                    style={{
                      fontSize: 12,
                      color: leave.leave_type_color,
                    }}
                  >
                    {leave.employee_name}
                  </Text>
                }
              />
            </Tooltip>
          </li>
        ))}
        {dayLeaves.length > 3 && (
          <li>
            <Text type="secondary" style={{ fontSize: 11 }}>
              +{dayLeaves.length - 3} more
            </Text>
          </li>
        )}
      </ul>
    );
  };

  const cellRender: CalendarProps<Dayjs>['cellRender'] = (current, info) => {
    if (info.type === 'date') return dateCellRender(current);
    return info.originNode;
  };

  const handlePanelChange = (date: Dayjs) => {
    setCurrentDate(date);
  };

  const isLoading = isLoadingLeave || isLoadingHolidays;

  return (
    <div>
      <Title level={2}>Leave Calendar</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        View leave schedules for you and your department members.
      </Text>

      <Card>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : (
          <Calendar
            cellRender={cellRender}
            onPanelChange={handlePanelChange}
          />
        )}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Title level={5}>Legend</Title>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <Badge status="success" text="Approved Leave" />
          <Badge status="processing" text="Pending Leave" />
          <Badge status="error" text="Holiday" />
        </div>
      </Card>
    </div>
  );
}

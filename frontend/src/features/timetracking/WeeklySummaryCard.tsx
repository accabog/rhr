import { Card, Row, Col, Statistic, Progress, Typography, Empty } from 'antd';
import {
  ClockCircleOutlined,
  RiseOutlined,
  CoffeeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { WeeklySummary } from '@/api/timetracking';

const { Text } = Typography;

interface WeeklySummaryCardProps {
  summary: WeeklySummary | undefined;
  isLoading: boolean;
  targetHours?: number;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WeeklySummaryCard({
  summary,
  isLoading,
  targetHours = 40,
}: WeeklySummaryCardProps) {
  if (isLoading) {
    return (
      <Card loading={true}>
        <div style={{ height: 200 }} />
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No time data available"
        />
      </Card>
    );
  }

  const totalHours = Number(summary.total_hours);
  const regularHours = Number(summary.regular_hours);
  const overtimeHours = Number(summary.overtime_hours);
  const progressPercent = Math.min((totalHours / targetHours) * 100, 100);

  // Create a map of daily hours
  const dailyMap = new Map<string, number>();
  summary.daily_breakdown.forEach((day) => {
    const weekday = dayjs(day.date).format('ddd');
    dailyMap.set(weekday, Number(day.total_hours));
  });

  // Find max hours for scaling
  const maxDailyHours = Math.max(8, ...Array.from(dailyMap.values()));

  return (
    <Card title="Weekly Summary">
      <Row gutter={[16, 24]}>
        {/* Progress toward target */}
        <Col span={24}>
          <div style={{ textAlign: 'center' }}>
            <Progress
              type="dashboard"
              percent={Math.round(progressPercent)}
              format={() => (
                <div>
                  <div style={{ fontSize: 24, fontWeight: 600 }}>
                    {totalHours.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    of {targetHours}h target
                  </div>
                </div>
              )}
              strokeColor={{
                '0%': '#1890ff',
                '100%': totalHours >= targetHours ? '#52c41a' : '#1890ff',
              }}
              size={160}
            />
          </div>
        </Col>

        {/* Stats */}
        <Col xs={12} sm={8}>
          <Statistic
            title={
              <span>
                <ClockCircleOutlined /> Regular
              </span>
            }
            value={regularHours.toFixed(1)}
            suffix="hrs"
          />
        </Col>
        <Col xs={12} sm={8}>
          <Statistic
            title={
              <span>
                <RiseOutlined /> Overtime
              </span>
            }
            value={overtimeHours.toFixed(1)}
            suffix="hrs"
            valueStyle={{ color: overtimeHours > 0 ? '#faad14' : undefined }}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic
            title={
              <span>
                <CoffeeOutlined /> Avg/Day
              </span>
            }
            value={(totalHours / 5).toFixed(1)}
            suffix="hrs"
          />
        </Col>

        {/* Daily bars */}
        <Col span={24}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            Daily Breakdown
          </Text>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
            {WEEKDAYS.map((day) => {
              const hours = dailyMap.get(day) || 0;
              const height = hours > 0 ? (hours / maxDailyHours) * 60 : 2;

              return (
                <div
                  key={day}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      height: 60,
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 32,
                        height,
                        background:
                          hours >= 8
                            ? '#52c41a'
                            : hours > 0
                            ? '#1890ff'
                            : '#f0f0f0',
                        borderRadius: 4,
                        transition: 'height 0.3s ease',
                      }}
                    />
                  </div>
                  <Text
                    type="secondary"
                    style={{ fontSize: 11, display: 'block', marginTop: 4 }}
                  >
                    {day}
                  </Text>
                  {hours > 0 && (
                    <Text style={{ fontSize: 11 }}>{hours.toFixed(1)}h</Text>
                  )}
                </div>
              );
            })}
          </div>
        </Col>
      </Row>
    </Card>
  );
}

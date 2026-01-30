import { useState, useEffect } from 'react';
import { Card, Button, Typography, Tag, Spin, Modal, Form, InputNumber } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  useCurrentTimeEntry,
  useClockIn,
  useClockOut,
} from '@/hooks/useTimeTracking';

const { Title, Text } = Typography;

function formatDuration(startTime: string): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const start = new Date();
  start.setHours(hours ?? 0, minutes, 0, 0);

  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;

  return `${h}h ${m}m`;
}

export default function ClockWidget() {
  const { data: currentEntry, isLoading } = useCurrentTimeEntry();
  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();

  const [elapsedTime, setElapsedTime] = useState('0h 0m');
  const [clockOutModalOpen, setClockOutModalOpen] = useState(false);
  const [form] = Form.useForm();

  const isClockedIn = !!currentEntry;

  // Update elapsed time every minute
  useEffect(() => {
    if (currentEntry?.start_time) {
      const updateElapsed = () => {
        setElapsedTime(formatDuration(currentEntry.start_time));
      };
      updateElapsed();
      const interval = setInterval(updateElapsed, 60000);
      return () => clearInterval(interval);
    }
  }, [currentEntry?.start_time]);

  const handleClockIn = () => {
    clockInMutation.mutate({});
  };

  const handleClockOutClick = () => {
    form.resetFields();
    setClockOutModalOpen(true);
  };

  const handleClockOut = async () => {
    const values = await form.validateFields();
    await clockOutMutation.mutateAsync({
      break_minutes: values.break_minutes || 0,
    });
    setClockOutModalOpen(false);
  };

  if (isLoading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        style={{
          background: isClockedIn
            ? 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)'
            : 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
          color: 'white',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <ClockCircleOutlined style={{ fontSize: 48, marginBottom: 16 }} />

          {isClockedIn ? (
            <>
              <Title level={4} style={{ color: 'white', margin: 0 }}>
                Currently Working
              </Title>
              <Title level={2} style={{ color: 'white', margin: '8px 0' }}>
                {elapsedTime}
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
                Started at {currentEntry?.start_time?.slice(0, 5)}
              </Text>
              {currentEntry?.entry_type_name && (
                <div style={{ marginTop: 8 }}>
                  <Tag color="white" style={{ color: '#333' }}>
                    {currentEntry.entry_type_name}
                  </Tag>
                </div>
              )}
              <div style={{ marginTop: 24 }}>
                <Button
                  size="large"
                  icon={<PauseCircleOutlined />}
                  onClick={handleClockOutClick}
                  loading={clockOutMutation.isPending}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: '2px solid white',
                    color: 'white',
                  }}
                >
                  Clock Out
                </Button>
              </div>
            </>
          ) : (
            <>
              <Title level={4} style={{ color: 'white', margin: 0 }}>
                Ready to Work?
              </Title>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  display: 'block',
                  margin: '8px 0 24px',
                }}
              >
                Click below to start tracking your time
              </Text>
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={handleClockIn}
                loading={clockInMutation.isPending}
                style={{
                  background: 'white',
                  color: '#1890ff',
                  border: 'none',
                  fontWeight: 600,
                }}
              >
                Clock In
              </Button>
            </>
          )}
        </div>
      </Card>

      <Modal
        title="Clock Out"
        open={clockOutModalOpen}
        onCancel={() => setClockOutModalOpen(false)}
        onOk={handleClockOut}
        okText="Clock Out"
        confirmLoading={clockOutMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="break_minutes"
            label="Break Time (minutes)"
            help="Enter any break time you took during this session"
          >
            <InputNumber
              min={0}
              max={480}
              style={{ width: '100%' }}
              placeholder="0"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  DatePicker,
  Popconfirm,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  useMyTimeEntries,
  useWeeklySummary,
  useDeleteTimeEntry,
} from '@/hooks/useTimeTracking';
import type { TimeEntry } from '@/api/timetracking';
import ClockWidget from './ClockWidget';
import TimeEntryFormModal from './TimeEntryFormModal';
import WeeklySummaryCard from './WeeklySummaryCard';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

function formatTime(time: string | null): string {
  if (!time) return '-';
  return time.slice(0, 5); // HH:mm
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export default function TimeTrackingPage() {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>(() => {
    const today = dayjs();
    const weekStart = today.startOf('week');
    const weekEnd = today.endOf('week');
    return [weekStart, weekEnd];
  });

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  const startDate = dateRange[0].format('YYYY-MM-DD');
  const endDate = dateRange[1].format('YYYY-MM-DD');

  const { data: entriesData, isLoading } = useMyTimeEntries({
    start_date: startDate,
    end_date: endDate,
  });

  const { data: summary } = useWeeklySummary(startDate, endDate);
  const deleteMutation = useDeleteTimeEntry();

  const handleAddEntry = () => {
    setEditingEntry(null);
    setFormModalOpen(true);
  };

  const handleEditEntry = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setFormModalOpen(true);
  };

  const handleDeleteEntry = (id: number) => {
    deleteMutation.mutate(id);
  };

  const columns: ColumnsType<TimeEntry> = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (date: string) => dayjs(date).format('ddd, MMM D'),
    },
    {
      title: 'Type',
      key: 'type',
      width: 120,
      render: (_, record) => (
        <Tag color={record.entry_type_color}>{record.entry_type_name}</Tag>
      ),
    },
    {
      title: 'Time',
      key: 'time',
      width: 140,
      render: (_, record) => (
        <span>
          {formatTime(record.start_time)} - {formatTime(record.end_time)}
        </span>
      ),
    },
    {
      title: 'Duration',
      key: 'duration',
      width: 100,
      render: (_, record) => {
        if (!record.end_time) {
          return <Tag color="green">In Progress</Tag>;
        }
        return formatDuration(record.duration_minutes);
      },
    },
    {
      title: 'Break',
      dataIndex: 'break_minutes',
      key: 'break',
      width: 80,
      render: (mins: number) => (mins > 0 ? `${mins}m` : '-'),
    },
    {
      title: 'Project / Task',
      key: 'project',
      render: (_, record) => (
        <span>
          {record.project && <Text strong>{record.project}</Text>}
          {record.project && record.task && ' / '}
          {record.task && <Text type="secondary">{record.task}</Text>}
          {!record.project && !record.task && '-'}
        </span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_, record) =>
        record.is_approved ? (
          <Tag color="green" icon={<CheckOutlined />}>
            Approved
          </Tag>
        ) : (
          <Tag color="default">Pending</Tag>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) =>
        record.end_time && !record.is_approved ? (
          <Space>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditEntry(record)}
            />
            <Popconfirm
              title="Delete this entry?"
              onConfirm={() => handleDeleteEntry(record.id)}
              okText="Delete"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ) : null,
    },
  ];

  const entries = entriesData?.results || [];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Time Tracking
      </Title>

      <Row gutter={[24, 24]}>
        {/* Clock Widget */}
        <Col xs={24} lg={8}>
          <ClockWidget />

          {/* Weekly Summary */}
          <div style={{ marginTop: 16 }}>
            <WeeklySummaryCard summary={summary} isLoading={false} />
          </div>
        </Col>

        {/* Time Entries */}
        <Col xs={24} lg={16}>
          <Card>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setDateRange([dates[0], dates[1]]);
                  }
                }}
                presets={[
                  {
                    label: 'This Week',
                    value: [dayjs().startOf('week'), dayjs().endOf('week')],
                  },
                  {
                    label: 'Last Week',
                    value: [
                      dayjs().subtract(1, 'week').startOf('week'),
                      dayjs().subtract(1, 'week').endOf('week'),
                    ],
                  },
                  {
                    label: 'This Month',
                    value: [dayjs().startOf('month'), dayjs().endOf('month')],
                  },
                ]}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddEntry}>
                Add Entry
              </Button>
            </div>

            {entries.length > 0 ? (
              <Table
                columns={columns}
                dataSource={entries}
                loading={isLoading}
                rowKey="id"
                pagination={false}
                size="small"
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No time entries for this period"
              />
            )}
          </Card>
        </Col>
      </Row>

      <TimeEntryFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        entry={editingEntry}
      />
    </div>
  );
}

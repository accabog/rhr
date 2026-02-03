import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Descriptions,
  Divider,
  Modal,
  Form,
  Input,
  Timeline,
  Spin,
  Alert,
  Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined,
  SendOutlined,
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  useTimesheet,
  useSubmitTimesheet,
  useApproveTimesheet,
  useRejectTimesheet,
  useReopenTimesheet,
  useDeleteTimesheet,
  useAddTimesheetComment,
} from '@/hooks/useTimesheets';
import type { TimeEntry } from '@/api/timesheets';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  submitted: 'processing',
  approved: 'success',
  rejected: 'error',
};

function formatTime(time: string | null): string {
  if (!time) return '-';
  return time.slice(0, 5);
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export default function TimesheetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [commentForm] = Form.useForm();

  const { data: timesheet, isLoading } = useTimesheet(Number(id));
  const submitMutation = useSubmitTimesheet();
  const approveMutation = useApproveTimesheet();
  const rejectMutation = useRejectTimesheet();
  const reopenMutation = useReopenTimesheet();
  const deleteMutation = useDeleteTimesheet();
  const addCommentMutation = useAddTimesheetComment();

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!timesheet) {
    return (
      <Alert
        type="error"
        message="Timesheet not found"
        action={
          <Button onClick={() => navigate('/timesheets')}>Back to Timesheets</Button>
        }
      />
    );
  }

  const handleSubmit = async () => {
    await submitMutation.mutateAsync({ id: timesheet.id });
  };

  const handleApprove = async () => {
    await approveMutation.mutateAsync(timesheet.id);
  };

  const handleReject = async () => {
    const values = await form.validateFields();
    await rejectMutation.mutateAsync({
      id: timesheet.id,
      reason: values.reason,
    });
    setRejectModalOpen(false);
    form.resetFields();
  };

  const handleReopen = async () => {
    await reopenMutation.mutateAsync(timesheet.id);
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(timesheet.id);
    navigate('/timesheets');
  };

  const handleAddComment = async () => {
    const values = await commentForm.validateFields();
    await addCommentMutation.mutateAsync({
      id: timesheet.id,
      content: values.content,
    });
    setCommentModalOpen(false);
    commentForm.resetFields();
  };

  const entryColumns: ColumnsType<TimeEntry> = [
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
      render: (_, record) => formatDuration(record.duration_minutes),
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
  ];

  const timeEntries = timesheet.time_entries || [];
  const comments = timesheet.comments || [];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/timesheets')}>
          Back
        </Button>
      </Space>

      <Row gutter={[24, 24]}>
        {/* Header Card */}
        <Col span={24}>
          <Card>
            <Row justify="space-between" align="middle">
              <Col>
                <Space orientation="vertical" size={0}>
                  <Title level={4} style={{ margin: 0 }}>
                    Timesheet: {dayjs(timesheet.period_start).format('MMM D')} -{' '}
                    {dayjs(timesheet.period_end).format('MMM D, YYYY')}
                  </Title>
                  <Text type="secondary">{timesheet.employee_name}</Text>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Tag
                    color={STATUS_COLORS[timesheet.status]}
                    style={{ fontSize: 14, padding: '4px 12px' }}
                  >
                    {timesheet.status.toUpperCase()}
                  </Tag>

                  {/* Action buttons based on status */}
                  {timesheet.status === 'draft' && (
                    <>
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={handleSubmit}
                        loading={submitMutation.isPending}
                      >
                        Submit for Approval
                      </Button>
                      <Popconfirm
                        title="Delete this timesheet?"
                        onConfirm={handleDelete}
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                      >
                        <Button danger icon={<DeleteOutlined />}>
                          Delete
                        </Button>
                      </Popconfirm>
                    </>
                  )}

                  {timesheet.status === 'submitted' && (
                    <>
                      <Button
                        type="primary"
                        icon={<CheckOutlined />}
                        onClick={handleApprove}
                        loading={approveMutation.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        danger
                        icon={<CloseOutlined />}
                        onClick={() => setRejectModalOpen(true)}
                      >
                        Reject
                      </Button>
                    </>
                  )}

                  {timesheet.status === 'rejected' && (
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={handleReopen}
                      loading={reopenMutation.isPending}
                    >
                      Reopen for Editing
                    </Button>
                  )}
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Summary Stats */}
        <Col xs={24} lg={8}>
          <Card>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Total Hours"
                  value={timesheet.total_hours.toFixed(1)}
                  suffix="hrs"
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Entries"
                  value={timeEntries.length}
                  prefix={<FileTextOutlined />}
                />
              </Col>
            </Row>
            <Divider />
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Regular Hours">
                {parseFloat(timesheet.total_regular_hours).toFixed(1)}h
              </Descriptions.Item>
              <Descriptions.Item label="Overtime">
                {parseFloat(timesheet.total_overtime_hours).toFixed(1)}h
              </Descriptions.Item>
              <Descriptions.Item label="Breaks">
                {parseFloat(timesheet.total_break_hours).toFixed(1)}h
              </Descriptions.Item>
            </Descriptions>

            {timesheet.status !== 'draft' && (
              <>
                <Divider />
                <Descriptions column={1} size="small">
                  {timesheet.submitted_at && (
                    <Descriptions.Item label="Submitted">
                      {dayjs(timesheet.submitted_at).format('MMM D, YYYY h:mm A')}
                    </Descriptions.Item>
                  )}
                  {timesheet.approved_at && (
                    <Descriptions.Item label="Approved">
                      {dayjs(timesheet.approved_at).format('MMM D, YYYY h:mm A')}
                    </Descriptions.Item>
                  )}
                  {timesheet.approved_by_name && (
                    <Descriptions.Item label="Approved By">
                      {timesheet.approved_by_name}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </>
            )}

            {timesheet.rejection_reason && (
              <>
                <Divider />
                <Alert
                  type="error"
                  message="Rejection Reason"
                  description={timesheet.rejection_reason}
                />
              </>
            )}
          </Card>

          {/* Comments Section */}
          <Card
            title="Comments"
            style={{ marginTop: 16 }}
            extra={
              <Button size="small" onClick={() => setCommentModalOpen(true)}>
                Add Comment
              </Button>
            }
          >
            {comments.length > 0 ? (
              <Timeline
                items={comments.map((comment) => ({
                  children: (
                    <div>
                      <Text strong>{comment.author_name}</Text>
                      <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                        {dayjs(comment.created_at).format('MMM D, h:mm A')}
                      </Text>
                      <Paragraph style={{ margin: '4px 0 0' }}>
                        {comment.content}
                      </Paragraph>
                    </div>
                  ),
                  dot: <UserOutlined />,
                }))}
              />
            ) : (
              <Text type="secondary">No comments yet</Text>
            )}
          </Card>
        </Col>

        {/* Time Entries */}
        <Col xs={24} lg={16}>
          <Card title="Time Entries">
            <Table
              columns={entryColumns}
              dataSource={timeEntries}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* Reject Modal */}
      <Modal
        title="Reject Timesheet"
        open={rejectModalOpen}
        onCancel={() => setRejectModalOpen(false)}
        onOk={handleReject}
        okText="Reject"
        okButtonProps={{ danger: true }}
        confirmLoading={rejectMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="reason"
            label="Rejection Reason"
            rules={[
              { required: true, message: 'Please provide a reason' },
              { min: 10, message: 'Reason must be at least 10 characters' },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Explain why this timesheet is being rejected..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Comment Modal */}
      <Modal
        title="Add Comment"
        open={commentModalOpen}
        onCancel={() => setCommentModalOpen(false)}
        onOk={handleAddComment}
        okText="Add Comment"
        confirmLoading={addCommentMutation.isPending}
      >
        <Form form={commentForm} layout="vertical">
          <Form.Item
            name="content"
            label="Comment"
            rules={[{ required: true, message: 'Please enter a comment' }]}
          >
            <TextArea rows={3} placeholder="Enter your comment..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

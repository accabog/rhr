import { Table, Button, Space, Popconfirm, Typography, Tooltip, Empty } from 'antd';
import {
  DownloadOutlined,
  DeleteOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useEntityDocuments, useDeleteDocument } from '@/hooks/useDocuments';
import type { Document } from '@/types';

const { Text } = Typography;

interface DocumentListProps {
  contentType: string;
  objectId: number;
  showEmpty?: boolean;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <FileImageOutlined />;
  if (mimeType === 'application/pdf') return <FilePdfOutlined />;
  if (mimeType.includes('word') || mimeType.includes('document'))
    return <FileWordOutlined />;
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
    return <FileExcelOutlined />;
  if (mimeType.startsWith('text/')) return <FileTextOutlined />;
  return <FileOutlined />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function DocumentList({
  contentType,
  objectId,
  showEmpty = true,
}: DocumentListProps) {
  const { data, isLoading } = useEntityDocuments(contentType, objectId);
  const deleteMutation = useDeleteDocument();

  const handleDownload = (document: Document) => {
    window.open(document.download_url, '_blank');
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const columns: ColumnsType<Document> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Document) => (
        <Space>
          {getFileIcon(record.mime_type)}
          <div>
            <div>{name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.original_filename}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Size',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: 'Uploaded',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'By',
      dataIndex: 'uploaded_by_name',
      key: 'uploaded_by_name',
      width: 150,
      render: (name: string) => name || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Document) => (
        <Space>
          <Tooltip title="Download">
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete document?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!isLoading && (!data?.results || data.results.length === 0) && !showEmpty) {
    return null;
  }

  return (
    <Table
      dataSource={data?.results || []}
      columns={columns}
      rowKey="id"
      loading={isLoading}
      pagination={false}
      size="small"
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No documents uploaded"
          />
        ),
      }}
    />
  );
}

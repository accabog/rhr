import { Space, Typography } from 'antd';
import DocumentList from './DocumentList';
import DocumentUpload from './DocumentUpload';

const { Title } = Typography;

interface DocumentSectionProps {
  contentType: string;
  objectId: number;
  title?: string;
}

/**
 * Combined document section with upload button and document list.
 * Use this component to add document functionality to any entity detail view.
 */
export default function DocumentSection({
  contentType,
  objectId,
  title = 'Documents',
}: DocumentSectionProps) {
  return (
    <div>
      <Space
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <Title level={5} style={{ margin: 0 }}>
          {title}
        </Title>
        <DocumentUpload contentType={contentType} objectId={objectId} />
      </Space>
      <DocumentList contentType={contentType} objectId={objectId} />
    </div>
  );
}

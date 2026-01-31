import { useState } from 'react';
import { Upload, Button, Modal, Form, Input, message } from 'antd';
import { UploadOutlined, InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { useUploadDocument } from '@/hooks/useDocuments';

const { Dragger } = Upload;
const { TextArea } = Input;

interface DocumentUploadProps {
  contentType: string;
  objectId: number;
  buttonText?: string;
  showButton?: boolean;
}

interface FormValues {
  name: string;
  description?: string;
}

export default function DocumentUpload({
  contentType,
  objectId,
  buttonText = 'Upload Document',
  showButton = true,
}: DocumentUploadProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [form] = Form.useForm<FormValues>();
  const uploadMutation = useUploadDocument();

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFileList([]);
    form.resetFields();
  };

  const handleUpload = async (values: FormValues) => {
    const file = fileList[0]?.originFileObj;
    if (!file) {
      message.error('Please select a file');
      return;
    }

    await uploadMutation.mutateAsync({
      file,
      name: values.name,
      description: values.description,
      content_type_model: contentType,
      object_id: objectId,
    });

    handleCloseModal();
  };

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      // Pre-fill name field with filename (without extension)
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      form.setFieldValue('name', nameWithoutExt);
      setFileList([{
        uid: '-1',
        name: file.name,
        status: 'done',
        originFileObj: file as unknown as UploadFile['originFileObj'],
      }]);
      return false; // Prevent automatic upload
    },
    onRemove: () => {
      setFileList([]);
      form.setFieldValue('name', '');
    },
    fileList,
    maxCount: 1,
  };

  return (
    <>
      {showButton && (
        <Button icon={<UploadOutlined />} onClick={handleOpenModal}>
          {buttonText}
        </Button>
      )}

      <Modal
        title="Upload Document"
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleUpload}>
          <Form.Item label="File" required>
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Click or drag file to this area to upload</p>
              <p className="ant-upload-hint">
                Supports PDF, images, Word documents, and other common file types.
              </p>
            </Dragger>
          </Form.Item>

          <Form.Item
            name="name"
            label="Document Name"
            rules={[{ required: true, message: 'Please enter a document name' }]}
          >
            <Input placeholder="Enter a display name for this document" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Optional description" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={handleCloseModal} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={uploadMutation.isPending}
              disabled={fileList.length === 0}
            >
              Upload
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

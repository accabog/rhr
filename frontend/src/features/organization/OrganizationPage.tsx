import { Typography, Card, Tabs } from 'antd';
import { ApartmentOutlined, IdcardOutlined } from '@ant-design/icons';
import DepartmentsTab from './DepartmentsTab';
import PositionsTab from './PositionsTab';

const { Title } = Typography;

export default function OrganizationPage() {
  const tabItems = [
    {
      key: 'departments',
      label: (
        <span>
          <ApartmentOutlined style={{ marginRight: 8 }} />
          Departments
        </span>
      ),
      children: <DepartmentsTab />,
    },
    {
      key: 'positions',
      label: (
        <span>
          <IdcardOutlined style={{ marginRight: 8 }} />
          Positions
        </span>
      ),
      children: <PositionsTab />,
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Organization Structure
      </Title>

      <Card>
        <Tabs items={tabItems} defaultActiveKey="departments" />
      </Card>
    </div>
  );
}

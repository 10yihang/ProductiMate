import React from 'react';
import { Card, Typography, Calendar as AntCalendar } from 'antd';

const { Title } = Typography;

export const Calendar: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <Title level={3}>日程管理</Title>
        <p>这个功能正在开发中，敬请期待！</p>
        <AntCalendar />
      </Card>
    </div>
  );
};

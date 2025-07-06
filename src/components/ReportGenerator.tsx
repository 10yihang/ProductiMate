import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

export const ReportGenerator: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <Title level={3}>总结生成器</Title>
        <p>这个功能正在开发中，敬请期待！</p>
      </Card>
    </div>
  );
};

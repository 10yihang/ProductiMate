import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Tooltip, Dropdown, message } from 'antd';
import {
  CheckSquareOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  TrophyOutlined,
  FileTextOutlined,
  BarChartOutlined,
  CodeOutlined,
  ToolOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  MoonOutlined,
  SunOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { TodoList } from './components/TodoList';
import { PomodoroTimer } from './components/PomodoroTimer';
import { Calendar } from './components/Calendar';
import { HabitTracker } from './components/HabitTracker';
import { QuickNotes } from './components/QuickNotes';
import { ReportGenerator } from './components/ReportGenerator';
import { CodeReview } from './components/CodeReview';
import { JsonTools } from './components/JsonTools';
import { Settings } from './components/Settings';
import { usePomodoroStore, initGlobalPomodoroStore } from './hooks/usePomodoroStore';

const { Header, Sider, Content } = Layout;

// 菜单项配置
const menuItems = [
  {
    key: 'efficiency',
    label: '个人效率中心',
    icon: <CheckSquareOutlined />,
    children: [
      { key: 'todo', label: '待办清单', icon: <CheckSquareOutlined /> },
      { key: 'pomodoro', label: '番茄钟', icon: <ClockCircleOutlined /> },
      { key: 'calendar', label: '日程管理', icon: <CalendarOutlined /> },
      { key: 'habits', label: '习惯打卡', icon: <TrophyOutlined /> },
      { key: 'notes', label: '便笺速记', icon: <FileTextOutlined /> },
    ],
  },
  {
    key: 'ai-tools',
    label: 'AI工具',
    icon: <BarChartOutlined />,
    children: [
      { key: 'reports', label: '总结生成器', icon: <BarChartOutlined /> },
      { key: 'code-review', label: 'AI Code Review', icon: <CodeOutlined /> },
    ],
  },
  {
    key: 'dev-tools',
    label: '开发工具',
    icon: <ToolOutlined />,
    children: [
      { key: 'json-tools', label: 'JSON工具', icon: <ToolOutlined /> },
    ],
  },
];

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('todo');
  const [darkMode, setDarkMode] = useState(false);
  
  // 初始化全局番茄钟状态
  const pomodoroStore = usePomodoroStore();
  
  useEffect(() => {
    initGlobalPomodoroStore(pomodoroStore);
  }, [pomodoroStore]);

  // 检查系统主题偏好
  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
  }, []);

  // 处理菜单点击
  const handleMenuClick = (e: { key: string }) => {
    setSelectedKey(e.key);
  };

  // 切换主题
  const toggleTheme = () => {
    setDarkMode(!darkMode);
    message.success(`已切换到${!darkMode ? '暗色' : '亮色'}主题`);
  };

  // 渲染内容区域
  const renderContent = () => {
    switch (selectedKey) {
      case 'todo':
        return <TodoList />;
      case 'pomodoro':
        return <PomodoroTimer darkMode={darkMode} />;
      case 'calendar':
        return <Calendar />;
      case 'habits':
        return <HabitTracker />;
      case 'notes':
        return <QuickNotes />;
      case 'reports':
        return <ReportGenerator />;
      case 'code-review':
        return <CodeReview />;
      case 'json-tools':
        return <JsonTools darkMode={darkMode} />;
      case 'settings':
        return <Settings />;
      default:
        return <TodoList />;
    }
  };

  // 用户菜单
  const userMenuItems = [
    {
      key: 'settings',
      label: '设置',
      icon: <SettingOutlined />,
      onClick: () => setSelectedKey('settings'),
    },
    {
      key: 'help',
      label: '帮助',
      icon: <QuestionCircleOutlined />,
      onClick: () => message.info('帮助功能即将上线'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'theme',
      label: darkMode ? '亮色主题' : '暗色主题',
      icon: darkMode ? <SunOutlined /> : <MoonOutlined />,
      onClick: toggleTheme,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }} className={darkMode ? 'dark' : ''}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={250}
        style={{
          background: darkMode ? '#1f2937' : '#fff',
          borderRight: `1px solid ${darkMode ? '#374151' : '#f0f0f0'}`,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: `1px solid ${darkMode ? '#374151' : '#f0f0f0'}`,
            color: darkMode ? '#f9fafb' : '#000',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          {collapsed ? '工具箱' : '效率工具箱'}
        </div>
        <Menu
          theme={darkMode ? 'dark' : 'light'}
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 'none' }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            padding: '0 16px',
            background: darkMode ? '#1f2937' : '#fff',
            borderBottom: `1px solid ${darkMode ? '#374151' : '#f0f0f0'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
                width: 40,
                height: 40,
                color: darkMode ? '#f9fafb' : '#000',
              }}
            />
            <span
              style={{
                marginLeft: 16,
                fontSize: '16px',
                color: darkMode ? '#f9fafb' : '#000',
                fontWeight: 500,
              }}
            >
              {menuItems
                .flatMap((group) => group.children || [group])
                .find((item) => item.key === selectedKey)?.label || '待办清单'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tooltip title={darkMode ? '切换到亮色主题' : '切换到暗色主题'}>
              <Button
                type="text"
                icon={darkMode ? <SunOutlined /> : <MoonOutlined />}
                onClick={toggleTheme}
                style={{
                  color: darkMode ? '#f9fafb' : '#000',
                  width: 40,
                  height: 40,
                }}
              />
            </Tooltip>
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Button
                type="text"
                icon={<SettingOutlined />}
                style={{
                  color: darkMode ? '#f9fafb' : '#000',
                  width: 40,
                  height: 40,
                }}
              />
            </Dropdown>
          </div>
        </Header>

        <Content
          style={{
            margin: 0,
            padding: '32px',
            background: darkMode ? '#0f172a' : '#f8fafc',
            minHeight: 'calc(100vh - 64px)',
            overflow: 'auto',
          }}
        >
          <div className="content-container">
            <div className="fade-in">
              {renderContent()}
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;

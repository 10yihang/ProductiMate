import React, { useState } from 'react';
import {
  Card,
  Button,
  InputNumber,
  Progress,
  Typography,
  Space,
  Row,
  Col,
  Switch,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  RedoOutlined,
  SettingOutlined,
  TrophyOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { usePomodoroStore } from '../hooks/usePomodoroStore';

const { Title, Text } = Typography;

interface PomodoroTimerProps {
  darkMode?: boolean;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ darkMode = false }) => {
  const {
    isRunning,
    timeLeft,
    currentCycle,
    currentState,
    settings,
    sessions,
    startTimer,
    pauseTimer,
    resetTimer,
    updateSettings,
    getTodayStats,
  } = usePomodoroStore();
  
  const [showSettings, setShowSettings] = useState(false);

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 获取当前状态的标题和颜色
  const getStateInfo = () => {
    switch (currentState) {
      case 'work':
        return { title: '工作时间', color: '#ff4d4f' };
      case 'shortBreak':
        return { title: '短休息', color: '#52c41a' };
      case 'longBreak':
        return { title: '长休息', color: '#1890ff' };
    }
  };

  // 获取初始时间
  const getInitialTime = () => {
    switch (currentState) {
      case 'work':
        return settings.workTime * 60;
      case 'shortBreak':
        return settings.shortBreak * 60;
      case 'longBreak':
        return settings.longBreak * 60;
    }
  };

  // 开始/暂停切换
  const toggleTimer = () => {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  };

  const stateInfo = getStateInfo();
  const todayStats = getTodayStats();
  const progress = ((getInitialTime() - timeLeft) / getInitialTime()) * 100;

  return (
    <div className="space-y-8">
      {/* 主计时器 */}
      <Card 
        className={`rounded-2xl border-2 shadow-lg ${
          darkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
        }`}
      >
        <div className="text-center py-10 px-5">
          <Title 
            level={2} 
            className="mb-4 text-2xl font-semibold"
            style={{ color: stateInfo.color }}
          >
            {stateInfo.title}
          </Title>
          <Title 
            level={1} 
            className="my-8 text-8xl font-bold drop-shadow"
            style={{ color: stateInfo.color }}
          >
            {formatTime(timeLeft)}
          </Title>
          <Progress
            percent={progress}
            showInfo={false}
            strokeColor={{
              '0%': stateInfo.color,
              '100%': stateInfo.color + '80',
            }}
            strokeWidth={12}
            className="mb-10"
          />
          <Space size="large">
            <Button
              type="primary"
              size="large"
              icon={isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={toggleTimer}
              className="h-14 px-8 text-base font-semibold rounded-2xl shadow-lg"
              style={{ 
                backgroundColor: stateInfo.color, 
                borderColor: stateInfo.color,
                boxShadow: `0 4px 16px ${stateInfo.color}40`,
              }}
            >
              {isRunning ? '暂停' : '开始'}
            </Button>
            <Button 
              size="large" 
              icon={<RedoOutlined />} 
              onClick={resetTimer}
              className="h-14 px-6 text-base rounded-2xl"
            >
              重置
            </Button>
            <Button
              size="large"
              icon={<SettingOutlined />}
              onClick={() => setShowSettings(!showSettings)}
              className="h-14 px-6 text-base rounded-2xl"
            >
              设置
            </Button>
          </Space>
        </div>
      </Card>

      {/* 当前进度 */}
      <Row gutter={[24, 16]}>
        <Col span={8}>
          <div className="stat-card">
            <div className="mb-3">
              <TrophyOutlined className="text-3xl text-orange-500" />
            </div>
            <div className="stat-number text-orange-500">
              {currentCycle}
            </div>
            <div className="stat-label">当前循环 / {settings.cycles}</div>
          </div>
        </Col>
        <Col span={8}>
          <div className="stat-card">
            <div className="mb-3">
              <CheckSquareOutlined className="text-3xl text-green-500" />
            </div>
            <div className="stat-number text-green-500">
              {todayStats.sessions}
            </div>
            <div className="stat-label">今日完成</div>
          </div>
        </Col>
        <Col span={8}>
          <div className="stat-card">
            <div className="mb-3">
              <ClockCircleOutlined className="text-3xl text-blue-500" />
            </div>
            <div className="stat-number text-blue-500">
              {todayStats.totalTime}
            </div>
            <div className="stat-label">专注时间(分钟)</div>
          </div>
        </Col>
      </Row>

      {/* 设置面板 */}
      {showSettings && (
        <Card title="番茄钟设置" className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
          <Row gutter={16}>
            <Col span={6}>
              <div className="mb-4">
                <Text className={darkMode ? 'text-gray-300' : ''}>工作时间（分钟）</Text>
                <InputNumber
                  min={1}
                  max={60}
                  value={settings.workTime}
                  onChange={(value) =>
                    updateSettings({ ...settings, workTime: value || 25 })
                  }
                  className="w-full mt-1"
                />
              </div>
            </Col>
            <Col span={6}>
              <div className="mb-4">
                <Text className={darkMode ? 'text-gray-300' : ''}>短休息（分钟）</Text>
                <InputNumber
                  min={1}
                  max={30}
                  value={settings.shortBreak}
                  onChange={(value) =>
                    updateSettings({ ...settings, shortBreak: value || 5 })
                  }
                  className="w-full mt-1"
                />
              </div>
            </Col>
            <Col span={6}>
              <div className="mb-4">
                <Text className={darkMode ? 'text-gray-300' : ''}>长休息（分钟）</Text>
                <InputNumber
                  min={1}
                  max={60}
                  value={settings.longBreak}
                  onChange={(value) =>
                    updateSettings({ ...settings, longBreak: value || 15 })
                  }
                  className="w-full mt-1"
                />
              </div>
            </Col>
            <Col span={6}>
              <div className="mb-4">
                <Text className={darkMode ? 'text-gray-300' : ''}>循环次数</Text>
                <InputNumber
                  min={1}
                  max={10}
                  value={settings.cycles}
                  onChange={(value) =>
                    updateSettings({ ...settings, cycles: value || 4 })
                  }
                  className="w-full mt-1"
                />
              </div>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <div className="flex items-center justify-between">
                <Text className={darkMode ? 'text-gray-300' : ''}>自动开始下一个</Text>
                <Switch
                  checked={settings.autoStart}
                  onChange={(checked) =>
                    updateSettings({ ...settings, autoStart: checked })
                  }
                />
              </div>
            </Col>
            <Col span={8}>
              <div className="flex items-center justify-between">
                <Text className={darkMode ? 'text-gray-300' : ''}>声音提醒</Text>
                <Switch
                  checked={settings.soundEnabled}
                  onChange={(checked) =>
                    updateSettings({ ...settings, soundEnabled: checked })
                  }
                />
              </div>
            </Col>
            <Col span={8}>
              <div className="flex items-center justify-between">
                <Text className={darkMode ? 'text-gray-300' : ''}>待办提醒</Text>
                <Switch
                  checked={settings.todoReminderEnabled}
                  onChange={(checked) =>
                    updateSettings({ ...settings, todoReminderEnabled: checked })
                  }
                />
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* 历史统计 */}
      <Card 
        title="最近7天统计" 
        className={darkMode ? 'bg-gray-800 border-gray-700' : ''}
      >
        {sessions.length === 0 ? (
          <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            还没有完成任何番茄钟，开始你的第一个吧！
          </div>
        ) : (
          <Row gutter={16}>
            {sessions.slice(-7).map((session, index) => (
              <Col span={6} key={index}>
                <Card 
                  size="small" 
                  className={`text-center ${darkMode ? 'bg-gray-700 border-gray-600' : ''}`}
                >
                  <div className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {new Date(session.date).toLocaleDateString()}
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    {session.workSessions}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>个番茄钟</div>
                  <div className="text-sm text-orange-600 mt-1">
                    {session.totalTime} 分钟
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>
    </div>
  );
};

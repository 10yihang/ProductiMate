import React, { useState } from 'react';
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Progress,
  message,
  Row,
  Col,
  Typography,
  Calendar,
  Badge,
  Statistic,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  FireOutlined,
  TrophyOutlined,
  CalendarOutlined,
  BarChartOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

interface HabitTrackerProps {
  darkMode?: boolean;
}

interface Habit {
  id: string;
  name: string;
  description?: string;
  category: 'health' | 'study' | 'work' | 'personal' | 'other';
  color: string;
  target: number; // 目标次数（每天/每周）
  unit: string; // 单位（次、分钟、页等）
  frequency: 'daily' | 'weekly';
  createdAt: string;
  isActive: boolean;
}

interface HabitRecord {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
  value?: number; // 实际完成数量
  note?: string;
}

export const HabitTracker: React.FC<HabitTrackerProps> = ({ darkMode = false }) => {
  const [habits, setHabits] = useState<Habit[]>([
    {
      id: '1',
      name: '每日阅读',
      description: '阅读30分钟提升自我',
      category: 'study',
      color: '#1890ff',
      target: 30,
      unit: '分钟',
      frequency: 'daily',
      createdAt: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
      isActive: true,
    },
    {
      id: '2',
      name: '晨练',
      description: '每天早上运动保持健康',
      category: 'health',
      color: '#52c41a',
      target: 1,
      unit: '次',
      frequency: 'daily',
      createdAt: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
      isActive: true,
    },
    {
      id: '3',
      name: '写日记',
      description: '记录每天的感悟和思考',
      category: 'personal',
      color: '#fa8c16',
      target: 1,
      unit: '篇',
      frequency: 'daily',
      createdAt: dayjs().subtract(3, 'day').format('YYYY-MM-DD'),
      isActive: true,
    },
  ]);

  const [records, setRecords] = useState<HabitRecord[]>([
    // 生成一些示例数据
    ...Array.from({ length: 21 }, (_, i) => {
      const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      return habits.flatMap(habit => ({
        id: `${habit.id}-${date}`,
        habitId: habit.id,
        date,
        completed: Math.random() > 0.3, // 70% 完成率
        value: habit.target,
      }));
    }).flat(),
  ]);

  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [form] = Form.useForm();

  // 获取指定日期的习惯记录
  const getRecordsForDate = (date: string) => {
    return records.filter(record => record.date === date);
  };

  // 获取习惯的连续打卡天数
  const getStreakDays = (habitId: string) => {
    let streak = 0;
    let currentDate = dayjs();
    
    while (currentDate.isAfter(dayjs().subtract(365, 'day'))) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      const record = records.find(r => r.habitId === habitId && r.date === dateStr);
      
      if (record?.completed) {
        streak++;
        currentDate = currentDate.subtract(1, 'day');
      } else {
        break;
      }
    }
    
    return streak;
  };

  // 获取习惯的完成率
  const getCompletionRate = (habitId: string, days: number = 30) => {
    const startDate = dayjs().subtract(days, 'day');
    const relevantRecords = records.filter(r => 
      r.habitId === habitId && 
      dayjs(r.date).isAfter(startDate)
    );
    
    if (relevantRecords.length === 0) return 0;
    
    const completedCount = relevantRecords.filter(r => r.completed).length;
    return Math.round((completedCount / relevantRecords.length) * 100);
  };

  // 切换习惯完成状态
  const toggleHabitRecord = (habitId: string, date: string) => {
    const existingRecord = records.find(r => r.habitId === habitId && r.date === date);
    
    if (existingRecord) {
      setRecords(prev => prev.map(r => 
        r.id === existingRecord.id 
          ? { ...r, completed: !r.completed }
          : r
      ));
    } else {
      const habit = habits.find(h => h.id === habitId);
      const newRecord: HabitRecord = {
        id: `${habitId}-${date}-${Date.now()}`,
        habitId,
        date,
        completed: true,
        value: habit?.target || 1,
      };
      setRecords(prev => [...prev, newRecord]);
    }
    
    message.success('打卡状态已更新');
  };

  // 创建或编辑习惯
  const handleHabitSubmit = (values: any) => {
    const habitData: Habit = {
      id: editingHabit?.id || Date.now().toString(),
      name: values.name,
      description: values.description,
      category: values.category,
      color: values.color,
      target: values.target,
      unit: values.unit,
      frequency: values.frequency,
      createdAt: editingHabit?.createdAt || dayjs().format('YYYY-MM-DD'),
      isActive: values.isActive !== false,
    };

    if (editingHabit) {
      setHabits(prev => prev.map(h => h.id === editingHabit.id ? habitData : h));
      message.success('习惯已更新');
    } else {
      setHabits(prev => [...prev, habitData]);
      message.success('习惯已创建');
    }

    setShowHabitModal(false);
    setEditingHabit(null);
    form.resetFields();
  };

  // 删除习惯
  const handleDeleteHabit = (habitId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个习惯吗？相关的打卡记录也会被删除。',
      onOk: () => {
        setHabits(prev => prev.filter(h => h.id !== habitId));
        setRecords(prev => prev.filter(r => r.habitId !== habitId));
        message.success('习惯已删除');
      },
    });
  };

  // 编辑习惯
  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    form.setFieldsValue(habit);
    setShowHabitModal(true);
  };

  // 日历单元格渲染
  const dateCellRender = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const dayRecords = getRecordsForDate(dateStr);
    const completedCount = dayRecords.filter(r => r.completed).length;
    const totalCount = habits.filter(h => h.isActive).length;
    
    if (totalCount === 0) return null;
    
    const rate = completedCount / totalCount;
    let color = '#f0f0f0';
    
    if (rate >= 0.8) color = '#52c41a';
    else if (rate >= 0.6) color = '#faad14';
    else if (rate >= 0.3) color = '#fa8c16';
    else if (rate > 0) color = '#ff4d4f';
    
    return (
      <div className="text-center">
        <Badge 
          count={completedCount} 
          size="small"
          style={{ backgroundColor: color }}
        />
      </div>
    );
  };

  // 渲染习惯卡片
  const renderHabitCard = (habit: Habit) => {
    const todayRecord = records.find(r => 
      r.habitId === habit.id && 
      r.date === dayjs().format('YYYY-MM-DD')
    );
    const streak = getStreakDays(habit.id);
    const completionRate = getCompletionRate(habit.id);
    
    return (
      <Card
        key={habit.id}
        size="small"
        className={`habit-card ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}
        style={{ borderLeft: `4px solid ${habit.color}` }}
        actions={[
          <Tooltip title="查看统计" key="stats">
            <Button 
              type="text" 
              icon={<BarChartOutlined />}
              onClick={() => {
                setSelectedHabit(habit);
                setShowStatsModal(true);
              }}
            />
          </Tooltip>,
          <Tooltip title="编辑" key="edit">
            <Button 
              type="text" 
              icon={<EditOutlined />}
              onClick={() => handleEditHabit(habit)}
            />
          </Tooltip>,
          <Tooltip title="删除" key="delete">
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteHabit(habit.id)}
            />
          </Tooltip>,
        ]}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <Text className="font-semibold">{habit.name}</Text>
            <div className="text-xs text-gray-500 mt-1">
              {habit.target} {habit.unit} / {habit.frequency === 'daily' ? '每日' : '每周'}
            </div>
          </div>
          
          <Button
            type={todayRecord?.completed ? 'primary' : 'default'}
            shape="circle"
            size="large"
            icon={todayRecord?.completed ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            onClick={() => toggleHabitRecord(habit.id, dayjs().format('YYYY-MM-DD'))}
            style={{ 
              backgroundColor: todayRecord?.completed ? habit.color : undefined,
              borderColor: habit.color,
            }}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center">
              <FireOutlined style={{ color: '#fa8c16' }} className="mr-1" />
              连续 {streak} 天
            </span>
            <span>{completionRate}% 完成率</span>
          </div>
          
          <Progress 
            percent={completionRate} 
            strokeColor={habit.color}
            size="small"
            showInfo={false}
          />
        </div>
        
        {habit.description && (
          <Text className={`text-xs block mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {habit.description}
          </Text>
        )}
      </Card>
    );
  };

  return (
    <div className="habit-tracker space-y-6">
      <div className="flex items-center justify-between">
        <Title level={2} className={darkMode ? 'text-white' : ''}>
          习惯打卡
        </Title>
        
        <Button 
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingHabit(null);
            form.resetFields();
            form.setFieldsValue({
              category: 'personal',
              color: '#1890ff',
              frequency: 'daily',
              target: 1,
              unit: '次',
              isActive: true,
            });
            setShowHabitModal(true);
          }}
        >
          新建习惯
        </Button>
      </div>

      {/* 概览统计 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
            <Statistic
              title="活跃习惯"
              value={habits.filter(h => h.isActive).length}
              suffix="个"
              prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
            <Statistic
              title="今日完成"
              value={getRecordsForDate(dayjs().format('YYYY-MM-DD')).filter(r => r.completed).length}
              suffix={`/${habits.filter(h => h.isActive).length}`}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
            <Statistic
              title="最长连续"
              value={Math.max(...habits.map(h => getStreakDays(h.id)), 0)}
              suffix="天"
              prefix={<FireOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
            <Statistic
              title="平均完成率"
              value={habits.length > 0 ? Math.round(habits.reduce((sum, h) => sum + getCompletionRate(h.id), 0) / habits.length) : 0}
              suffix="%"
              prefix={<TrophyOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* 习惯列表 */}
      <Row gutter={16}>
        <Col span={16}>
          <Card 
            title="我的习惯"
            className={darkMode ? 'bg-gray-800 border-gray-700' : ''}
          >
            {habits.filter(h => h.isActive).length === 0 ? (
              <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                还没有创建任何习惯，点击上方按钮开始吧！
              </div>
            ) : (
              <Row gutter={[16, 16]}>
                {habits.filter(h => h.isActive).map(habit => (
                  <Col span={8} key={habit.id}>
                    {renderHabitCard(habit)}
                  </Col>
                ))}
              </Row>
            )}
          </Card>
        </Col>
        
        <Col span={8}>
          <Card 
            title="打卡日历"
            className={darkMode ? 'bg-gray-800 border-gray-700' : ''}
          >
            <Calendar
              fullscreen={false}
              value={selectedDate}
              onSelect={setSelectedDate}
              dateCellRender={dateCellRender}
            />
          </Card>
        </Col>
      </Row>

      {/* 习惯编辑弹窗 */}
      <Modal
        title={editingHabit ? '编辑习惯' : '新建习惯'}
        open={showHabitModal}
        onCancel={() => {
          setShowHabitModal(false);
          setEditingHabit(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleHabitSubmit}
        >
          <Form.Item
            name="name"
            label="习惯名称"
            rules={[{ required: true, message: '请输入习惯名称' }]}
          >
            <Input placeholder="例如：每日阅读" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="描述这个习惯的意义或目标" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="分类">
                <Select>
                  <Option value="health">健康</Option>
                  <Option value="study">学习</Option>
                  <Option value="work">工作</Option>
                  <Option value="personal">个人</Option>
                  <Option value="other">其他</Option>
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item name="color" label="颜色">
                <Select>
                  <Option value="#1890ff">蓝色</Option>
                  <Option value="#52c41a">绿色</Option>
                  <Option value="#fa8c16">橙色</Option>
                  <Option value="#eb2f96">粉色</Option>
                  <Option value="#722ed1">紫色</Option>
                  <Option value="#fa541c">红色</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="target" label="目标">
                <Input type="number" min={1} />
              </Form.Item>
            </Col>
            
            <Col span={8}>
              <Form.Item name="unit" label="单位">
                <Select>
                  <Option value="次">次</Option>
                  <Option value="分钟">分钟</Option>
                  <Option value="小时">小时</Option>
                  <Option value="页">页</Option>
                  <Option value="公里">公里</Option>
                  <Option value="杯">杯</Option>
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={8}>
              <Form.Item name="frequency" label="频率">
                <Select>
                  <Option value="daily">每日</Option>
                  <Option value="weekly">每周</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="isActive" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 统计详情弹窗 */}
      <Modal
        title={`${selectedHabit?.name} - 统计详情`}
        open={showStatsModal}
        onCancel={() => {
          setShowStatsModal(false);
          setSelectedHabit(null);
        }}
        footer={null}
        width={800}
      >
        <div className="space-y-6">
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="当前连续天数"
                value={selectedHabit ? getStreakDays(selectedHabit.id) : 0}
                suffix="天"
                prefix={<FireOutlined style={{ color: '#fa8c16' }} />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="30天完成率"
                value={selectedHabit ? getCompletionRate(selectedHabit.id) : 0}
                suffix="%"
                prefix={<TrophyOutlined style={{ color: '#52c41a' }} />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="总完成次数"
                value={selectedHabit ? records.filter(r => r.habitId === selectedHabit.id && r.completed).length : 0}
                suffix="次"
                prefix={<CheckCircleOutlined style={{ color: '#1890ff' }} />}
              />
            </Col>
          </Row>
          
          <div className={`text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            详细图表功能开发中...
          </div>
        </div>
      </Modal>
    </div>
  );
};

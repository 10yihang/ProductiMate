import React, { useState } from 'react';
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  TimePicker,
  Select,
  Switch,
  message,
  Space,
  Row,
  Col,
  Typography,
  Popover,
  Tag,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  BellOutlined,
  SyncOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

interface CalendarProps {
  darkMode?: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  type: 'work' | 'personal' | 'health' | 'study' | 'meeting' | 'other';
  priority: 'high' | 'medium' | 'low';
  isAllDay: boolean;
  reminder?: number; // 提前多少分钟提醒
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  location?: string;
  attendees?: string[];
}

export const Calendar: React.FC<CalendarProps> = ({ darkMode = false }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      id: '1',
      title: '团队会议',
      description: '讨论项目进度和下周计划',
      date: dayjs().format('YYYY-MM-DD'),
      startTime: '09:00',
      endTime: '10:30',
      type: 'meeting',
      priority: 'high',
      isAllDay: false,
      reminder: 15,
      repeat: 'weekly',
      location: '会议室A',
      attendees: ['张三', '李四'],
    },
    {
      id: '2',
      title: '健身',
      description: '有氧运动30分钟',
      date: dayjs().format('YYYY-MM-DD'),
      startTime: '18:00',
      endTime: '19:00',
      type: 'health',
      priority: 'medium',
      isAllDay: false,
      reminder: 30,
      repeat: 'daily',
    },
  ]);
  
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day'>('month');
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form] = Form.useForm();

  // 获取指定日期的事件
  const getEventsForDate = (date: string) => {
    return events.filter(event => event.date === date);
  };

  // 事件类型颜色
  const getEventTypeColor = (type: string) => {
    const colors = {
      work: '#1890ff',
      personal: '#52c41a',
      health: '#fa8c16',
      study: '#722ed1',
      meeting: '#eb2f96',
      other: '#8c8c8c',
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  // 优先级颜色
  const getPriorityColor = (priority: string) => {
    const colors = {
      high: '#ff4d4f',
      medium: '#fa8c16',
      low: '#52c41a',
    };
    return colors[priority as keyof typeof colors];
  };

  // 创建或编辑事件
  const handleEventSubmit = (values: any) => {
    const eventData: CalendarEvent = {
      id: editingEvent?.id || Date.now().toString(),
      title: values.title,
      description: values.description,
      date: values.date.format('YYYY-MM-DD'),
      startTime: values.isAllDay ? undefined : values.timeRange?.[0]?.format('HH:mm'),
      endTime: values.isAllDay ? undefined : values.timeRange?.[1]?.format('HH:mm'),
      type: values.type,
      priority: values.priority,
      isAllDay: values.isAllDay,
      reminder: values.reminder,
      repeat: values.repeat,
      location: values.location,
      attendees: values.attendees?.split(',').map((a: string) => a.trim()).filter(Boolean),
    };

    if (editingEvent) {
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? eventData : e));
      message.success('事件已更新');
    } else {
      setEvents(prev => [...prev, eventData]);
      message.success('事件已创建');
    }

    setShowEventModal(false);
    setEditingEvent(null);
    form.resetFields();
  };

  // 删除事件
  const handleDeleteEvent = (eventId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个事件吗？',
      onOk: () => {
        setEvents(prev => prev.filter(e => e.id !== eventId));
        message.success('事件已删除');
      },
    });
  };

  // 编辑事件
  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    form.setFieldsValue({
      title: event.title,
      description: event.description,
      date: dayjs(event.date),
      timeRange: event.startTime && event.endTime ? [
        dayjs(event.startTime, 'HH:mm'),
        dayjs(event.endTime, 'HH:mm'),
      ] : undefined,
      type: event.type,
      priority: event.priority,
      isAllDay: event.isAllDay,
      reminder: event.reminder,
      repeat: event.repeat,
      location: event.location,
      attendees: event.attendees?.join(', '),
    });
    setShowEventModal(true);
  };

  // 渲染日历网格
  const renderCalendarGrid = () => {
    const startOfMonth = selectedDate.startOf('month');
    const endOfMonth = selectedDate.endOf('month');
    const startDate = startOfMonth.startOf('week');
    const endDate = endOfMonth.endOf('week');
    
    const weeks: Dayjs[][] = [];
    let currentWeek: Dayjs[] = [];
    let current = startDate;
    
    while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
      currentWeek.push(current);
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      
      current = current.add(1, 'day');
    }
    
    return (
      <div className="calendar-grid">
        {/* 星期标题 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map(day => (
            <div key={day} className={`text-center py-2 font-semibold ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {day}
            </div>
          ))}
        </div>
        
        {/* 日期网格 */}
        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map(date => {
            const dateStr = date.format('YYYY-MM-DD');
            const dayEvents = getEventsForDate(dateStr);
            const isCurrentMonth = date.isSame(selectedDate, 'month');
            const isToday = date.isSame(dayjs(), 'day');
            const isSelected = date.isSame(selectedDate, 'day');
            
            return (
              <div
                key={dateStr}
                className={`min-h-24 p-2 border rounded cursor-pointer transition-colors ${
                  darkMode 
                    ? 'border-gray-600 hover:bg-gray-700' 
                    : 'border-gray-200 hover:bg-gray-50'
                } ${
                  !isCurrentMonth 
                    ? darkMode ? 'text-gray-500' : 'text-gray-400'
                    : ''
                } ${
                  isToday 
                    ? darkMode ? 'bg-blue-900 border-blue-500' : 'bg-blue-50 border-blue-300'
                    : ''
                } ${
                  isSelected 
                    ? darkMode ? 'bg-gray-700' : 'bg-gray-100'
                    : ''
                }`}
                onClick={() => setSelectedDate(date)}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday ? 'text-blue-600 font-bold' : ''
                }`}>
                  {date.date()}
                </div>
                
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <Popover
                      key={event.id}
                      content={
                        <div className="max-w-xs">
                          <div className="font-semibold mb-2">{event.title}</div>
                          {event.description && (
                            <div className="text-sm text-gray-600 mb-2">{event.description}</div>
                          )}
                          <div className="text-xs space-y-1">
                            {!event.isAllDay && (
                              <div>时间: {event.startTime} - {event.endTime}</div>
                            )}
                            {event.location && <div>地点: {event.location}</div>}
                            <div>类型: {event.type}</div>
                            <div>优先级: {event.priority}</div>
                          </div>
                          <div className="mt-2 space-x-2">
                            <Button size="small" onClick={() => handleEditEvent(event)}>
                              编辑
                            </Button>
                            <Button size="small" danger onClick={() => handleDeleteEvent(event.id)}>
                              删除
                            </Button>
                          </div>
                        </div>
                      }
                      trigger="hover"
                    >
                      <div
                        className="text-xs px-1 py-0.5 rounded truncate"
                        style={{ 
                          backgroundColor: getEventTypeColor(event.type) + '20',
                          borderLeft: `3px solid ${getEventTypeColor(event.type)}`,
                        }}
                      >
                        {event.title}
                      </div>
                    </Popover>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{dayEvents.length - 3} 更多
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 渲染事件列表
  const renderEventList = () => {
    const todayEvents = getEventsForDate(selectedDate.format('YYYY-MM-DD'));
    
    return (
      <Card 
        title={`${selectedDate.format('MM月DD日')} 的事件`}
        className={darkMode ? 'bg-gray-800 border-gray-700' : ''}
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingEvent(null);
              form.resetFields();
              form.setFieldsValue({ 
                date: selectedDate,
                type: 'personal',
                priority: 'medium',
                isAllDay: false,
                reminder: 15,
                repeat: 'none',
              });
              setShowEventModal(true);
            }}
          >
            添加事件
          </Button>
        }
      >
        {todayEvents.length === 0 ? (
          <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            今天没有安排事件
          </div>
        ) : (
          <div className="space-y-3">
            {todayEvents
              .sort((a, b) => {
                if (a.isAllDay && !b.isAllDay) return -1;
                if (!a.isAllDay && b.isAllDay) return 1;
                if (!a.isAllDay && !b.isAllDay) {
                  return (a.startTime || '').localeCompare(b.startTime || '');
                }
                return 0;
              })
              .map(event => (
                <div
                  key={event.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    darkMode ? 'bg-gray-700' : 'bg-white'
                  } shadow-sm`}
                  style={{ borderLeftColor: getEventTypeColor(event.type) }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Text className="font-semibold text-base">{event.title}</Text>
                        <Tag color={getPriorityColor(event.priority)}>
                          {event.priority === 'high' ? '高' : event.priority === 'medium' ? '中' : '低'}
                        </Tag>
                        <Tag color={getEventTypeColor(event.type)}>
                          {event.type}
                        </Tag>
                      </div>
                      
                      {event.description && (
                        <Text className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {event.description}
                        </Text>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <ClockCircleOutlined />
                          <span>
                            {event.isAllDay 
                              ? '全天' 
                              : `${event.startTime} - ${event.endTime}`
                            }
                          </span>
                        </div>
                        
                        {event.location && (
                          <div className="flex items-center space-x-1">
                            <CalendarOutlined />
                            <span>{event.location}</span>
                          </div>
                        )}
                        
                        {event.reminder && (
                          <div className="flex items-center space-x-1">
                            <BellOutlined />
                            <span>提前{event.reminder}分钟提醒</span>
                          </div>
                        )}
                        
                        {event.repeat && event.repeat !== 'none' && (
                          <div className="flex items-center space-x-1">
                            <SyncOutlined />
                            <span>
                              {event.repeat === 'daily' ? '每日重复' :
                               event.repeat === 'weekly' ? '每周重复' :
                               event.repeat === 'monthly' ? '每月重复' :
                               event.repeat === 'yearly' ? '每年重复' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {event.attendees && event.attendees.length > 0 && (
                        <div className="mt-2">
                          <Text className="text-sm">参与者: {event.attendees.join(', ')}</Text>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Tooltip title="编辑">
                        <Button 
                          size="small" 
                          icon={<EditOutlined />}
                          onClick={() => handleEditEvent(event)}
                        />
                      </Tooltip>
                      <Tooltip title="删除">
                        <Button 
                          size="small" 
                          danger 
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteEvent(event.id)}
                        />
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="calendar-container space-y-6">
      <div className="flex items-center justify-between">
        <Title level={2} className={darkMode ? 'text-white' : ''}>
          日程管理
        </Title>
        
        <Space>
          <Button icon={<ExportOutlined />}>
            导出日历
          </Button>
          <Button icon={<SyncOutlined />}>
            同步日历
          </Button>
          <Button 
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingEvent(null);
              form.resetFields();
              form.setFieldsValue({ 
                date: selectedDate,
                type: 'personal',
                priority: 'medium',
                isAllDay: false,
                reminder: 15,
                repeat: 'none',
              });
              setShowEventModal(true);
            }}
          >
            新建事件
          </Button>
        </Space>
      </div>

      {/* 工具栏 */}
      <Card className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
        <Row gutter={16} align="middle" justify="space-between">
          <Col>
            <Space>
              <Button.Group>
                <Button 
                  type={currentView === 'month' ? 'primary' : 'default'}
                  onClick={() => setCurrentView('month')}
                >
                  月视图
                </Button>
                <Button 
                  type={currentView === 'week' ? 'primary' : 'default'}
                  onClick={() => setCurrentView('week')}
                  disabled
                >
                  周视图
                </Button>
                <Button 
                  type={currentView === 'day' ? 'primary' : 'default'}
                  onClick={() => setCurrentView('day')}
                  disabled
                >
                  日视图
                </Button>
              </Button.Group>
              
              <Button onClick={() => setSelectedDate(dayjs())}>
                今天
              </Button>
            </Space>
          </Col>
          
          <Col>
            <Space>
              <Button 
                onClick={() => setSelectedDate(selectedDate.subtract(1, 'month'))}
              >
                上一月
              </Button>
              
              <Text className={`mx-4 font-semibold ${darkMode ? 'text-white' : ''}`}>
                {selectedDate.format('YYYY年MM月')}
              </Text>
              
              <Button 
                onClick={() => setSelectedDate(selectedDate.add(1, 'month'))}
              >
                下一月
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 日历主体 */}
      <Row gutter={16}>
        <Col span={16}>
          <Card className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
            {renderCalendarGrid()}
          </Card>
        </Col>
        
        <Col span={8}>
          {renderEventList()}
        </Col>
      </Row>

      {/* 事件编辑弹窗 */}
      <Modal
        title={editingEvent ? '编辑事件' : '新建事件'}
        open={showEventModal}
        onCancel={() => {
          setShowEventModal(false);
          setEditingEvent(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEventSubmit}
        >
          <Form.Item
            name="title"
            label="事件标题"
            rules={[{ required: true, message: '请输入事件标题' }]}
          >
            <Input placeholder="输入事件标题" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="输入事件描述" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="date"
                label="日期"
                rules={[{ required: true, message: '请选择日期' }]}
              >
                <DatePicker className="w-full" />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item name="isAllDay" valuePropName="checked">
                <Switch checkedChildren="全天" unCheckedChildren="指定时间" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.isAllDay !== currentValues.isAllDay
            }
          >
            {({ getFieldValue }) => 
              !getFieldValue('isAllDay') && (
                <Form.Item name="timeRange" label="时间">
                  <TimePicker.RangePicker format="HH:mm" className="w-full" />
                </Form.Item>
              )
            }
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="类型">
                <Select>
                  <Option value="work">工作</Option>
                  <Option value="personal">个人</Option>
                  <Option value="health">健康</Option>
                  <Option value="study">学习</Option>
                  <Option value="meeting">会议</Option>
                  <Option value="other">其他</Option>
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item name="priority" label="优先级">
                <Select>
                  <Option value="high">高</Option>
                  <Option value="medium">中</Option>
                  <Option value="low">低</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="reminder" label="提醒">
                <Select allowClear placeholder="选择提醒时间">
                  <Option value={5}>5分钟前</Option>
                  <Option value={15}>15分钟前</Option>
                  <Option value={30}>30分钟前</Option>
                  <Option value={60}>1小时前</Option>
                  <Option value={1440}>1天前</Option>
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item name="repeat" label="重复">
                <Select>
                  <Option value="none">不重复</Option>
                  <Option value="daily">每天</Option>
                  <Option value="weekly">每周</Option>
                  <Option value="monthly">每月</Option>
                  <Option value="yearly">每年</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="location" label="地点">
            <Input placeholder="输入地点" />
          </Form.Item>

          <Form.Item name="attendees" label="参与者">
            <Input placeholder="输入参与者，用逗号分隔" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

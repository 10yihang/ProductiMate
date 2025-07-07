import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
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
  Badge,
  Avatar,
  Empty,
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
  EnvironmentOutlined,
  TeamOutlined,
  LeftOutlined,
  RightOutlined,
  EyeOutlined,
  FilterOutlined,
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
  start_time?: string;
  end_time?: string;
  event_type: 'work' | 'personal' | 'health' | 'study' | 'meeting' | 'other';
  priority: 'high' | 'medium' | 'low';
  is_all_day: boolean;
  reminder?: number; // 提前多少分钟提醒
  repeat_type?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  location?: string;
  attendees?: string; // JSON string of array
  created_at: string;
  updated_at: string;
}

interface CreateEventRequest {
  title: string;
  description?: string;
  date: string;
  start_time?: string;
  end_time?: string;
  event_type: string;
  priority: string;
  is_all_day: boolean;
  reminder?: number;
  repeat_type?: string;
  location?: string;
  attendees?: string[];
}

interface UpdateEventRequest {
  id: string;
  title: string;
  description?: string;
  date: string;
  start_time?: string;
  end_time?: string;
  event_type: string;
  priority: string;
  is_all_day: boolean;
  reminder?: number;
  repeat_type?: string;
  location?: string;
  attendees?: string[];
}

export const Calendar: React.FC<CalendarProps> = ({ darkMode = false }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day'>('month');
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();

  // 从后端加载事件
  const loadEvents = async () => {
    setLoading(true);
    try {
      const fetchedEvents: CalendarEvent[] = await invoke('get_all_events');
      const processedEvents = fetchedEvents.map(event => ({
        ...event,
        attendees: event.attendees ? JSON.parse(event.attendees) : [],
      }));
      setEvents(processedEvents);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      message.error('加载事件失败');
    } finally {
      setLoading(false);
    }
  };

  // 组件加载时获取事件
  useEffect(() => {
    loadEvents();
  }, []);
  // 获取指定日期的事件
  const getEventsForDate = (date: string) => {
    let dateEvents = events.filter(event => event.date === date);

    if (filterType !== 'all') {
      dateEvents = dateEvents.filter(event => event.event_type === filterType);
    }

    return dateEvents.sort((a, b) => {
      if (a.is_all_day && !b.is_all_day) return -1;
      if (!a.is_all_day && b.is_all_day) return 1;
      if (!a.is_all_day && !b.is_all_day) {
        return (a.start_time || '').localeCompare(b.start_time || '');
      }
      return 0;
    });
  };
  // 事件类型配置
  const eventTypeConfig = {
    work: {
      label: '工作',
      color: '#1890ff',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      icon: '💼'
    },
    personal: {
      label: '个人',
      color: '#52c41a',
      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      icon: '🏠'
    },
    health: {
      label: '健康',
      color: '#fa8c16',
      gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      icon: '💪'
    },
    study: {
      label: '学习',
      color: '#722ed1',
      gradient: 'linear-gradient(135deg, #a8caba 0%, #5d4e75 100%)',
      icon: '📚'
    },
    meeting: {
      label: '会议',
      color: '#eb2f96',
      gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      icon: '🤝'
    },
    other: {
      label: '其他',
      color: '#8c8c8c',
      gradient: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
      icon: '📌'
    },
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
  const handleEventSubmit = async (values: any) => {
    try {
      const eventData: CreateEventRequest | UpdateEventRequest = {
        ...(editingEvent ? { id: editingEvent.id } : {}),
        title: values.title,
        description: values.description,
        date: values.date.format('YYYY-MM-DD'),
        start_time: values.is_all_day ? undefined : values.timeRange?.[0]?.format('HH:mm'),
        end_time: values.is_all_day ? undefined : values.timeRange?.[1]?.format('HH:mm'),
        event_type: values.event_type,
        priority: values.priority,
        is_all_day: values.is_all_day,
        reminder: values.reminder,
        repeat_type: values.repeat_type,
        location: values.location,
        attendees: values.attendees?.split(',').map((a: string) => a.trim()).filter(Boolean),
      };

      if (editingEvent) {
        await invoke('update_event', { request: eventData });
        message.success('事件已更新');
      } else {
        await invoke('create_event', { request: eventData });
        message.success('事件已创建');
      }

      await loadEvents();
      setShowEventModal(false);
      setEditingEvent(null);
      form.resetFields();
    } catch (error) {
      console.error('Failed to save event:', error);
      message.error('保存事件失败');
    }
  };
  // 删除事件
  const handleDeleteEvent = (eventId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个事件吗？',
      onOk: async () => {
        try {
          await invoke('delete_event', { id: eventId });
          await loadEvents();
          message.success('事件已删除');
        } catch (error) {
          console.error('Failed to delete event:', error);
          message.error('删除事件失败');
        }
      },
    });
  };
  // 编辑事件
  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    const attendeesList = event.attendees ?
      (typeof event.attendees === 'string' ? JSON.parse(event.attendees) : event.attendees) : [];
    form.setFieldsValue({
      title: event.title,
      description: event.description,
      date: dayjs(event.date),
      timeRange: event.start_time && event.end_time ? [
        dayjs(event.start_time, 'HH:mm'),
        dayjs(event.end_time, 'HH:mm'),
      ] : undefined,
      event_type: event.event_type,
      priority: event.priority,
      is_all_day: event.is_all_day,
      reminder: event.reminder,
      repeat_type: event.repeat_type,
      location: event.location,
      attendees: attendeesList.join(', '),
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
        <div className="grid grid-cols-7 gap-3 mb-4">
          {['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map((day, index) => (
            <div key={day} className={`text-center py-3 font-semibold text-sm rounded-lg ${darkMode ? 'text-gray-300 bg-gray-800' : 'text-gray-600 bg-gray-50'
              } ${index === 0 || index === 6 ? (darkMode ? 'text-blue-400' : 'text-blue-600') : ''}`}>
              {day}
            </div>
          ))}
        </div>

        {/* 日期网格 */}
        <div className="grid grid-cols-7 gap-3">
          {weeks.flat().map(date => {
            const dateStr = date.format('YYYY-MM-DD');
            const dayEvents = getEventsForDate(dateStr);
            const isCurrentMonth = date.isSame(selectedDate, 'month');
            const isToday = date.isSame(dayjs(), 'day');
            const isSelected = date.isSame(selectedDate, 'day');

            return (
              <div
                key={dateStr}
                className={`min-h-32 p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg ${darkMode
                    ? 'border-gray-600 hover:border-gray-500 bg-gray-800 hover:bg-gray-750'
                    : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                  } ${!isCurrentMonth
                    ? 'opacity-40'
                    : ''
                  } ${isToday
                    ? darkMode
                      ? 'bg-blue-900/50 border-blue-500 ring-2 ring-blue-500/20'
                      : 'bg-blue-50 border-blue-300 ring-2 ring-blue-300/20'
                    : ''
                  } ${isSelected && !isToday
                    ? darkMode ? 'bg-gray-700 border-gray-500' : 'bg-gray-100 border-gray-400'
                    : ''
                  }`}
                onClick={() => setSelectedDate(date)}
              >
                <div className={`text-sm font-semibold mb-2 flex items-center justify-between ${isToday ? 'text-blue-600 font-bold' : darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                  <span className={isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs' : ''}>
                    {date.date()}
                  </span>
                  {dayEvents.length > 0 && (
                    <Badge
                      count={dayEvents.length}
                      size="small"
                      style={{ backgroundColor: '#1890ff' }}
                    />
                  )}
                </div>

                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => {
                    const typeConfig = eventTypeConfig[event.event_type as keyof typeof eventTypeConfig];
                    return (
                      <Popover
                        key={event.id}
                        content={
                          <div className="max-w-xs">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-lg">{typeConfig.icon}</span>
                              <Text className="font-semibold">{event.title}</Text>
                            </div>
                            {event.description && (
                              <Text className="text-sm text-gray-600 block mb-2">
                                {event.description}
                              </Text>
                            )}                            <div className="space-y-1 text-xs">
                              {!event.is_all_day && (
                                <div className="flex items-center space-x-1">
                                  <ClockCircleOutlined />
                                  <span>{event.start_time} - {event.end_time}</span>
                                </div>
                              )}
                              {event.location && (
                                <div className="flex items-center space-x-1">
                                  <EnvironmentOutlined />
                                  <span>{event.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        }
                        trigger="hover"
                      >
                        <div
                          className={`text-xs p-2 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 text-white font-medium shadow-sm`}
                          style={{
                            background: typeConfig.gradient,
                            border: `1px solid ${typeConfig.color}20`
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditEvent(event);
                          }}
                        >
                          <div className="flex items-center space-x-1">
                            <span>{typeConfig.icon}</span>
                            <span className="truncate flex-1">{event.title}</span>
                          </div>                          {!event.is_all_day && (
                            <div className="text-xs opacity-80 mt-1">
                              {event.start_time}
                            </div>
                          )}
                        </div>
                      </Popover>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className={`text-xs p-1 rounded text-center ${darkMode ? 'text-gray-400 bg-gray-700' : 'text-gray-500 bg-gray-100'
                      }`}>
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
        title={
          <div className="flex items-center space-x-2">
            <CalendarOutlined className="text-blue-600" />
            <span>{selectedDate.format('MM月DD日')} 的事件</span>
          </div>
        }
        className={`${darkMode ? 'bg-gray-800 border-gray-700' : ''} shadow-lg`}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="rounded-lg"
            onClick={() => {
              setEditingEvent(null);
              form.resetFields();
              form.setFieldsValue({
                date: selectedDate,
                event_type: 'personal',
                priority: 'medium',
                is_all_day: false,
                reminder: 15,
                repeat_type: 'none',
              });
              setShowEventModal(true);
            }}
          >
            添加事件
          </Button>
        }
      >
        {todayEvents.length === 0 ? (
          <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <CalendarOutlined className="text-4xl mb-4 opacity-50" />
            <div className="text-lg mb-2">今天没有安排事件</div>
            <div className="text-sm">点击上方按钮添加新事件</div>
          </div>
        ) : (
          <div className="space-y-4">
            {todayEvents.map(event => {
              const typeConfig = eventTypeConfig[event.event_type as keyof typeof eventTypeConfig];
              return (
                <div
                  key={event.id}
                  className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-650' : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  style={{
                    borderLeft: `4px solid ${typeConfig.color}`,
                    background: darkMode
                      ? `linear-gradient(135deg, ${typeConfig.color}10 0%, transparent 100%)`
                      : `linear-gradient(135deg, ${typeConfig.color}08 0%, transparent 100%)`
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                          style={{ backgroundColor: `${typeConfig.color}20` }}>
                          {typeConfig.icon}
                        </div>
                        <div>
                          <Text className="font-semibold text-lg">{event.title}</Text>
                          <div className="flex items-center space-x-2 mt-1">
                            <Tag color={typeConfig.color} className="rounded-full">
                              {typeConfig.label}
                            </Tag>
                            <Tag color={getPriorityColor(event.priority)} className="rounded-full">
                              {event.priority === 'high' ? '高优先级' : event.priority === 'medium' ? '中优先级' : '低优先级'}
                            </Tag>
                          </div>
                        </div>
                      </div>

                      {event.description && (
                        <Text className={`block mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {event.description}
                        </Text>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm">                        <div className="flex items-center space-x-1">
                        <ClockCircleOutlined className="text-blue-600" />
                        <span>
                          {event.is_all_day ? '全天' : `${event.start_time} - ${event.end_time}`}
                        </span>
                      </div>

                        {event.location && (
                          <div className="flex items-center space-x-1">
                            <EnvironmentOutlined className="text-green-600" />
                            <span>{event.location}</span>
                          </div>
                        )}

                        {event.reminder && (
                          <div className="flex items-center space-x-1">
                            <BellOutlined className="text-orange-600" />
                            <span>提前{event.reminder}分钟提醒</span>
                          </div>
                        )}
                        {event.repeat_type && event.repeat_type !== 'none' && (
                          <div className="flex items-center space-x-1">
                            <SyncOutlined className="text-purple-600" />
                            <span>
                              {event.repeat_type === 'daily' ? '每日重复' :
                                event.repeat_type === 'weekly' ? '每周重复' :
                                  event.repeat_type === 'monthly' ? '每月重复' : '每年重复'}
                            </span>
                          </div>
                        )}
                      </div>
                      {(() => {
                        const attendeesList = event.attendees ?
                          (typeof event.attendees === 'string' ? JSON.parse(event.attendees) : event.attendees) : [];
                        return attendeesList.length > 0 && (
                          <div className="mt-3 flex items-center space-x-2">
                            <TeamOutlined className="text-blue-600" />
                            <Text className="text-sm">参与者: </Text>
                            <Avatar.Group size="small" maxCount={3}>
                              {attendeesList.map((attendee: string, index: number) => (
                                <Avatar key={index} className="bg-blue-500">
                                  {attendee.charAt(0)}
                                </Avatar>
                              ))}
                            </Avatar.Group>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex space-x-2">
                      <Tooltip title="编辑">
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          className="rounded-lg"
                          onClick={() => handleEditEvent(event)}
                        />
                      </Tooltip>
                      <Tooltip title="删除">
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          className="rounded-lg"
                          onClick={() => handleDeleteEvent(event.id)}
                        />
                      </Tooltip>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="calendar-container space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className={`mb-2 ${darkMode ? 'text-white' : ''}`}>
            日程管理
          </Title>
          <Text className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            管理您的日程安排和重要事件
          </Text>
        </div>

        <Space>
          <Button icon={<ExportOutlined />} className="rounded-lg">
            导出日历
          </Button>
          <Button icon={<SyncOutlined />} className="rounded-lg">
            同步日历
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            className="rounded-lg"
            onClick={() => {
              setEditingEvent(null);
              form.resetFields();
              form.setFieldsValue({
                date: selectedDate,
                event_type: 'personal',
                priority: 'medium',
                is_all_day: false,
                reminder: 15,
                repeat_type: 'none',
              });
              setShowEventModal(true);
            }}
          >
            新建事件
          </Button>
        </Space>
      </div>

      {/* 工具栏 */}
      <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : ''} shadow-lg`}>
        <Row gutter={16} align="middle" justify="space-between">
          <Col>
            <Space size="large">
              <Button.Group>
                <Button
                  type={currentView === 'month' ? 'primary' : 'default'}
                  onClick={() => setCurrentView('month')}
                  className="rounded-l-lg"
                >
                  <EyeOutlined /> 月视图
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
                  className="rounded-r-lg"
                >
                  日视图
                </Button>
              </Button.Group>

              <Button
                onClick={() => setSelectedDate(dayjs())}
                className="rounded-lg"
              >
                今天
              </Button>

              <Space>
                <FilterOutlined />
                <Select
                  value={filterType}
                  onChange={setFilterType}
                  style={{ width: 120 }}
                  size="small"
                >
                  <Option value="all">所有类型</Option>
                  {Object.entries(eventTypeConfig).map(([key, config]) => (
                    <Option key={key} value={key}>
                      {config.icon} {config.label}
                    </Option>
                  ))}
                </Select>
              </Space>
            </Space>
          </Col>

          <Col>
            <Space size="large">
              <Button
                onClick={() => setSelectedDate(selectedDate.subtract(1, 'month'))}
                icon={<LeftOutlined />}
                className="rounded-lg"
              />

              <Text className={`mx-4 font-semibold text-lg ${darkMode ? 'text-white' : ''}`}>
                {selectedDate.format('YYYY年MM月')}
              </Text>

              <Button
                onClick={() => setSelectedDate(selectedDate.add(1, 'month'))}
                icon={<RightOutlined />}
                className="rounded-lg"
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 日历主体 */}
      <Row gutter={24}>
        <Col span={16}>
          <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : ''} shadow-lg`}>
            {renderCalendarGrid()}
          </Card>
        </Col>

        <Col span={8}>
          {renderEventList()}
        </Col>
      </Row>

      {/* 事件编辑弹窗 */}
      <Modal
        title={
          <div className="flex items-center space-x-2">
            <CalendarOutlined className="text-blue-600" />
            <span>{editingEvent ? '编辑事件' : '新建事件'}</span>
          </div>
        }
        open={showEventModal}
        onCancel={() => {
          setShowEventModal(false);
          setEditingEvent(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
        className="event-modal"
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
            <Input placeholder="输入事件标题" size="large" />
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
                <DatePicker className="w-full" size="large" />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="is_all_day" valuePropName="checked" label=" ">
                <Switch
                  checkedChildren="全天"
                  unCheckedChildren="指定时间"
                  size="default"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            noStyle shouldUpdate={(prevValues, currentValues) =>
              prevValues.is_all_day !== currentValues.is_all_day
            }
          >
            {({ getFieldValue }) =>
              !getFieldValue('is_all_day') && (
                <Form.Item name="timeRange" label="时间">
                  <TimePicker.RangePicker format="HH:mm" className="w-full" size="large" />
                </Form.Item>
              )
            }
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="event_type" label="类型">
                <Select size="large">
                  {Object.entries(eventTypeConfig).map(([key, config]) => (
                    <Option key={key} value={key}>
                      <span className="flex items-center space-x-2">
                        <span>{config.icon}</span>
                        <span>{config.label}</span>
                      </span>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="priority" label="优先级">
                <Select size="large">
                  <Option value="high">🔴 高优先级</Option>
                  <Option value="medium">🟡 中优先级</Option>
                  <Option value="low">🟢 低优先级</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="reminder" label="提醒">
                <Select allowClear placeholder="选择提醒时间" size="large">
                  <Option value={5}>5分钟前</Option>
                  <Option value={15}>15分钟前</Option>
                  <Option value={30}>30分钟前</Option>
                  <Option value={60}>1小时前</Option>
                  <Option value={1440}>1天前</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="repeat_type" label="重复">
                <Select size="large">
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
            <Input placeholder="输入地点" size="large" prefix={<EnvironmentOutlined />} />
          </Form.Item>

          <Form.Item name="attendees" label="参与者">
            <Input placeholder="输入参与者，用逗号分隔" size="large" prefix={<TeamOutlined />} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Card,
  Input,
  Button,
  List,
  Checkbox,
  Tag,
  Select,
  DatePicker,
  Modal,
  Form,
  Row,
  Col,
  Space,
  Tooltip,
  Popconfirm,
  Progress,
  Empty,
  message,
  Typography,
  Badge,
  Divider,
  Drawer,
  Timeline,
  Statistic,
  Dropdown,
  TimePicker,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  FlagOutlined,
  SyncOutlined,
  ExportOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  StarOutlined,
  FilterOutlined,
  BarChartOutlined,
  TagsOutlined,
  MoreOutlined,
  SearchOutlined,
  FileExcelOutlined,
  PrinterOutlined,
  CopyOutlined,
  HeartOutlined,
  ThunderboltOutlined,
  FireOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { Column, Pie, Line } from '@ant-design/plots';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import isBetween from 'dayjs/plugin/isBetween';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.extend(isBetween);
dayjs.locale('zh-cn');

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

// 任务接口定义
interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  tags?: string[];
  due_date?: string;
  category: string;
  created_at: string;
  updated_at: string;
}

interface CreateTodoRequest {
  title: string;
  description?: string;
  priority: string;
  tags?: string[];
  due_date?: string;
  category: string;
}

interface UpdateTodoRequest {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: string;
  tags?: string[];
  due_date?: string;
  category: string;
}

// 优先级颜色映射
const priorityColors = {
  high: '#ff4d4f',
  medium: '#faad14',
  low: '#52c41a',
};

// 优先级标签
const priorityLabels = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
};

interface TodoListProps {
  darkMode?: boolean;
}

export const TodoList: React.FC<TodoListProps> = ({ darkMode = false }) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filteredTodos, setFilteredTodos] = useState<Todo[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSubtaskModalVisible, setIsSubtaskModalVisible] = useState(false);
  const [isStatsDrawerVisible, setIsStatsDrawerVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [selectedTodos, setSelectedTodos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'card' | 'timeline'>('list');
  const [form] = Form.useForm();
  const [subtaskForm] = Form.useForm();

  // 从后端加载待办事项
  const loadTodos = async () => {
    setLoading(true);
    try {
      const fetchedTodos: Todo[] = await invoke('get_all_todos');
      const processedTodos = fetchedTodos.map(todo => ({
        ...todo,
        tags: typeof todo.tags === 'string' ? JSON.parse(todo.tags || '[]') : (todo.tags || []),
      }));
      setTodos(processedTodos);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
      message.error('加载待办事项失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载待办事项
  useEffect(() => {
    loadTodos();
  }, []);

  // 过滤和搜索
  useEffect(() => {
    let filtered = [...todos];

    // 搜索过滤
    if (searchText) {
      filtered = filtered.filter(
        (todo) =>
          todo.title.toLowerCase().includes(searchText.toLowerCase()) ||
          todo.description?.toLowerCase().includes(searchText.toLowerCase()) ||
          (todo.tags || []).some((tag) =>
            tag.toLowerCase().includes(searchText.toLowerCase())
          )
      );
    }

    // 优先级过滤
    if (filterPriority !== 'all') {
      filtered = filtered.filter((todo) => todo.priority === filterPriority);
    }

    // 分类过滤
    if (filterCategory !== 'all') {
      filtered = filtered.filter((todo) => todo.category === filterCategory);
    }

    // 状态过滤
    if (filterStatus === 'completed') {
      filtered = filtered.filter((todo) => todo.completed);
    } else if (filterStatus === 'pending') {
      filtered = filtered.filter((todo) => !todo.completed);
    } else if (filterStatus === 'overdue') {
      filtered = filtered.filter(
        (todo) =>
          !todo.completed &&
          todo.due_date &&
          dayjs(todo.due_date).isBefore(dayjs(), 'day')
      );
    } else if (filterStatus === 'today') {
      filtered = filtered.filter(
        (todo) =>
          todo.due_date &&
          dayjs(todo.due_date).isSame(dayjs(), 'day')
      );
    } else if (filterStatus === 'upcoming') {
      filtered = filtered.filter(
        (todo) =>
          todo.due_date &&
          dayjs(todo.due_date).isAfter(dayjs(), 'day') &&
          dayjs(todo.due_date).isBefore(dayjs().add(7, 'day'))
      );
    }

    // 排序
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'title':
          compareValue = a.title.localeCompare(b.title);
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          compareValue = priorityOrder[b.priority] - priorityOrder[a.priority];
          break;
        case 'due_date':
          if (!a.due_date && !b.due_date) compareValue = 0;
          else if (!a.due_date) compareValue = 1;
          else if (!b.due_date) compareValue = -1;
          else compareValue = dayjs(a.due_date).valueOf() - dayjs(b.due_date).valueOf();
          break;
        case 'created_at':
        default:
          compareValue = dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf();
          break;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    setFilteredTodos(filtered);
  }, [todos, searchText, filterPriority, filterCategory, filterStatus, sortBy, sortOrder]);

  // 提交表单
  const handleSubmit = async (values: any) => {
    try {
      const requestData: CreateTodoRequest = {
        title: values.title,
        description: values.description,
        priority: values.priority,
        tags: values.tags?.split(',').map((tag: string) => tag.trim()).filter(Boolean),
        due_date: values.due_date && values.due_time
          ? dayjs(values.due_date).hour(values.due_time.hour()).minute(values.due_time.minute()).format('YYYY-MM-DD HH:mm:ss')
          : values.due_date?.format('YYYY-MM-DD'),
        category: values.category || 'general',
      };

      if (editingTodo) {
        const updateRequest: UpdateTodoRequest = {
          ...requestData,
          id: editingTodo.id,
          completed: editingTodo.completed,
        };
        await invoke('update_todo', { request: updateRequest });
        message.success('待办事项已更新');
      } else {
        await invoke('create_todo', { request: requestData });
        message.success('待办事项已创建');
      }

      loadTodos();
      setIsModalVisible(false);
      setEditingTodo(null);
      form.resetFields();
    } catch (error) {
      console.error('Failed to save todo:', error);
      message.error('保存待办事项失败');
    }
  };

  // 删除待办事项
  const handleDelete = async (id: string) => {
    try {
      await invoke('delete_todo', { id });
      message.success('待办事项已删除');
      loadTodos();
    } catch (error) {
      console.error('Failed to delete todo:', error);
      message.error('删除待办事项失败');
    }
  };

  // 切换完成状态
  const handleToggleComplete = async (id: string) => {
    try {
      await invoke('toggle_todo_completion', { id });
      loadTodos();
    } catch (error) {
      console.error('Failed to toggle todo completion:', error);
      message.error('更新待办事项状态失败');
    }
  };
  // 编辑待办事项
  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo);
    const dueDate = todo.due_date ? dayjs(todo.due_date) : null;
    form.setFieldsValue({
      title: todo.title,
      description: todo.description,
      priority: todo.priority,
      tags: (todo.tags || []).join(', '),
      due_date: dueDate ? dueDate.startOf('day') : null,
      due_time: dueDate ? dueDate : null,
      category: todo.category,
    });
    setIsModalVisible(true);
  };

  // 新建待办事项
  const handleNew = () => {
    setEditingTodo(null);
    form.resetFields();
    form.setFieldsValue({
      priority: 'medium',
      category: 'general',
    });
    setIsModalVisible(true);
  };
  // 获取统计信息
  const getStats = () => {
    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const pending = total - completed;
    const overdue = todos.filter(
      (t) => !t.completed && t.due_date && dayjs(t.due_date).isBefore(dayjs(), 'day')
    ).length;

    return { total, completed, pending, overdue };
  };

  // 获取图表数据
  const getChartData = () => {
    // 优先级分布饼图数据
    const priorityData = [
      { type: '高优先级', value: todos.filter(t => t.priority === 'high').length, color: '#ff4d4f' },
      { type: '中优先级', value: todos.filter(t => t.priority === 'medium').length, color: '#faad14' },
      { type: '低优先级', value: todos.filter(t => t.priority === 'low').length, color: '#52c41a' },
    ].filter(item => item.value > 0);

    // 分类分布柱状图数据
    const categoryData = [
      { category: '工作', count: todos.filter(t => t.category === 'work').length },
      { category: '个人', count: todos.filter(t => t.category === 'personal').length },
      { category: '学习', count: todos.filter(t => t.category === 'study').length },
      { category: '健康', count: todos.filter(t => t.category === 'health').length },
      { category: '一般', count: todos.filter(t => t.category === 'general').length },
    ].filter(item => item.count > 0);

    // 完成状态饼图数据
    const statusData = [
      { type: '已完成', value: stats.completed, color: '#52c41a' },
      { type: '待完成', value: stats.pending, color: '#faad14' },
      { type: '已逾期', value: stats.overdue, color: '#ff4d4f' },
    ].filter(item => item.value > 0);

    // 每日完成趋势线图数据（最近7天）
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day');
      const completedCount = todos.filter(t =>
        t.completed && dayjs(t.updated_at).isSame(date, 'day')
      ).length;
      trendData.push({
        date: date.format('MM-DD'),
        count: completedCount,
      });
    }

    return { priorityData, categoryData, statusData, trendData };
  };

  const stats = getStats();
  const chartData = getChartData();

  return (
    <div className="space-y-6">
      {/* 标题和操作 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Title level={2} className={`mb-2 ${darkMode ? 'text-white' : ''}`}>
            <CheckSquareOutlined className="mr-2" />
            待办清单
          </Title>
          <Text className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            高效管理您的任务和待办事项，让工作井井有条
          </Text>
        </div>

        <Space>
          {/* 视图切换 */}
          <Button.Group>
            <Tooltip title="列表视图">
              <Button
                icon={<FilterOutlined />}
                type={viewMode === 'list' ? 'primary' : 'default'}
                onClick={() => setViewMode('list')}
              />
            </Tooltip>
            <Tooltip title="卡片视图">
              <Button
                icon={<TagsOutlined />}
                type={viewMode === 'card' ? 'primary' : 'default'}
                onClick={() => setViewMode('card')}
              />
            </Tooltip>
            <Tooltip title="时间线视图">
              <Button
                icon={<ClockCircleOutlined />}
                type={viewMode === 'timeline' ? 'primary' : 'default'}
                onClick={() => setViewMode('timeline')}
              />
            </Tooltip>
          </Button.Group>

          <Divider type="vertical" />

          {/* 操作按钮 */}
          <Tooltip title="统计报告">
            <Button
              icon={<BarChartOutlined />}
              onClick={() => setIsStatsDrawerVisible(true)}
            >
              统计
            </Button>
          </Tooltip>

          <Tooltip title="刷新数据">
            <Button icon={<SyncOutlined />} onClick={loadTodos} loading={loading}>
              刷新
            </Button>
          </Tooltip>

          <Dropdown
            menu={{
              items: [
                {
                  key: 'export-excel',
                  label: '导出为 Excel',
                  icon: <FileExcelOutlined />,
                },
                {
                  key: 'export-pdf',
                  label: '导出为 PDF',
                  icon: <PrinterOutlined />,
                },
                {
                  key: 'copy',
                  label: '复制到剪贴板',
                  icon: <CopyOutlined />,
                },
              ],
            }}
          >
            <Button icon={<ExportOutlined />}>
              导出 <span className="ml-1">▼</span>
            </Button>
          </Dropdown>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={handleNew}
            className="shadow-lg"
          >
            新建任务
          </Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card
            className={`text-center hover:shadow-lg transition-shadow ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}
            bodyStyle={{ padding: '20px 12px' }}
          >
            <Statistic
              title="总任务"
              value={stats.total}
              prefix={<CheckSquareOutlined />}
              valueStyle={{ color: '#1890ff', fontSize: '28px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            className={`text-center hover:shadow-lg transition-shadow ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}
            bodyStyle={{ padding: '20px 12px' }}
          >
            <Statistic
              title="已完成"
              value={stats.completed}
              prefix={<HeartOutlined />}
              valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: 'bold' }}
              suffix={
                <span className="text-sm text-gray-500">
                  / {stats.total}
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            className={`text-center hover:shadow-lg transition-shadow ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}
            bodyStyle={{ padding: '20px 12px' }}
          >
            <Statistic
              title="待完成"
              value={stats.pending}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#faad14', fontSize: '28px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            className={`text-center hover:shadow-lg transition-shadow ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}
            bodyStyle={{ padding: '20px 12px' }}
          >
            <Statistic
              title="已逾期"
              value={stats.overdue}
              prefix={<FireOutlined />}
              valueStyle={{ color: '#ff4d4f', fontSize: '28px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 搜索和过滤 */}
      <Card className={`mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <Input.Search
              placeholder="搜索标题、描述、标签..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="large"
              prefix={<SearchOutlined />}
            />
          </Col>

          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="优先级"
              value={filterPriority}
              onChange={setFilterPriority}
              className="w-full"
              size="large"
            >
              <Option value="all">所有优先级</Option>
              <Option value="high">🔴 高优先级</Option>
              <Option value="medium">🟡 中优先级</Option>
              <Option value="low">🟢 低优先级</Option>
            </Select>
          </Col>

          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="状态"
              value={filterStatus}
              onChange={setFilterStatus}
              className="w-full"
              size="large"
            >
              <Option value="all">所有状态</Option>
              <Option value="pending">⏳ 待完成</Option>
              <Option value="completed">✅ 已完成</Option>
              <Option value="today">📅 今日到期</Option>
              <Option value="upcoming">🔜 即将到期</Option>
              <Option value="overdue">🚨 已逾期</Option>
            </Select>
          </Col>

          <Col xs={12} sm={6} md={3}>
            <Select
              placeholder="分类"
              value={filterCategory}
              onChange={setFilterCategory}
              className="w-full"
              size="large"
            >
              <Option value="all">所有分类</Option>
              <Option value="work">💼 工作</Option>
              <Option value="personal">👤 个人</Option>
              <Option value="study">📚 学习</Option>
              <Option value="health">🏃 健康</Option>
              <Option value="general">📋 一般</Option>
            </Select>
          </Col>

          <Col xs={12} sm={6} md={3}>
            <Select
              placeholder="排序"
              value={`${sortBy}-${sortOrder}`}
              onChange={(value) => {
                const [sort, order] = value.split('-');
                setSortBy(sort);
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="w-full"
              size="large"
            >
              <Option value="created_at-desc">🕐 创建时间 ↓</Option>
              <Option value="created_at-asc">🕐 创建时间 ↑</Option>
              <Option value="due_date-asc">📅 到期时间 ↑</Option>
              <Option value="due_date-desc">📅 到期时间 ↓</Option>
              <Option value="priority-desc">🔥 优先级 ↓</Option>
              <Option value="priority-asc">🔥 优先级 ↑</Option>
              <Option value="title-asc">📝 标题 A-Z</Option>
              <Option value="title-desc">📝 标题 Z-A</Option>
            </Select>
          </Col>

          <Col xs={24} md={2}>
            <div className="text-center">
              {stats.total > 0 && (
                <Progress
                  type="circle"
                  percent={Math.round((stats.completed / stats.total) * 100)}
                  size={60}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                  format={(percent) => `${percent}%`}
                />
              )}
            </div>
          </Col>
        </Row>

        {/* 快速过滤标签 */}
        <Divider />
        <Space wrap>
          <Tag.CheckableTag
            checked={filterStatus === 'all'}
            onChange={() => setFilterStatus('all')}
          >
            全部 ({stats.total})
          </Tag.CheckableTag>
          <Tag.CheckableTag
            checked={filterStatus === 'pending'}
            onChange={() => setFilterStatus('pending')}
          >
            待完成 ({stats.pending})
          </Tag.CheckableTag>
          <Tag.CheckableTag
            checked={filterStatus === 'completed'}
            onChange={() => setFilterStatus('completed')}
          >
            已完成 ({stats.completed})
          </Tag.CheckableTag>
          <Tag.CheckableTag
            checked={filterStatus === 'overdue'}
            onChange={() => setFilterStatus('overdue')}
          >
            已逾期 ({stats.overdue})
          </Tag.CheckableTag>
          <Tag.CheckableTag
            checked={filterStatus === 'today'}
            onChange={() => setFilterStatus('today')}
          >
            今日到期 ({todos.filter(t => t.due_date && dayjs(t.due_date).isSame(dayjs(), 'day')).length})
          </Tag.CheckableTag>
        </Space>
      </Card>

      {/* 待办事项列表 */}
      <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
        {/* 批量操作工具栏 */}
        {selectedTodos.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Space>
              <Text strong>已选择 {selectedTodos.length} 项</Text>
              <Button size="small" onClick={() => setSelectedTodos([])}>
                取消选择
              </Button>
              <Button
                size="small"
                type="primary"
                icon={<CheckSquareOutlined />}
                onClick={() => {
                  // 批量完成逻辑
                  selectedTodos.forEach(id => handleToggleComplete(id));
                  setSelectedTodos([]);
                }}
              >
                批量完成
              </Button>
              <Popconfirm
                title="确定要删除选中的任务吗？"
                onConfirm={() => {
                  selectedTodos.forEach(id => handleDelete(id));
                  setSelectedTodos([]);
                }}
              >
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                >
                  批量删除
                </Button>
              </Popconfirm>
            </Space>
          </div>
        )}

        {filteredTodos.length === 0 ? (
          <Empty
            description={
              loading ? "正在加载任务..." :
                searchText || filterPriority !== 'all' || filterStatus !== 'all' ?
                  "没有符合条件的任务" : "暂无待办事项"
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            className="py-12"
          >
            {!loading && !searchText && filterPriority === 'all' && filterStatus === 'all' && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleNew}>
                创建第一个任务
              </Button>
            )}
          </Empty>
        ) : (
          <List
            dataSource={filteredTodos}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 项，共 ${total} 项`,
            }} renderItem={(todo) => (
              <List.Item
                className={`transition-all duration-200 hover:bg-gray-50 rounded-lg mb-2 p-4 border border-gray-100 ${todo.completed ? 'opacity-70 bg-gray-50' : 'bg-white'
                  } ${darkMode ? 'border-gray-600 hover:bg-gray-700' : ''} ${selectedTodos.includes(todo.id) ? 'ring-2 ring-blue-500' : ''
                  }`}                actions={[
                  <Checkbox
                    checked={selectedTodos.includes(todo.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTodos([...selectedTodos, todo.id]);
                      } else {
                        setSelectedTodos(selectedTodos.filter(id => id !== todo.id));
                      }
                    }}
                  />,
                  <Tooltip title="添加子任务">
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setIsSubtaskModalVisible(true);
                      }}
                    />
                  </Tooltip>,
                  <Tooltip title="编辑任务">
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleEdit(todo)}
                    />
                  </Tooltip>,
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'duplicate',
                          label: '复制任务',
                          icon: <CopyOutlined />,
                        },
                        {
                          key: 'share',
                          label: '分享任务',
                          icon: <ShareAltOutlined />,
                        },
                        {
                          type: 'divider',
                        },
                        {
                          key: 'delete',
                          label: '删除任务',
                          icon: <DeleteOutlined />,
                          danger: true,
                          onClick: () => handleDelete(todo.id),
                        },
                      ],
                    }}
                  >
                    <Button size="small" icon={<MoreOutlined />} />
                  </Dropdown>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8">
                        <Checkbox
                          checked={todo.completed}
                          onChange={() => handleToggleComplete(todo.id)}
                          className="transform scale-110"
                        />
                      </div>
                      {todo.priority === 'high' && (
                        <FireOutlined className="text-red-500" />
                      )}
                    </div>
                  }
                  title={
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1">
                        <span
                          className={`text-lg font-medium ${todo.completed ? 'line-through text-gray-500' : ''
                            }`}
                        >
                          {todo.title}
                        </span>

                        {/* 优先级标签 */}
                        <Tag
                          color={priorityColors[todo.priority]}
                          className="rounded-full px-2"
                        >
                          <FlagOutlined /> {priorityLabels[todo.priority]}
                        </Tag>
                        {/* 到期日期标签 */}
                        {todo.due_date && (
                          <Tag
                            color={
                              !todo.completed && dayjs(todo.due_date).isBefore(dayjs())
                                ? 'red'
                                : dayjs(todo.due_date).isSame(dayjs(), 'day')
                                  ? 'orange'
                                  : 'blue'
                            }
                            icon={<CalendarOutlined />}
                            className="rounded-full"
                          >
                            {dayjs(todo.due_date).format('MM-DD HH:mm')}
                            {dayjs(todo.due_date).isSame(dayjs(), 'day') && ' (今天)'}
                          </Tag>
                        )}

                        {/* 收藏标志 */}
                        <Button
                          type="text"
                          size="small"
                          icon={<StarOutlined />}
                          className="text-gray-400 hover:text-yellow-500"
                        />
                      </div>

                      {/* 任务进度（如果有子任务） */}
                      <div className="text-sm text-gray-500">
                        <ClockCircleOutlined className="mr-1" />
                        {dayjs(todo.created_at).fromNow()}
                      </div>
                    </div>
                  }
                  description={
                    <div className="mt-2">
                      {/* 任务描述 */}
                      {todo.description && (
                        <div className="mb-3 text-gray-600 bg-gray-50 p-2 rounded text-sm">
                          {todo.description}
                        </div>
                      )}

                      {/* 标签 */}
                      {(todo.tags || []).length > 0 && (
                        <div className="mb-2">
                          <Space wrap>
                            {(todo.tags || []).map((tag, index) => (
                              <Tag
                                key={index}
                                color="processing"
                                className="rounded-full text-xs"
                              >
                                #{tag}
                              </Tag>
                            ))}
                          </Space>
                        </div>
                      )}

                      {/* 元信息 */}
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                        <Space>
                          <span>
                            📅 创建于 {dayjs(todo.created_at).format('MM-DD HH:mm')}
                          </span>
                          {todo.category !== 'general' && (
                            <Tag color="default">
                              📁 {todo.category}
                            </Tag>
                          )}
                        </Space>

                        {todo.updated_at !== todo.created_at && (
                          <span>
                            ✏️ 更新于 {dayjs(todo.updated_at).format('MM-DD HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* 新建/编辑弹窗 */}
      <Modal
        title={
          <div className="flex items-center space-x-2">
            <CheckSquareOutlined />
            <span>{editingTodo ? '编辑待办事项' : '新建待办事项'}</span>
          </div>
        }
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingTodo(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={700}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            priority: 'medium',
            category: 'general',
          }}
        >
          <Form.Item
            name="title"
            label="任务标题"
            rules={[{ required: true, message: '请输入任务标题' }]}
          >
            <Input placeholder="输入任务标题" size="large" />
          </Form.Item>

          <Form.Item name="description" label="任务描述">
            <TextArea rows={3} placeholder="输入任务描述（可选）" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="priority" label="优先级">
                <Select size="large">
                  <Option value="high">🔴 高优先级</Option>
                  <Option value="medium">🟡 中优先级</Option>
                  <Option value="low">🟢 低优先级</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="分类">
                <Select size="large">
                  <Option value="general">📋 一般</Option>
                  <Option value="work">💼 工作</Option>
                  <Option value="personal">👤 个人</Option>
                  <Option value="study">📚 学习</Option>
                  <Option value="health">🏃 健康</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="due_date" label="截止日期">
                <DatePicker
                  className="w-full"
                  size="large"
                  placeholder="选择截止日期"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="due_time" label="截止时间">
                <TimePicker
                  className="w-full"
                  size="large"
                  placeholder="选择截止时间"
                  format="HH:mm"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="tags" label="标签">
                <Input
                  placeholder="输入标签，用逗号分隔"
                  size="large"
                  prefix={<TagsOutlined />}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>      {/* 子任务弹窗 */}
      <Modal
        title="添加子任务"
        open={isSubtaskModalVisible}
        onCancel={() => {
          setIsSubtaskModalVisible(false);
          subtaskForm.resetFields();
        }}
        onOk={() => subtaskForm.submit()}
        width={500}
      >
        <Form
          form={subtaskForm}
          layout="vertical"
          onFinish={(values) => {
            // 这里可以添加创建子任务的逻辑
            console.log('创建子任务:', values);
            setIsSubtaskModalVisible(false);
            subtaskForm.resetFields();
          }}
        >
          <Form.Item
            name="title"
            label="子任务标题"
            rules={[{ required: true, message: '请输入子任务标题' }]}
          >
            <Input placeholder="输入子任务标题" size="large" />
          </Form.Item>
        </Form>
      </Modal>{/* 统计抽屉 */}
      <Drawer
        title="任务统计报告"
        placement="right"
        onClose={() => setIsStatsDrawerVisible(false)}
        open={isStatsDrawerVisible}
        width={600}
      >
        <div className="space-y-6">
          {/* 完成率统计 */}
          <Card>
            <Statistic
              title="总体完成率"
              value={stats.total > 0 ? (stats.completed / stats.total * 100) : 0}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#52c41a', fontSize: '24px' }}
            />
            <Progress
              percent={stats.total > 0 ? Math.round(stats.completed / stats.total * 100) : 0}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          </Card>

          {/* 完成状态分布饼图 */}
          <Card title="📊 任务状态分布">
            {chartData.statusData.length > 0 ? (
              <Pie
                data={chartData.statusData}
                angleField="value"
                colorField="type"
                radius={0.8}
                label={{
                  type: 'outer',
                  content: '{name}: {value}',
                }}
                legend={{
                  position: 'bottom',
                }}
                color={['#52c41a', '#faad14', '#ff4d4f']}
                height={200}
              />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>

          {/* 优先级分布饼图 */}
          <Card title="🎯 优先级分布">
            {chartData.priorityData.length > 0 ? (
              <Pie
                data={chartData.priorityData}
                angleField="value"
                colorField="type"
                radius={0.8}
                label={{
                  type: 'outer',
                  content: '{name}: {value}',
                }}
                legend={{
                  position: 'bottom',
                }}
                color={['#ff4d4f', '#faad14', '#52c41a']}
                height={200}
              />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>

          {/* 分类分布柱状图 */}
          <Card title="📁 分类分布">
            {chartData.categoryData.length > 0 ? (
              <Column
                data={chartData.categoryData}
                xField="category"
                yField="count"
                color="#1890ff"
                label={{
                  position: 'middle',
                  style: {
                    fill: '#FFFFFF',
                    opacity: 0.6,
                  },
                }}
                xAxis={{
                  label: {
                    autoHide: true,
                    autoRotate: false,
                  },
                }}
                meta={{
                  category: {
                    alias: '分类',
                  },
                  count: {
                    alias: '数量',
                  },
                }}
                height={200}
              />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>

          {/* 完成趋势线图 */}
          <Card title="📈 完成趋势（最近7天）">
            <Line
              data={chartData.trendData}
              xField="date"
              yField="count"
              color="#52c41a"
              point={{
                size: 5,
                shape: 'diamond',
                style: {
                  fill: 'white',
                  stroke: '#52c41a',
                  lineWidth: 2,
                },
              }} tooltip={{
                formatter: (data: any) => {
                  return { name: '完成任务', value: `${data.count} 个` };
                },
              }}
              meta={{
                date: {
                  alias: '日期',
                },
                count: {
                  alias: '完成数量',
                },
              }}
              height={200}
            />
          </Card>

          {/* 数据统计表格 */}
          <Card title="📋 详细统计">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>� 高优先级</span>
                <Badge count={todos.filter(t => t.priority === 'high').length} />
              </div>
              <div className="flex justify-between">
                <span>� 中优先级</span>
                <Badge count={todos.filter(t => t.priority === 'medium').length} />
              </div>
              <div className="flex justify-between">
                <span>🟢 低优先级</span>
                <Badge count={todos.filter(t => t.priority === 'low').length} />
              </div>
              <Divider />
              {['work', 'personal', 'study', 'health', 'general'].map(category => {
                const count = todos.filter(t => t.category === category).length;
                const categoryLabels = {
                  work: '💼 工作',
                  personal: '👤 个人',
                  study: '📚 学习',
                  health: '🏃 健康',
                  general: '📋 一般'
                };
                return count > 0 && (
                  <div key={category} className="flex justify-between">
                    <span>{categoryLabels[category as keyof typeof categoryLabels]}</span>
                    <Badge count={count} />
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 时间统计 */}
          <Card title="⏰ 时间统计">
            <Timeline
              items={[
                {
                  children: `今日到期: ${todos.filter(t => t.due_date && dayjs(t.due_date).isSame(dayjs(), 'day')).length} 项`,
                  color: 'blue',
                },
                {
                  children: `本周到期: ${todos.filter(t => t.due_date && dayjs(t.due_date).isBetween(dayjs(), dayjs().add(7, 'day'))).length} 项`,
                  color: 'green',
                },
                {
                  children: `已逾期: ${stats.overdue} 项`,
                  color: 'red',
                },
              ]}
            />
          </Card>
        </div>
      </Drawer>
    </div>
  );
};

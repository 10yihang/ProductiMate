import React, { useState, useEffect } from 'react';
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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  FlagOutlined,
  SyncOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

// 任务接口定义
interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  subtasks?: Subtask[];
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
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

export const TodoList: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filteredTodos, setFilteredTodos] = useState<Todo[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [form] = Form.useForm();

  // 加载待办事项
  useEffect(() => {
    loadTodos();
  }, []);

  // 过滤和搜索
  useEffect(() => {
    let filtered = todos;

    // 搜索过滤
    if (searchText) {
      filtered = filtered.filter(
        (todo) =>
          todo.title.toLowerCase().includes(searchText.toLowerCase()) ||
          todo.description?.toLowerCase().includes(searchText.toLowerCase()) ||
          todo.tags.some((tag) =>
            tag.toLowerCase().includes(searchText.toLowerCase())
          )
      );
    }

    // 优先级过滤
    if (filterPriority !== 'all') {
      filtered = filtered.filter((todo) => todo.priority === filterPriority);
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
          todo.dueDate &&
          dayjs(todo.dueDate).isBefore(dayjs(), 'day')
      );
    }

    setFilteredTodos(filtered);
  }, [todos, searchText, filterPriority, filterStatus]);

  // 从本地存储加载数据
  const loadTodos = () => {
    try {
      const savedTodos = localStorage.getItem('todos');
      if (savedTodos) {
        setTodos(JSON.parse(savedTodos));
      }
    } catch (error) {
      console.error('加载待办事项失败:', error);
      message.error('加载待办事项失败');
    }
  };

  // 保存到本地存储
  const saveTodos = (newTodos: Todo[]) => {
    try {
      localStorage.setItem('todos', JSON.stringify(newTodos));
      setTodos(newTodos);
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败');
    }
  };

  // 添加或更新待办事项
  const handleSubmit = async (values: any) => {
    try {
      const now = dayjs().toISOString();
      const todoData: Todo = {
        id: editingTodo?.id || Date.now().toString(),
        title: values.title,
        description: values.description,
        completed: editingTodo?.completed || false,
        priority: values.priority,
        tags: values.tags || [],
        dueDate: values.dueDate?.toISOString(),
        createdAt: editingTodo?.createdAt || now,
        updatedAt: now,
        subtasks: editingTodo?.subtasks || [],
      };

      let newTodos;
      if (editingTodo) {
        newTodos = todos.map((todo) => (todo.id === editingTodo.id ? todoData : todo));
        message.success('待办事项已更新');
      } else {
        newTodos = [todoData, ...todos];
        message.success('待办事项已添加');
      }

      saveTodos(newTodos);
      setIsModalVisible(false);
      setEditingTodo(null);
      form.resetFields();
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败');
    }
  };

  // 切换完成状态
  const toggleTodo = (id: string) => {
    const newTodos = todos.map((todo) =>
      todo.id === id
        ? { ...todo, completed: !todo.completed, updatedAt: dayjs().toISOString() }
        : todo
    );
    saveTodos(newTodos);
    message.success(
      newTodos.find((t) => t.id === id)?.completed ? '任务已完成' : '任务已重新激活'
    );
  };

  // 删除待办事项
  const deleteTodo = (id: string) => {
    const newTodos = todos.filter((todo) => todo.id !== id);
    saveTodos(newTodos);
    message.success('待办事项已删除');
  };

  // 编辑待办事项
  const editTodo = (todo: Todo) => {
    setEditingTodo(todo);
    form.setFieldsValue({
      title: todo.title,
      description: todo.description,
      priority: todo.priority,
      tags: todo.tags,
      dueDate: todo.dueDate ? dayjs(todo.dueDate) : null,
    });
    setIsModalVisible(true);
  };

  // 快速添加
  const quickAdd = (title: string) => {
    if (!title.trim()) return;

    const todoData: Todo = {
      id: Date.now().toString(),
      title: title.trim(),
      completed: false,
      priority: 'medium',
      tags: [],
      createdAt: dayjs().toISOString(),
      updatedAt: dayjs().toISOString(),
    };

    saveTodos([todoData, ...todos]);
    message.success('快速添加成功');
  };

  // 计算统计信息
  const getStats = () => {
    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const pending = total - completed;
    const overdue = todos.filter(
      (t) => !t.completed && t.dueDate && dayjs(t.dueDate).isBefore(dayjs(), 'day')
    ).length;

    return { total, completed, pending, overdue };
  };

  const stats = getStats();

  return (
    <div className="space-y-8">
      {/* 头部统计 */}
      <Row gutter={[24, 16]}>
        <Col span={6}>
          <div className="stat-card">
            <div className="stat-number" style={{ color: '#1890ff' }}>{stats.total}</div>
            <div className="stat-label">总任务数</div>
          </div>
        </Col>
        <Col span={6}>
          <div className="stat-card">
            <div className="stat-number" style={{ color: '#52c41a' }}>{stats.completed}</div>
            <div className="stat-label">已完成</div>
          </div>
        </Col>
        <Col span={6}>
          <div className="stat-card">
            <div className="stat-number" style={{ color: '#fa8c16' }}>{stats.pending}</div>
            <div className="stat-label">进行中</div>
          </div>
        </Col>
        <Col span={6}>
          <div className="stat-card">
            <div className="stat-number" style={{ color: '#ff4d4f' }}>{stats.overdue}</div>
            <div className="stat-label">已逾期</div>
          </div>
        </Col>
      </Row>

      {/* 进度条 */}
      {stats.total > 0 && (
        <Card size="small">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Progress
                percent={Math.round((stats.completed / stats.total) * 100)}
                status={stats.completed === stats.total ? 'success' : 'active'}
                strokeColor={{
                  from: '#108ee9',
                  to: '#87d068',
                }}
              />
            </div>
            <div className="text-sm text-gray-500">
              {stats.completed}/{stats.total} 完成
            </div>
          </div>
        </Card>
      )}

      {/* 工具栏 */}
      <Card>
        <div className="space-y-6">
          <Row gutter={[16, 16]} align="middle">
            <Col flex="auto">
              <Input.Search
                placeholder="快速添加任务，按回车键添加..."
                onSearch={quickAdd}
                size="large"
                allowClear
                style={{ borderRadius: '12px' }}
              />
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsModalVisible(true)}
                size="large"
                style={{
                  borderRadius: '12px',
                  padding: '0 24px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                新建任务
              </Button>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Input
                placeholder="搜索任务..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                style={{ height: '40px' }}
              />
            </Col>
            <Col span={5}>
              <Select
                placeholder="优先级"
                value={filterPriority}
                onChange={setFilterPriority}
                style={{ width: '100%', height: '40px' }}
              >
                <Option value="all">所有优先级</Option>
                <Option value="high">高优先级</Option>
                <Option value="medium">中优先级</Option>
                <Option value="low">低优先级</Option>
              </Select>
            </Col>
            <Col span={5}>
              <Select
                placeholder="状态"
                value={filterStatus}
                onChange={setFilterStatus}
                style={{ width: '100%', height: '40px' }}
              >
                <Option value="all">所有状态</Option>
                <Option value="pending">进行中</Option>
                <Option value="completed">已完成</Option>
                <Option value="overdue">已逾期</Option>
              </Select>
            </Col>
            <Col span={6}>
              <Space size="middle">
                <Tooltip title="同步数据">
                  <Button 
                    icon={<SyncOutlined />} 
                    onClick={loadTodos}
                    style={{ height: '40px', width: '40px' }}
                  />
                </Tooltip>
                <Tooltip title="导出数据">
                  <Button
                    icon={<ExportOutlined />}
                    style={{ height: '40px', width: '40px' }}
                    onClick={() => {
                      const dataStr = JSON.stringify(todos, null, 2);
                      const dataBlob = new Blob([dataStr], { type: 'application/json' });
                      const url = URL.createObjectURL(dataBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `todos-${dayjs().format('YYYY-MM-DD')}.json`;
                      link.click();
                      URL.revokeObjectURL(url);
                      message.success('数据导出成功');
                    }}
                  />
                </Tooltip>
              </Space>
            </Col>
          </Row>
        </div>
      </Card>

      {/* 任务列表 */}
      <Card 
        title={
          <div className="flex items-center justify-between">
            <span style={{ fontSize: '18px', fontWeight: 600 }}>
              任务列表 ({filteredTodos.length})
            </span>
          </div>
        }
        style={{ borderRadius: '16px' }}
      >
        {filteredTodos.length === 0 ? (
          <Empty
            description="暂无任务"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '60px 0' }}
          />
        ) : (
          <List
            dataSource={filteredTodos}
            renderItem={(todo) => (
              <List.Item
                key={todo.id}
                className={`transition-all duration-300 hover:bg-gray-50 rounded-lg p-4 ${
                  todo.completed ? 'opacity-60' : ''
                }`}
                style={{
                  border: '1px solid #f0f0f0',
                  borderRadius: '12px',
                  marginBottom: '12px',
                  background: todo.completed ? '#f9f9f9' : '#fff',
                }}
                actions={[
                  <Tooltip title="编辑" key="edit">
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => editTodo(todo)}
                      style={{
                        borderRadius: '8px',
                        color: '#1890ff',
                      }}
                    />
                  </Tooltip>,
                  <Popconfirm
                    title="确定删除这个任务吗？"
                    onConfirm={() => deleteTodo(todo.id)}
                    okText="确定"
                    cancelText="取消"
                    key="delete"
                  >
                    <Tooltip title="删除">
                      <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        danger
                        style={{
                          borderRadius: '8px',
                        }}
                      />
                    </Tooltip>
                  </Popconfirm>,
                ]}
              >
                <div className="flex items-start space-x-4 w-full">
                  <Checkbox
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id)}
                    style={{ marginTop: '4px' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4
                        className={`text-lg font-medium ${
                          todo.completed ? 'line-through text-gray-400' : 'text-gray-800'
                        }`}
                        style={{ margin: 0 }}
                      >
                        {todo.title}
                      </h4>
                      <Tag
                        color={priorityColors[todo.priority]}
                        icon={<FlagOutlined />}
                        style={{
                          borderRadius: '6px',
                          fontWeight: 500,
                          padding: '2px 8px',
                        }}
                      >
                        {priorityLabels[todo.priority]}
                      </Tag>
                    </div>
                    {todo.description && (
                      <p 
                        style={{ 
                          color: '#6b7280', 
                          fontSize: '14px', 
                          marginBottom: '12px',
                          lineHeight: '1.5',
                        }}
                      >
                        {todo.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-6 text-sm" style={{ color: '#9ca3af' }}>
                      {todo.dueDate && (
                        <span
                          className={`flex items-center space-x-1 ${
                            !todo.completed && dayjs(todo.dueDate).isBefore(dayjs(), 'day')
                              ? 'text-red-500 font-medium'
                              : 'text-gray-500'
                          }`}
                        >
                          <CalendarOutlined />
                          <span>{dayjs(todo.dueDate).format('MM-DD HH:mm')}</span>
                        </span>
                      )}
                      <span>创建于 {dayjs(todo.createdAt).format('MM-DD HH:mm')}</span>
                    </div>
                    {todo.tags.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        {todo.tags.map((tag, index) => (
                          <Tag 
                            key={index} 
                            style={{
                              borderRadius: '6px',
                              marginBottom: '4px',
                              background: '#f0f9ff',
                              color: '#0369a1',
                              border: '1px solid #bae6fd',
                            }}
                          >
                            {tag}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* 新建/编辑任务模态框 */}
      <Modal
        title={editingTodo ? '编辑任务' : '新建任务'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingTodo(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            priority: 'medium',
          }}
        >
          <Form.Item
            name="title"
            label="任务标题"
            rules={[{ required: true, message: '请输入任务标题' }]}
          >
            <Input placeholder="输入任务标题..." size="large" />
          </Form.Item>

          <Form.Item name="description" label="任务描述">
            <TextArea
              placeholder="输入任务描述..."
              rows={3}
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="priority" label="优先级">
                <Select size="large">
                  <Option value="low">低优先级</Option>
                  <Option value="medium">中优先级</Option>
                  <Option value="high">高优先级</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dueDate" label="截止时间">
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm"
                  placeholder="选择截止时间"
                  style={{ width: '100%' }}
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="tags" label="标签">
            <Select
              mode="tags"
              placeholder="输入标签并按回车添加"
              style={{ width: '100%' }}
              size="large"
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => setIsModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingTodo ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Card,
  Input,
  Button,
  Modal,
  Form,
  Select,
  Row,
  Col,
  Space,
  Typography,
  Tag,
  Empty,
  message,
  Popconfirm,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PushpinOutlined,
  PushpinFilled,
  FileTextOutlined,
  SearchOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

interface Note {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  category: string;
  color: string;
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateNoteRequest {
  title: string;
  content: string;
  tags?: string[];
  category: string;
  color: string;
}

interface UpdateNoteRequest {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  category: string;
  color: string;
  is_pinned: boolean;
  is_archived: boolean;
}

const noteColors = [
  { label: '黄色', value: '#fef3c7', bg: 'bg-yellow-100', border: 'border-yellow-200' },
  { label: '绿色', value: '#d1fae5', bg: 'bg-green-100', border: 'border-green-200' },
  { label: '蓝色', value: '#dbeafe', bg: 'bg-blue-100', border: 'border-blue-200' },
  { label: '紫色', value: '#e9d5ff', bg: 'bg-purple-100', border: 'border-purple-200' },
  { label: '粉色', value: '#fce7f3', bg: 'bg-pink-100', border: 'border-pink-200' },
  { label: '橙色', value: '#fed7aa', bg: 'bg-orange-100', border: 'border-orange-200' },
];

interface QuickNotesProps {
  darkMode?: boolean;
}

export const QuickNotes: React.FC<QuickNotesProps> = ({ darkMode = false }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();

  // 从后端加载便笺
  const loadNotes = async () => {
    setLoading(true);
    try {
      const fetchedNotes: Note[] = await invoke('get_all_notes');
      const processedNotes = fetchedNotes.map(note => ({
        ...note,
        tags: typeof note.tags === 'string' ? JSON.parse(note.tags || '[]') : (note.tags || []),
      }));
      setNotes(processedNotes);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      message.error('加载便笺失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  // 过滤和搜索
  useEffect(() => {
    let filtered = notes;

    if (searchText) {
      filtered = filtered.filter(
        (note) =>
          note.title.toLowerCase().includes(searchText.toLowerCase()) ||
          note.content.toLowerCase().includes(searchText.toLowerCase()) ||
          (note.tags || []).some((tag) =>
            tag.toLowerCase().includes(searchText.toLowerCase())
          )
      );
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter((note) => note.category === filterCategory);
    }

    // 置顶的便笺排在前面
    filtered.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    setFilteredNotes(filtered);
  }, [notes, searchText, filterCategory]);

  // 提交表单
  const handleSubmit = async (values: any) => {
    try {
      const requestData: CreateNoteRequest = {
        title: values.title,
        content: values.content,
        tags: values.tags?.split(',').map((tag: string) => tag.trim()).filter(Boolean),
        category: values.category || 'general',
        color: values.color || '#fef3c7',
      };

      if (editingNote) {
        const updateRequest: UpdateNoteRequest = {
          ...requestData,
          id: editingNote.id,
          is_pinned: editingNote.is_pinned,
          is_archived: editingNote.is_archived,
        };
        await invoke('update_note', { request: updateRequest });
        message.success('便笺已更新');
      } else {
        await invoke('create_note', { request: requestData });
        message.success('便笺已创建');
      }

      loadNotes();
      setIsModalVisible(false);
      setEditingNote(null);
      form.resetFields();
    } catch (error) {
      console.error('Failed to save note:', error);
      message.error('保存便笺失败');
    }
  };

  // 删除便笺
  const handleDelete = async (id: string) => {
    try {
      await invoke('delete_note', { id });
      message.success('便笺已删除');
      loadNotes();
    } catch (error) {
      console.error('Failed to delete note:', error);
      message.error('删除便笺失败');
    }
  };

  // 切换置顶状态
  const handleTogglePin = async (id: string) => {
    try {
      await invoke('toggle_note_pin', { id });
      loadNotes();
    } catch (error) {
      console.error('Failed to toggle note pin:', error);
      message.error('更新便笺状态失败');
    }
  };

  // 编辑便笺
  const handleEdit = (note: Note) => {
    setEditingNote(note);
    form.setFieldsValue({
      title: note.title,
      content: note.content,
      tags: (note.tags || []).join(', '),
      category: note.category,
      color: note.color,
    });
    setIsModalVisible(true);
  };

  // 新建便笺
  const handleNew = () => {
    setEditingNote(null);
    form.resetFields();
    form.setFieldsValue({
      category: 'general',
      color: '#fef3c7',
    });
    setIsModalVisible(true);
  };

  // 获取颜色配置
  const getColorConfig = (color: string) => {
    return noteColors.find(c => c.value === color) || noteColors[0];
  };

  return (
    <div className="space-y-6">
      {/* 标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className={`mb-2 ${darkMode ? 'text-white' : ''}`}>
            便笺速记
          </Title>
          <Text className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            记录您的想法和重要信息
          </Text>
        </div>
        
        <Space>
          <Button icon={<SyncOutlined />} onClick={loadNotes} loading={loading}>
            刷新
          </Button>
          <Button 
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={handleNew}
          >
            新建便笺
          </Button>
        </Space>
      </div>

      {/* 搜索和过滤 */}
      <Card className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
        <Row gutter={16} align="middle">
          <Col span={12}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="搜索便笺..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="large"
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="分类"
              value={filterCategory}
              onChange={setFilterCategory}
              className="w-full"
              size="large"
            >
              <Option value="all">所有分类</Option>
              <Option value="general">一般</Option>
              <Option value="work">工作</Option>
              <Option value="personal">个人</Option>
              <Option value="ideas">想法</Option>
              <Option value="recipes">食谱</Option>
              <Option value="quotes">摘录</Option>
            </Select>
          </Col>
          <Col span={6}>
            <div className="text-right">
              <Text className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                共 {filteredNotes.length} 条便笺
              </Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 便笺网格 */}
      {filteredNotes.length === 0 ? (
        <Card className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
          <Empty
            description={loading ? "加载中..." : "暂无便笺"}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredNotes.map((note) => {
            const colorConfig = getColorConfig(note.color);
            return (
              <Card
                key={note.id}
                className={`relative transition-all duration-200 hover:shadow-lg cursor-pointer ${
                  darkMode ? 'bg-gray-800 border-gray-700' : ''
                }`}
                style={{
                  backgroundColor: darkMode ? undefined : note.color,
                  borderColor: darkMode ? undefined : colorConfig.value,
                }}
                bodyStyle={{ padding: '16px' }}
                onClick={() => handleEdit(note)}
              >
                {/* 置顶图标 */}
                {note.is_pinned && (
                  <div className="absolute top-2 right-2">
                    <PushpinFilled className="text-red-500" />
                  </div>
                )}

                {/* 便笺内容 */}
                <div className="space-y-3">
                  <div>
                    <Title 
                      level={5} 
                      className={`mb-2 ${darkMode ? 'text-white' : 'text-gray-800'} line-clamp-2`}
                    >
                      {note.title}
                    </Title>
                    <Text 
                      className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} line-clamp-4`}
                    >
                      {note.content}
                    </Text>
                  </div>

                  {/* 标签 */}
                  {(note.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(note.tags || []).slice(0, 3).map((tag, index) => (
                        <Tag key={index} color="processing">
                          {tag}
                        </Tag>
                      ))}
                      {(note.tags || []).length > 3 && (
                        <Tag color="default">
                          +{(note.tags || []).length - 3}
                        </Tag>
                      )}
                    </div>
                  )}

                  {/* 底部信息 */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      <Text className="text-xs text-gray-500">
                        {dayjs(note.updated_at).format('MM-DD')}
                      </Text>
                      {note.category !== 'general' && (
                        <Tag color="default">
                          {note.category}
                        </Tag>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title={note.is_pinned ? "取消置顶" : "置顶"}>
                        <Button
                          size="small"
                          type="text"
                          icon={note.is_pinned ? <PushpinFilled /> : <PushpinOutlined />}
                          onClick={() => handleTogglePin(note.id)}
                          className={note.is_pinned ? 'text-red-500' : ''}
                        />
                      </Tooltip>
                      <Tooltip title="编辑">
                        <Button
                          size="small"
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => handleEdit(note)}
                        />
                      </Tooltip>
                      <Popconfirm
                        title="确定要删除这个便笺吗？"
                        onConfirm={() => handleDelete(note.id)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Tooltip title="删除">
                          <Button
                            size="small"
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                          />
                        </Tooltip>
                      </Popconfirm>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 新建/编辑弹窗 */}
      <Modal
        title={
          <div className="flex items-center space-x-2">
            <FileTextOutlined />
            <span>{editingNote ? '编辑便笺' : '新建便笺'}</span>
          </div>
        }
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingNote(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            category: 'general',
            color: '#fef3c7',
          }}
        >
          <Form.Item
            name="title"
            label="便笺标题"
            rules={[{ required: true, message: '请输入便笺标题' }]}
          >
            <Input placeholder="输入便笺标题" size="large" />
          </Form.Item>

          <Form.Item
            name="content"
            label="便笺内容"
            rules={[{ required: true, message: '请输入便笺内容' }]}
          >
            <TextArea rows={6} placeholder="输入便笺内容" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="category" label="分类">
                <Select size="large">
                  <Option value="general">一般</Option>
                  <Option value="work">工作</Option>
                  <Option value="personal">个人</Option>
                  <Option value="ideas">想法</Option>
                  <Option value="recipes">食谱</Option>
                  <Option value="quotes">摘录</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="color" label="颜色">
                <Select size="large">
                  {noteColors.map((color) => (
                    <Option key={color.value} value={color.value}>
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: color.value }}
                        />
                        <span>{color.label}</span>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="tags" label="标签">
                <Input placeholder="输入标签，用逗号分隔" size="large" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

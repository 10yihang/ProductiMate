import React, { useState, useMemo, useCallback } from 'react';
import {
  Card,
  Input,
  Button,
  Tabs,
  Space,
  Typography,
  message,
  Row,
  Col,
  Select,
  Switch,
  Badge,
  Tooltip,
} from 'antd';
import {
  SearchOutlined,
  CopyOutlined,
  DownloadOutlined,
  UploadOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { isEqual } from 'lodash';
import { JsonViewer } from './JsonViewer';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

interface JsonToolsProps {
  darkMode?: boolean;
}

interface JsonDiffResult {
  path: string;
  type: 'added' | 'removed' | 'changed' | 'unchanged';
  leftValue?: any;
  rightValue?: any;
}

export const JsonTools: React.FC<JsonToolsProps> = ({ darkMode = false }) => {
  // 单个 JSON 处理状态
  const [jsonInput, setJsonInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [indentSize, setIndentSize] = useState(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  
  // JSON Diff 状态
  const [leftJson, setLeftJson] = useState('');
  const [rightJson, setRightJson] = useState('');
  const [showOnlyDiffs, setShowOnlyDiffs] = useState(false);

  // 递归排序对象键
  const sortObjectKeys = useCallback((obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sortObjectKeys);
    }

    const sortedKeys = Object.keys(obj).sort();
    const sortedObj: any = {};
    
    for (const key of sortedKeys) {
      sortedObj[key] = sortObjectKeys(obj[key]);
    }

    return sortedObj;
  }, []);

  // 实时格式化的 JSON
  const formattedJson = useMemo(() => {
    if (!jsonInput.trim()) return '';

    try {
      const parsed = JSON.parse(jsonInput);
      
      if (compactMode) {
        return JSON.stringify(parsed);
      } else {
        if (sortKeys) {
          const sortedParsed = sortObjectKeys(parsed);
          return JSON.stringify(sortedParsed, null, indentSize);
        } else {
          return JSON.stringify(parsed, null, indentSize);
        }
      }
    } catch (error) {
      return ''; // 格式错误时返回空字符串
    }
  }, [jsonInput, indentSize, sortKeys, compactMode, sortObjectKeys]);

  // JSON 有效性检查
  const isValidJson = useMemo(() => {
    if (!jsonInput.trim()) return true;

    try {
      JSON.parse(jsonInput);
      return true;
    } catch (error) {
      return false;
    }
  }, [jsonInput]);

  // 智能 JSON 差异生成（忽略对象键值顺序）
  const generateSmartJsonDiff = useCallback((left: any, right: any, path: string = ''): JsonDiffResult[] => {
    const results: JsonDiffResult[] = [];

    // 如果是原始值，直接比较
    if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) {
      if (!isEqual(left, right)) {
        results.push({
          path: path || 'root',
          type: 'changed',
          leftValue: left,
          rightValue: right,
        });
      } else {
        results.push({
          path: path || 'root',
          type: 'unchanged',
          leftValue: left,
          rightValue: right,
        });
      }
      return results;
    }

    // 如果类型不同
    if (Array.isArray(left) !== Array.isArray(right)) {
      results.push({
        path: path || 'root',
        type: 'changed',
        leftValue: left,
        rightValue: right,
      });
      return results;
    }

    // 数组比较（保持顺序敏感）
    if (Array.isArray(left) && Array.isArray(right)) {
      const maxLength = Math.max(left.length, right.length);
      
      for (let i = 0; i < maxLength; i++) {
        const currentPath = `${path}[${i}]`;
        
        if (i >= left.length) {
          results.push({
            path: currentPath,
            type: 'added',
            rightValue: right[i],
          });
        } else if (i >= right.length) {
          results.push({
            path: currentPath,
            type: 'removed',
            leftValue: left[i],
          });
        } else {
          results.push(...generateSmartJsonDiff(left[i], right[i], currentPath));
        }
      }
      return results;
    }

    // 对象比较（忽略键值顺序，使用深度比较）
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    const allKeys = [...new Set([...leftKeys, ...rightKeys])];

    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      const leftHasKey = leftKeys.includes(key);
      const rightHasKey = rightKeys.includes(key);

      if (leftHasKey && rightHasKey) {
        results.push(...generateSmartJsonDiff(left[key], right[key], currentPath));
      } else if (leftHasKey && !rightHasKey) {
        results.push({
          path: currentPath,
          type: 'removed',
          leftValue: left[key],
        });
      } else if (!leftHasKey && rightHasKey) {
        results.push({
          path: currentPath,
          type: 'added',
          rightValue: right[key],
        });
      }
    }

    return results;
  }, []);

  // 实时 JSON Diff 比较
  const diffResult = useMemo(() => {
    if (!leftJson.trim() || !rightJson.trim()) {
      return [];
    }

    try {
      const leftParsed = JSON.parse(leftJson);
      const rightParsed = JSON.parse(rightJson);
      
      return generateSmartJsonDiff(leftParsed, rightParsed);
    } catch (error) {
      return [];
    }
  }, [leftJson, rightJson, generateSmartJsonDiff]);

  // 过滤后的差异结果
  const filteredDiffResult = useMemo(() => {
    if (!showOnlyDiffs) return diffResult;
    return diffResult.filter((diff: JsonDiffResult) => diff.type !== 'unchanged');
  }, [diffResult, showOnlyDiffs]);

  // 复制到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('已复制到剪贴板');
    } catch (error) {
      message.error('复制失败');
    }
  };

  // 复制格式化后的 JSON
  const copyFormattedJson = () => {
    if (formattedJson) {
      copyToClipboard(formattedJson);
    } else {
      message.warning('没有可复制的格式化内容');
    }
  };

  // 文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonInput(content);
    };
    reader.readAsText(file);
  };

  // 下载 JSON 文件
  const downloadJson = (content: string, filename: string = 'formatted.json') => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // JSON 搜索高亮
  const highlightSearchTerm = (text: string, term: string) => {
    if (!term) return text;
    
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark style="background-color: #fff2b8;">$1</mark>');
  };

  // 获取差异类型的颜色
  const getDiffColor = (type: string) => {
    switch (type) {
      case 'added': return '#52c41a';
      case 'removed': return '#ff4d4f';
      case 'changed': return '#fa8c16';
      default: return '#d9d9d9';
    }
  };

  // 获取差异类型的标签
  const getDiffLabel = (type: string) => {
    switch (type) {
      case 'added': return '新增';
      case 'removed': return '删除';
      case 'changed': return '修改';
      default: return '未变';
    }
  };

  // 创建 tabs 项目
  const tabItems = [
    {
      key: 'parser',
      label: 'JSON 解析',
      children: <JsonViewer darkMode={darkMode} />,
    },
    {
      key: 'formatter',
      label: 'JSON 格式化',
      children: (
        <div className="space-y-4">
          {/* JSON 输入 */}
          <Row gutter={16}>
            <Col span={12}>
              <Card 
                title="JSON 输入"
                className={darkMode ? 'bg-gray-800 border-gray-700' : ''}
                extra={
                  <Space>
                    <input
                      type="file"
                      accept=".json,.txt"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      id="json-upload"
                    />
                    <Tooltip title="上传 JSON 文件">
                      <Button
                        icon={<UploadOutlined />}
                        size="small"
                        onClick={() => document.getElementById('json-upload')?.click()}
                      >
                        上传
                      </Button>
                    </Tooltip>
                  </Space>
                }
              >
                <TextArea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder="请输入 JSON 数据..."
                  className={`font-mono text-sm ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''
                  } ${!isValidJson && jsonInput ? 'border-red-500' : ''}`}
                  rows={15}
                />
                {!isValidJson && jsonInput && (
                  <Text type="danger" className="text-sm mt-2 block">
                    JSON 格式错误，请检查语法
                  </Text>
                )}
              </Card>
            </Col>

            <Col span={12}>
              <Card 
                title="格式化结果"
                className={darkMode ? 'bg-gray-800 border-gray-700' : ''}
                extra={
                  <Space>
                    <Tooltip title="复制格式化结果">
                      <Button
                        icon={<CopyOutlined />}
                        size="small"
                        onClick={copyFormattedJson}
                        disabled={!formattedJson}
                      >
                        复制
                      </Button>
                    </Tooltip>
                    <Tooltip title="下载 JSON 文件">
                      <Button
                        icon={<DownloadOutlined />}
                        size="small"
                        onClick={() => downloadJson(formattedJson)}
                        disabled={!formattedJson}
                      >
                        下载
                      </Button>
                    </Tooltip>
                  </Space>
                }
              >
                <TextArea
                  value={formattedJson}
                  readOnly
                  className={`font-mono text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  rows={15}
                />
              </Card>
            </Col>
          </Row>

          {/* 工具栏 */}
          <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
            <Row gutter={16} align="middle">
              <Col span={6}>
                <Space>
                  <Button 
                    type="primary" 
                    icon={<CopyOutlined />}
                    onClick={copyFormattedJson}
                    disabled={!formattedJson}
                  >
                    复制格式化结果
                  </Button>
                  <Button 
                    icon={<ClearOutlined />}
                    onClick={() => setJsonInput('')}
                  >
                    清空
                  </Button>
                </Space>
              </Col>
              
              <Col span={4}>
                <div className="flex items-center space-x-2">
                  <Text className={darkMode ? 'text-gray-300' : ''}>缩进:</Text>
                  <Select
                    value={indentSize}
                    onChange={setIndentSize}
                    size="small"
                    style={{ width: 60 }}
                  >
                    <Option value={2}>2</Option>
                    <Option value={4}>4</Option>
                    <Option value={8}>8</Option>
                  </Select>
                </div>
              </Col>

              <Col span={4}>
                <div className="flex items-center space-x-2">
                  <Text className={darkMode ? 'text-gray-300' : ''}>排序键:</Text>
                  <Switch
                    checked={sortKeys}
                    onChange={setSortKeys}
                    size="small"
                  />
                </div>
              </Col>

              <Col span={4}>
                <div className="flex items-center space-x-2">
                  <Text className={darkMode ? 'text-gray-300' : ''}>压缩:</Text>
                  <Switch
                    checked={compactMode}
                    onChange={setCompactMode}
                    size="small"
                  />
                </div>
              </Col>

              <Col span={6}>
                <Input
                  placeholder="搜索内容..."
                  prefix={<SearchOutlined />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="small"
                  className={darkMode ? 'bg-gray-700 border-gray-600' : ''}
                />
              </Col>
            </Row>
          </Card>
        </div>
      ),
    },
    {
      key: 'diff',
      label: (
        <Badge 
          count={diffResult.filter((d: JsonDiffResult) => d.type !== 'unchanged').length}
          size="small"
          offset={[10, 0]}
        >
          JSON 对比
        </Badge>
      ),
      children: (
        <div className="space-y-4">
          {/* JSON 对比输入 */}
          <Row gutter={16}>
            <Col span={12}>
              <Card 
                title="左侧 JSON"
                className={darkMode ? 'bg-gray-800 border-gray-700' : ''}
              >
                <TextArea
                  value={leftJson}
                  onChange={(e) => setLeftJson(e.target.value)}
                  placeholder="请输入左侧 JSON 数据..."
                  className={`font-mono text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  rows={15}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card 
                title="右侧 JSON"
                className={darkMode ? 'bg-gray-800 border-gray-700' : ''}
              >
                <TextArea
                  value={rightJson}
                  onChange={(e) => setRightJson(e.target.value)}
                  placeholder="请输入右侧 JSON 数据..."
                  className={`font-mono text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  rows={15}
                />
              </Card>
            </Col>
          </Row>

          {/* 比较工具栏 */}
          <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
            <Row gutter={16} align="middle">
              <Col span={8}>
                <Space>
                  <Button 
                    icon={<ClearOutlined />}
                    onClick={() => {
                      setLeftJson('');
                      setRightJson('');
                    }}
                  >
                    清空
                  </Button>
                  <Text className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                    实时比较中...
                  </Text>
                </Space>
              </Col>
              
              <Col span={8}>
                <div className="flex items-center space-x-2">
                  <Text className={darkMode ? 'text-gray-300' : ''}>仅显示差异:</Text>
                  <Switch
                    checked={showOnlyDiffs}
                    onChange={setShowOnlyDiffs}
                    size="small"
                  />
                </div>
              </Col>

              <Col span={8}>
                <Space>
                  <Badge count={diffResult.filter((d: JsonDiffResult) => d.type === 'added').length} color="#52c41a">
                    <Button size="small">新增</Button>
                  </Badge>
                  <Badge count={diffResult.filter((d: JsonDiffResult) => d.type === 'removed').length} color="#ff4d4f">
                    <Button size="small">删除</Button>
                  </Badge>
                  <Badge count={diffResult.filter((d: JsonDiffResult) => d.type === 'changed').length} color="#fa8c16">
                    <Button size="small">修改</Button>
                  </Badge>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* 差异结果 */}
          {diffResult.length > 0 && (
            <Card 
              title={`对比结果 (${filteredDiffResult.length} 项)`}
              className={darkMode ? 'bg-gray-800 border-gray-700' : ''}
            >
              <div className={`max-h-96 overflow-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} rounded p-4`}>
                {filteredDiffResult.map((diff: JsonDiffResult, index: number) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between py-2 px-3 mb-2 rounded ${
                      darkMode ? 'bg-gray-800' : 'bg-white'
                    } border-l-4`}
                    style={{ borderLeftColor: getDiffColor(diff.type) }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Text 
                          className={`font-mono text-sm ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}
                        >
                          {diff.path}
                        </Text>
                        <Badge 
                          color={getDiffColor(diff.type)}
                          text={getDiffLabel(diff.type)}
                        />
                      </div>
                      
                      {diff.type === 'changed' && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center space-x-2">
                            <Text className="text-red-500 text-xs">- </Text>
                            <Text className={`font-mono text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {JSON.stringify(diff.leftValue)}
                            </Text>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Text className="text-green-500 text-xs">+ </Text>
                            <Text className={`font-mono text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {JSON.stringify(diff.rightValue)}
                            </Text>
                          </div>
                        </div>
                      )}
                      
                      {diff.type === 'added' && (
                        <div className="mt-2">
                          <div className="flex items-center space-x-2">
                            <Text className="text-green-500 text-xs">+ </Text>
                            <Text className={`font-mono text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {JSON.stringify(diff.rightValue)}
                            </Text>
                          </div>
                        </div>
                      )}
                      
                      {diff.type === 'removed' && (
                        <div className="mt-2">
                          <div className="flex items-center space-x-2">
                            <Text className="text-red-500 text-xs">- </Text>
                            <Text className={`font-mono text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {JSON.stringify(diff.leftValue)}
                            </Text>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard(diff.path)}
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {diffResult.length === 0 && leftJson && rightJson && (
            <Card className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
              <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {leftJson && rightJson ? '两个 JSON 完全相同！' : '请输入两个 JSON 进行比较'}
              </div>
            </Card>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="json-tools">
      <Title level={2} className={`mb-6 ${darkMode ? 'text-white' : ''}`}>
        JSON 工具箱
      </Title>
      
      <Tabs
        items={tabItems}
        className={darkMode ? 'dark-tabs' : ''}
        size="large"
      />
    </div>
  );
};

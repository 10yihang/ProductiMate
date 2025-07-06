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
  }, [jsonInput, indentSize, sortKeys, compactMode]);

  // JSON 有效性检查
  const jsonValidation = useMemo(() => {
    if (!jsonInput.trim()) {
      return { isValid: true, error: null };
    }

    try {
      JSON.parse(jsonInput);
      return { isValid: true, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      return { isValid: false, error: errorMessage };
    }
  }, [jsonInput]);

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
  }, [leftJson, rightJson]);

  // JSON 验证和格式化
  const validateAndFormatJson = (input: string) => {
    if (!input.trim()) {
      setFormattedJson('');
      return { isValid: true, error: null };
    }

    try {
      const parsed = JSON.parse(input);
      let formatted: string;

      if (compactMode) {
        formatted = JSON.stringify(parsed);
      } else {
        if (sortKeys) {
          const sortedParsed = sortObjectKeys(parsed);
          formatted = JSON.stringify(sortedParsed, null, indentSize);
        } else {
          formatted = JSON.stringify(parsed, null, indentSize);
        }
      }

      setFormattedJson(formatted);
      return { isValid: true, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      return { isValid: false, error: errorMessage };
    }
  };

  // 递归排序对象键
  const sortObjectKeys = (obj: any): any => {
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
  };

  // 处理 JSON 输入变化（实时验证）
  const handleJsonChange = (value: string) => {
    setJsonInput(value);
  };

  // 复制格式化后的 JSON
  const copyFormattedJson = () => {
    if (formattedJson) {
      copyToClipboard(formattedJson);
    } else {
      message.warning('没有可复制的格式化内容');
    }
  };

  // 清空内容
  const clearContent = () => {
    setJsonInput('');
  };

  // 复制到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('已复制到剪贴板');
    } catch (error) {
      message.error('复制失败');
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
      handleJsonChange(content);
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

  // 生成 JSON 差异（兼容旧版本）
  const generateJsonDiff = generateSmartJsonDiff;

  // 过滤后的差异结果
  const filteredDiffResult = useMemo(() => {
    if (!showOnlyDiffs) return diffResult;
    return diffResult.filter(diff => diff.type !== 'unchanged');
  }, [diffResult, showOnlyDiffs]);

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
        <>
          <Row gutter={24}>
            {/* 输入区域 */}
            <Col span={12}>
              <Card 
                title="JSON 输入"
                className={darkMode ? 'bg-gray-800 border-gray-700' : ''}
                extra={
                  <Space>
                    <Tooltip title="上传文件">
                      <Button 
                        icon={<UploadOutlined />} 
                        onClick={() => document.getElementById('json-file-upload')?.click()}
                      />
                    </Tooltip>
                    <input
                      id="json-file-upload"
                      type="file"
                      accept=".json"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                    <Tooltip title="清空">
                      <Button 
                        icon={<ClearOutlined />}
                        onClick={() => {
                          setJsonInput('');
                          setFormattedJson('');
                        }}
                      />
                    </Tooltip>
                  </Space>
                }
              >
                <TextArea
                  value={jsonInput}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  placeholder="请输入 JSON 数据..."
                  className={`font-mono text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  rows={20}
                />
              </Card>
            </Col>

            {/* 输出区域 */}
            <Col span={12}>
              <Card 
                title="格式化结果"
                className={darkMode ? 'bg-gray-800 border-gray-700' : ''}
                extra={
                  <Space>
                    <Tooltip title="复制">
                      <Button 
                        icon={<CopyOutlined />}
                        onClick={() => copyToClipboard(formattedJson)}
                        disabled={!formattedJson}
                      />
                    </Tooltip>
                    <Tooltip title="下载">
                      <Button 
                        icon={<DownloadOutlined />}
                        onClick={() => downloadJson(formattedJson)}
                        disabled={!formattedJson}
                      />
                    </Tooltip>
                  </Space>
                }
              >
                <div
                  className={`font-mono text-sm p-3 border rounded h-96 overflow-auto ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50'
                  }`}
                  dangerouslySetInnerHTML={{
                    __html: highlightSearchTerm(formattedJson, searchTerm)
                  }}
                />
              </Card>
            </Col>
          </Row>

          {/* 工具栏 */}
          <Card className={`mt-4 ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
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
                    onClick={clearContent}
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
                  <Text className={darkMode ? 'text-gray-300' : ''}>压缩模式:</Text>
                  <Switch
                    checked={compactMode}
                    onChange={setCompactMode}
                    size="small"
                  />
                </div>
              </Col>

              <Col span={6}>
                <Input
                  placeholder="搜索字段..."
                  prefix={<SearchOutlined />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="small"
                  className={darkMode ? 'bg-gray-700 border-gray-600' : ''}
                />
              </Col>
            </Row>
          </Card>
        </>
      ),
    },
    {
      key: 'diff',
      label: 'JSON 比较',
      children: (
        <>
          <Row gutter={24}>
            <Col span={12}>
              <Card 
                title="JSON A"
                className={darkMode ? 'bg-gray-800 border-gray-700' : ''}
              >
                <TextArea
                  value={leftJson}
                  onChange={(e) => setLeftJson(e.target.value)}
                  placeholder="请输入第一个 JSON..."
                  className={`font-mono text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  rows={15}
                />
              </Card>
            </Col>

            <Col span={12}>
              <Card 
                title="JSON B"
                className={darkMode ? 'bg-gray-800 border-gray-700' : ''}
              >
                <TextArea
                  value={rightJson}
                  onChange={(e) => setRightJson(e.target.value)}
                  placeholder="请输入第二个 JSON..."
                  className={`font-mono text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  rows={15}
                />
              </Card>
            </Col>
          </Row>

          {/* 比较工具栏 */}
          <Card className={`mt-4 ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
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
                {diffResult.length > 0 && (
                  <Space>
                    <Badge count={diffResult.filter(d => d.type === 'added').length} color="#52c41a">
                      <Text className={darkMode ? 'text-gray-300' : ''}>新增</Text>
                    </Badge>
                    <Badge count={diffResult.filter(d => d.type === 'removed').length} color="#ff4d4f">
                      <Text className={darkMode ? 'text-gray-300' : ''}>删除</Text>
                    </Badge>
                    <Badge count={diffResult.filter(d => d.type === 'changed').length} color="#fa8c16">
                      <Text className={darkMode ? 'text-gray-300' : ''}>修改</Text>
                    </Badge>
                  </Space>
                )}
              </Col>
            </Row>
          </Card>

          {/* 差异结果 */}
          {filteredDiffResult.length > 0 && (
            <Card 
              title="差异结果"
              className={`mt-4 ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}
            >
              <div className="space-y-2 max-h-96 overflow-auto">
                {filteredDiffResult.map((diff, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded border-l-4 ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-50'
                    }`}
                    style={{ borderLeftColor: getDiffColor(diff.type) }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Text 
                        strong 
                        className={`font-mono ${darkMode ? 'text-white' : ''}`}
                      >
                        {diff.path}
                      </Text>
                      <Badge 
                        color={getDiffColor(diff.type)} 
                        text={getDiffLabel(diff.type)}
                      />
                    </div>
                    
                    {diff.type === 'changed' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Text type="danger" className="text-xs">原值:</Text>
                          <div className={`font-mono text-sm p-2 rounded ${
                            darkMode ? 'bg-gray-800' : 'bg-red-50'
                          }`}>
                            {JSON.stringify(diff.leftValue, null, 2)}
                          </div>
                        </div>
                        <div>
                          <Text type="success" className="text-xs">新值:</Text>
                          <div className={`font-mono text-sm p-2 rounded ${
                            darkMode ? 'bg-gray-800' : 'bg-green-50'
                          }`}>
                            {JSON.stringify(diff.rightValue, null, 2)}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {diff.type === 'added' && (
                      <div className={`font-mono text-sm p-2 rounded ${
                        darkMode ? 'bg-gray-800' : 'bg-green-50'
                      }`}>
                        <Text type="success" className="text-xs">新增:</Text>
                        <br />
                        {JSON.stringify(diff.rightValue, null, 2)}
                      </div>
                    )}
                    
                    {diff.type === 'removed' && (
                      <div className={`font-mono text-sm p-2 rounded ${
                        darkMode ? 'bg-gray-800' : 'bg-red-50'
                      }`}>
                        <Text type="danger" className="text-xs">删除:</Text>
                        <br />
                        {JSON.stringify(diff.leftValue, null, 2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Title level={2} className={darkMode ? 'text-white' : ''}>
        JSON 工具箱
      </Title>

      <Tabs defaultActiveKey="parser" items={tabItems} className={darkMode ? 'dark-tabs' : ''} />
    </div>
  );
};

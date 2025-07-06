import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, Input, Typography, Space, Button, message, Tooltip } from 'antd';
import {
  ExpandAltOutlined,
  CompressOutlined,
  SearchOutlined,
  CopyOutlined,
  FileTextOutlined,
  NumberOutlined,
  CheckCircleOutlined,
  MinusCircleOutlined,
  FolderOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;

interface JsonViewerProps {
  darkMode?: boolean;
}

interface JsonNode {
  key: string;
  value: any;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  path: string;
  level: number;
  isExpanded: boolean;
  hasChildren: boolean;
  isVisible: boolean;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ darkMode = false }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [parsedJson, setParsedJson] = useState<any>(null);

  // 解析 JSON 并构建节点树
  const parseJsonToNodes = useCallback((obj: any, parentPath: string = '', level: number = 0): JsonNode[] => {
    const nodes: JsonNode[] = [];

    if (obj === null) {
      nodes.push({
        key: 'null',
        value: null,
        type: 'null',
        path: parentPath,
        level,
        isExpanded: false,
        hasChildren: false,
        isVisible: true,
      });
      return nodes;
    }

    if (typeof obj !== 'object') {
      const type = typeof obj as 'string' | 'number' | 'boolean';
      nodes.push({
        key: String(obj),
        value: obj,
        type,
        path: parentPath,
        level,
        isExpanded: false,
        hasChildren: false,
        isVisible: true,
      });
      return nodes;
    }

    if (Array.isArray(obj)) {
      const arrayPath = parentPath;
      const isExpanded = expandedPaths.has(arrayPath);
      
      nodes.push({
        key: `Array(${obj.length})`,
        value: obj,
        type: 'array',
        path: arrayPath,
        level,
        isExpanded,
        hasChildren: obj.length > 0,
        isVisible: true,
      });

      if (isExpanded) {
        obj.forEach((item, index) => {
          const itemPath = `${arrayPath}[${index}]`;
          const childNodes = parseJsonToNodes(item, itemPath, level + 1);
          nodes.push(...childNodes);
        });
      }
    } else {
      const objectPath = parentPath;
      const keys = Object.keys(obj);

      nodes.push({
        key: `Object{${keys.length}}`,
        value: obj,
        type: 'object',
        path: objectPath,
        level,
        isExpanded: expandedPaths.has(objectPath),
        hasChildren: keys.length > 0,
        isVisible: true,
      });

      if (expandedPaths.has(objectPath)) {
        keys.forEach(key => {
          const childPath = parentPath ? `${parentPath}.${key}` : key;
          const childNodes = parseJsonToNodes(obj[key], childPath, level + 1);
          nodes.push(...childNodes);
        });
      }
    }

    return nodes;
  }, [expandedPaths]);

  // 处理 JSON 输入
  const handleJsonInput = useCallback((value: string) => {
    setJsonInput(value);
    
    if (!value.trim()) {
      setParsedJson(null);
      return;
    }

    try {
      const parsed = JSON.parse(value);
      setParsedJson(parsed);
      console.log('JSON 解析成功');
    } catch (error) {
      setParsedJson(null);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error(`JSON 格式错误: ${errorMessage}`);
    }
  }, []);

  // 切换节点展开状态
  const toggleExpanded = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }, []);

  // 展开所有节点
  const expandAll = useCallback(() => {
    if (!parsedJson) return;
    
    const getAllPaths = (obj: any, parentPath: string = ''): string[] => {
      const paths: string[] = [parentPath];
      
      if (obj && typeof obj === 'object') {
        if (Array.isArray(obj)) {
          obj.forEach((_, index) => {
            const itemPath = `${parentPath}[${index}]`;
            paths.push(...getAllPaths(obj[index], itemPath));
          });
        } else {
          Object.keys(obj).forEach(key => {
            const childPath = parentPath ? `${parentPath}.${key}` : key;
            paths.push(...getAllPaths(obj[key], childPath));
          });
        }
      }
      
      return paths;
    };

    const allPaths = getAllPaths(parsedJson);
    setExpandedPaths(new Set(allPaths));
  }, [parsedJson]);

  // 折叠所有节点
  const collapseAll = useCallback(() => {
    setExpandedPaths(new Set(['']));
  }, []);

  // 获取节点
  const nodes = useMemo(() => {
    if (!parsedJson) return [];
    return parseJsonToNodes(parsedJson);
  }, [parsedJson, expandedPaths]);

  // 过滤节点（搜索功能）
  const filteredNodes = useMemo(() => {
    if (!searchTerm) return nodes;
    
    return nodes.filter(node => {
      const matchesSearch = 
        node.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(node.value).toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [nodes, searchTerm]);

  // 获取值的显示字符串
  const getValueDisplay = useCallback((node: JsonNode) => {
    if (node.type === 'string') return `"${node.value}"`;
    if (node.type === 'null') return 'null';
    if (node.type === 'boolean') return node.value ? 'true' : 'false';
    if (node.type === 'number') return String(node.value);
    if (node.type === 'object') return node.isExpanded ? '{...}' : `{${Object.keys(node.value).length}}`;
    if (node.type === 'array') return node.isExpanded ? '[...]' : `[${node.value.length}]`;
    return String(node.value);
  }, []);

  // 获取类型图标
  const getTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'string': return <FileTextOutlined className="w-3 h-3" />;
      case 'number': return <NumberOutlined className="w-3 h-3" />;
      case 'boolean': return <CheckCircleOutlined className="w-3 h-3" />;
      case 'null': return <MinusCircleOutlined className="w-3 h-3" />;
      case 'object': return <FolderOutlined className="w-3 h-3" />;
      case 'array': return <UnorderedListOutlined className="w-3 h-3" />;
      default: return null;
    }
  }, []);

  // 获取类型颜色
  const getTypeColor = useCallback((type: string) => {
    switch (type) {
      case 'string': return darkMode ? '#10b981' : '#059669';    // 翠绿色
      case 'number': return darkMode ? '#f59e0b' : '#d97706';    // 琥珀色
      case 'boolean': return darkMode ? '#8b5cf6' : '#7c3aed';   // 紫色
      case 'null': return darkMode ? '#6b7280' : '#4b5563';      // 灰色
      case 'object': return darkMode ? '#3b82f6' : '#2563eb';    // 蓝色
      case 'array': return darkMode ? '#ec4899' : '#db2777';     // 粉色
      default: return darkMode ? '#e5e7eb' : '#374151';
    }
  }, [darkMode]);

  // 复制路径
  const copyPath = useCallback(async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      message.success('路径已复制到剪贴板');
    } catch (error) {
      message.error('复制失败');
    }
  }, []);

  // 复制值
  const copyValue = useCallback(async (value: any) => {
    try {
      const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      await navigator.clipboard.writeText(text);
      message.success('值已复制到剪贴板');
    } catch (error) {
      message.error('复制失败');
    }
  }, []);

  // 当 parsedJson 变化时，初始化展开状态
  useEffect(() => {
    if (parsedJson !== null) {
      // 默认展开根节点
      setExpandedPaths(new Set(['']));
    }
  }, [parsedJson]);

  return (
    <div className="space-y-4">
      {/* JSON 输入区域 */}
      <Card 
        title="JSON 输入"
        className={darkMode ? 'bg-gray-800 border-gray-700' : ''}
        extra={
          <Space>
            <Button 
              icon={<ExpandAltOutlined />}
              onClick={expandAll}
              size="small"
              disabled={!parsedJson}
            >
              全部展开
            </Button>
            <Button 
              icon={<CompressOutlined />}
              onClick={collapseAll}
              size="small"
              disabled={!parsedJson}
            >
              全部折叠
            </Button>
          </Space>
        }
      >
        <TextArea
          value={jsonInput}
          onChange={(e) => handleJsonInput(e.target.value)}
          placeholder="请输入 JSON 数据..."
          className={`font-mono text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
          rows={8}
        />
      </Card>

      {/* 搜索栏 */}
      {parsedJson && (
        <Card className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
          <Input
            placeholder="搜索字段名或值..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={darkMode ? 'bg-gray-700 border-gray-600' : ''}
          />
        </Card>
      )}

      {/* JSON 可视化区域 */}
      {parsedJson && (
        <Card 
          title={`JSON 结构 (${filteredNodes.length} 个节点)`}
          className={darkMode ? 'bg-gray-800 border-gray-700' : ''}
        >
          <div className={`max-h-96 overflow-auto font-mono text-sm ${
            darkMode ? 'bg-gray-900' : 'bg-gray-50'
          } rounded p-4`}>
            {filteredNodes.map((node, index) => (
              <div
                key={`${node.path}-${node.type}-${index}`}
                className={`group flex items-center py-2 px-2 rounded-md transition-colors duration-150 ${
                  darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100/80'
                }`}
                style={{ paddingLeft: `${node.level * 20 + 8}px` }}
              >
                {/* 展开/折叠按钮 */}
                <div className="w-6 mr-2 flex justify-center">
                  {node.hasChildren && (
                    <Button
                      type="text"
                      size="small"
                      onClick={() => toggleExpanded(node.path)}
                      className={`p-0 w-5 h-5 flex items-center justify-center border-0 text-xs transition-colors ${
                        darkMode 
                          ? 'text-gray-400 hover:text-blue-300 hover:bg-gray-700' 
                          : 'text-gray-500 hover:text-blue-600 hover:bg-gray-200'
                      }`}
                    >
                      {node.isExpanded ? '▼' : '▶'}
                    </Button>
                  )}
                </div>

                {/* 键名 */}
                <div className="flex-1 flex items-center gap-3">
                  {node.path && (
                    <>
                      <Text 
                        className={`font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}
                      >
                        {node.path.split('.').pop() || node.path}
                      </Text>
                      <Text className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>:</Text>
                    </>
                  )}
                  
                  {/* 值 */}
                  <Text 
                    style={{ color: getTypeColor(node.type) }}
                    className="font-medium flex-1"
                  >
                    {getValueDisplay(node)}
                  </Text>

                  {/* 类型标签 */}
                  <span 
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 backdrop-blur-sm ${
                      darkMode 
                        ? 'bg-opacity-25 text-opacity-95 shadow-lg' 
                        : 'bg-opacity-20 text-opacity-90 shadow-md'
                    }`}
                    style={{
                      backgroundColor: getTypeColor(node.type) + (darkMode ? '40' : '33'),
                      color: getTypeColor(node.type),
                      border: `1.5px solid ${getTypeColor(node.type)}${darkMode ? '60' : '50'}`,
                      boxShadow: `0 2px 8px ${getTypeColor(node.type)}${darkMode ? '25' : '20'}, inset 0 1px 0 rgba(255,255,255,${darkMode ? '0.1' : '0.2'})`,
                    }}
                  >
                    {getTypeIcon(node.type)}
                    <span className="leading-none font-bold tracking-wide">{node.type.toUpperCase()}</span>
                  </span>
                </div>

                {/* 操作按钮 */}
                <div className="flex space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Tooltip title="复制路径">
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyPath(node.path)}
                      className={`w-6 h-6 p-0 border-0 ${
                        darkMode 
                          ? 'text-gray-400 hover:text-blue-300 hover:bg-gray-600' 
                          : 'text-gray-500 hover:text-blue-600 hover:bg-gray-200'
                      }`}
                    />
                  </Tooltip>
                  <Tooltip title="复制值">
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyValue(node.value)}
                      className={`w-6 h-6 p-0 border-0 ${
                        darkMode 
                          ? 'text-gray-400 hover:text-green-300 hover:bg-gray-600' 
                          : 'text-gray-500 hover:text-green-600 hover:bg-gray-200'
                      }`}
                    />
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

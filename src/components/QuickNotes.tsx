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
  PushpinOutlin
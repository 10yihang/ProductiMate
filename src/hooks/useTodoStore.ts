import { useState, useEffect } from 'react';

export interface Todo {
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

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TodoStore {
  todos: Todo[];
  getTodos: () => Todo[];
  getPendingTodos: () => Todo[];
  getOverdueTodos: () => Todo[];
  getUrgentTodos: () => Todo[];
  loadTodos: () => void;
}

// 全局待办事项状态管理 Hook
export const useTodoStore = (): TodoStore => {
  const [todos, setTodos] = useState<Todo[]>([]);

  // 加载待办事项
  const loadTodos = () => {
    try {
      const savedTodos = localStorage.getItem('todos');
      if (savedTodos) {
        const parsedTodos = JSON.parse(savedTodos);
        setTodos(parsedTodos);
      }
    } catch (error) {
      console.error('加载待办事项失败:', error);
    }
  };

  // 初始化时加载数据
  useEffect(() => {
    loadTodos();
  }, []);

  // 获取所有待办事项
  const getTodos = () => todos;

  // 获取未完成的待办事项
  const getPendingTodos = () => {
    return todos.filter(todo => !todo.completed);
  };

  // 获取过期的待办事项
  const getOverdueTodos = () => {
    const now = new Date();
    return todos.filter(todo => {
      if (!todo.dueDate || todo.completed) return false;
      const dueDate = new Date(todo.dueDate);
      return dueDate < now;
    });
  };

  // 获取紧急待办事项（今天到期或过期的高优先级任务）
  const getUrgentTodos = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    return todos.filter(todo => {
      if (todo.completed) return false;
      
      // 高优先级任务
      if (todo.priority === 'high') return true;
      
      // 今天到期的任务
      if (todo.dueDate) {
        const dueDate = new Date(todo.dueDate);
        return dueDate >= today && dueDate < tomorrow;
      }
      
      return false;
    });
  };

  return {
    todos,
    getTodos,
    getPendingTodos,
    getOverdueTodos,
    getUrgentTodos,
    loadTodos,
  };
};

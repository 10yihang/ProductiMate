import { useState, useEffect, useRef, useCallback } from 'react';
import { notification, Modal } from 'antd';

export interface PomodoroSettings {
  workTime: number; // 工作时间（分钟）
  shortBreak: number; // 短休息时间（分钟）
  longBreak: number; // 长休息时间（分钟）
  cycles: number; // 循环次数
  autoStart: boolean; // 自动开始
  soundEnabled: boolean; // 声音提醒
  todoReminderEnabled: boolean; // 待办事项提醒
}

export interface PomodoroSession {
  date: string;
  workSessions: number;
  totalTime: number; // 总工作时间（分钟）
}

export type TimerState = 'work' | 'shortBreak' | 'longBreak';

export interface PomodoroStore {
  isRunning: boolean;
  timeLeft: number;
  currentCycle: number;
  currentState: TimerState;
  settings: PomodoroSettings;
  sessions: PomodoroSession[];
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  updateSettings: (newSettings: PomodoroSettings) => void;
  getTodayStats: () => { sessions: number; totalTime: number };
}

const defaultSettings: PomodoroSettings = {
  workTime: 25,
  shortBreak: 5,
  longBreak: 15,
  cycles: 4,
  autoStart: false,
  soundEnabled: true,
  todoReminderEnabled: true,
};

// 全局番茄钟状态管理 Hook
export const usePomodoroStore = (): PomodoroStore => {
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [currentState, setCurrentState] = useState<TimerState>('work');
  const [settings, setSettings] = useState<PomodoroSettings>(defaultSettings);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);

  const intervalRef = useRef<number | null>(null);

  // 加载持久化数据
  useEffect(() => {
    loadSettings();
    loadSessions();
    loadTimerState();
  }, []);

  // 计时器逻辑
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = window.setTimeout(() => {
        setTimeLeft(prev => {
          const newTimeLeft = prev - 1;
          // 保存当前计时器状态
          saveTimerState(newTimeLeft, currentCycle, currentState, isRunning);
          return newTimeLeft;
        });
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      handleTimerComplete();
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, currentCycle, currentState, settings]);

  // 加载设置
  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('pomodoroSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  // 保存设置
  const saveSettings = (newSettings: PomodoroSettings) => {
    try {
      localStorage.setItem('pomodoroSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  };

  // 加载历史记录
  const loadSessions = () => {
    try {
      const savedSessions = localStorage.getItem('pomodoroSessions');
      if (savedSessions) {
        setSessions(JSON.parse(savedSessions));
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
    }
  };

  // 保存历史记录
  const saveSessions = (newSessions: PomodoroSession[]) => {
    try {
      localStorage.setItem('pomodoroSessions', JSON.stringify(newSessions));
      setSessions(newSessions);
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  };

  // 保存计时器状态
  const saveTimerState = (timeLeft: number, cycle: number, state: TimerState, running: boolean) => {
    try {
      const timerState = {
        timeLeft,
        currentCycle: cycle,
        currentState: state,
        isRunning: running,
        lastUpdate: Date.now(),
      };
      localStorage.setItem('pomodoroTimerState', JSON.stringify(timerState));
    } catch (error) {
      console.error('保存计时器状态失败:', error);
    }
  };

  // 加载计时器状态
  const loadTimerState = () => {
    try {
      const savedState = localStorage.getItem('pomodoroTimerState');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        const now = Date.now();
        const timeDiff = Math.floor((now - parsed.lastUpdate) / 1000);
        
        if (parsed.isRunning && timeDiff > 0) {
          // 如果计时器之前在运行，需要减去经过的时间
          const newTimeLeft = Math.max(0, parsed.timeLeft - timeDiff);
          setTimeLeft(newTimeLeft);
          setCurrentCycle(parsed.currentCycle);
          setCurrentState(parsed.currentState);
          setIsRunning(newTimeLeft > 0 ? parsed.isRunning : false);
          
          if (newTimeLeft === 0 && parsed.isRunning) {
            // 如果时间已经到了，触发完成逻辑
            setTimeout(() => handleTimerComplete(), 100);
          }
        } else {
          // 如果计时器之前暂停，恢复状态
          setTimeLeft(parsed.timeLeft);
          setCurrentCycle(parsed.currentCycle);
          setCurrentState(parsed.currentState);
          setIsRunning(false);
        }
      }
    } catch (error) {
      console.error('加载计时器状态失败:', error);
    }
  };

  // 显示待办事项提醒
  const showTodoReminder = useCallback(() => {
    try {
      const savedTodos = localStorage.getItem('todos');
      if (!savedTodos) return;
      
      const todos = JSON.parse(savedTodos);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      
      // 获取未完成的任务
      const pendingTodos = todos.filter((todo: any) => !todo.completed);
      
      // 获取紧急任务（高优先级或今天到期）
      const urgentTodos = pendingTodos.filter((todo: any) => {
        if (todo.priority === 'high') return true;
        if (todo.dueDate) {
          const dueDate = new Date(todo.dueDate);
          return dueDate >= today && dueDate < tomorrow;
        }
        return false;
      });
      
      // 获取过期任务
      const overdueTodos = pendingTodos.filter((todo: any) => {
        if (!todo.dueDate) return false;
        const dueDate = new Date(todo.dueDate);
        return dueDate < today;
      });
      
      // 构建提醒内容
      let reminderContent = '';
      let hasImportantTasks = false;
      
      if (overdueTodos.length > 0) {
        hasImportantTasks = true;
        reminderContent += `🚨 过期任务 (${overdueTodos.length}个):\n`;
        overdueTodos.slice(0, 3).forEach((todo: any) => {
          reminderContent += `• ${todo.title}\n`;
        });
        if (overdueTodos.length > 3) {
          reminderContent += `  ...还有 ${overdueTodos.length - 3} 个过期任务\n`;
        }
        reminderContent += '\n';
      }
      
      if (urgentTodos.length > 0) {
        hasImportantTasks = true;
        reminderContent += `⚡ 紧急任务 (${urgentTodos.length}个):\n`;
        urgentTodos.slice(0, 3).forEach((todo: any) => {
          reminderContent += `• ${todo.title}\n`;
        });
        if (urgentTodos.length > 3) {
          reminderContent += `  ...还有 ${urgentTodos.length - 3} 个紧急任务\n`;
        }
        reminderContent += '\n';
      }
      
      if (pendingTodos.length > 0 && !hasImportantTasks) {
        reminderContent += `📝 待办任务 (${pendingTodos.length}个):\n`;
        pendingTodos.slice(0, 5).forEach((todo: any) => {
          reminderContent += `• ${todo.title}\n`;
        });
        if (pendingTodos.length > 5) {
          reminderContent += `  ...还有 ${pendingTodos.length - 5} 个待办任务\n`;
        }
      }
      
      // 显示提醒
      if (reminderContent) {
        reminderContent += '\n💡 建议在下个番茄钟处理这些任务';
        
        Modal.info({
          title: hasImportantTasks ? '⚠️ 重要任务提醒' : '📋 待办任务提醒',
          content: reminderContent,
          width: 480,
          okText: '知道了',
          getContainer: () => document.body, // 指定容器避免上下文问题
          onOk: () => {
            // 可以在这里添加跳转到待办清单的逻辑
          },
        });
      }
    } catch (error) {
      console.error('显示待办事项提醒失败:', error);
    }
  }, []);

  // 计时器完成处理
  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);

    if (settings.soundEnabled) {
      // 这里可以添加声音提醒
      // 由于浏览器限制，需要用户交互才能播放音频
    }

    if (currentState === 'work') {
      // 工作时间结束，记录会话
      recordWorkSession();

      // 显示待办事项提醒（如果启用）
      if (settings.todoReminderEnabled) {
        setTimeout(() => {
          showTodoReminder();
        }, 1000); // 延迟1秒显示，让用户先看到完成通知
      }

      if (currentCycle >= settings.cycles) {
        // 完成所有循环，长休息
        setCurrentState('longBreak');
        setTimeLeft(settings.longBreak * 60);
        setCurrentCycle(1);
        notification.success({
          message: '恭喜！',
          description: `完成了 ${settings.cycles} 个番茄钟，可以长休息了！`,
          duration: 5,
        });
      } else {
        // 短休息
        setCurrentState('shortBreak');
        setTimeLeft(settings.shortBreak * 60);
        notification.success({
          message: '工作时间结束',
          description: '休息一下，稍后继续！',
          duration: 3,
        });
      }
    } else {
      // 休息时间结束，开始工作
      setCurrentState('work');
      setTimeLeft(settings.workTime * 60);
      if (currentState === 'shortBreak') {
        setCurrentCycle(prev => prev + 1);
      }
      notification.info({
        message: '休息结束',
        description: '开始新的番茄钟！',
        duration: 3,
      });
    }

    // 自动开始下一个计时器
    if (settings.autoStart) {
      setIsRunning(true);
    }
  }, [currentState, currentCycle, settings]);

  // 记录工作会话
  const recordWorkSession = () => {
    const today = new Date().toDateString();
    const existingSessionIndex = sessions.findIndex((s) => s.date === today);

    let newSessions;
    if (existingSessionIndex >= 0) {
      newSessions = [...sessions];
      newSessions[existingSessionIndex] = {
        ...newSessions[existingSessionIndex],
        workSessions: newSessions[existingSessionIndex].workSessions + 1,
        totalTime: newSessions[existingSessionIndex].totalTime + settings.workTime,
      };
    } else {
      newSessions = [
        ...sessions,
        {
          date: today,
          workSessions: 1,
          totalTime: settings.workTime,
        },
      ];
    }

    saveSessions(newSessions);
  };

  // 开始计时器
  const startTimer = () => {
    setIsRunning(true);
  };

  // 暂停计时器
  const pauseTimer = () => {
    setIsRunning(false);
  };

  // 重置计时器
  const resetTimer = () => {
    setIsRunning(false);
    setCurrentCycle(1);
    setCurrentState('work');
    setTimeLeft(settings.workTime * 60);
    // 清除保存的状态
    localStorage.removeItem('pomodoroTimerState');
  };

  // 更新设置
  const updateSettings = (newSettings: PomodoroSettings) => {
    saveSettings(newSettings);
    // 如果当前没在运行，重置计时器时间
    if (!isRunning) {
      resetTimer();
    }
  };

  // 获取今日统计
  const getTodayStats = () => {
    const today = new Date().toDateString();
    const todaySession = sessions.find((s) => s.date === today);
    return {
      sessions: todaySession?.workSessions || 0,
      totalTime: todaySession?.totalTime || 0,
    };
  };

  return {
    isRunning,
    timeLeft,
    currentCycle,
    currentState,
    settings,
    sessions,
    startTimer,
    pauseTimer,
    resetTimer,
    updateSettings,
    getTodayStats,
  };
};

// 创建全局状态
let globalPomodoroStore: PomodoroStore | null = null;

export const getGlobalPomodoroStore = (): PomodoroStore => {
  if (!globalPomodoroStore) {
    // 这里我们需要在React组件外部创建store，稍后会修改
    throw new Error('Pomodoro store not initialized');
  }
  return globalPomodoroStore;
};

export const initGlobalPomodoroStore = (store: PomodoroStore) => {
  globalPomodoroStore = store;
};

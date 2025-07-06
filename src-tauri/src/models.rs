use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};

// 日程事件相关
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub date: String,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub event_type: String,
    pub priority: String,
    pub is_all_day: bool,
    pub reminder: Option<i32>,
    pub repeat_type: Option<String>,
    pub location: Option<String>,
    pub attendees: Option<String>, // JSON string of array
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateEventRequest {
    pub title: String,
    pub description: Option<String>,
    pub date: String,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub event_type: String,
    pub priority: String,
    pub is_all_day: bool,
    pub reminder: Option<i32>,
    pub repeat_type: Option<String>,
    pub location: Option<String>,
    pub attendees: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateEventRequest {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub date: String,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub event_type: String,
    pub priority: String,
    pub is_all_day: bool,
    pub reminder: Option<i32>,
    pub repeat_type: Option<String>,
    pub location: Option<String>,
    pub attendees: Option<Vec<String>>,
}

// 习惯相关
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Habit {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub color: String,
    pub target: i32,
    pub unit: String,
    pub frequency: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct HabitRecord {
    pub id: String,
    pub habit_id: String,
    pub date: String,
    pub completed: bool,
    pub value: Option<i32>,
    pub note: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateHabitRequest {
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub color: String,
    pub target: i32,
    pub unit: String,
    pub frequency: String,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateHabitRequest {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub color: String,
    pub target: i32,
    pub unit: String,
    pub frequency: String,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateHabitRecordRequest {
    pub habit_id: String,
    pub date: String,
    pub completed: bool,
    pub value: Option<i32>,
    pub note: Option<String>,
}

// 待办事项相关
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Todo {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub completed: bool,
    pub priority: String, // 'low', 'medium', 'high'
    pub tags: Option<String>, // JSON string of array
    pub due_date: Option<String>,
    pub category: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Subtask {
    pub id: String,
    pub todo_id: String,
    pub title: String,
    pub completed: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTodoRequest {
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub tags: Option<Vec<String>>,
    pub due_date: Option<String>,
    pub category: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTodoRequest {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub completed: bool,
    pub priority: String,
    pub tags: Option<Vec<String>>,
    pub due_date: Option<String>,
    pub category: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSubtaskRequest {
    pub todo_id: String,
    pub title: String,
}

// 番茄钟相关
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct PomodoroSession {
    pub id: String,
    pub session_type: String, // 'work', 'short_break', 'long_break'
    pub duration: i32, // 秒数
    pub completed: bool,
    pub task_title: Option<String>,
    pub notes: Option<String>,
    pub date: String,
    pub started_at: Option<DateTime<Utc>>,
    pub ended_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePomodoroSessionRequest {
    pub session_type: String,
    pub duration: i32,
    pub task_title: Option<String>,
    pub notes: Option<String>,
    pub date: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatePomodoroSessionRequest {
    pub id: String,
    pub completed: bool,
    pub task_title: Option<String>,
    pub notes: Option<String>,
    pub ended_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct PomodoroSettings {
    pub id: String,
    pub work_time: i32, // 分钟
    pub short_break: i32, // 分钟
    pub long_break: i32, // 分钟
    pub long_break_interval: i32, // 多少个工作周期后长休息
    pub auto_start_breaks: bool,
    pub auto_start_work: bool,
    pub notification_enabled: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatePomodoroSettingsRequest {
    pub work_time: i32,
    pub short_break: i32,
    pub long_break: i32,
    pub long_break_interval: i32,
    pub auto_start_breaks: bool,
    pub auto_start_work: bool,
    pub notification_enabled: bool,
}

// 便笺相关
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub tags: Option<String>, // JSON string of array
    pub category: String,
    pub color: String,
    pub is_pinned: bool,
    pub is_archived: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNoteRequest {
    pub title: String,
    pub content: String,
    pub tags: Option<Vec<String>>,
    pub category: String,
    pub color: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateNoteRequest {
    pub id: String,
    pub title: String,
    pub content: String,
    pub tags: Option<Vec<String>>,
    pub category: String,
    pub color: String,
    pub is_pinned: bool,
    pub is_archived: bool,
}
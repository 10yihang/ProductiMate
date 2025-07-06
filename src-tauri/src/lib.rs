// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

mod models;
mod database;

use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::State;
use database::DatabaseService;
use models::*;

type DatabaseState = Arc<Mutex<DatabaseService>>;

// 日程事件相关命令
#[tauri::command]
async fn get_all_events(
    db: State<'_, DatabaseState>,
) -> Result<Vec<CalendarEvent>, String> {
    let db = db.lock().await;
    db.get_all_events().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_events_by_date_range(
    start_date: String,
    end_date: String,
    db: State<'_, DatabaseState>,
) -> Result<Vec<CalendarEvent>, String> {
    let db = db.lock().await;
    db.get_events_by_date_range(&start_date, &end_date)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_event(
    request: CreateEventRequest,
    db: State<'_, DatabaseState>,
) -> Result<CalendarEvent, String> {
    let db = db.lock().await;
    db.create_event(request).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_event(
    request: UpdateEventRequest,
    db: State<'_, DatabaseState>,
) -> Result<CalendarEvent, String> {
    let db = db.lock().await;
    db.update_event(request).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_event(
    id: String,
    db: State<'_, DatabaseState>,
) -> Result<(), String> {
    let db = db.lock().await;
    db.delete_event(&id).await.map_err(|e| e.to_string())
}

// 习惯相关命令
#[tauri::command]
async fn get_all_habits(
    db: State<'_, DatabaseState>,
) -> Result<Vec<Habit>, String> {
    let db = db.lock().await;
    db.get_all_habits().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_habit(
    request: CreateHabitRequest,
    db: State<'_, DatabaseState>,
) -> Result<Habit, String> {
    let db = db.lock().await;
    db.create_habit(request).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_habit(
    request: UpdateHabitRequest,
    db: State<'_, DatabaseState>,
) -> Result<Habit, String> {
    let db = db.lock().await;
    db.update_habit(request).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_habit(
    id: String,
    db: State<'_, DatabaseState>,
) -> Result<(), String> {
    let db = db.lock().await;
    db.delete_habit(&id).await.map_err(|e| e.to_string())
}

// 习惯打卡记录相关命令
#[tauri::command]
async fn get_habit_records_by_date_range(
    habit_id: String,
    start_date: String,
    end_date: String,
    db: State<'_, DatabaseState>,
) -> Result<Vec<HabitRecord>, String> {
    let db = db.lock().await;
    db.get_habit_records_by_date_range(&habit_id, &start_date, &end_date)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_habit_record(
    request: CreateHabitRecordRequest,
    db: State<'_, DatabaseState>,
) -> Result<HabitRecord, String> {
    let db = db.lock().await;
    db.create_habit_record(request).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_habit_record_by_date(
    habit_id: String,
    date: String,
    db: State<'_, DatabaseState>,
) -> Result<Option<HabitRecord>, String> {
    let db = db.lock().await;
    db.get_habit_record_by_date(&habit_id, &date)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_or_create_habit_record(
    habit_id: String,
    date: String,
    db: State<'_, DatabaseState>,
) -> Result<HabitRecord, String> {
    let db = db.lock().await;
    db.get_or_create_habit_record(&habit_id, &date)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_habit_record(
    id: String,
    completed: bool,
    value: Option<i32>,
    note: Option<String>,
    db: State<'_, DatabaseState>,
) -> Result<HabitRecord, String> {
    let db = db.lock().await;
    db.update_habit_record(&id, completed, value, note)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_habit_records_by_habit(
    habit_id: String,
    db: State<'_, DatabaseState>,
) -> Result<Vec<HabitRecord>, String> {
    let db = db.lock().await;
    db.get_habit_records_by_habit(&habit_id)
        .await
        .map_err(|e| e.to_string())
}

// 待办事项相关命令
#[tauri::command]
async fn get_all_todos(
    db: State<'_, DatabaseState>,
) -> Result<Vec<Todo>, String> {
    let db = db.lock().await;
    db.get_all_todos().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_todo(
    request: CreateTodoRequest,
    db: State<'_, DatabaseState>,
) -> Result<Todo, String> {
    let db = db.lock().await;
    db.create_todo(request).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_todo(
    request: UpdateTodoRequest,
    db: State<'_, DatabaseState>,
) -> Result<Todo, String> {
    let db = db.lock().await;
    db.update_todo(request).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_todo(
    id: String,
    db: State<'_, DatabaseState>,
) -> Result<(), String> {
    let db = db.lock().await;
    db.delete_todo(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn toggle_todo_completion(
    id: String,
    db: State<'_, DatabaseState>,
) -> Result<Todo, String> {
    let db = db.lock().await;
    db.toggle_todo_completion(&id).await.map_err(|e| e.to_string())
}

// 子任务相关命令
#[tauri::command]
async fn get_subtasks_by_todo(
    todo_id: String,
    db: State<'_, DatabaseState>,
) -> Result<Vec<Subtask>, String> {
    let db = db.lock().await;
    db.get_subtasks_by_todo(&todo_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_subtask(
    request: CreateSubtaskRequest,
    db: State<'_, DatabaseState>,
) -> Result<Subtask, String> {
    let db = db.lock().await;
    db.create_subtask(request).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn toggle_subtask_completion(
    id: String,
    db: State<'_, DatabaseState>,
) -> Result<Subtask, String> {
    let db = db.lock().await;
    db.toggle_subtask_completion(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_subtask(
    id: String,
    db: State<'_, DatabaseState>,
) -> Result<(), String> {
    let db = db.lock().await;
    db.delete_subtask(&id).await.map_err(|e| e.to_string())
}

// 番茄钟会话相关命令
#[tauri::command]
async fn create_pomodoro_session(
    request: CreatePomodoroSessionRequest,
    db: State<'_, DatabaseState>,
) -> Result<PomodoroSession, String> {
    let db = db.lock().await;
    db.create_pomodoro_session(request).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_pomodoro_session(
    request: UpdatePomodoroSessionRequest,
    db: State<'_, DatabaseState>,
) -> Result<PomodoroSession, String> {
    let db = db.lock().await;
    db.update_pomodoro_session(request).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_pomodoro_sessions_by_date(
    date: String,
    db: State<'_, DatabaseState>,
) -> Result<Vec<PomodoroSession>, String> {
    let db = db.lock().await;
    db.get_pomodoro_sessions_by_date(&date).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_pomodoro_sessions_by_date_range(
    start_date: String,
    end_date: String,
    db: State<'_, DatabaseState>,
) -> Result<Vec<PomodoroSession>, String> {
    let db = db.lock().await;
    db.get_pomodoro_sessions_by_date_range(&start_date, &end_date)
        .await
        .map_err(|e| e.to_string())
}

// 番茄钟设置相关命令
#[tauri::command]
async fn get_pomodoro_settings(
    db: State<'_, DatabaseState>,
) -> Result<PomodoroSettings, String> {
    let db = db.lock().await;
    db.get_pomodoro_settings().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_pomodoro_settings(
    request: UpdatePomodoroSettingsRequest,
    db: State<'_, DatabaseState>,
) -> Result<PomodoroSettings, String> {
    let db = db.lock().await;
    db.update_pomodoro_settings(request).await.map_err(|e| e.to_string())
}

// 便笺相关命令
#[tauri::command]
async fn get_all_notes(
    db: State<'_, DatabaseState>,
) -> Result<Vec<Note>, String> {
    let db = db.lock().await;
    db.get_all_notes().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_note(
    request: CreateNoteRequest,
    db: State<'_, DatabaseState>,
) -> Result<Note, String> {
    let db = db.lock().await;
    db.create_note(request).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_note(
    request: UpdateNoteRequest,
    db: State<'_, DatabaseState>,
) -> Result<Note, String> {
    let db = db.lock().await;
    db.update_note(request).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_note(
    id: String,
    db: State<'_, DatabaseState>,
) -> Result<(), String> {
    let db = db.lock().await;
    db.delete_note(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn toggle_note_pin(
    id: String,
    db: State<'_, DatabaseState>,
) -> Result<Note, String> {
    let db = db.lock().await;
    db.toggle_note_pin(&id).await.map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::async_runtime::block_on(async {
        let database_service = DatabaseService::new()
            .await
            .expect("Failed to initialize database");
        
        tauri::Builder::default()
            .plugin(tauri_plugin_opener::init())
            .manage(Arc::new(Mutex::new(database_service)))
            .invoke_handler(tauri::generate_handler![
                // 日程事件
                get_all_events,
                get_events_by_date_range,
                create_event,
                update_event,
                delete_event,
                // 习惯
                get_all_habits,
                create_habit,
                update_habit,
                delete_habit,
                get_habit_records_by_date_range,
                create_habit_record,
                get_habit_record_by_date,
                get_or_create_habit_record,
                update_habit_record,
                get_habit_records_by_habit,
                // 待办事项
                get_all_todos,
                create_todo,
                update_todo,
                delete_todo,
                toggle_todo_completion,
                // 子任务
                get_subtasks_by_todo,
                create_subtask,
                toggle_subtask_completion,
                delete_subtask,
                // 番茄钟会话
                create_pomodoro_session,
                update_pomodoro_session,
                get_pomodoro_sessions_by_date,
                get_pomodoro_sessions_by_date_range,
                // 番茄钟设置
                get_pomodoro_settings,
                update_pomodoro_settings,
                // 便笺
                get_all_notes,
                create_note,
                update_note,
                delete_note,
                toggle_note_pin
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    });
}

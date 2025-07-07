use sqlx::{migrate::MigrateDatabase, Sqlite, SqlitePool, Row};
use crate::models::*;
use chrono::Utc;
use uuid::Uuid;

pub struct DatabaseService {
    pool: SqlitePool,
}

impl DatabaseService {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let database_url = "sqlite://toolbox.db";
        
        // 创建数据库（如果不存在）
        if !Sqlite::database_exists(database_url).await.unwrap_or(false) {
            Sqlite::create_database(database_url).await?;
        }

        let pool = SqlitePool::connect(database_url).await?;

        // 创建所有表
        Self::create_tables(&pool).await?;

        Ok(DatabaseService { pool })
    }

    async fn create_tables(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
        // 日程事件表
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS calendar_events (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                date TEXT NOT NULL,
                start_time TEXT,
                end_time TEXT,
                event_type TEXT NOT NULL,
                priority TEXT NOT NULL,
                is_all_day BOOLEAN NOT NULL,
                reminder INTEGER,
                repeat_type TEXT,
                location TEXT,
                attendees TEXT,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL
            )
            "#,
        )
        .execute(pool)
        .await?;

        // 习惯表
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS habits (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                category TEXT NOT NULL,
                color TEXT NOT NULL,
                target INTEGER NOT NULL,
                unit TEXT NOT NULL,
                frequency TEXT NOT NULL,
                is_active BOOLEAN NOT NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL
            )
            "#,
        )
        .execute(pool)
        .await?;

        // 习惯记录表
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS habit_records (
                id TEXT PRIMARY KEY,
                habit_id TEXT NOT NULL,
                date TEXT NOT NULL,
                completed BOOLEAN NOT NULL,
                value INTEGER,
                note TEXT,
                created_at DATETIME NOT NULL,
                FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(pool)
        .await?;

        // 待办事项表
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS todos (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                completed BOOLEAN NOT NULL DEFAULT FALSE,
                priority TEXT NOT NULL,
                tags TEXT,
                due_date TEXT,
                category TEXT NOT NULL DEFAULT 'general',
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL
            )
            "#,
        )
        .execute(pool)
        .await?;

        // 子任务表
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS subtasks (
                id TEXT PRIMARY KEY,
                todo_id TEXT NOT NULL,
                title TEXT NOT NULL,
                completed BOOLEAN NOT NULL DEFAULT FALSE,
                created_at DATETIME NOT NULL,
                FOREIGN KEY (todo_id) REFERENCES todos (id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(pool)
        .await?;

        // 番茄钟会话表
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS pomodoro_sessions (
                id TEXT PRIMARY KEY,
                session_type TEXT NOT NULL,
                duration INTEGER NOT NULL,
                completed BOOLEAN NOT NULL DEFAULT FALSE,
                task_title TEXT,
                notes TEXT,
                date TEXT NOT NULL,
                started_at DATETIME,
                ended_at DATETIME,
                created_at DATETIME NOT NULL
            )
            "#,
        )
        .execute(pool)
        .await?;

        // 番茄钟设置表
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS pomodoro_settings (
                id TEXT PRIMARY KEY,
                work_time INTEGER NOT NULL DEFAULT 25,
                short_break INTEGER NOT NULL DEFAULT 5,
                long_break INTEGER NOT NULL DEFAULT 15,
                long_break_interval INTEGER NOT NULL DEFAULT 4,
                auto_start_breaks BOOLEAN NOT NULL DEFAULT FALSE,
                auto_start_work BOOLEAN NOT NULL DEFAULT FALSE,
                notification_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL
            )
            "#,
        )
        .execute(pool)
        .await?;

        // 便笺表
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                tags TEXT,
                category TEXT NOT NULL DEFAULT 'general',
                color TEXT NOT NULL DEFAULT '#fef3c7',
                is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
                is_archived BOOLEAN NOT NULL DEFAULT FALSE,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL
            )
            "#,
        )
        .execute(pool)
        .await?;

        // 插入默认番茄钟设置（如果不存在）
        let exists = sqlx::query("SELECT COUNT(*) as count FROM pomodoro_settings")
            .fetch_one(pool)
            .await?
            .get::<i64, _>("count");

        if exists == 0 {
            let id = Uuid::new_v4().to_string();
            let now = Utc::now();
            sqlx::query(
                r#"
                INSERT INTO pomodoro_settings (
                    id, work_time, short_break, long_break, long_break_interval,
                    auto_start_breaks, auto_start_work, notification_enabled,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(id)
            .bind(25)
            .bind(5)
            .bind(15)
            .bind(4)
            .bind(false)
            .bind(false)
            .bind(true)
            .bind(now)
            .bind(now)
            .execute(pool)
            .await?;
        }

        Ok(())
    }

    // 日程事件相关方法
    pub async fn create_event(&self, request: CreateEventRequest) -> Result<CalendarEvent, Box<dyn std::error::Error>> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let attendees_json = if let Some(attendees) = &request.attendees {
            Some(serde_json::to_string(attendees)?)
        } else {
            None
        };

        sqlx::query(
            r#"
            INSERT INTO calendar_events (
                id, title, description, date, start_time, end_time, event_type, priority, 
                is_all_day, reminder, repeat_type, location, attendees, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&request.title)
        .bind(&request.description)
        .bind(&request.date)
        .bind(&request.start_time)
        .bind(&request.end_time)
        .bind(&request.event_type)
        .bind(&request.priority)
        .bind(request.is_all_day)
        .bind(request.reminder)
        .bind(&request.repeat_type)
        .bind(&request.location)
        .bind(&attendees_json)
        .bind(now)
        .bind(now)
        .execute(&self.pool)
        .await?;

        self.get_event(&id).await
    }

    pub async fn get_event(&self, id: &str) -> Result<CalendarEvent, Box<dyn std::error::Error>> {
        let event = sqlx::query_as::<_, CalendarEvent>(
            "SELECT id, title, description, date, start_time, end_time, event_type, priority, is_all_day, reminder, repeat_type, location, attendees, created_at, updated_at FROM calendar_events WHERE id = ?"
        )
        .bind(id)
        .fetch_one(&self.pool)
        .await?;

        Ok(event)
    }

    pub async fn get_all_events(&self) -> Result<Vec<CalendarEvent>, Box<dyn std::error::Error>> {
        let events = sqlx::query_as::<_, CalendarEvent>(
            "SELECT id, title, description, date, start_time, end_time, event_type, priority, is_all_day, reminder, repeat_type, location, attendees, created_at, updated_at FROM calendar_events ORDER BY date, start_time"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(events)
    }

    pub async fn get_events_by_date_range(&self, start_date: &str, end_date: &str) -> Result<Vec<CalendarEvent>, Box<dyn std::error::Error>> {
        let events = sqlx::query_as::<_, CalendarEvent>(
            "SELECT id, title, description, date, start_time, end_time, event_type, priority, is_all_day, reminder, repeat_type, location, attendees, created_at, updated_at FROM calendar_events WHERE date >= ? AND date <= ? ORDER BY date, start_time"
        )
        .bind(start_date)
        .bind(end_date)
        .fetch_all(&self.pool)
        .await?;

        Ok(events)
    }

    pub async fn update_event(&self, request: UpdateEventRequest) -> Result<CalendarEvent, Box<dyn std::error::Error>> {
        let now = Utc::now();
        let attendees_json = if let Some(attendees) = &request.attendees {
            Some(serde_json::to_string(attendees)?)
        } else {
            None
        };

        sqlx::query(
            r#"
            UPDATE calendar_events SET 
                title = ?, description = ?, date = ?, start_time = ?, end_time = ?, 
                event_type = ?, priority = ?, is_all_day = ?, reminder = ?, 
                repeat_type = ?, location = ?, attendees = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(&request.title)
        .bind(&request.description)
        .bind(&request.date)
        .bind(&request.start_time)
        .bind(&request.end_time)
        .bind(&request.event_type)
        .bind(&request.priority)
        .bind(request.is_all_day)
        .bind(request.reminder)
        .bind(&request.repeat_type)
        .bind(&request.location)
        .bind(&attendees_json)
        .bind(now)
        .bind(&request.id)
        .execute(&self.pool)
        .await?;

        self.get_event(&request.id).await
    }

    pub async fn delete_event(&self, id: &str) -> Result<(), Box<dyn std::error::Error>> {
        sqlx::query("DELETE FROM calendar_events WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    // 待办事项相关方法
    pub async fn create_todo(&self, request: CreateTodoRequest) -> Result<Todo, Box<dyn std::error::Error>> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let tags_json = if let Some(tags) = &request.tags {
            Some(serde_json::to_string(tags)?)
        } else {
            None
        };

        sqlx::query(
            r#"
            INSERT INTO todos (
                id, title, description, completed, priority, tags, due_date, category, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&request.title)
        .bind(&request.description)
        .bind(false)
        .bind(&request.priority)
        .bind(&tags_json)
        .bind(&request.due_date)
        .bind(&request.category)
        .bind(now)
        .bind(now)
        .execute(&self.pool)
        .await?;

        self.get_todo(&id).await
    }

    pub async fn get_todo(&self, id: &str) -> Result<Todo, Box<dyn std::error::Error>> {
        let todo = sqlx::query_as::<_, Todo>(
            "SELECT id, title, description, completed, priority, tags, due_date, category, created_at, updated_at FROM todos WHERE id = ?"
        )
        .bind(id)
        .fetch_one(&self.pool)
        .await?;

        Ok(todo)
    }

    pub async fn get_all_todos(&self) -> Result<Vec<Todo>, Box<dyn std::error::Error>> {
        let todos = sqlx::query_as::<_, Todo>(
            "SELECT id, title, description, completed, priority, tags, due_date, category, created_at, updated_at FROM todos ORDER BY created_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(todos)
    }

    pub async fn update_todo(&self, request: UpdateTodoRequest) -> Result<Todo, Box<dyn std::error::Error>> {
        let now = Utc::now();
        let tags_json = if let Some(tags) = &request.tags {
            Some(serde_json::to_string(tags)?)
        } else {
            None
        };

        sqlx::query(
            r#"
            UPDATE todos SET 
                title = ?, description = ?, completed = ?, priority = ?, 
                tags = ?, due_date = ?, category = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(&request.title)
        .bind(&request.description)
        .bind(request.completed)
        .bind(&request.priority)
        .bind(&tags_json)
        .bind(&request.due_date)
        .bind(&request.category)
        .bind(now)
        .bind(&request.id)
        .execute(&self.pool)
        .await?;

        self.get_todo(&request.id).await
    }

    pub async fn delete_todo(&self, id: &str) -> Result<(), Box<dyn std::error::Error>> {
        sqlx::query("DELETE FROM todos WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn toggle_todo_completion(&self, id: &str) -> Result<Todo, Box<dyn std::error::Error>> {
        let now = Utc::now();
        sqlx::query("UPDATE todos SET completed = NOT completed, updated_at = ? WHERE id = ?")
            .bind(now)
            .bind(id)
            .execute(&self.pool)
            .await?;

        self.get_todo(id).await
    }

    // 子任务相关方法
    pub async fn create_subtask(&self, request: CreateSubtaskRequest) -> Result<Subtask, Box<dyn std::error::Error>> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        sqlx::query(
            "INSERT INTO subtasks (id, todo_id, title, completed, created_at) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&request.todo_id)
        .bind(&request.title)
        .bind(false)
        .bind(now)
        .execute(&self.pool)
        .await?;

        let subtask = sqlx::query_as::<_, Subtask>(
            "SELECT id, todo_id, title, completed, created_at FROM subtasks WHERE id = ?"
        )
        .bind(&id)
        .fetch_one(&self.pool)
        .await?;

        Ok(subtask)
    }

    pub async fn get_subtasks_by_todo(&self, todo_id: &str) -> Result<Vec<Subtask>, Box<dyn std::error::Error>> {
        let subtasks = sqlx::query_as::<_, Subtask>(
            "SELECT id, todo_id, title, completed, created_at FROM subtasks WHERE todo_id = ? ORDER BY created_at"
        )
        .bind(todo_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(subtasks)
    }

    pub async fn toggle_subtask_completion(&self, id: &str) -> Result<Subtask, Box<dyn std::error::Error>> {
        sqlx::query("UPDATE subtasks SET completed = NOT completed WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        let subtask = sqlx::query_as::<_, Subtask>(
            "SELECT id, todo_id, title, completed, created_at FROM subtasks WHERE id = ?"
        )
        .bind(id)
        .fetch_one(&self.pool)
        .await?;

        Ok(subtask)
    }

    pub async fn delete_subtask(&self, id: &str) -> Result<(), Box<dyn std::error::Error>> {
        sqlx::query("DELETE FROM subtasks WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    // 番茄钟会话相关方法
    pub async fn create_pomodoro_session(&self, request: CreatePomodoroSessionRequest) -> Result<PomodoroSession, Box<dyn std::error::Error>> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        sqlx::query(
            r#"
            INSERT INTO pomodoro_sessions (
                id, session_type, duration, completed, task_title, notes, date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&request.session_type)
        .bind(request.duration)
        .bind(false)
        .bind(&request.task_title)
        .bind(&request.notes)
        .bind(&request.date)
        .bind(now)
        .execute(&self.pool)
        .await?;

        let session = sqlx::query_as::<_, PomodoroSession>(
            "SELECT id, session_type, duration, completed, task_title, notes, date, started_at, ended_at, created_at FROM pomodoro_sessions WHERE id = ?"
        )
        .bind(&id)
        .fetch_one(&self.pool)
        .await?;

        Ok(session)
    }

    pub async fn update_pomodoro_session(&self, request: UpdatePomodoroSessionRequest) -> Result<PomodoroSession, Box<dyn std::error::Error>> {
        sqlx::query(
            r#"
            UPDATE pomodoro_sessions SET 
                completed = ?, task_title = ?, notes = ?, ended_at = ?
            WHERE id = ?
            "#,
        )
        .bind(request.completed)
        .bind(&request.task_title)
        .bind(&request.notes)
        .bind(&request.ended_at)
        .bind(&request.id)
        .execute(&self.pool)
        .await?;

        let session = sqlx::query_as::<_, PomodoroSession>(
            "SELECT id, session_type, duration, completed, task_title, notes, date, started_at, ended_at, created_at FROM pomodoro_sessions WHERE id = ?"
        )
        .bind(&request.id)
        .fetch_one(&self.pool)
        .await?;

        Ok(session)
    }

    pub async fn get_pomodoro_sessions_by_date(&self, date: &str) -> Result<Vec<PomodoroSession>, Box<dyn std::error::Error>> {
        let sessions = sqlx::query_as::<_, PomodoroSession>(
            "SELECT id, session_type, duration, completed, task_title, notes, date, started_at, ended_at, created_at FROM pomodoro_sessions WHERE date = ? ORDER BY created_at"
        )
        .bind(date)
        .fetch_all(&self.pool)
        .await?;

        Ok(sessions)
    }

    pub async fn get_pomodoro_sessions_by_date_range(&self, start_date: &str, end_date: &str) -> Result<Vec<PomodoroSession>, Box<dyn std::error::Error>> {
        let sessions = sqlx::query_as::<_, PomodoroSession>(
            "SELECT id, session_type, duration, completed, task_title, notes, date, started_at, ended_at, created_at FROM pomodoro_sessions WHERE date >= ? AND date <= ? ORDER BY date, created_at"
        )
        .bind(start_date)
        .bind(end_date)
        .fetch_all(&self.pool)
        .await?;

        Ok(sessions)
    }

    // 番茄钟设置相关方法
    pub async fn get_pomodoro_settings(&self) -> Result<PomodoroSettings, Box<dyn std::error::Error>> {
        let settings = sqlx::query_as::<_, PomodoroSettings>(
            "SELECT id, work_time, short_break, long_break, long_break_interval, auto_start_breaks, auto_start_work, notification_enabled, created_at, updated_at FROM pomodoro_settings LIMIT 1"
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(settings)
    }

    pub async fn update_pomodoro_settings(&self, request: UpdatePomodoroSettingsRequest) -> Result<PomodoroSettings, Box<dyn std::error::Error>> {
        let now = Utc::now();
        
        sqlx::query(
            r#"
            UPDATE pomodoro_settings SET 
                work_time = ?, short_break = ?, long_break = ?, long_break_interval = ?,
                auto_start_breaks = ?, auto_start_work = ?, notification_enabled = ?, updated_at = ?
            "#,
        )
        .bind(request.work_time)
        .bind(request.short_break)
        .bind(request.long_break)
        .bind(request.long_break_interval)
        .bind(request.auto_start_breaks)
        .bind(request.auto_start_work)
        .bind(request.notification_enabled)
        .bind(now)
        .execute(&self.pool)
        .await?;

        self.get_pomodoro_settings().await
    }

    // 便笺相关方法
    pub async fn create_note(&self, request: CreateNoteRequest) -> Result<Note, Box<dyn std::error::Error>> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let tags_json = if let Some(tags) = &request.tags {
            Some(serde_json::to_string(tags)?)
        } else {
            None
        };

        sqlx::query(
            r#"
            INSERT INTO notes (
                id, title, content, tags, category, color, is_pinned, is_archived, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&request.title)
        .bind(&request.content)
        .bind(&tags_json)
        .bind(&request.category)
        .bind(&request.color)
        .bind(false)
        .bind(false)
        .bind(now)
        .bind(now)
        .execute(&self.pool)
        .await?;

        self.get_note(&id).await
    }

    pub async fn get_note(&self, id: &str) -> Result<Note, Box<dyn std::error::Error>> {
        let note = sqlx::query_as::<_, Note>(
            "SELECT id, title, content, tags, category, color, is_pinned, is_archived, created_at, updated_at FROM notes WHERE id = ?"
        )
        .bind(id)
        .fetch_one(&self.pool)
        .await?;

        Ok(note)
    }

    pub async fn get_all_notes(&self) -> Result<Vec<Note>, Box<dyn std::error::Error>> {
        let notes = sqlx::query_as::<_, Note>(
            "SELECT id, title, content, tags, category, color, is_pinned, is_archived, created_at, updated_at FROM notes WHERE is_archived = FALSE ORDER BY is_pinned DESC, updated_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(notes)
    }

    pub async fn update_note(&self, request: UpdateNoteRequest) -> Result<Note, Box<dyn std::error::Error>> {
        let now = Utc::now();
        let tags_json = if let Some(tags) = &request.tags {
            Some(serde_json::to_string(tags)?)
        } else {
            None
        };

        sqlx::query(
            r#"
            UPDATE notes SET 
                title = ?, content = ?, tags = ?, category = ?, color = ?, 
                is_pinned = ?, is_archived = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(&request.title)
        .bind(&request.content)
        .bind(&tags_json)
        .bind(&request.category)
        .bind(&request.color)
        .bind(request.is_pinned)
        .bind(request.is_archived)
        .bind(now)
        .bind(&request.id)
        .execute(&self.pool)
        .await?;

        self.get_note(&request.id).await
    }

    pub async fn delete_note(&self, id: &str) -> Result<(), Box<dyn std::error::Error>> {
        sqlx::query("DELETE FROM notes WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn toggle_note_pin(&self, id: &str) -> Result<Note, Box<dyn std::error::Error>> {
        let now = Utc::now();
        sqlx::query("UPDATE notes SET is_pinned = NOT is_pinned, updated_at = ? WHERE id = ?")
            .bind(now)
            .bind(id)
            .execute(&self.pool)
            .await?;

        self.get_note(id).await
    }

    // 习惯相关方法
    pub async fn create_habit(&self, request: CreateHabitRequest) -> Result<Habit, Box<dyn std::error::Error>> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        sqlx::query(
            r#"
            INSERT INTO habits (
                id, name, description, category, color, target, unit, frequency, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&request.name)
        .bind(&request.description)
        .bind(&request.category)
        .bind(&request.color)
        .bind(request.target)
        .bind(&request.unit)
        .bind(&request.frequency)
        .bind(request.is_active)
        .bind(now)
        .bind(now)
        .execute(&self.pool)
        .await?;

        self.get_habit(&id).await
    }

    pub async fn get_habit(&self, id: &str) -> Result<Habit, Box<dyn std::error::Error>> {
        let habit = sqlx::query_as::<_, Habit>(
            "SELECT id, name, description, category, color, target, unit, frequency, is_active, created_at, updated_at FROM habits WHERE id = ?"
        )
        .bind(id)
        .fetch_one(&self.pool)
        .await?;

        Ok(habit)
    }

    pub async fn get_all_habits(&self) -> Result<Vec<Habit>, Box<dyn std::error::Error>> {
        let habits = sqlx::query_as::<_, Habit>(
            "SELECT id, name, description, category, color, target, unit, frequency, is_active, created_at, updated_at FROM habits ORDER BY created_at"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(habits)
    }

    pub async fn update_habit(&self, request: UpdateHabitRequest) -> Result<Habit, Box<dyn std::error::Error>> {
        let now = Utc::now();

        sqlx::query(
            r#"
            UPDATE habits SET 
                name = ?, description = ?, category = ?, color = ?, target = ?, 
                unit = ?, frequency = ?, is_active = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(&request.name)
        .bind(&request.description)
        .bind(&request.category)
        .bind(&request.color)
        .bind(request.target)
        .bind(&request.unit)
        .bind(&request.frequency)
        .bind(request.is_active)
        .bind(now)
        .bind(&request.id)
        .execute(&self.pool)
        .await?;

        self.get_habit(&request.id).await
    }

    pub async fn delete_habit(&self, id: &str) -> Result<(), Box<dyn std::error::Error>> {
        sqlx::query("DELETE FROM habits WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    // 习惯记录相关方法
    pub async fn create_habit_record(&self, request: CreateHabitRecordRequest) -> Result<HabitRecord, Box<dyn std::error::Error>> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        sqlx::query(
            r#"
            INSERT INTO habit_records (
                id, habit_id, date, completed, value, note, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&request.habit_id)
        .bind(&request.date)
        .bind(request.completed)
        .bind(request.value)
        .bind(&request.note)
        .bind(now)
        .execute(&self.pool)
        .await?;

        self.get_habit_record(&id).await
    }

    pub async fn get_habit_record(&self, id: &str) -> Result<HabitRecord, Box<dyn std::error::Error>> {
        let record = sqlx::query_as::<_, HabitRecord>(
            "SELECT id, habit_id, date, completed, value, note, created_at FROM habit_records WHERE id = ?"
        )
        .bind(id)
        .fetch_one(&self.pool)
        .await?;

        Ok(record)
    }

    pub async fn get_habit_records_by_habit(&self, habit_id: &str) -> Result<Vec<HabitRecord>, Box<dyn std::error::Error>> {
        let records = sqlx::query_as::<_, HabitRecord>(
            "SELECT id, habit_id, date, completed, value, note, created_at FROM habit_records WHERE habit_id = ? ORDER BY date DESC"
        )
        .bind(habit_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(records)
    }

    pub async fn get_habit_records_by_date_range(&self, habit_id: &str, start_date: &str, end_date: &str) -> Result<Vec<HabitRecord>, Box<dyn std::error::Error>> {
        let records = sqlx::query_as::<_, HabitRecord>(
            "SELECT id, habit_id, date, completed, value, note, created_at FROM habit_records WHERE habit_id = ? AND date >= ? AND date <= ? ORDER BY date DESC"
        )
        .bind(habit_id)
        .bind(start_date)
        .bind(end_date)
        .fetch_all(&self.pool)
        .await?;

        Ok(records)
    }

    pub async fn get_habit_record_by_date(&self, habit_id: &str, date: &str) -> Result<Option<HabitRecord>, Box<dyn std::error::Error>> {
        let record = sqlx::query_as::<_, HabitRecord>(
            "SELECT id, habit_id, date, completed, value, note, created_at FROM habit_records WHERE habit_id = ? AND date = ?"
        )
        .bind(habit_id)
        .bind(date)
        .fetch_optional(&self.pool)
        .await?;

        Ok(record)
    }

    pub async fn update_habit_record(&self, id: &str, completed: bool, value: Option<i32>, note: Option<String>) -> Result<HabitRecord, Box<dyn std::error::Error>> {
        sqlx::query(
            "UPDATE habit_records SET completed = ?, value = ?, note = ? WHERE id = ?"
        )
        .bind(completed)
        .bind(value)
        .bind(&note)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get_habit_record(id).await
    }

    // pub async fn delete_habit_record(&self, id: &str) -> Result<(), Box<dyn std::error::Error>> {
    //     sqlx::query("DELETE FROM habit_records WHERE id = ?")
    //         .bind(id)
    //         .execute(&self.pool)
    //         .await?;

    //     Ok(())
    // }

    pub async fn get_or_create_habit_record(&self, habit_id: &str, date: &str) -> Result<HabitRecord, Box<dyn std::error::Error>> {
        // 首先尝试获取现有记录
        let existing_record = sqlx::query_as::<_, HabitRecord>(
            "SELECT id, habit_id, date, completed, value, note, created_at FROM habit_records WHERE habit_id = ? AND date = ?"
        )
        .bind(habit_id)
        .bind(date)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(record) = existing_record {
            Ok(record)
        } else {
            // 创建新记录
            let request = CreateHabitRecordRequest {
                habit_id: habit_id.to_string(),
                date: date.to_string(),
                completed: false,
                value: None,
                note: None,
            };
            self.create_habit_record(request).await
        }
    }
}
CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  frequency TEXT NOT NULL,
  custom_days TEXT,
  reminder_time TEXT,
  sort_order INTEGER DEFAULT 0,
  is_archived INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  UNIQUE(habit_id, date)
);

CREATE TABLE IF NOT EXISTS sleep_logs (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  bedtime TEXT NOT NULL,
  wake_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  quality INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL
);

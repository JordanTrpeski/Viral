-- Health Module v1 Schema Snapshot
-- Captured before roadmap v1.1.0 teardown on 2026-05-17

-- Exercise library (flat schema, no JSON fields)
CREATE TABLE exercises (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  muscle_group TEXT NOT NULL,  -- single string, not JSON array
  equipment    TEXT,
  is_custom    INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL
);

-- Workout sessions
CREATE TABLE workout_sessions (
  id               TEXT PRIMARY KEY,
  date             TEXT NOT NULL,
  name             TEXT,
  duration_minutes INTEGER,
  notes            TEXT,
  started_at       TEXT NOT NULL,
  ended_at         TEXT,
  created_at       TEXT NOT NULL
);

-- Workout sets (no target vs performed split, no RPE, no tempo)
CREATE TABLE workout_sets (
  id               TEXT PRIMARY KEY,
  session_id       TEXT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id      TEXT NOT NULL REFERENCES exercises(id),
  set_number       INTEGER NOT NULL,
  reps             INTEGER,
  weight_kg        REAL,
  duration_seconds INTEGER,
  notes            TEXT,
  created_at       TEXT NOT NULL
);

-- Workout templates (just name)
CREATE TABLE workout_templates (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Template exercises (just order, no sets/reps/rest)
CREATE TABLE template_exercises (
  id          TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  order_index INTEGER NOT NULL,
  created_at  TEXT NOT NULL
);

-- Foods (same schema as v2, just missing barcode column)
CREATE TABLE foods (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  brand             TEXT,
  calories_per_100g REAL NOT NULL,
  protein_per_100g  REAL NOT NULL,
  carbs_per_100g    REAL NOT NULL,
  fat_per_100g      REAL NOT NULL,
  fiber_per_100g    REAL,
  is_custom         INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL
);

-- Meals
CREATE TABLE meals (
  id         TEXT PRIMARY KEY,
  date       TEXT NOT NULL,
  meal_type  TEXT NOT NULL,
  name       TEXT,
  logged_at  TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Meal entries (no pre-calculated macros — computed at query time via JOIN with foods)
CREATE TABLE meal_entries (
  id           TEXT PRIMARY KEY,
  meal_id      TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  food_id      TEXT NOT NULL REFERENCES foods(id),
  amount_grams REAL NOT NULL,
  created_at   TEXT NOT NULL
);

-- Meal templates (old system — replaced by Section 7)
CREATE TABLE meal_templates (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  meal_type  TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE meal_template_entries (
  id           TEXT PRIMARY KEY,
  template_id  TEXT NOT NULL REFERENCES meal_templates(id) ON DELETE CASCADE,
  food_id      TEXT NOT NULL,
  food_name    TEXT NOT NULL,
  amount_grams REAL NOT NULL,
  calories     REAL NOT NULL,
  protein_g    REAL NOT NULL,
  carbs_g      REAL NOT NULL,
  fat_g        REAL NOT NULL,
  created_at   TEXT NOT NULL
);

-- Water log (one row per day — replaced by per-event log in Section 8)
CREATE TABLE water_log (
  id         TEXT PRIMARY KEY,
  date       TEXT NOT NULL UNIQUE,
  amount_ml  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Steps log (flat, no distance/calories columns)
CREATE TABLE steps_log (
  id         TEXT PRIMARY KEY,
  date       TEXT NOT NULL UNIQUE,
  step_count INTEGER NOT NULL DEFAULT 0,
  goal       INTEGER NOT NULL DEFAULT 8000,
  created_at TEXT NOT NULL
);

-- Step sessions (manual session logging — removed in Section 8)
CREATE TABLE step_sessions (
  id               TEXT PRIMARY KEY,
  date             TEXT NOT NULL,
  activity_type    TEXT NOT NULL DEFAULT 'walk',
  step_count       INTEGER NOT NULL,
  duration_minutes REAL,
  incline          INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL
);

-- Body weight log (removed in Section 9)
CREATE TABLE body_weight_log (
  id         TEXT PRIMARY KEY,
  date       TEXT NOT NULL UNIQUE,
  weight_kg  REAL NOT NULL,
  created_at TEXT NOT NULL
);

-- Body measurements (removed in Section 9)
CREATE TABLE body_measurements (
  id             TEXT PRIMARY KEY,
  date           TEXT NOT NULL UNIQUE,
  chest_cm       REAL,
  waist_cm       REAL,
  hips_cm        REAL,
  left_arm_cm    REAL,
  right_arm_cm   REAL,
  left_thigh_cm  REAL,
  right_thigh_cm REAL,
  notes          TEXT,
  created_at     TEXT NOT NULL
);

-- Sleep logs (removed in Section 9)
CREATE TABLE sleep_logs (
  id               TEXT PRIMARY KEY,
  date             TEXT NOT NULL UNIQUE,
  bedtime          TEXT NOT NULL,
  wake_time        TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  quality          INTEGER,
  notes            TEXT,
  created_at       TEXT NOT NULL
);

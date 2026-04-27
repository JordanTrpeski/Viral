import * as SQLite from 'expo-sqlite'

export const db = SQLite.openDatabaseSync('viral.db')

export function initDatabase(): void {
  db.execSync('PRAGMA journal_mode = WAL;')
  db.execSync('PRAGMA foreign_keys = ON;')

  db.execSync(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      date_of_birth     TEXT NOT NULL,
      weight_kg         REAL NOT NULL,
      height_cm         REAL NOT NULL,
      goals             TEXT NOT NULL,
      calorie_goal_kcal INTEGER,
      created_at        TEXT NOT NULL,
      updated_at        TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS daily_log (
      id         TEXT PRIMARY KEY,
      date       TEXT NOT NULL UNIQUE,
      notes      TEXT,
      created_at TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS body_weight_log (
      id         TEXT PRIMARY KEY,
      date       TEXT NOT NULL UNIQUE,
      weight_kg  REAL NOT NULL,
      created_at TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS exercises (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      muscle_group TEXT NOT NULL,
      equipment    TEXT,
      is_custom    INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id               TEXT PRIMARY KEY,
      date             TEXT NOT NULL,
      name             TEXT,
      duration_minutes INTEGER,
      notes            TEXT,
      started_at       TEXT NOT NULL,
      ended_at         TEXT,
      created_at       TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS workout_sets (
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
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS workout_templates (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS template_exercises (
      id          TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id),
      order_index INTEGER NOT NULL,
      created_at  TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS checklists (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      is_template INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS foods (
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
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS meals (
      id         TEXT PRIMARY KEY,
      date       TEXT NOT NULL,
      meal_type  TEXT NOT NULL,
      name       TEXT,
      logged_at  TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS meal_entries (
      id           TEXT PRIMARY KEY,
      meal_id      TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
      food_id      TEXT NOT NULL REFERENCES foods(id),
      amount_grams REAL NOT NULL,
      created_at   TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS water_log (
      id         TEXT PRIMARY KEY,
      date       TEXT NOT NULL UNIQUE,
      amount_ml  INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS checklist_items (
      id           TEXT PRIMARY KEY,
      checklist_id TEXT NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
      title        TEXT NOT NULL,
      is_checked   INTEGER NOT NULL DEFAULT 0,
      order_index  INTEGER NOT NULL,
      created_at   TEXT NOT NULL
    );
  `)

  // ── Budget ──────────────────────────────────────────────────────────────────

  db.execSync(`
    CREATE TABLE IF NOT EXISTS budget_categories (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      type            TEXT NOT NULL CHECK(type IN ('income','expense')),
      emoji           TEXT NOT NULL,
      color           TEXT NOT NULL,
      monthly_limit   REAL,
      order_index     INTEGER NOT NULL DEFAULT 0,
      is_archived     INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS budget_income (
      id                TEXT PRIMARY KEY,
      source_name       TEXT NOT NULL,
      amount            REAL NOT NULL,
      date              TEXT NOT NULL,
      category_id       TEXT NOT NULL REFERENCES budget_categories(id),
      note              TEXT,
      is_recurring      INTEGER NOT NULL DEFAULT 0,
      recurrence_period TEXT CHECK(recurrence_period IN ('daily','weekly','monthly')),
      created_at        TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS budget_expenses (
      id             TEXT PRIMARY KEY,
      merchant_name  TEXT,
      date           TEXT NOT NULL,
      category_id    TEXT NOT NULL REFERENCES budget_categories(id),
      payment_method TEXT CHECK(payment_method IN ('cash','card','online')),
      note           TEXT,
      receipt_photo  TEXT,
      created_at     TEXT NOT NULL
    );
  `)

  // Migration: add receipt_photo if an older db exists without it
  try { db.execSync(`ALTER TABLE budget_expenses ADD COLUMN receipt_photo TEXT`) } catch { /* already exists */ }

  db.execSync(`
    CREATE TABLE IF NOT EXISTS budget_expense_items (
      id         TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL REFERENCES budget_expenses(id) ON DELETE CASCADE,
      item_name  TEXT NOT NULL,
      amount     REAL NOT NULL,
      created_at TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS budget_templates (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      category_id TEXT REFERENCES budget_categories(id),
      last_used_at TEXT,
      created_at  TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS budget_template_items (
      id             TEXT PRIMARY KEY,
      template_id    TEXT NOT NULL REFERENCES budget_templates(id) ON DELETE CASCADE,
      item_name      TEXT NOT NULL,
      default_amount REAL NOT NULL,
      created_at     TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS budget_template_uses (
      id          TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES budget_templates(id) ON DELETE CASCADE,
      expense_id  TEXT,
      total       REAL NOT NULL,
      used_at     TEXT NOT NULL
    );
  `)
}

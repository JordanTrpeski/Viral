import * as SQLite from 'expo-sqlite'

export const db = SQLite.openDatabaseSync('viral.db')

export function initDatabase(): void {
  db.execSync('PRAGMA journal_mode = WAL;')
  db.execSync('PRAGMA foreign_keys = ON;')

  // ── v1.1.0 migration ──────────────────────────────────────────────────────
  // Drop old Health tables that have incompatible schemas and recreate them.
  // Guarded by PRAGMA user_version so this only ever runs once.
  // Non-health tables (budget, organizer, habits, checklist) are untouched.
  // Tables still used by the old dashboard (body_weight_log, sleep_logs,
  // step_sessions, water_log) are kept until Sections 8/9 rebuild them.
  const versionRow = db.getFirstSync<{ user_version: number }>('PRAGMA user_version')
  const schemaVersion = versionRow?.user_version ?? 0

  if (schemaVersion < 2) {
    db.execSync('PRAGMA foreign_keys = OFF;')
    db.execSync('DROP TABLE IF EXISTS meal_template_entries')
    db.execSync('DROP TABLE IF EXISTS meal_templates')
    db.execSync('DROP TABLE IF EXISTS template_exercises')
    db.execSync('DROP TABLE IF EXISTS workout_sets')
    db.execSync('DROP TABLE IF EXISTS workout_sessions')
    db.execSync('DROP TABLE IF EXISTS workout_templates')
    db.execSync('DROP TABLE IF EXISTS exercises')
    db.execSync('PRAGMA foreign_keys = ON;')
    db.execSync('PRAGMA user_version = 2;')
  }

  // ── Core / shared tables ──────────────────────────────────────────────────

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

  // ADD columns to user_profile if upgrading from very early schema
  try { db.execSync(`ALTER TABLE user_profile ADD COLUMN sex TEXT`) } catch { /* already exists */ }
  try { db.execSync(`ALTER TABLE user_profile ADD COLUMN activity_level TEXT`) } catch { /* already exists */ }
  try { db.execSync(`ALTER TABLE user_profile ADD COLUMN goal_weight_kg REAL`) } catch { /* already exists */ }

  // ── Workout tables (v1.1.0 schema) ───────────────────────────────────────

  db.execSync(`
    CREATE TABLE IF NOT EXISTS exercises (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      slug              TEXT UNIQUE NOT NULL,
      category          TEXT NOT NULL,
      primary_muscles   TEXT NOT NULL,
      secondary_muscles TEXT,
      equipment         TEXT NOT NULL,
      movement_pattern  TEXT,
      description       TEXT,
      form_cues         TEXT,
      common_mistakes   TEXT,
      difficulty        TEXT,
      substitute_ids    TEXT,
      is_unilateral     INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS workout_templates (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      description    TEXT,
      goal_type      TEXT,
      duration_weeks INTEGER,
      days_per_week  INTEGER,
      created_at     TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS template_exercises (
      id           TEXT PRIMARY KEY,
      template_id  TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
      exercise_id  TEXT NOT NULL REFERENCES exercises(id),
      day_number   INTEGER NOT NULL,
      order_index  INTEGER NOT NULL,
      sets         INTEGER NOT NULL,
      rep_min      INTEGER,
      rep_max      INTEGER,
      rest_seconds INTEGER DEFAULT 90,
      notes        TEXT,
      is_optional  INTEGER DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
  try { db.execSync(`ALTER TABLE template_exercises ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'))`) } catch { /* already exists */ }

  db.execSync(`
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id                   TEXT PRIMARY KEY,
      template_id          TEXT REFERENCES workout_templates(id),
      date                 TEXT NOT NULL,
      started_at           TEXT NOT NULL,
      ended_at             TEXT,
      duration_seconds     INTEGER,
      notes                TEXT,
      perceived_difficulty INTEGER,
      created_at           TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS workout_sets (
      id               TEXT PRIMARY KEY,
      session_id       TEXT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
      exercise_id      TEXT NOT NULL REFERENCES exercises(id),
      set_number       INTEGER NOT NULL,
      target_reps      INTEGER,
      performed_reps   INTEGER,
      target_weight    REAL,
      performed_weight REAL,
      rpe              INTEGER,
      is_warmup        INTEGER NOT NULL DEFAULT 0,
      is_failed        INTEGER NOT NULL DEFAULT 0,
      tempo            TEXT,
      notes            TEXT,
      completed_at     TEXT
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS exercise_prs (
      id                   TEXT PRIMARY KEY,
      exercise_id          TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      date                 TEXT NOT NULL,
      weight_kg            REAL NOT NULL DEFAULT 0,
      reps                 INTEGER NOT NULL DEFAULT 0,
      estimated_one_rep_max REAL NOT NULL DEFAULT 0,
      session_id           TEXT REFERENCES workout_sessions(id),
      created_at           TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
  try { db.execSync(`ALTER TABLE exercise_prs ADD COLUMN weight_kg REAL NOT NULL DEFAULT 0`) } catch { /* already exists */ }
  try { db.execSync(`ALTER TABLE exercise_prs ADD COLUMN estimated_one_rep_max REAL NOT NULL DEFAULT 0`) } catch { /* already exists */ }
  try { db.execSync(`ALTER TABLE exercise_prs ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'))`) } catch { /* already exists */ }

  // ── Nutrition tables (v1.1.0 schema) ─────────────────────────────────────

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
      barcode           TEXT,
      created_at        TEXT NOT NULL
    );
  `)
  // Add barcode column for databases predating v1.1.0
  try { db.execSync(`ALTER TABLE foods ADD COLUMN barcode TEXT`) } catch { /* already exists */ }

  db.execSync(`
    CREATE TABLE IF NOT EXISTS meals (
      id         TEXT PRIMARY KEY,
      date       TEXT NOT NULL,
      meal_type  TEXT NOT NULL,
      name       TEXT,
      logged_at  TEXT,
      created_at TEXT NOT NULL
    );
  `)

  // meal_entries: keep old amount_grams for backward compat with existing dietQueries.ts,
  // new columns (grams, calories, protein, carbs, fat) used by v1.1.0 nutrition module.
  db.execSync(`
    CREATE TABLE IF NOT EXISTS meal_entries (
      id           TEXT PRIMARY KEY,
      meal_id      TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
      food_id      TEXT NOT NULL REFERENCES foods(id),
      amount_grams REAL,
      grams        REAL,
      calories     REAL,
      protein      REAL,
      carbs        REAL,
      fat          REAL
    );
  `)
  // Add new columns for databases predating v1.1.0
  try { db.execSync(`ALTER TABLE meal_entries ADD COLUMN grams REAL`) } catch { /* already exists */ }
  try { db.execSync(`ALTER TABLE meal_entries ADD COLUMN calories REAL`) } catch { /* already exists */ }
  try { db.execSync(`ALTER TABLE meal_entries ADD COLUMN protein REAL`) } catch { /* already exists */ }
  try { db.execSync(`ALTER TABLE meal_entries ADD COLUMN carbs REAL`) } catch { /* already exists */ }
  try { db.execSync(`ALTER TABLE meal_entries ADD COLUMN fat REAL`) } catch { /* already exists */ }

  db.execSync(`
    CREATE TABLE IF NOT EXISTS nutrition_goals (
      id           TEXT PRIMARY KEY,
      date         TEXT NOT NULL UNIQUE,
      calorie_goal INTEGER NOT NULL,
      protein_goal INTEGER NOT NULL,
      carbs_goal   INTEGER NOT NULL,
      fat_goal     INTEGER NOT NULL
    );
  `)

  // New per-event water entries table (Section 8 uses this; old water_log kept for compat)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS water_entries (
      id        TEXT PRIMARY KEY,
      date      TEXT NOT NULL,
      amount_ml INTEGER NOT NULL,
      logged_at TEXT NOT NULL
    );
  `)

  // Old water_log kept for backward compat until Section 8 migration
  db.execSync(`
    CREATE TABLE IF NOT EXISTS water_log (
      id         TEXT PRIMARY KEY,
      date       TEXT NOT NULL UNIQUE,
      amount_ml  INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `)

  // ── Steps table (v1.1.0 schema) ───────────────────────────────────────────

  db.execSync(`
    CREATE TABLE IF NOT EXISTS steps_log (
      id                 TEXT PRIMARY KEY,
      date               TEXT NOT NULL UNIQUE,
      step_count         INTEGER NOT NULL DEFAULT 0,
      goal               INTEGER NOT NULL DEFAULT 10000,
      distance_km        REAL,
      calories_burned    INTEGER,
      synced_from_health INTEGER NOT NULL DEFAULT 0,
      created_at         TEXT NOT NULL
    );
  `)
  // Add new columns for databases predating v1.1.0
  try { db.execSync(`ALTER TABLE steps_log ADD COLUMN distance_km REAL`) } catch { /* already exists */ }
  try { db.execSync(`ALTER TABLE steps_log ADD COLUMN calories_burned INTEGER`) } catch { /* already exists */ }
  try { db.execSync(`ALTER TABLE steps_log ADD COLUMN synced_from_health INTEGER NOT NULL DEFAULT 0`) } catch { /* already exists */ }

  // step_sessions kept for backward compat until Section 8 removes it
  db.execSync(`
    CREATE TABLE IF NOT EXISTS step_sessions (
      id               TEXT PRIMARY KEY,
      date             TEXT NOT NULL,
      activity_type    TEXT NOT NULL DEFAULT 'walk',
      step_count       INTEGER NOT NULL,
      duration_minutes REAL,
      incline          INTEGER NOT NULL DEFAULT 0,
      created_at       TEXT NOT NULL
    );
  `)

  // ── Legacy Health tables (kept until later sections remove them) ──────────

  db.execSync(`
    CREATE TABLE IF NOT EXISTS body_weight_log (
      id         TEXT PRIMARY KEY,
      date       TEXT NOT NULL UNIQUE,
      weight_kg  REAL NOT NULL,
      created_at TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS body_measurements (
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
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS sleep_logs (
      id               TEXT PRIMARY KEY,
      date             TEXT NOT NULL UNIQUE,
      bedtime          TEXT NOT NULL,
      wake_time        TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      quality          INTEGER,
      notes            TEXT,
      created_at       TEXT NOT NULL
    );
  `)

  // ── Checklist ─────────────────────────────────────────────────────────────

  db.execSync(`
    CREATE TABLE IF NOT EXISTS checklists (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      is_template INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL
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

  // ── Budget ────────────────────────────────────────────────────────────────

  db.execSync(`
    CREATE TABLE IF NOT EXISTS budget_categories (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      type          TEXT NOT NULL CHECK(type IN ('income','expense')),
      emoji         TEXT NOT NULL,
      color         TEXT NOT NULL,
      monthly_limit REAL,
      order_index   INTEGER NOT NULL DEFAULT 0,
      is_archived   INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL
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
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      category_id  TEXT REFERENCES budget_categories(id),
      last_used_at TEXT,
      created_at   TEXT NOT NULL
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

  // ── Organizer ─────────────────────────────────────────────────────────────

  db.execSync(`
    CREATE TABLE IF NOT EXISTS organizer_tiers (
      id                         TEXT PRIMARY KEY,
      name                       TEXT NOT NULL,
      color                      TEXT NOT NULL,
      emoji                      TEXT NOT NULL,
      daily_countdown            INTEGER NOT NULL DEFAULT 0,
      daily_countdown_start_days INTEGER NOT NULL DEFAULT 7,
      order_index                INTEGER NOT NULL DEFAULT 0,
      is_system                  INTEGER NOT NULL DEFAULT 0,
      created_at                 TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS organizer_tier_rules (
      id                TEXT PRIMARY KEY,
      tier_id           TEXT NOT NULL REFERENCES organizer_tiers(id) ON DELETE CASCADE,
      days_before       INTEGER NOT NULL,
      notification_time TEXT NOT NULL DEFAULT '09:00',
      message_template  TEXT NOT NULL,
      is_enabled        INTEGER NOT NULL DEFAULT 1,
      created_at        TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS organizer_people (
      id                     TEXT PRIMARY KEY,
      name                   TEXT NOT NULL,
      birthday_day           INTEGER,
      birthday_month         INTEGER,
      birthday_year          INTEGER,
      photo_uri              TEXT,
      tier_id                TEXT NOT NULL REFERENCES organizer_tiers(id),
      relationship           TEXT,
      phone                  TEXT,
      notes                  TEXT,
      override_notifications INTEGER NOT NULL DEFAULT 0,
      created_at             TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS organizer_person_rules (
      id                TEXT PRIMARY KEY,
      person_id         TEXT NOT NULL REFERENCES organizer_people(id) ON DELETE CASCADE,
      days_before       INTEGER NOT NULL,
      notification_time TEXT NOT NULL DEFAULT '09:00',
      message_template  TEXT NOT NULL,
      is_enabled        INTEGER NOT NULL DEFAULT 1,
      created_at        TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS organizer_gift_ideas (
      id             TEXT PRIMARY KEY,
      person_id      TEXT NOT NULL REFERENCES organizer_people(id) ON DELETE CASCADE,
      idea           TEXT NOT NULL,
      price_estimate REAL,
      is_purchased   INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS organizer_reminders (
      id            TEXT PRIMARY KEY,
      title         TEXT NOT NULL,
      due_date      TEXT NOT NULL,
      due_time      TEXT,
      repeat        TEXT CHECK(repeat IN ('none','daily','weekly','monthly','yearly')),
      priority      TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
      person_id     TEXT REFERENCES organizer_people(id) ON DELETE SET NULL,
      note_id       TEXT,
      is_completed  INTEGER NOT NULL DEFAULT 0,
      completed_at  TEXT,
      snoozed_until TEXT,
      created_at    TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS organizer_events (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      date       TEXT NOT NULL,
      start_time TEXT,
      end_time   TEXT,
      is_all_day INTEGER NOT NULL DEFAULT 0,
      location   TEXT,
      repeat     TEXT CHECK(repeat IN ('none','daily','weekly','monthly','yearly')),
      color      TEXT,
      notes      TEXT,
      person_id  TEXT REFERENCES organizer_people(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS organizer_event_reminders (
      id             TEXT PRIMARY KEY,
      event_id       TEXT NOT NULL REFERENCES organizer_events(id) ON DELETE CASCADE,
      minutes_before INTEGER NOT NULL,
      created_at     TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS organizer_notes (
      id          TEXT PRIMARY KEY,
      title       TEXT,
      body        TEXT NOT NULL DEFAULT '',
      is_pinned   INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      person_id   TEXT REFERENCES organizer_people(id) ON DELETE SET NULL,
      event_id    TEXT REFERENCES organizer_events(id) ON DELETE SET NULL,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS organizer_tags (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL UNIQUE,
      color      TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS organizer_note_tags (
      note_id TEXT NOT NULL REFERENCES organizer_notes(id) ON DELETE CASCADE,
      tag_id  TEXT NOT NULL REFERENCES organizer_tags(id) ON DELETE CASCADE,
      PRIMARY KEY (note_id, tag_id)
    );
  `)
}

# CLAUDE.md — Health Module

## What This Module Does

Tracks the user's physical health across two sub-modules:
- **Workout**: Log training sessions, exercises, sets, reps, weight. View history. Track progress.
- **Diet**: Log meals and food items, track calories and macros. View daily nutrition summary.

Both sub-modules share a combined daily summary (calories in vs. out, macros, training volume).
The Health module is the first module being built in Phase 1.

---

## Module Structure

```
modules/health/
├── CLAUDE.md                        ← YOU ARE HERE
├── shared/
│   ├── types.ts                     ← Health-specific TypeScript types
│   ├── healthStore.ts               ← Zustand store for this module
│   ├── healthDb.ts                  ← All DB queries for health (read/write)
│   └── DailySummary.tsx             ← Combined calories in/out + macros widget
├── workout/
│   ├── components/
│   │   ├── ExerciseCard.tsx
│   │   ├── SetRow.tsx
│   │   ├── WorkoutSessionCard.tsx
│   │   └── MuscleGroupBadge.tsx
│   ├── screens/
│   │   ├── WorkoutHomeScreen.tsx    ← Today's workout + start session button
│   │   ├── ActiveSessionScreen.tsx ← Live workout logging
│   │   ├── HistoryScreen.tsx       ← Past sessions list
│   │   └── ExerciseLibraryScreen.tsx
│   └── workoutUtils.ts             ← Volume calc, 1RM estimate, etc.
└── diet/
    ├── components/
    │   ├── MealCard.tsx
    │   ├── FoodSearchRow.tsx
    │   ├── MacroBar.tsx
    │   └── CalorieSummary.tsx
    ├── screens/
    │   ├── DietHomeScreen.tsx       ← Today's meals + log meal button
    │   ├── LogMealScreen.tsx        ← Add food to a meal
    │   ├── FoodSearchScreen.tsx     ← Search food database
    │   └── NutritionHistoryScreen.tsx
    └── dietUtils.ts                ← Macro calculations, TDEE helpers
```

---

## Database Schema

All tables are defined in `core/db/migrations/`. Health module owns these tables:

### Workout Tables

```sql
-- Exercise library (seeded with common exercises, user can add custom)
CREATE TABLE exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,        -- 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio'
  equipment TEXT,                    -- 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'cable'
  is_custom INTEGER DEFAULT 0,       -- 1 = user-created
  created_at TEXT NOT NULL
);

-- A workout session (one per training day)
CREATE TABLE workout_sessions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,                -- YYYY-MM-DD
  name TEXT,                        -- e.g. "Push Day A", optional
  duration_minutes INTEGER,
  notes TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  created_at TEXT NOT NULL
);

-- Sets logged within a session
CREATE TABLE workout_sets (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  set_number INTEGER NOT NULL,
  reps INTEGER,
  weight_kg REAL,
  duration_seconds INTEGER,         -- for timed exercises (planks, etc.)
  notes TEXT,
  created_at TEXT NOT NULL
);
```

### Diet Tables

```sql
-- Food item database (seeded + user-added)
CREATE TABLE foods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  calories_per_100g REAL NOT NULL,
  protein_per_100g REAL NOT NULL,
  carbs_per_100g REAL NOT NULL,
  fat_per_100g REAL NOT NULL,
  fiber_per_100g REAL,
  is_custom INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

-- A meal (breakfast, lunch, dinner, snack)
CREATE TABLE meals (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,               -- YYYY-MM-DD
  meal_type TEXT NOT NULL,          -- 'breakfast' | 'lunch' | 'dinner' | 'snack'
  name TEXT,                        -- optional custom name
  logged_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Food items logged within a meal
CREATE TABLE meal_entries (
  id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  food_id TEXT NOT NULL REFERENCES foods(id),
  amount_grams REAL NOT NULL,
  created_at TEXT NOT NULL
);
```

### Derived / Computed (not stored, calculated at query time)

- Total calories for a day = SUM of (food.calories_per_100g * entry.amount_grams / 100)
- Total protein/carbs/fat = same formula per macro
- Calories burned (workout) = estimated from session duration + exercise type (simple formula, not wearable-dependent)
- Net calories = calories_in - calories_burned

---

## TypeScript Types

Defined in `modules/health/shared/types.ts`:

```typescript
// Workout
export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio'
export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'cable' | 'other'

export interface Exercise {
  id: string
  name: string
  muscleGroup: MuscleGroup
  equipment?: Equipment
  isCustom: boolean
  createdAt: string
}

export interface WorkoutSession {
  id: string
  date: string
  name?: string
  durationMinutes?: number
  notes?: string
  startedAt: string
  endedAt?: string
  createdAt: string
}

export interface WorkoutSet {
  id: string
  sessionId: string
  exerciseId: string
  setNumber: number
  reps?: number
  weightKg?: number
  durationSeconds?: number
  notes?: string
  createdAt: string
}

// Diet
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface Food {
  id: string
  name: string
  brand?: string
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g?: number
  isCustom: boolean
  createdAt: string
}

export interface Meal {
  id: string
  date: string
  mealType: MealType
  name?: string
  loggedAt: string
  createdAt: string
}

export interface MealEntry {
  id: string
  mealId: string
  foodId: string
  amountGrams: number
  createdAt: string
}

// Computed / derived
export interface DailyNutritionSummary {
  date: string
  totalCalories: number
  totalProteinG: number
  totalCarbsG: number
  totalFatG: number
  calorieGoal: number               // from UserProfile
  proteinGoalG: number
}

export interface DailyWorkoutSummary {
  date: string
  sessionCount: number
  totalVolumeKg: number             // sum of weight_kg * reps across all sets
  totalDurationMinutes: number
  muscleGroupsHit: MuscleGroup[]
}
```

---

## What This Module Reads from Core

```typescript
// From core/store/userStore
userProfile.weightKg          // used to calculate TDEE and calorie goals
userProfile.heightCm
userProfile.dateOfBirth       // used to calculate age for TDEE
userProfile.goals             // e.g. ['lose_weight', 'build_muscle']
```

It does NOT write back to core/store — it only writes to its own DB tables.

---

## Calorie & Macro Goal Logic

Stored in `modules/health/diet/dietUtils.ts`:

- **TDEE** (Total Daily Energy Expenditure): Mifflin-St Jeor formula + activity multiplier
- **Calorie goal**: TDEE adjusted by goal (deficit -300kcal for loss, surplus +200kcal for gain)
- **Protein goal**: 2.0g per kg bodyweight (default)
- **Carb goal**: fills remaining calories after protein + fat
- **Fat goal**: 25% of total calories

These are calculated fresh from `UserProfile` each time — not stored.

---

## Current Tasks (Phase 1)

- [ ] DB migration file for all health tables
- [ ] Seed data: 50 common exercises
- [ ] WorkoutHomeScreen — today's session card + "Start Workout" button
- [ ] ActiveSessionScreen — add exercises, log sets in real time
- [ ] HistoryScreen — list of past sessions, tap to expand
- [ ] DietHomeScreen — today's meal list + running calorie count
- [ ] LogMealScreen — pick meal type, search food, enter grams
- [ ] DailySummary widget — shared component for home dashboard

---

## Known Constraints / Decisions

- **No barcode scanner in Phase 1** — food must be searched by name from seeded database
- **No wearable integration** — calorie burn is estimated, not from device sensors
- **Offline only in Phase 1** — no cloud sync yet, all data in local SQLite
- **No social/sharing features** — this is a private personal tool

---

## When Working on This Module

1. Read this file + `core/types/index.ts` + the specific component/screen you're touching
2. All DB access goes through `modules/health/shared/healthDb.ts` — do not write raw SQL in components
3. All state goes through `modules/health/shared/healthStore.ts` — do not use useState for shared data
4. UI components go in `modules/health/workout/components/` or `modules/health/diet/components/`
5. Do not reach into `/modules/budget` or any other module

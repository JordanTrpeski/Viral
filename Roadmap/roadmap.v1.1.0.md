# roadmap.v1.1.0.md — Health Module Complete Rebuild

## Status: Active (start immediately after review)
## Prerequisites: Current app fully functional with all modules
## Deployment version: 1.1.0 (major rebuild)
## Scope: Complete teardown and rebuild of entire Health section

---

## CRITICAL: Read This First

This is a **complete rebuild**. All existing Health module code will be deleted:
- ❌ Old workout system
- ❌ Old diet/nutrition system  
- ❌ Body weight tracking
- ❌ Body measurements
- ❌ Steps tracking (old version)
- ❌ Water tracking (old version)
- ❌ Sleep tracking

**What we're building from scratch:**
- ✅ New workout logger with templates, programs, analytics
- ✅ New nutrition tracker with meal planning, macros, analytics
- ✅ New water tracker integrated with nutrition
- ✅ New steps tracker with better analytics
- ✅ Health hub with sub-sections (Workout, Nutrition, Water, Steps)
- ✅ Multiple dashboard cards (one per sub-section)
- ✅ AI placeholders (keys blank, ready to activate later)

---

## Rules for Claude Code

- Work through tasks IN ORDER — do not skip ahead
- After completing each task check it off: [ ] becomes [x]
- Do not mark a task done unless it works on BOTH web and mobile
- After each section completes, report completion and wait for confirmation before starting next section
- When all tasks in a section are checked, STOP and ask: "Section X complete. Ready to start Section Y?"

---

## Design Rules — MANDATORY

Every screen, component, or UI element must follow the existing design system:

**Colors (theme tokens only, never hardcode):**
- Background: #0F0F0F
- Cards: #1C1C1E
- Surface2: #2A2A2A
- Primary: #6C63FF
- Success: #30D158
- Warning: #FFD60A
- Danger: #FF453A
- Text: #F5F5F5
- Muted: #636366
- Border: rgba(255,255,255,0.07)

**Typography:**
- Screen titles: 24px/700
- Section headers: 18px/600
- Card titles: 16px/600
- Body text: 14px/400
- Labels: 12px/400

**Spacing:**
- Screen horizontal padding: 16px
- Card gap: 12px
- Border radius: 12-18px on cards, 8-12px on buttons/inputs

**Components:**
- Reuse existing Button, Card, BottomSheet from `core/components`
- Dark mode only — every element must be readable on #0F0F0F background
- Match visual density of existing Budget/Organizer screens

**Mobile-first:**
- 48px minimum tap targets
- One-handed thumb-friendly layouts
- Fast input (pre-filled values, one-tap confirm)

---

## Premium Feature Tags

Features marked `[PREMIUM]` are planned for MyOS Premium subscription later.
Build them fully functional now, no paywalls yet. We'll add entitlement checks in a future roadmap.

Premium features include:
- Unlimited templates/programs
- Advanced analytics
- AI features (weekly summaries, swap suggestions, insights)
- Cloud sync & backup
- Export data

---

## Section 1 — Database Teardown & New Schema

**Goal:** Delete all old Health tables, create new clean schema for Workout, Nutrition, Water, Steps.

- [x] **1.1 Backup current Health data**
      Before deleting anything, export all existing Health module data to JSON files in `/backups/health-v1/`.
      This includes: workouts, diet logs, body weight, measurements, steps, water, sleep.
      User may want to reference this later.

- [x] **1.2 Delete old Health tables**
      Drop all tables related to old Health module:
      - workout_sessions, workout_sets, workout_templates, workout_exercises
      - meals, meal_entries, foods, food_seed
      - body_weight_log, body_measurements
      - steps_log, step_sessions
      - water_log
      - sleep_logs
      Run migration to cleanly remove these tables.

- [x] **1.3 Create Workout schema**
      New tables:
      ```sql
      CREATE TABLE exercises (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL, -- strength, cardio, mobility
        primary_muscles TEXT NOT NULL, -- JSON array: ["chest", "triceps"]
        secondary_muscles TEXT, -- JSON array
        equipment TEXT NOT NULL, -- barbell, dumbbell, machine, bodyweight, cable, band
        movement_pattern TEXT, -- push, pull, squat, hinge, carry, core
        description TEXT,
        form_cues TEXT, -- JSON array of technique tips
        common_mistakes TEXT, -- JSON array
        difficulty TEXT, -- beginner, intermediate, advanced
        substitute_ids TEXT, -- JSON array of exercise IDs
        is_unilateral INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE workout_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        goal_type TEXT, -- strength, hypertrophy, endurance
        duration_weeks INTEGER,
        days_per_week INTEGER,
        created_at TEXT NOT NULL
      );

      CREATE TABLE template_exercises (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        day_number INTEGER NOT NULL, -- 1-7
        order_index INTEGER NOT NULL,
        sets INTEGER NOT NULL,
        rep_min INTEGER,
        rep_max INTEGER,
        rest_seconds INTEGER DEFAULT 90,
        notes TEXT,
        is_optional INTEGER DEFAULT 0
      );

      CREATE TABLE workout_sessions (
        id TEXT PRIMARY KEY,
        template_id TEXT REFERENCES workout_templates(id),
        date TEXT NOT NULL, -- YYYY-MM-DD
        started_at TEXT NOT NULL, -- ISO timestamp
        ended_at TEXT, -- ISO timestamp
        duration_seconds INTEGER,
        notes TEXT,
        perceived_difficulty INTEGER, -- 1-10
        created_at TEXT NOT NULL
      );

      CREATE TABLE workout_sets (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        set_number INTEGER NOT NULL,
        target_reps INTEGER,
        performed_reps INTEGER,
        target_weight REAL,
        performed_weight REAL,
        rpe INTEGER, -- 1-10 rate of perceived exertion
        is_warmup INTEGER DEFAULT 0,
        is_failed INTEGER DEFAULT 0,
        tempo TEXT, -- e.g. "3-1-1-0"
        notes TEXT,
        completed_at TEXT
      );

      CREATE TABLE exercise_prs (
        id TEXT PRIMARY KEY,
        exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        metric_type TEXT NOT NULL, -- max_weight, max_reps, max_volume
        value REAL NOT NULL,
        reps INTEGER, -- for max_weight PRs
        date TEXT NOT NULL,
        session_id TEXT REFERENCES workout_sessions(id)
      );
      ```

- [x] **1.4 Create Nutrition schema**
      New tables:
      ```sql
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
        barcode TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE meals (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL, -- YYYY-MM-DD
        meal_type TEXT NOT NULL, -- breakfast, lunch, dinner, snack
        name TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE meal_entries (
        id TEXT PRIMARY KEY,
        meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
        food_id TEXT NOT NULL REFERENCES foods(id),
        grams REAL NOT NULL,
        calories REAL NOT NULL,
        protein REAL NOT NULL,
        carbs REAL NOT NULL,
        fat REAL NOT NULL
      );

      CREATE TABLE nutrition_goals (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE, -- YYYY-MM-DD
        calorie_goal INTEGER NOT NULL,
        protein_goal INTEGER NOT NULL,
        carbs_goal INTEGER NOT NULL,
        fat_goal INTEGER NOT NULL
      );

      CREATE TABLE water_log (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL, -- YYYY-MM-DD
        amount_ml INTEGER NOT NULL,
        logged_at TEXT NOT NULL
      );
      ```

- [x] **1.5 Create Steps schema**
      New table:
      ```sql
      CREATE TABLE steps_log (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE, -- YYYY-MM-DD
        step_count INTEGER NOT NULL DEFAULT 0,
        goal INTEGER NOT NULL DEFAULT 10000,
        distance_km REAL,
        calories_burned INTEGER,
        synced_from_health INTEGER DEFAULT 0,
        updated_at TEXT NOT NULL
      );
      ```

- [x] **1.6 Seed exercise library (50 exercises)**
      Create `/modules/health/data/exerciseSeed.ts` with 50 exercises covering:
      - Barbell: squat, bench, deadlift, overhead press, row, curl, lunge
      - Dumbbell: press, row, curl, fly, lateral raise, shrug
      - Machine: leg press, chest press, lat pulldown, leg curl, leg extension
      - Cable: face pull, tricep pushdown, cable fly, cable row
      - Bodyweight: push-up, pull-up, dip, plank, lunge
      - Core: ab wheel, hanging leg raise, Russian twist
      - Cardio: treadmill run, bike, rowing machine
      
      Each exercise needs: name, muscles, equipment, difficulty, description, 2-3 form cues, 2-3 common mistakes, substitute IDs.
      Run migration to insert these on first app launch.

- [x] **1.7 Seed food database (100 common foods)**
      Create `/modules/health/data/foodSeed.ts` with 100 common foods:
      - Proteins: chicken breast, ground beef, salmon, eggs, tofu, protein powder
      - Carbs: rice, pasta, bread, oats, potato, quinoa
      - Fats: olive oil, butter, avocado, nuts, seeds
      - Fruits: banana, apple, berries, orange
      - Vegetables: broccoli, spinach, carrots, peppers
      - Dairy: milk, yogurt, cheese
      - Common packaged: protein bar, cereal, granola
      
      Each food needs: name, brand (optional), calories, protein, carbs, fat per 100g.
      Run migration to insert on first launch.

**Section 1 checkpoint:** All old tables deleted, new schema created, exercise and food libraries seeded. Report completion before starting Section 2.

---

## Section 2 — Workout Module: Exercise Library

**Goal:** Build the exercise library screen where users can browse, search, and view exercise details.

- [ ] **2.1 Create Exercise Library screen**
      File: `app/health/workout/exercises/index.tsx`
      
      Layout:
      - Search bar at top
      - Filter chips: All, Barbell, Dumbbell, Machine, Bodyweight, Cable
      - Muscle group filter: All, Chest, Back, Legs, Shoulders, Arms, Core
      - Exercise list: each card shows exercise name, primary muscles, equipment icon
      - Tap card → navigate to exercise detail
      
      Use FlatList with search + filter logic. Pre-load all 50 exercises from SQLite on mount.

- [ ] **2.2 Create Exercise Detail screen**
      File: `app/health/workout/exercises/[id].tsx`
      
      Sections:
      - Exercise name (24px/700)
      - Equipment + difficulty badges
      - Primary/secondary muscle tags
      - Description text
      - "Form Cues" expandable section with bullet list
      - "Common Mistakes" expandable section with bullet list
      - "Alternatives" section showing substitute exercise cards (tap to navigate)
      - Placeholder for demo video/image (show gray box with "Demo coming soon")
      - "Exercise History" button → navigate to history for this exercise
      
      Match existing screen visual density. Use Card components for sections.

- [ ] **2.3 Create Exercise History screen**
      File: `app/health/workout/exercises/[id]/history.tsx`
      
      Shows all sets ever logged for this exercise:
      - PR card at top (best weight × reps, date)
      - Line graph: weight progression over time (last 10 sessions)
      - List of sessions grouped by date, showing each set (weight, reps, RPE)
      
      Use same SVG chart pattern as body weight chart from old module.

**Section 2 checkpoint:** Exercise library browseable, detail screens show all info, history shows progression graph. Report completion before Section 3.

---

## Section 3 — Workout Module: Logger Core

**Goal:** Build the in-workout logging screen — the most important screen in the entire module.

- [ ] **3.1 Create Today screen (workout hub)**
      File: `app/health/workout/index.tsx`
      
      Blocks:
      - Greeting + current date
      - "Today's Workout" card (if template scheduled) showing:
        - Template name
        - Estimated duration
        - Target muscles
        - "Start Workout" button (large, primary color)
      - If no workout scheduled: "Rest Day" or "Create Workout" button
      - Recent sessions list (last 5): date, template name, duration, volume
      - "Templates" button → navigate to templates screen
      - "History" button → navigate to all sessions
      
      This is the landing screen when user taps "Workout" in Health tab.

- [ ] **3.2 Create active session screen**
      File: `app/health/workout/session/active.tsx`
      
      **Critical UX requirements** (this screen must be FAST):
      
      Layout:
      - Sticky header: elapsed timer, finish button, menu (add exercise, notes)
      - Exercise cards in vertical list (order matches template)
      - Each exercise card:
        - Exercise name + muscle group
        - "Last session" comparison visible (weight/reps from previous time)
        - Set rows: each row shows set number, target reps, weight input, reps input, checkmark button
        - Tapping checkmark completes set → auto-starts rest timer
        - Long-press set row → options: mark warmup, mark failed, add note, delete set
        - "Add Set" button below rows
      - Swipe exercise card actions: skip exercise, swap exercise, view exercise detail
      
      **Input behavior:**
      - Weight and reps fields pre-filled with last session values (if available)
      - One-tap checkmark confirms set with pre-filled values
      - If user changes weight/reps, tapping checkmark uses new values
      - No keyboard unless user explicitly taps input field
      - Fast, one-handed, thumb-friendly
      
      Store all set data in SQLite immediately on checkmark tap. No waiting for finish.

- [ ] **3.3 Implement rest timer**
      When user completes a set:
      - Bottom sheet appears showing countdown (default 90 seconds)
      - Progress bar fills as time passes
      - "Skip Rest" button
      - "Add 30s" button
      - Notification at 0 seconds if app is backgrounded
      - Timer persists if user navigates away (stored in Zustand state)
      - Returning to session shows timer still running
      
      Rest duration configurable in settings (60s, 90s, 120s, custom).

- [ ] **3.4 Create finish session screen**
      File: `app/health/workout/session/finish.tsx`
      
      Triggered when user taps "Finish" in active session header.
      
      Shows:
      - Session summary card:
        - Total duration
        - Total sets
        - Total volume (sets × reps × weight summed)
        - Exercises completed
      - Optional session name input
      - Optional session notes text area
      - PR detection: if any exercise hit a new PR (weight or reps), show highlighted card per PR
      - "Save Workout" button → writes end time to session, navigates back to Today screen
      
      [PREMIUM] PR detection with animation and "New PR!" badge.

- [ ] **3.5 Implement plate calculator utility**
      File: `core/utils/plateCalculator.ts`
      
      Function: `calculatePlates(targetWeight: number, barType: string, unit: string)`
      
      Returns: array of plates needed per side.
      
      Example: 
      - Input: 100kg, Olympic barbell (20kg), metric
      - Output: [20kg × 2, 10kg × 0] = "Load 2×20kg per side"
      
      Accessible from active session screen via long-press on weight input → "Calculate Plates" option.
      Shows bottom sheet with visual plate layout.

**Section 3 checkpoint:** Active session logging works smoothly, rest timer functional, finish screen shows summary + PRs. Report completion before Section 4.

---

## Section 4 — Workout Module: Templates & Programs

**Goal:** Let users create custom templates and use pre-made programs.

- [ ] **4.1 Create Templates screen**
      File: `app/health/workout/templates/index.tsx`
      
      Sections:
      - "My Templates" list: shows custom templates user created
        Each card: name, exercise count, last used date
        Swipe actions: edit, duplicate, delete
      - "Pre-Made Programs" section: 3 curated programs (see 4.3)
        Each card: program name, goal, duration, days/week
        Tap → view program details
      - "+" button → create new template
      
      Free tier limit: 3 custom templates. [PREMIUM] Unlimited.

- [ ] **4.2 Create Template Builder screen**
      File: `app/health/workout/templates/builder.tsx`
      
      Flow:
      - Template name input
      - Goal selector: Strength, Hypertrophy, Endurance, General
      - Exercise list builder:
        - "Add Exercise" button → opens exercise picker (search + filter)
        - Each added exercise shows: name, sets, reps (range or fixed), rest seconds
        - Drag to reorder exercises
        - Tap exercise → edit sets/reps/rest
        - Swipe to delete
      - "Save Template" button
      
      Stores in workout_templates + template_exercises tables.

- [ ] **4.3 Seed 3 pre-made programs**
      Create `/modules/health/data/programSeed.ts`:
      
      **Program 1: Full Body Strength (3 days/week)**
      - Day 1: Squat, Bench, Row, Overhead Press, Core
      - Day 2: Deadlift, Incline Press, Pull-ups, Curls, Core  
      - Day 3: Front Squat, Dips, Cable Rows, Lateral Raises, Core
      
      **Program 2: Push/Pull/Legs (6 days/week)**
      - Push: Bench, Overhead Press, Incline DB Press, Tricep, Lateral Raise
      - Pull: Deadlift, Pull-ups, Barbell Row, Face Pulls, Curls
      - Legs: Squat, Leg Press, Lunges, Leg Curl, Calf Raises
      - Repeat 2x per week
      
      **Program 3: Upper/Lower (4 days/week)**
      - Upper A: Bench, Row, Overhead Press, Pull-ups, Curls
      - Lower A: Squat, Leg Curl, Calf Raise, Core
      - Upper B: Incline Press, Cable Row, Dips, Face Pulls, Triceps
      - Lower B: Deadlift, Leg Press, Lunges, Core
      
      Each program stored as workout_template with template_exercises. Sets/reps/rest defined.

- [ ] **4.4 Create Program Detail screen**
      File: `app/health/workout/programs/[id].tsx`
      
      Shows:
      - Program name and description
      - Goal type, duration, frequency
      - Week-by-week breakdown (expandable)
      - Each day shows exercise list with sets/reps
      - "Start This Program" button → copies template to user's templates, schedules first session
      
      [PREMIUM] Access to full program library (future). Free: 3 curated programs only.

- [ ] **4.5 Implement template progression rules**
      File: `core/utils/progressionRules.ts`
      
      Simple double progression:
      - If user completes all sets at top of rep range (e.g. 3×12), next session suggests +2.5kg
      - If user fails to hit bottom of range (e.g. only gets 3×6 when target is 8-12), weight stays same
      - After 3 sessions with no progress, suggest deload (reduce weight 10%)
      
      Show progression suggestion as a notification on Today screen after finishing a session.

**Section 4 checkpoint:** Templates work, 3 programs seeded, progression suggestions appear. Report completion before Section 5.

---

## Section 5 — Workout Module: Progress & Analytics

**Goal:** Show meaningful progress metrics — PRs, volume trends, muscle group balance.

- [ ] **5.1 Create Workout History screen**
      File: `app/health/workout/history/index.tsx`
      
      Calendar view or list view toggle:
      - **List view:** sessions grouped by month, showing date, template name, duration, volume
        Tap session → session detail
      - **Calendar view:** month grid with dots on days with sessions
        Tap day → that day's session(s)
      
      Filter by template, date range.

- [ ] **5.2 Create Session Detail screen**
      File: `app/health/workout/history/[sessionId].tsx`
      
      Shows completed session breakdown:
      - Date, time, duration
      - Exercise list with all sets (weight, reps, RPE, warmup/failed flags, notes)
      - Session notes
      - Volume total
      - "Repeat This Workout" button → starts new session with same exercises
      - "vs Last Time" comparison if this template was done before

- [ ] **5.3 Implement PR tracking**
      After each session, scan all completed sets:
      - Check if any set is a new max weight for that exercise (at any rep count)
      - Check if any set is a new max reps at a given weight
      - Check if any set is a new max volume (weight × reps)
      
      Store in exercise_prs table. Show on finish screen if PRs detected.
      
      PR screen (`app/health/workout/progress/prs.tsx`):
      - List of all PRs grouped by exercise
      - Each shows: exercise, PR type, value, date achieved

- [ ] **5.4 Create volume analytics screen** [PREMIUM]
      File: `app/health/workout/progress/volume.tsx`
      
      Weekly volume per muscle group:
      - Bar chart: last 4 weeks, stacked bars per muscle (chest, back, legs, shoulders, arms, core)
      - Each muscle shows total sets across all exercises that hit that muscle
      - Warning if any muscle < 10 sets/week or > 30 sets/week
      - Tap muscle → drill down to exercise breakdown
      
      This helps users balance their training.

- [ ] **5.5 Create workout streak tracker**
      Show on Today screen:
      - Current streak (consecutive weeks with ≥2 workouts)
      - Longest streak
      - This week's workout count (e.g. "3 / 4 workouts this week")
      
      Use same streak calculation pattern as Habits module.

- [ ] **5.6 Session comparison feature**
      On session finish screen, if this template was done before:
      - Show "vs Last Time" card comparing:
        - Volume (total, and per exercise)
        - Reps per set
        - Weight per set
      - Highlight improvements in green, regressions in red, same in white
      
      This immediate feedback loop is critical for motivation.

**Section 5 checkpoint:** History browseable, PRs tracked, volume analytics work, streaks shown. Report completion before Section 6.

---

## Section 6 — Workout Module: Smart Features

**Goal:** Add utility features that make the workout experience better — substitutions, warnings, deload planning.

- [ ] **6.1 Exercise substitution system**
      File: `core/utils/exerciseSubstitutions.ts`
      
      When user long-presses an exercise in active session → "Swap Exercise":
      - Show bottom sheet with substitute exercises from exercise library
      - Substitutes filtered by:
        - Same primary muscle group
        - Available equipment (if user has equipment preferences set)
        - Similar movement pattern
      - Each substitute shows name, equipment, difficulty
      - Tap substitute → replaces exercise in current session only (doesn't change template)
      
      Substitution mappings already in exercise seed data (substitute_ids field).

- [ ] **6.2 Volume warnings**
      At end of week (Sunday night), check total sets per muscle group:
      - If any muscle > 25 sets: show notification "High volume on [muscle] this week - consider reducing next week"
      - If any muscle < 8 sets: show notification "Low volume on [muscle] - consider adding more exercises"
      
      Optional feature, can be disabled in settings.

- [ ] **6.3 Deload week planner**
      Every 4 weeks, show notification on Today screen:
      - "You've been training hard for 4 weeks. Consider a deload week."
      - Tap notification → shows deload plan:
        - Reduce weight by 10% on all exercises
        - Or reduce sets by 30%
        - Or take full rest week
      - "Apply Deload" button modifies this week's scheduled sessions
      
      [PREMIUM] Automatic deload scheduling based on fatigue detection.

- [ ] **6.4 Equipment preference system**
      Settings screen option: "Available Equipment"
      - Checkboxes: Barbell, Dumbbell, Machine, Cable, Bodyweight, Bands, Kettlebell
      - When creating templates or swapping exercises, only show exercises matching available equipment
      - Useful for home gym users with limited equipment

**Section 6 checkpoint:** Substitutions work, volume warnings fire, deload planner functional. Report completion before Section 7.

---

## Section 7 — Nutrition Module Rebuild

**Goal:** Rebuild nutrition tracking with similar quality to workout module — fast logging, templates, analytics.

- [ ] **7.1 Create Nutrition Hub screen**
      File: `app/health/nutrition/index.tsx`
      
      Layout:
      - Today's summary card:
        - Large calorie number: consumed / goal
        - Progress bar (green → amber → red as approaching/exceeding goal)
        - Macro pills: Protein (Xg / Yg), Carbs, Fat with mini progress bars
      - Meals section:
        - Breakfast card: shows foods logged, tap to add more
        - Lunch card
        - Dinner card
        - Snacks card
        - Each meal shows total calories, tap to expand food list
        - "Add to [Meal]" button on each card
      - Water card (inline quick-add, see 8.1)
      - "Meal History" button
      - "Food Database" button
      
      This is the landing screen when user taps "Nutrition" in Health tab.

- [ ] **7.2 Create food search & add screen**
      File: `app/health/nutrition/food-search.tsx`
      
      Search bar at top, results list below:
      - Each food card shows: name, brand, calories/100g, macros
      - Tap food → amount input bottom sheet:
        - Grams input (number pad)
        - Calculated calories and macros update live
        - "Add to [Meal]" button
      - "Create Custom Food" button at bottom (see 7.4)
      - Barcode scanner icon button (placeholder, see 7.5)
      
      Search queries foods table, sorts by relevance.

- [ ] **7.3 Create meal detail screen**
      File: `app/health/nutrition/meals/[mealId].tsx`
      
      Shows:
      - Meal type and date
      - Food entries list: each shows name, grams, calories, macros
      - Swipe actions: edit grams, delete entry
      - Total calories and macros at bottom
      - "Add Food" button
      - "Save as Template" button (see 7.6)
      - "Delete Meal" button
      
      Editing grams: tap entry → bottom sheet with grams input, recalculates on save.

- [ ] **7.4 Create custom food creation**
      File: `app/health/nutrition/food-create.tsx`
      
      Form fields:
      - Food name (required)
      - Brand (optional)
      - Per 100g:
        - Calories (required)
        - Protein (required)
        - Carbs (required)
        - Fat (required)
        - Fiber (optional)
      - "Save Food" button → writes to foods table with is_custom = 1
      
      Custom foods appear in search with "Custom" badge.

- [ ] **7.5 Barcode scanner placeholder** [AI Feature]
      File: `app/health/nutrition/barcode-scanner.tsx`
      
      Camera view with barcode overlay (use expo-camera).
      On scan → query Open Food Facts API: `https://world.openfoodfacts.org/api/v0/product/{barcode}.json`
      
      **For now:** Show placeholder message:
      "Barcode scanning uses Open Food Facts API. This feature is ready but requires testing. Coming soon."
      
      Full implementation deferred to AI features phase.

- [ ] **7.6 Meal templates system**
      Similar to workout templates:
      - Save any meal as a template (name + food list with amounts)
      - "My Meal Templates" screen shows saved templates
      - Tap template → adds all foods to selected meal in one action
      - Useful for repeated meals (e.g. "Usual Breakfast")
      
      Free tier: 3 meal templates. [PREMIUM] Unlimited.

- [ ] **7.7 Nutrition goals calculation**
      File: `core/utils/nutritionGoals.ts`
      
      Uses Mifflin-St Jeor formula:
      - BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age + sex_offset
      - TDEE = BMR × activity_multiplier
      - Calorie goal = TDEE + goal_adjustment (deficit for fat loss, surplus for muscle gain)
      - Macro split: protein 2g/kg bodyweight, fat 0.8g/kg, remainder carbs
      
      Pulls user data from profile (weight, height, age, sex, activity level, goal).
      Stores in nutrition_goals table per day.
      Recalculates when user profile changes.

- [ ] **7.8 Nutrition history & analytics** [PREMIUM]
      File: `app/health/nutrition/history.tsx`
      
      Calendar view or list view:
      - Shows daily calorie totals with goal comparison
      - Color-coded: green if within ±100 cal of goal, red if >200 cal over, amber otherwise
      - Tap day → that day's meals breakdown
      
      Weekly averages view:
      - Average daily calories last 7 days
      - Average protein/carbs/fat
      - Days over goal, days under goal
      - Streak of days hitting goal

**Section 7 checkpoint:** Nutrition tracking works, food search fast, custom foods supported, meal templates functional. Report completion before Section 8.

---

## Section 8 — Water & Steps Rebuild

**Goal:** Rebuild water and steps tracking with better UX and analytics.

- [ ] **8.1 Rebuild Water tracking**
      Water is part of nutrition hub (see 7.1) but also has its own detail screen.
      
      File: `app/health/nutrition/water.tsx`
      
      Layout:
      - Large ring showing today's intake vs goal (liters or oz based on units)
      - Quick-add buttons: +250ml, +500ml, +750ml, +1L
      - Custom amount input
      - Goal editor (expandable): preset buttons (1.5L, 2L, 2.5L, 3L) + custom input
      - Today's log history: list of each add event with time and amount
      - Weekly chart: bar graph of last 7 days' intake vs goal
      - "Reset Today" button with confirmation
      
      Stores in water_log table (one row per add event, query sum for daily total).

- [ ] **8.2 Rebuild Steps tracking**
      File: `app/health/steps/index.tsx`
      
      Layout:
      - Large ring showing today's steps vs goal
      - Stats pills: step count, estimated distance, calorie range
      - Goal editor (expandable): preset buttons (5k, 7.5k, 10k, 12k) + custom input
      - Quick-add buttons grid: +500, +1000, +2000, +5000
      - Custom amount input
      - Weekly chart: bar graph of last 7 days' steps vs goal
      - Streak counter: consecutive days hitting goal (skip non-goal days)
      - "Reset Today" button with confirmation
      
      Native pedometer sync:
      - On screen mount, query expo-sensors Pedometer for today's count
      - If available, auto-update steps_log
      - If permission denied, show banner: "Enable step tracking in Settings to auto-sync"
      
      Stores in steps_log table (one row per day).

- [ ] **8.3 Steps goal auto-calculation**
      Default goal based on age (from user profile):
      - < 30 years: 10,000 steps
      - 30-50 years: 9,000 steps
      - > 50 years: 7,500 steps
      
      User can override in goal editor, but this provides sensible default.

**Section 8 checkpoint:** Water tracking works with quick-add, steps tracking works with native sync option. Report completion before Section 9.

---

## Section 9 — Health Hub Integration & Dashboard

**Goal:** Tie all Health sub-sections together, update dashboard with new cards, remove old Health content.

- [ ] **9.1 Create Health Hub screen**
      File: `app/health/index.tsx`
      
      This is the landing screen when user taps "Health" in bottom nav.
      
      Layout:
      - Greeting + date
      - Sub-section cards (4 cards in 2×2 grid or vertical list):
        - **Workout** card: shows today's workout or "Rest Day", tap → workout hub
        - **Nutrition** card: shows today's calorie progress, tap → nutrition hub
        - **Water** card: shows today's intake progress, tap → water detail
        - **Steps** card: shows today's step count, tap → steps detail
      - Each card uses existing Card component, matches Budget/Organizer card styling
      
      This replaces the old Health hub that had body weight, measurements, sleep, etc.

- [ ] **9.2 Remove old Health dashboard cards**
      File: `app/(tabs)/index.tsx`
      
      Delete these cards from home dashboard:
      - Old workout card
      - Old diet card
      - Old body weight card
      - Old steps card
      - Old water card (if it was inline)
      - Old sleep card
      
      These will be replaced with new cards in next task.

- [ ] **9.3 Add new Health dashboard cards**
      File: `app/(tabs)/index.tsx`
      
      Add 4 new cards to dashboard (after Budget card, before Organizer card):
      
      **Workout card:**
      - If workout scheduled today: shows template name, "Start Workout" button
      - If workout in progress: shows "Resume Workout", elapsed time
      - If workout completed: shows "Done ✓", total volume, duration
      - If rest day: shows "Rest Day" with next workout date
      
      **Nutrition card:**
      - Shows today's calorie progress: X / Y kcal
      - Macro pills: P/C/F with mini bars
      - Tap → nutrition hub
      
      **Water card:**
      - Mini ring (60px) showing intake vs goal
      - "X.XL / Y.YL" text
      - Tap → water detail
      
      **Steps card:**
      - Mini ring (60px) showing steps vs goal
      - "X,XXX / Y,YYY" text
      - Tap → steps detail
      
      Use same card styling as existing dashboard cards. Match visual density.

- [ ] **9.4 Update dashboard data loading**
      Refactor dashboard loadAll() to include new Health queries:
      - Today's workout session (if any)
      - Today's nutrition totals
      - Today's water total
      - Today's step count
      
      Each card loads its own data independently (no shared query blocking).

- [ ] **9.5 Update bottom nav Health icon**
      If Health icon needs to change or if Health tab behavior changed, update here.
      Ensure tapping "Health" tab navigates to new Health hub screen.

**Section 9 checkpoint:** Health hub works with 4 sub-sections, dashboard shows 4 new Health cards, old cards removed. Report completion before Section 10.

---

## Section 10 — AI Placeholders & Settings

**Goal:** Create files for AI features with blank API keys, ready to activate later. Add Health settings.

- [ ] **10.1 Create AI weekly workout summary placeholder**
      File: `core/utils/ai/workoutSummary.ts`
      
      Function: `generateWeeklyWorkoutSummary(userId: string, weekStartDate: string)`
      
      Logic:
      - Query last 7 days of workout sessions for user
      - Aggregate: total sessions, total volume, exercises completed, PRs hit
      - Format as structured data
      - Call Claude API (Anthropic) with prompt:
        "Analyze this week's training data and provide 3-5 specific insights and recommendations."
      
      **API key blank:**
      ```typescript
      const ANTHROPIC_API_KEY = ''; // Add your Anthropic API key here
      
      if (!ANTHROPIC_API_KEY) {
        return {
          summary: "Weekly AI summaries require an API key. Add your Anthropic API key in core/utils/ai/workoutSummary.ts to enable this feature.",
          insights: []
        };
      }
      ```
      
      Screen to display: `app/health/workout/insights.tsx`
      Shows placeholder message if key blank, otherwise shows AI-generated summary.
      
      [PREMIUM] AI weekly summaries.

- [ ] **10.2 Create AI exercise swap assistant placeholder**
      File: `core/utils/ai/exerciseSwap.ts`
      
      Function: `suggestExerciseSwap(exerciseId: string, reason: string, equipment: string[])`
      
      Reason examples: "no equipment", "joint pain", "too difficult", "want variation"
      
      Calls Claude API with context:
      - Current exercise details
      - User's available equipment
      - User's experience level
      - Reason for swap
      
      Returns: list of 3-5 substitute exercises with explanations.
      
      **API key blank:** Same pattern as 10.1, placeholder message if no key.
      
      Accessible from active session screen → long-press exercise → "AI Swap Suggestions"
      
      [PREMIUM] AI swap suggestions.

- [ ] **10.3 Create AI food photo recognition placeholder**
      File: `core/utils/ai/foodRecognition.ts`
      
      Function: `recognizeFoodFromPhoto(imageUri: string)`
      
      Uses Gemini Vision API to analyze food photo and return:
      - List of identified foods
      - Estimated portion sizes in grams
      - Confidence scores
      
      **API key blank:**
      ```typescript
      const GEMINI_API_KEY = ''; // Add your Google Gemini API key here
      
      if (!GEMINI_API_KEY) {
        return {
          foods: [],
          message: "Food photo recognition requires a Gemini Vision API key. Add it in core/utils/ai/foodRecognition.ts to enable this feature."
        };
      }
      ```
      
      Screen: food search screen has camera icon → opens camera → capture → shows recognition results or placeholder message.
      
      [PREMIUM] Food photo recognition.

- [ ] **10.4 Create AI nutrition insights placeholder**
      File: `core/utils/ai/nutritionInsights.ts`
      
      Function: `generateWeeklyNutritionInsights(userId: string, weekStartDate: string)`
      
      Similar to workout summary:
      - Query last 7 days of meals
      - Aggregate: average calories, macros, days over/under goal
      - Call Claude API for insights
      
      **API key blank:** Same placeholder pattern.
      
      Screen: `app/health/nutrition/insights.tsx`
      
      [PREMIUM] AI nutrition insights.

- [ ] **10.5 Create Health Settings screen**
      File: `app/health/settings.tsx`
      
      Accessible from Health hub (gear icon top-right).
      
      Settings:
      - Units: metric / imperial
      - Default rest timer: 60s / 90s / 120s / custom
      - Available equipment: checkboxes for barbell, dumbbell, etc.
      - Workout notifications: remind to workout if missed scheduled session
      - Volume warnings: enable/disable weekly volume notifications
      - Nutrition goal source: auto-calculate from profile / manual override
      - Water goal: preset or custom
      - Steps goal: auto (age-based) / custom
      
      All settings stored in MMKV or user preferences table.

- [ ] **10.6 Update onboarding to include Health setup**
      File: `app/onboarding/*`
      
      Add Health-specific questions to onboarding flow:
      - Training experience: beginner / intermediate / advanced
      - Training goal: strength / muscle / fat loss / general fitness
      - Available equipment: select from list
      - Days per week available to train: 2-7
      
      Use these to suggest initial program on first Health hub visit.

**Section 10 checkpoint:** AI placeholder files created with blank keys and helpful messages. Health settings functional. Onboarding includes Health questions. Report completion — Section 10 is final section.

---

## Roadmap v1.1.0 Complete When

- [ ] All 10 sections checked off
- [ ] Old Health module code completely deleted
- [ ] New Workout, Nutrition, Water, Steps modules all functional
- [ ] Dashboard shows 4 new Health cards
- [ ] Health hub shows 4 sub-sections
- [ ] AI placeholder files exist with blank keys
- [ ] No regressions — Budget, Organizer, Habits still work
- [ ] App tested on both mobile and web
- [ ] Zero TypeScript errors

---

## What Comes After v1.1.0

**Next roadmap (v1.1.1):** Premium subscription infrastructure
- Supabase auth setup
- Entitlement system
- Feature gating for Premium features
- Subscription purchase flow (RevenueCat or native)
- Settings screen "Go Premium" section

**Future roadmaps:**
- v1.1.2: AI features activation (add API keys, test, refine)
- v1.1.3: Cloud backup & sync
- v1.1.4: Advanced analytics & insights
- v1.1.5: Social features (optional)

---

## Notes for Claude Code

This is the biggest single rebuild in the project's history. Take your time, work methodically, test each section before moving on.

The goal is quality over speed. A working, polished Health module is better than a rushed, buggy one.

When in doubt: look at existing Budget or Organizer screens for design patterns. Match their visual style, component usage, and interaction patterns.

Good luck. Report completion of each section before continuing.

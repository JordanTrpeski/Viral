# roadmap.v1.md — Phase 1: App Shell + Health + Dashboard

## Status: Active
## Module CLAUDE.md: /modules/health/CLAUDE.md

---

## Goal

Build the foundation of the app and the first fully working module.
By the end of Phase 1 the app should be usable daily for workout tracking,
diet logging, water intake, and body weight logging — all unified on a dashboard.

---

## Build Order (do in this sequence)

1. App Shell
2. Onboarding
3. Settings
4. Body Weight Log
5. Workout
6. Checklist
7. Diet
8. Home Dashboard

Do not skip ahead. Each step depends on the previous.

---

## 1. App Shell

**What:** The container everything else lives in. Navigation, theme, component library.
No business logic here — just the skeleton.

- [ ] Expo project init — TypeScript + Expo Router + NativeWind
- [ ] Theme file — all color tokens as constants (see roadmap.init for values)
- [ ] Dark mode configured as default, light mode available
- [ ] Bottom tab navigator — 3 tabs to start: Home · Health · Checklist
      (built to accept more tabs as phases complete — don't hardcode 3)
- [ ] Splash screen placeholder
- [ ] App icon placeholder

**Core component library** — build these once, use everywhere:
- [ ] Button (primary / secondary / ghost / danger variants)
- [ ] Card (surface card with border radius)
- [ ] Input (text, number — keyboard-aware, never hidden behind keyboard)
- [ ] BottomSheet (slide-up, dismissible, handles safe area)
- [ ] Badge (colored pill label)
- [ ] ProgressBar (height configurable, color configurable)
- [ ] EmptyState (illustration placeholder + message + CTA button)
- [ ] LoadingSpinner
- [ ] SectionHeader (label + optional right-side action)
- [ ] SwipeableRow (swipe left to reveal edit/delete actions)
- [ ] TabBar (in-screen tab switcher, not the bottom nav)
- [ ] SparklineGraph (small inline line chart, no axes)

---

## 2. Onboarding

**What:** First-launch flow. Collects the data every module depends on.
Must complete before anything else is accessible.

- [ ] Welcome screen — name input, large type, minimal UI
- [ ] Profile screen — weight (kg/lbs), height (cm/ft), date of birth
      Show one field at a time, keyboard auto-advances
- [ ] Goal picker — 4 visual cards: Lose Weight / Maintain / Build Muscle / General Health
      Large icons, tap to select, continue button activates on selection
- [ ] Unit preference — metric vs imperial
      Stored globally in core/store — every module reads this
- [ ] Calorie goal screen — show calculated TDEE, user can adjust the number
- [ ] Completion screen — "You're all set" + animated checkmark
      Then navigate to Home dashboard

**Rules:**
- On re-launch after onboarding: skip straight to Home
- All data saved to core/store/userStore and core/db

---

## 3. Settings

**What:** User-editable preferences. Accessible from Home via profile icon.

- [ ] Edit profile — name, weight, height, date of birth, goal
- [ ] Units toggle — kg/lbs and cm/ft, updates everywhere immediately
- [ ] Calorie goal override — manual number input
- [ ] Notification preferences:
      - Workout reminder (time picker)
      - Water reminder (interval picker — every X hours)
- [ ] Data export — generates JSON file of all user data
- [ ] Clear all data — confirmation dialog before action
- [ ] App version display + OTA update status (Expo EAS)

---

## 4. Body Weight Log

**What:** Simple daily weigh-in. Feeds calorie goal calculations in Diet.
Short screen, used in 10 seconds.

- [ ] Log screen — large number input (kg or lbs per units setting)
      Date defaults to today, can change
      Single confirm button
- [ ] Weight history graph — line chart
      Toggle: 7 days / 30 days / 90 days / all time
      Show trend line
      Mark today's entry with a dot
- [ ] BMI display — calculated from height + latest weight
      Show as a number + range label (underweight / normal / overweight)
      Style: informational, never judgmental
- [ ] Streak counter — consecutive days logged
- [ ] Auto-trigger: when new weight is saved, recalculate calorie goal in diet module

---

## 5. Workout

### 5a. Exercise Library

- [ ] SQLite migration for exercises table (see health CLAUDE.md for schema)
- [ ] Seed data — 60+ exercises with muscle group + equipment tags
- [ ] Library screen:
      - Search bar at top
      - Filter row: muscle group chips (All / Chest / Back / Legs / Shoulders / Arms / Core / Cardio)
      - Filter row: equipment chips
      - List of exercise cards
- [ ] Exercise card — name, muscle group badge, equipment tag,
      last performance (weight × reps), personal best marker
- [ ] Add custom exercise — bottom sheet: name + muscle group + equipment
- [ ] Tap exercise → detail screen with full history graph

### 5b. Session Logging

- [ ] Workout home screen:
      - Today's status card: Not started / In progress / Done
      - "Start Workout" primary button
      - Recent sessions list below (last 5)
- [ ] Start session screen:
      - "Load template" option (top)
      - "Start blank" option
      - On blank: session begins immediately
- [ ] Active session screen:
      - Session name (editable, defaults to date)
      - Running duration timer in header
      - Exercise list — each exercise has its set rows below it
      - Per-exercise: previous performance shown in muted text above first set
      - Set row: set number · weight input · reps input · checkmark button
      - Tap checkmark → set logged, rest timer starts
      - "Add set" button below last set of each exercise
      - "Add exercise" FAB at bottom
      - "Finish" button (top right, confirms before saving)
- [ ] Rest timer:
      - Persistent bottom bar — doesn't push content up
      - Amber color, countdown, progress bar
      - Default 90s, configurable in settings
      - Skip button
      - Notification if app is backgrounded during rest
- [ ] Finish screen:
      - Summary: total exercises, total sets, total volume (kg), duration
      - Personal bests highlighted with a star + brief animation
      - "Save & exit" button

### 5c. History & Progress

- [ ] Session history screen — chronological list, tap to expand detail
- [ ] Session detail — all exercises, all sets, duration, notes
- [ ] Progress screen — pick an exercise → line graph of weight over time
      Toggle: max weight per session / total volume per session

### 5d. Templates

- [ ] Save current session as template (from finish screen, one tap)
- [ ] Template library — card grid
- [ ] Template card — name, exercise count, muscle groups as colored pills
- [ ] Load template → pre-fills active session
- [ ] Edit template name, delete template

---

## 6. Checklist

**What:** Simple tap-to-check list. Used during workouts for warmup/cooldown routines.
Can also be used standalone for anything.

- [ ] Checklist home — list of active checklists
- [ ] Default checklist: "Workout Routine" (warmup + cooldown items seeded)
- [ ] Create new checklist — name + add items
- [ ] Checklist detail:
      - Item rows with tap-to-check (animated strikethrough + fade)
      - Add item inline (+ button at bottom)
      - Reorder items (long press drag)
- [ ] Reset checklist — uncheck all items
- [ ] Recurring templates — mark a checklist as a template
      Creates a fresh copy each time you start from it
- [ ] Attach checklist to workout session (optional)

---

## 7. Diet

### 7a. Meal Logging

- [ ] SQLite migration for foods, meals, meal_entries tables (see health CLAUDE.md)
- [ ] Seed data — 100+ common foods with calories + macros per 100g
- [ ] Diet home screen:
      - Calorie progress bar at top (color shifts: green → amber at 80% → red at 100%)
      - Macro pills: P / C / F current vs goal
      - Meal list in time order (breakfast → lunch → dinner → snack)
      - Each meal card: meal type, time, calorie total, mini item list
      - "Add meal" FAB
- [ ] Add meal — bottom sheet: pick meal type via icon cards
- [ ] Food search screen:
      - Search bar → results list
      - Each result: food name, brand (if any), kcal per 100g, macros
      - Tap food → amount input (grams) → calculated totals shown live → add
- [ ] Meal entry: edit grams, delete entry
- [ ] Meal templates:
      - Save current meal as template
      - Load template → adds all items to current meal

### 7b. Water Tracking

- [ ] Water widget on diet home and dashboard
- [ ] Quick-add bottom sheet: +250ml / +500ml / +750ml / custom
- [ ] Daily goal (default 2.5L, editable in settings)
- [ ] Progress ring — fills as you log
- [ ] Optional reminder — notification every X hours (set in settings)

### 7c. Macros & History

- [ ] Macro donut chart — protein / carbs / fat, today's totals
- [ ] Each meal card shows a mini 3-bar macro indicator
- [ ] Nutrition history screen — bar chart, calories per day, 7/30 day toggle

---

## 8. Home Dashboard

**What:** The first screen on every open. Glanceable in 3 seconds.
All cards are live — update immediately when data changes elsewhere.

### Layout (top to bottom)

- [ ] Header — "Good morning/afternoon/evening, [Name]" + today's date
- [ ] Day Score ring card:
      - 3 concentric SVG rings: calories (outer/purple), workout (middle/green), water (inner/sky)
      - Each ring fills 0–100% based on today's progress
      - Legend: three rows with color dot + label + value
- [ ] 2-column row:
      - Calories card — eaten / goal, color bar, P/C/F pills
      - Water card — progress ring, current/goal, +250ml quick tap
- [ ] Workout card (full width):
      - If not started: "Not started" + "Start Workout" button
      - If in progress: "In progress" + "Resume" button + exercises done so far
      - If done: session name + duration + total volume + muscle group pills
- [ ] Weight card:
      - Today's weight (or "Log today's weight" prompt if not logged)
      - Delta vs yesterday (green arrow down / red arrow up)
      - 7-day sparkline graph on the right
- [ ] Checklist card:
      - Shows first 3 items with checkboxes
      - "X of Y done" progress label
      - Tap to expand full list inline
- [ ] Weekly strip:
      - 7-day bar chart (today highlighted, previous days muted)
      - Calorie bar heights represent % of goal
      - Green dot below each day a workout was done

### Dashboard Rules

- All cards tappable → navigate to that module
- Empty states must include a CTA button (never just text)
- No loading spinners — if data isn't there, show the empty state
- Pull to refresh as a fallback only
- As new modules are added (Budget in v2, Organizer in v3) their summary
  cards slot into the dashboard below the weekly strip

---

## Phase 1 Done When

- [ ] App runs on iOS and Android via Expo Go
- [ ] Onboarding completes and saves profile
- [ ] Can log a full workout session end to end
- [ ] Can log all meals for a day and see calorie total
- [ ] Water intake logs and shows on dashboard
- [ ] Body weight logs and appears in history graph
- [ ] Dashboard shows live data from all of the above
- [ ] Checklist works standalone and can attach to a session
- [ ] No placeholder screens remaining in Phase 1 scope

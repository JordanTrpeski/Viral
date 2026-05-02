# Viral — Personal Super-App (MyOS)

A unified mobile and desktop environment that consolidates personal life management into one offline-first app. Tracks health, budget, tasks, and relationships from a single codebase that targets iOS, Android, and web.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Architecture](#architecture)
5. [Modules](#modules)
6. [Navigation](#navigation)
7. [Data Layer](#data-layer)
8. [State Management](#state-management)
9. [Styling](#styling)
10. [OTA Updates & CI/CD](#ota-updates--cicd)
11. [Getting Started](#getting-started)
12. [Building for Device](#building-for-device)
13. [Key Conventions](#key-conventions)
14. [Roadmap](#roadmap)

---

## Overview

Viral is a private, single-user personal app — not a SaaS product. It works fully offline with local SQLite storage and can receive over-the-air JS bundle updates without reinstalling the app. A future Supabase backend will add cloud sync.

**Modules:**

| Module | Status | Description |
|---|---|---|
| Health | Active | Workout logging, diet tracking, body weight, water intake |
| Budget | Active | Income/expense tracking, categories, monthly/weekly views |
| Checklist | Active | Task lists with templates and progress tracking |
| Organizer | Active | People, birthdays, reminders, calendar, notes |

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | React Native + Expo | SDK 54 |
| Language | TypeScript (strict mode) | ~5.9 |
| Navigation | Expo Router (file-based) | ~6.0 |
| Local DB | Expo SQLite | ~16.0 |
| Fast KV store | react-native-mmkv | ^4.3 |
| State management | Zustand | ^5.0 |
| Styling | NativeWind (Tailwind for RN) | ^4.1 |
| Charts | react-native-svg | 15.12 |
| Swipe gestures | react-native-gesture-handler | ~2.28 |
| Animations | react-native-reanimated | ~4.1 |
| Bottom sheets | @gorhom/bottom-sheet | ^5.2 |
| Notifications | expo-notifications | ^55.0 |
| Image picker | expo-image-picker | ^55.0 |
| Crypto / UUIDs | expo-crypto | ~15.0 |
| OTA updates | Expo EAS Update | — |
| Future backend | Supabase | — |

---

## Project Structure

```
/
├── app/                        ← Expo Router screens (navigation only, no logic)
│   ├── _layout.tsx             ← Root layout: DB init, seed data, onboarding gate
│   ├── +html.tsx               ← Web HTML head
│   ├── +not-found.tsx          ← 404 fallback
│   ├── settings.tsx            ← User profile & preferences
│   ├── (tabs)/                 ← Bottom tab bar (5 tabs)
│   │   ├── _layout.tsx         ← Tab bar definition with icons and overdue badge
│   │   ├── index.tsx           ← Home dashboard
│   │   ├── health.tsx          ← Health module entry
│   │   ├── checklist.tsx       ← Checklist module entry
│   │   ├── budget.tsx          ← Budget module entry
│   │   └── organizer.tsx       ← Organizer module entry
│   ├── health/                 ← Health sub-screens (workout, diet, weight, water)
│   ├── checklist/              ← Checklist sub-screens
│   ├── budget/                 ← Budget sub-screens
│   ├── organizer/              ← Organizer sub-screens
│   └── onboarding/             ← First-run setup flow
│
├── core/
│   ├── components/             ← Shared reusable UI (Button, Card, BottomSheet, etc.)
│   ├── db/                     ← SQLite schema + all query functions, one file per domain
│   ├── store/                  ← Global Zustand stores (user profile, onboarding)
│   ├── types/                  ← All shared TypeScript interfaces
│   ├── utils/                  ← Date helpers, unit conversions, MMKV wrapper, TDEE
│   └── theme.ts                ← Design tokens (colors, spacing, typography)
│
├── modules/
│   ├── health/                 ← Workout, diet, body weight stores + seed data + components
│   ├── budget/                 ← Budget store + seed data
│   ├── checklist/              ← Checklist store + seed data
│   └── organizer/              ← Organizer store, notification scheduler, utils
│
├── assets/                     ← Images, icons, fonts
├── Roadmap/                    ← Phase v1/v2/v3 planning documents
├── .github/workflows/          ← OTA update CI pipeline
├── app.json                    ← Expo app configuration
├── eas.json                    ← EAS build/update profiles
├── metro.config.js             ← Bundler config (NativeWind + path aliases)
├── tailwind.config.js          ← NativeWind Tailwind config
└── tsconfig.json               ← TypeScript config with path aliases
```

---

## Architecture

### Core Principle: Thin Screens, Thick Modules

Screens in `app/` are navigation shells — they read from Zustand stores and call store actions. All business logic lives in `modules/` or `core/`.

```
┌─────────────────────────────────┐
│   app/  (Expo Router screens)   │  ← layout + UI rendering only
│   reads state, calls actions,   │
│   renders components            │
└──────────────┬──────────────────┘
               │ reads / writes
┌──────────────▼──────────────────┐
│   modules/*/store.ts            │  ← business logic + derived state
│   Zustand stores, one per domain│
└──────────────┬──────────────────┘
               │ queries
┌──────────────▼──────────────────┐
│   core/db/*Queries.ts           │  ← all SQL, one file per module domain
│   Expo SQLite, plain objects out│
└─────────────────────────────────┘
```

### Module Isolation

Modules **never import from each other**. They share data only through:
- `core/store` — reading the global user profile
- `core/db` — writing to their own tables
- `core/types` — shared TypeScript interfaces

### Path Aliases

All imports use module aliases defined in `tsconfig.json` and `metro.config.js`:

```ts
import { localDateStr } from '@core/utils/units'
import { useDietStore } from '@modules/health/diet/dietStore'
import { Button } from '@core/components'
```

---

## Modules

### Health

**Screens** (`app/health/`):

| Screen | File | Description |
|---|---|---|
| Workout home | `workout.tsx` | Today's session card, start/resume button |
| Start session | `workout-start.tsx` | Session name, load template |
| Active session | `workout-active.tsx` | Live exercise and set logging with rest timer |
| Session finish | `workout-finish.tsx` | Post-session summary and save |
| History | `workout-history.tsx` | Past sessions list with volume/duration |
| Templates | `workout-templates.tsx` | Saved workout templates |
| Exercise library | `exercise-library.tsx` | Browse, filter, and add exercises |
| Exercise detail | `exercise-detail.tsx` | Per-exercise history and best sets |
| Diet home | `diet.tsx` | Today's meals, calorie ring, macro bars, water ring |
| Food search | `food-search.tsx` | Search and add food to a meal |
| Nutrition history | `nutrition-history.tsx` | Calorie history bar chart |
| Body weight | `body-weight.tsx` | Daily weigh-in, streak, history graph |
| Water | `water.tsx` | Water intake log with quick-add and remove |

**Stores:**

`workoutStore` — manages the full workout lifecycle:
- `exercises` — loaded exercise library
- `activeSession` — the in-progress workout (or `null`)
- `sessionExercises` — exercises + sets for the active session
- `recentSessions` — last N completed sessions
- `templates` — saved workout templates
- Key actions: `startSession`, `resumeTodaySession`, `addExercise`, `addSet`, `confirmSet`, `startRestTimer`, `finishSession`, `discardSession`, `saveAsTemplate`, `loadTemplate`

`bodyWeightStore` — daily weight entries and streak calculation:
- `todayEntry`, `history`, `streak`, `range` (7d / 30d / 90d / all)
- Key actions: `loadToday`, `loadHistory`, `logWeight`, `setRange`

`dietStore` — daily nutrition and water:
- `meals` — today's meals with entries and computed macros
- `waterMl`, `waterGoalMl`
- `calorieHistory` — for the history chart
- `mealTemplates` — reusable meal presets
- `searchResults` — food search against local DB
- Key actions: `loadToday`, `createMeal`, `addEntry`, `updateEntry`, `deleteEntry`, `addWater`, `setWaterGoal`, `searchFoods`, `saveMealAsTemplate`, `loadMealTemplate`

**Calorie and macro goals** are computed fresh from `UserProfile` on every render using the Mifflin-St Jeor TDEE formula (`core/utils/tdee.ts`). They are never stored.

**Seed data:** 50+ common exercises (`exerciseSeed.ts`) and a food database (`foodSeed.ts`). Seeds run once on first launch and are idempotent — they check for existing data before inserting.

---

### Budget

**Screens** (`app/budget/`):

| Screen | File | Description |
|---|---|---|
| Add expense | `add-expense.tsx` | Quick or full expense entry with receipt photo |
| Add income | `add-income.tsx` | Income entry with recurring option |
| Daily view | `daily.tsx` | All income and expenses for a specific day |
| Weekly view | `weekly.tsx` | Bar chart + category breakdown for the current week |
| Monthly view | `monthly.tsx` | Monthly spending chart, biggest expense, annual overview |
| Income history | `income-history.tsx` | Income log with category breakdown |
| Categories | `categories.tsx` | Manage income/expense categories |
| Category drill | `category-drill.tsx` | Transaction list + monthly trend for one category |
| Category edit | `category-edit.tsx` | Edit category name, emoji, limit |
| Balance | `balance.tsx` | Net balance summary |
| Templates | `templates.tsx` | Reusable expense bundles |
| Template edit | `template-edit.tsx` | Edit template name and items |

**Store** (`budgetStore`):
- `viewYear`, `viewMonth` — the currently displayed month
- `incomeCategories`, `expenseCategories`, `allCategories`
- `incomeEntries`, `expenseEntries` — entries for the viewed month
- `categorySpending` — aggregated spend per category for the month
- `totalIncome`, `totalSpending`, `netBalance`, `projectedIncome`
- `pendingRecurring` — recurring income entries awaiting confirmation for the current period
- `templates` — reusable expense bundles
- Key actions: `addIncome`, `addExpense`, `removeIncome`, `removeExpense`, `loadMonth`, `confirmRecurring`, `createCategory`, `setCategoryLimit`, `saveAsTemplate`
- **Spend alerts:** sends a local push notification when spending reaches 80%+ of a category's monthly limit. Disabled on web.

**Seed data:** default expense categories with emojis (`budgetSeed.ts`).

---

### Checklist

**Screens:**

| Screen | File | Description |
|---|---|---|
| Checklist hub | `(tabs)/checklist.tsx` | List of all checklists with progress rings |
| Individual list | `checklist/[id].tsx` | Items in a specific checklist, swipe to delete |

**Store** (`checklistStore`):
- `checklists` — all lists with item count and completion progress
- `items` — items for the currently open checklist
- Key actions: `createChecklist`, `deleteChecklist`, `renameChecklist`, `addItem`, `deleteItem`, `toggleItem`, `moveItem`, `resetChecklist`, `startFromTemplate`

**Seed data:** starter checklist templates (`checklistSeed.ts`).

---

### Organizer

**Screens** (`app/organizer/`):

| Screen | File | Description |
|---|---|---|
| Hub | `(tabs)/organizer.tsx` | Overview with upcoming birthdays, overdue reminders, pinned notes |
| People | `people.tsx` | Virtualized directory with search, sort, tier filter, birthday strips |
| Person profile | `person-profile.tsx` | Birthday, contact info, gift ideas, linked notes and events |
| Person add/edit | `person-add.tsx` | Create or edit a person record |
| Birthdays | `birthdays.tsx` | Upcoming and recent birthdays list |
| Importance tiers | `tiers.tsx` | List of tiers with rule counts |
| Tier edit | `tier-edit.tsx` | Edit tier name, color, emoji, notification rules |
| Reminders | `reminders.tsx` | All reminders sorted by due date with overdue highlight |
| Reminder add | `reminder-add.tsx` | Create or edit a reminder with repeat, priority, person link |
| Calendar | `calendar.tsx` | Month grid with event dots, day sheet with event list |
| Event add | `event-add.tsx` | Create or edit a calendar event |
| Notes | `notes.tsx` | Notes list with pin/archive/tag filter |
| Note edit | `note-edit.tsx` | Full note editor with tag management |

**Store** (`organizerStore`):
- `tiers` — importance tiers (Very Important, Family, Close Friends, Friends, Acquaintances)
- `tierRules` — notification rules per tier (days before, notification time, message template)
- `people` — full contact directory
- `reminders` — one-off and recurring reminders with priority and due date
- `events` — calendar events with optional repeat and person link
- `notes` — freeform notes with tags, pinning, and archiving
- `tags` — tag library for notes
- Full CRUD actions for all entities; reminder completion/snooze; note pinning/archiving

**Birthday notification system** (`modules/organizer/shared/notificationScheduler.ts`):

The scheduler runs on every organizer screen mount:
1. Cancels all previously scheduled `organizer_birthday_*` notifications
2. For each person with a birthday set, resolves the effective notification rules (person-level overrides if `overrideNotifications = true`, otherwise tier rules)
3. For each enabled rule: if `localDateStr(today) === birthday - daysBefore`, schedules a local push notification at the rule's time
4. Message templates support `[Name]`, `[Days]`, `[Age]`, `[Relationship]` variables resolved per person
5. Silently no-ops on web (`Platform.OS === 'web'`)

**Seed data:** 5 default importance tiers with pre-configured notification rule sets (`organizerSeed.ts`).

---

## Navigation

Expo Router uses the file system as the route map.

```
(tabs)/index          →  Home dashboard
(tabs)/health         →  Health hub  →  pushes into /health/* stack
(tabs)/checklist      →  Checklist hub  →  pushes into /checklist/* stack
(tabs)/budget         →  Budget hub  →  pushes into /budget/* stack
(tabs)/organizer      →  Organizer hub  →  pushes into /organizer/* stack
onboarding/*          →  First-run flow (shown before tabs if onboarding not complete)
settings              →  Pushed from home screen header
```

All sub-screens use `headerShown: false` — headers are built inside each screen's JSX for full design control.

The **Organizer tab icon** shows a red badge counting overdue incomplete reminders, computed inline in the tab bar layout component.

---

## Data Layer

### SQLite

All structured data lives in a local SQLite database, initialized in `core/db/database.ts`. Tables are created with `CREATE TABLE IF NOT EXISTS` on every launch — there is no migration runner.

**Table ownership by module:**

| Module | Tables |
|---|---|
| Workout | `exercises`, `workout_sessions`, `workout_sets`, `workout_templates`, `workout_template_exercises`, `workout_template_sets` |
| Diet | `foods`, `meals`, `meal_entries`, `water_log`, `meal_templates`, `meal_template_entries` |
| Body weight | `body_weight_log` |
| Checklist | `checklists`, `checklist_items` |
| Budget | `budget_categories`, `income_entries`, `expense_entries`, `expense_items`, `budget_templates`, `budget_template_items` |
| Organizer | `organizer_tiers`, `organizer_tier_rules`, `organizer_people`, `organizer_person_rules`, `organizer_gift_ideas`, `organizer_reminders`, `organizer_events`, `organizer_event_reminders`, `organizer_notes`, `organizer_tags`, `organizer_note_tags` |

All query functions live in `core/db/*Queries.ts`, one file per domain. Screens and stores never write raw SQL directly.

**On web**, SQLite is unavailable. `core/db/database.web.ts` provides a no-op stub so imports resolve without crashing. The app is usable on web but data does not persist across sessions.

### MMKV

`react-native-mmkv` handles fast key-value preferences:
- `units` — metric or imperial
- `onboarding_complete` — first-run gate
- Module preferences (water goal, etc.)

`core/utils/storage.ts` exports `createStorage(namespace)` which namespaces each module's MMKV instance so keys never collide.

### Date Handling

All dates are stored as `YYYY-MM-DD` strings. The `localDateStr` utility in `core/utils/units.ts` uses local calendar getters to avoid the UTC-offset bug that `new Date().toISOString().slice(0, 10)` causes for users in timezones ahead of or behind UTC:

```ts
// core/utils/units.ts
export function localDateStr(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
```

`todayStr()` in `workoutUtils.ts` delegates to `localDateStr()` and is re-exported for screens that already import from that file.

When constructing a `Date` object from a stored date string, always use noon to avoid DST boundary issues:
```ts
const d = new Date(dateStr + 'T12:00:00')  // safe — stays on the correct local day
```

---

## State Management

One Zustand store per domain, co-located with its module. Stores hold both state and actions.

### Global Stores (`core/store/`)

**`useUserStore`** — single source of truth for the user profile:

```ts
// State
profile: UserProfile | null
units: 'metric' | 'imperial'
onboardingComplete: boolean

// Actions
loadProfile()                    // reads from SQLite on mount
saveProfile(profile)             // writes to SQLite
updateProfile(partial)           // partial update, recalculates calorie goal
recalcCaloriesFromWeight(kg)     // updates goal when body weight changes
setUnits(units)                  // persists to MMKV
completeOnboarding()             // sets MMKV flag, shows tab bar
```

**`useOnboardingStore`** — temporary state accumulated during the multi-step onboarding flow. Cleared after `completeOnboarding()`.

### Module Stores — Data Flow

Stores call DB query functions directly. Example: logging a meal entry:

```
Screen calls:    store.addEntry(mealId, foodId, grams)
↓
Store executes:  dbInsertMealEntry(id, mealId, foodId, grams, now)
Store calls:     set({ meals: buildMeals(date) })  ← recomputes all derived state
↓
Screen re-renders with updated totals
```

Stores never call each other. When a store needs the user's profile (e.g., `dietStore` needs weight for TDEE), it reads directly:

```ts
const profile = useUserStore.getState().profile
```

---

## Styling

NativeWind (Tailwind utility classes for React Native) handles layout and spacing. The app is dark-mode only — `userInterfaceStyle: "dark"` in `app.json`.

All colors, spacing, typography, and radius values are tokens from `core/theme.ts`. Components never use hardcoded hex values.

**Color tokens:**

| Token | Value | Usage |
|---|---|---|
| `colors.bg` | `#0F0F0F` | Main screen background |
| `colors.surface` | `#1C1C1E` | Cards, bottom sheets |
| `colors.surface2` | `#2C2C2E` | Elevated surfaces, inputs |
| `colors.border` | `#3A3A3C` | Dividers, card borders |
| `colors.text` | `#FFFFFF` | Primary text |
| `colors.textMuted` | `#8E8E93` | Labels, captions |
| `colors.primary` | `#0A84FF` | Action buttons |
| `colors.success` | `#30D158` | Income, positive values |
| `colors.warning` | `#FFD60A` | Alerts, streaks |
| `colors.danger` | `#FF453A` | Delete, overdue |
| `colors.health` | `#FF6B35` | Health module accent |
| `colors.budget` | `#FFD60A` | Budget module accent |
| `colors.organizer` | `#BF5AF2` | Organizer module accent |
| `colors.people` | `#FF6B9D` | People sub-section |
| `colors.reminders` | `#FF453A` | Reminders sub-section |

**Spacing scale** (4px base unit):

```
spacing.xs  = 4px
spacing.sm  = 8px
spacing.md  = 16px
spacing.lg  = 24px
spacing.xl  = 32px
spacing.xxl = 48px
```

---

## OTA Updates & CI/CD

The app uses **Expo EAS Update** to push JS bundle updates to installed devices without a new app store release or reinstall.

### How It Works

1. Commit and push to `main`
2. GitHub Actions (`.github/workflows/ota-update.yml`) runs automatically:
   - Installs dependencies with `npm ci`
   - Runs `npx eas-cli update --branch production --message "<commit message>"`
3. On the next app launch, the installed binary checks the EAS production channel, downloads the new bundle in the background, and applies it on the following open

### Build Profiles (`eas.json`)

| Profile | Distribution | Channel | Purpose |
|---|---|---|---|
| `development` | internal | — | Dev client with hot reload |
| `preview` | internal | preview | QA / testing builds |
| `production` | internal | production | Live OTA target |

`distribution: "internal"` generates a direct QR-code download link — no App Store submission required.

### When to Rebuild vs. Just Push

| Change | Push to main (OTA) | Run `eas build` + reinstall |
|---|---|---|
| JS, styles, screens, logic | Yes | No |
| JS-only npm package | Yes | No |
| New native Expo module | No | Yes — bump `version` in `app.json` |
| Expo SDK major upgrade | No | Yes |
| New permissions in `app.json` | No | Yes |

### Required Setup

- `EXPO_TOKEN` secret in GitHub repo → Settings → Secrets → Actions
- Generate the token at `expo.dev` → Account Settings → Access Tokens

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Run Locally

```bash
git clone https://github.com/JordanTrpeski/Viral
cd Viral/repo
npm install
npx expo start
```

Press `w` for web, `a` for Android emulator, `i` for iOS simulator, or scan the QR code with Expo Go.

### First-Time EAS Setup (one-time)

```bash
npm install -g eas-cli
npx eas-cli login           # log in with your expo.dev account
npx eas-cli init            # creates project, writes projectId into app.json
```

After `eas init`, verify that `app.json` has the correct `expo.updates.url` with the real project ID.

---

## Building for Device

### Android (no Apple account needed)

```bash
npx eas-cli build --profile production --platform android
```

EAS builds in the cloud and provides a QR code. Scan with an Android phone to install the `.apk` directly.

### iOS (requires Apple Developer account)

```bash
npx eas-cli build --profile production --platform ios
```

This is the **only time you need to install the app**. Every subsequent push to `main` delivers updates automatically via OTA.

---

## Key Conventions

### File Rules
- **One default export per file** — every component and screen file exports exactly one thing
- **Screens are thin** — no business logic in `app/`; screens call store actions and render JSX
- **Queries are centralized** — all SQL lives in `core/db/*Queries.ts`, never inline in stores or components

### TypeScript
- Strict mode — no `any`, no implicit types
- Shared interfaces in `core/types/index.ts`
- Module-specific types in `modules/*/shared/types.ts`
- DB column names use `snake_case`; TypeScript interfaces use `camelCase`

### IDs
- All entity IDs generated with `Crypto.randomUUID()` from `expo-crypto`
- Organizer store uses a prefixed helper: `genId('tier')` → `tier_<timestamp>_<counter>`

### Dates
- Stored as `YYYY-MM-DD` strings in SQLite
- Use `localDateStr()` from `core/utils/units` — never `new Date().toISOString().slice(0, 10)` (UTC offset bug)
- Construct Date objects from stored strings with: `new Date(dateStr + 'T12:00:00')` (noon avoids DST boundaries)

### Platform Guards
- Features unavailable on web (notifications, SQLite persistence) are wrapped with `if (Platform.OS === 'web') return`
- The app runs and is navigable on web; data just doesn't persist

### Comments
- Only when the **why** is non-obvious: a constraint, invariant, formula, or workaround
- Never document what the code does — names do that

---

## Roadmap

### Phase 1 — Foundation (Complete)
App shell, onboarding, user profile, settings, body weight tracking, workout logging (sessions, sets, exercises, templates), diet tracking (meals, food search, macros, water), checklist, home dashboard.

### Phase 2 — Budget (Complete)
Income and expense logging, category management with monthly limits, recurring income, expense templates, daily/weekly/monthly/category views, spending alerts.

### Phase 3 — Organizer (Complete)
People directory with birthday tracking, importance tiers with configurable notification rules, birthday reminders scheduler, reminders with repeat/priority/snooze, calendar with events, notes with tags and pinning.

### Phase 4 — Cloud Sync (Planned)
Supabase backend, Postgres + Row-Level Security, real-time sync, cross-device data access.

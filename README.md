# Viral — Personal Super-App

Private, single-user mobile app. Tracks health, budget, tasks, and relationships from one offline-first codebase targeting iOS, Android, and web.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Language | TypeScript (strict) |
| Navigation | Expo Router (file-based) |
| Local DB | Expo SQLite |
| Key-Value | react-native-mmkv |
| State | Zustand |
| OTA Updates | Expo EAS Update |
| Crash Reporting | Sentry |
| Future Backend | Supabase |

---

## Project Structure

```
app/                    ← Expo Router screens (navigation + rendering only)
  _layout.tsx           ← Root layout: DB init, onboarding gate
  (tabs)/               ← Bottom tab bar (Home, Health, Checklist, Budget, Organizer)
  health/               ← Health sub-screens
  checklist/            ← Checklist sub-screens
  budget/               ← Budget sub-screens
  organizer/            ← Organizer sub-screens
  onboarding/           ← First-run setup flow
  settings.tsx

core/
  components/           ← Shared reusable components
  db/                   ← SQLite schema + query functions (one file per domain)
  store/                ← Global Zustand stores (user profile, onboarding)
  types/                ← Shared TypeScript interfaces
  utils/                ← Date helpers, unit conversions, MMKV wrapper, TDEE
  theme.ts              ← Color, spacing, typography tokens

modules/
  health/               ← Workout, diet, body weight, steps, water
  budget/               ← Budget store + seed data
  checklist/            ← Checklist store + seed data
  organizer/            ← Organizer store, notification scheduler

assets/                 ← icons, images, fonts
.github/workflows/      ← OTA update CI pipeline
```

---

## Architecture

**Thin screens, thick modules.** Screens in `app/` only render and call store actions. Logic lives in `modules/` or `core/`.

```
app/  (screens)         ← render + navigation
       ↓
modules/*/store.ts      ← business logic, Zustand
       ↓
core/db/*Queries.ts     ← all SQL, plain objects out
```

**Module isolation:** modules never import from each other. Shared data flows through `core/store`, `core/db`, and `core/types` only.

**Path aliases:**
```ts
import { localDateStr } from '@core/utils/units'
import { useDietStore } from '@modules/health/diet/dietStore'
```

---

## Modules

### Health
Screens: workout session lifecycle, exercise library (search + category/equipment filters), exercise detail (form cues, common mistakes, history, PR tracking), diet/meal logging, food search, body weight, water intake, steps.

Stores: `workoutStoreV2`, `dietStore`, `bodyWeightStore`, `stepsStore`

Calorie/macro goals computed from `UserProfile` via Mifflin-St Jeor TDEE (`core/utils/tdee.ts`) — never stored.

Active workout session: inline "Add Exercise" card renders below the last exercise block; rest timer overlays at the bottom; plate calculator accessible via long-press on any weight input; exercise swap modal respects available equipment.

Seed data: 70+ exercises (`exerciseSeed.ts`) across strength, cardio, mobility, and band categories; food database (`foodSeed.ts`). Seed function is incremental — inserts only missing exercise IDs on each launch so existing users receive new exercises without a data wipe.

### Budget
Screens: add/edit expense/income, daily (swipe-to-edit/delete), weekly, monthly, categories, category drill-down, balance, templates.

Store: `budgetStore` — tracks entries, categories, limits, recurring income, templates. Expense and income entries support full edit mode (pre-filled form, UPDATE query, reload on focus return). Sends a push notification when spending hits 80% of a category's monthly limit and when recurring income is due.

### Checklist
Screens: checklist hub, individual list with swipe-to-delete.

Store: `checklistStore` — CRUD for lists and items, templates, reset.

### Organizer
Screens: people directory, person profile, birthdays, importance tiers, reminders, calendar, notes.

Store: `organizerStore` — tiers, tier rules, people, reminders, events, notes, tags.

**Birthday notification scheduler** (`modules/organizer/shared/notificationScheduler.ts`): runs on mount, cancels old notifications, resolves per-person or per-tier rules, schedules local push notifications. Template variables: `[Name]`, `[Days]`, `[Age]`, `[Relationship]`. No-ops on web.

---

## Data Layer

### SQLite
Initialized in `core/db/database.ts` with `CREATE TABLE IF NOT EXISTS` on every launch.

| Module | Tables |
|---|---|
| Workout | `exercises`, `workout_sessions`, `workout_sets`, `workout_templates`, `workout_template_exercises`, `workout_template_sets` |
| Diet | `foods`, `meals`, `meal_entries`, `water_log`, `meal_templates`, `meal_template_entries` |
| Body weight | `body_weight_log` |
| Checklist | `checklists`, `checklist_items` |
| Budget | `budget_categories`, `income_entries`, `expense_entries`, `expense_items`, `budget_templates`, `budget_template_items` |
| Organizer | `organizer_tiers`, `organizer_tier_rules`, `organizer_people`, `organizer_person_rules`, `organizer_gift_ideas`, `organizer_reminders`, `organizer_events`, `organizer_event_reminders`, `organizer_notes`, `organizer_tags`, `organizer_note_tags` |

All SQL lives in `core/db/*Queries.ts`. Screens and stores never write raw SQL.

**Web:** `core/db/database.web.ts` is a no-op stub — app navigates but data doesn't persist.

### MMKV
Handles fast key-value preferences: `units`, `onboarding_complete`, module prefs. `createStorage(namespace)` in `core/utils/storage.ts` namespaces each store's instance.

### Dates
All dates stored as `YYYY-MM-DD`. Always use `localDateStr()` from `core/utils/units` — never `toISOString().slice(0, 10)` (UTC offset bug). Construct Date objects from stored strings with `new Date(dateStr + 'T12:00:00')` (noon avoids DST edge cases).

---

## State Management

One Zustand store per domain, co-located with its module.

**Global stores (`core/store/`):**
- `useUserStore` — user profile, units, onboarding flag. Reads/writes SQLite.
- `useOnboardingStore` — temporary state during onboarding flow. Cleared after completion.

**Data flow example:**
```
screen:  store.addEntry(mealId, foodId, grams)
store:   dbInsertMealEntry(...)  →  set({ meals: buildMeals(date) })
screen:  re-renders with updated totals
```

Stores never call each other. Cross-store reads use `useXxxStore.getState()` directly.

---

## OTA Updates & CI/CD

Every push to `main` triggers a GitHub Actions workflow that runs:
```
npx eas-cli update --branch production --message "<commit message>"
```
The app downloads the new bundle on next launch and applies it on the following open.

**OTA vs rebuild:**

| Change | OTA push | Rebuild needed |
|---|---|---|
| JS, screens, logic | ✅ | — |
| JS-only npm package | ✅ | — |
| New native module | — | ✅ bump `version` |
| Expo SDK upgrade | — | ✅ |
| New permissions | — | ✅ |

**Setup:** add `EXPO_TOKEN` to GitHub repo → Settings → Secrets → Actions (generate at expo.dev).

---

## Getting Started

```bash
git clone https://github.com/JordanTrpeski/Viral
cd Viral
npm install
npx expo start
```

### Build for Device

```bash
# Android
npx eas-cli build --profile production --platform android

# iOS (requires Apple Developer account)
npx eas-cli build --profile production --platform ios
```

EAS builds in the cloud and provides a direct install link. After the initial install, all subsequent updates are delivered via OTA — no reinstall needed.

---

## Key Conventions

- **One default export per file**
- **No business logic in `app/`** — screens call store actions and render
- **No raw SQL outside `core/db/`**
- **TypeScript strict** — no `any`, shared interfaces in `core/types/index.ts`
- **IDs** generated with `Crypto.randomUUID()` (expo-crypto)
- **Platform guards** — features unavailable on web wrapped with `Platform.OS === 'web'` checks
- **Comments** only for non-obvious constraints, formulas, or workarounds

---

## Roadmap

| Phase | Status | Scope |
|---|---|---|
| 1 — Foundation | ✅ Done | App shell, onboarding, health (workout + diet + weight + steps + water) |
| 2 — Budget | ✅ Done | Income/expense, categories, limits, recurring, templates |
| 3 — Organizer | ✅ Done | People, birthdays, tiers, reminders, calendar, notes |
| 4 — Cloud Sync | 🔲 Planned | Supabase backend, Postgres, real-time cross-device sync |

# PATCH_NOTES.md — Ground Truth App State

Read this before any roadmap file. This document reflects what is actually built and working,
verified by code audit on 2026-05-15.

---

## Current version: 1.0.3

---

## What is built and confirmed working

### Shell & Navigation
- Expo Router file-based navigation with tab layout (Health, Budget, Organizer, Habits + home dashboard)
- Dark-mode-only design system in `core/theme.ts`
- Shared components: Button, Card, BottomSheet, Input in `core/components/`
- SQLite via expo-sqlite, MMKV for settings/cache
- EAS Update (OTA) wired to `main` branch — pushes go live without app store submission
- GitHub Actions workflow for production builds on version tags

### Onboarding (6 steps)
- index → profile → lifestyle → goals → units → complete
- Completion flag persists via MMKV — never re-shows after completion
- Calorie goal calculated silently from profile data and shown on completion screen
- Dead file: `app/onboarding/calories.tsx` (old step from 10-step flow, not reachable — delete when touching onboarding)

### Home Dashboard
- Day score rings (5 rings: calories, workout, water, steps, sleep)
- Combined score shown in ring centre
- Weekly strip — tappable past days navigate to `/daily-summary`
- Quick log FAB (bottom-right) → bottom sheet for weight / expense / water
- Empty state for brand-new users (no data): welcome card with 3 first-action buttons
- Budget card always reads current calendar month (AppState listener refreshes on foreground)
- Body weight card: delta vs previous entry (any 2 entries in history, not 7-day window)
- Organizer card: birthdays within 14 days (not 7), up to 5 shown
- Budget progress bar: green < 60%, amber 60–85%, red 85%+
- Workout card: PR badge shown when session had personal bests
- Steps card: step count + calorie estimate + streak label
- Habits card: X of Y habits done + icon row (tap icon to complete)
- Sleep card: last night duration + quality dots

### Health Module
- **Body weight**: log entry, line chart history, goal weight dashed line on chart, delta on dashboard, units-aware (kg/lbs)
- **Body measurements**: chest/waist/hips/arms/thighs, one entry per date, per-measurement line charts, units-aware (cm/in)
- **Workout**: exercise library (seeded + custom), active session, sets with notes (long-press to expand), reorder exercises (up/down arrows), rest timer (90s default, persistent bottom bar), finish screen with PR detection and save-as-template
- **Diet**: meal logging (breakfast/lunch/dinner/snack), food search (seeded DB), custom food creation, barcode scanner (Open Food Facts API), swipe-to-edit entries, meal templates, macro tracking, calorie goal from profile
- **Nutrition history**: day-by-day bar chart, weekly averages (this week vs last, protein missed days)
- **Food recognition**: camera-based (Gemini Vision) — NEEDS API KEY before it works
- **Water**: log intake, SVG ring, history, goal editor
- **Steps**: manual entry, quick-add buttons, activity sessions with calorie estimation (±%), streak counter, 7-day bar chart history, native pedometer (expo-sensors, requires native rebuild + permission)
- **Sleep**: bedtime/wake time pickers, duration calculated, 5-star quality rating, 7-day bar chart, bedtime/wake reminders

### Budget Module
- Add expense / add income with categories
- Category management with monthly limits and color/emoji
- Spending alerts: notification at 80% of category limit and 85% of total income (once per month per category)
- Templates for recurring expenses
- Recurring expenses management screen (`app/budget/recurring.tsx`)
- Monthly view, weekly view with vs-last-week comparison
- Balance screen: all-time running balance, 6-month net chart, savings rate, savings goal with progress bar
- Category drill-down
- Income history

### Organizer Module
- People list with relationship tiers
- Tier management with notification rules and editable message templates (variables: [Name] [Days] [Age] [Relationship])
- Per-person notification override (overrides tier rules)
- Birthday tracking with reminder notifications
- Reminders with snooze (5min / 15min / 1hr / tomorrow / custom)
- Calendar: month view + week view (06:00–22:00 time grid, all-day row)
- Repeating events (daily/weekly/monthly/yearly), generated on read up to 1 year ahead
- Event reminders/notifications (at time / 15min / 30min / 1hr / 1day / 1week before)
- Notes with markdown formatting (bold, italic, headings, lists) and tag filtering
- Person profile: gift ideas (text + price + purchased checkbox, swipe to delete)

### Habits Module
- Create habits with icon, color, frequency (daily/weekdays/weekends/custom days), optional reminder time
- Streak calculation (non-scheduled days don't break streak)
- Habit detail: 3-month heatmap, current/longest streak, completion rate, total completions
- Reminder notifications (daily at configured time)

### AI Features
- Weekly insights screen (`app/insights.tsx`): calls Anthropic API (claude-haiku), aggregates 7 days of health/budget/workout data, result cached per week in MMKV, regenerate button
- NEEDS API KEY: set `ANTHROPIC_API_KEY` in `core/utils/insightsSummary.ts`
- Food photo recognition: NEEDS API KEY: set `GEMINI_API_KEY` in `core/utils/foodRecognition.ts`

### Dev Tools
- Hub at `app/dev-tools/index.tsx` (accessible from Settings)
- JSON Formatter (pretty-print, minify, syntax highlight, copy)
- Base64 Encoder/Decoder (live conversion, debounced)
- URL Encoder/Decoder (live conversion)
- Timestamp Converter (Unix ↔ human, auto-detect ms vs s, UTC/local/relative)

### Currency Converter
- `app/tools/currency.tsx`
- Free exchange rate API (open.er-api.com), cached 1 hour in MMKV
- Pre-loaded: EUR↔MKD, EUR↔USD, USD↔MKD

---

## Known issues / technical debt

### High priority
- Dashboard re-queries entire DB on every tab switch — needs memoisation or a single load-on-mount strategy
- Notification system has 5 disconnected call sites (budget, habits, sleep, organizer scheduler, workout rest timer) — no central manager

### Medium priority
- Workout active session UX: set input requires two taps (tap field → keyboard → type), no superset support, no warmup/failed set flags
- Onboarding diverges from profile editing (Settings) — calorie goal and profile can drift out of sync
- `app/onboarding/calories.tsx` is a dead file — delete it next time onboarding is touched

### Low priority / cosmetic
- TypeScript was clean as of 2026-05-15 audit (expo-clipboard + expo-camera needed npm install)

---

## API keys needed (features gated until set)

| Feature | File | Key name |
|---|---|---|
| AI food photo recognition | `core/utils/foodRecognition.ts` | `GEMINI_API_KEY` |
| Weekly AI insights | `core/utils/insightsSummary.ts` | `ANTHROPIC_API_KEY` |

---

## Package notes

- `expo-clipboard` and `expo-camera` are in package.json — always run `npm install` after pulling to ensure they are present
- `expo-sensors` (Pedometer) is installed but native pedometer requires EAS build + reinstall (not OTA-updatable)
- Adding any new native module requires a new EAS build before it works on device

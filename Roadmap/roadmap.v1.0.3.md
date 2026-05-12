# roadmap.v1.0.3.md — Deployment Cycle 3: New Modules + Major Features

## Status: Planned (start after ALL tasks in v1.0.2 are checked)
## Prerequisites: roadmap.v1.0.2.md fully completed and checked
## Deployment version: 1.0.3

---

## Rules for Claude Code working on this file
- Work through tasks IN ORDER — do not skip ahead
- After completing each task check it off: [ ] becomes [x]
- Do not mark a task done unless it works on BOTH web and mobile
- Do not touch files outside the scope of each task
- When all tasks in a section are checked, report section complete before moving on

## Design Rules — MANDATORY for every task in this file
Every screen, component, or UI element added or modified must follow
the existing app design exactly. No exceptions.

- Colors: use ONLY tokens from `core/theme` — never hardcode hex values inline
- Background: #0F0F0F, Cards: #1C1C1E, Surface2: #2A2A2A
- Primary: #6C63FF, Success: #30D158, Warning: #FFD60A, Danger: #FF453A
- Text: #F5F5F5, Muted: #636366, Border: rgba(255,255,255,0.07)
- Border radius: 12–18px on cards, 8–12px on buttons and inputs
- Typography: screen titles 24px/700, card titles 16px/600, body 14px/400
- Spacing: 16px horizontal padding on all screens, 8–12px gap between cards
- All new buttons use the existing Button component from `core/components`
- All new cards use the existing Card component from `core/components`
- All new bottom sheets use the existing BottomSheet component
- Dark mode is the default — every new element must be readable in dark mode
- New screens must match the visual density and layout of existing screens
- New modules must match the hub screen pattern of existing modules:
  cards with icon + title + subtitle + chevron, same spacing, same colors
- If in doubt about a design decision, look at an existing screen in the same
  module and replicate the exact same pattern

---

## Section 1 — AI Food Recognition (Diet Upgrade)

- [ ] **1.1 Evaluate and select food recognition API**
      Before writing any code, read the current food search implementation
      and report back:
      - Current food database size (how many seeded foods)
      - Whether expo-camera is already installed and configured
      - Current Open Food Facts integration status (from v4 barcode scanner)
      Then confirm which API to use for photo recognition:
      Option A: Google Gemini Vision (requires API key)
      Option B: LogMeal API (purpose-built, requires API key)
      Option C: Nutritionix (natural language + image, requires API key)
      Report findings before writing any code.

- [ ] **1.2 Camera button on food search screen**
      File: `app/health/food-search.tsx`
      Add a camera icon button in the search bar row.
      Tap → opens camera view (expo-camera) with a food-optimised overlay:
      frame guide rectangle in centre, "Point at your meal" label,
      capture button at bottom.

- [ ] **1.3 Photo → food identification**
      File: new `core/utils/foodRecognition.ts`
      On photo capture: send image to selected API.
      Parse response: list of identified foods with estimated portions.
      Show results as a confirmation sheet:
      - List of identified items (name + estimated grams)
      - Each item editable (tap to change grams)
      - "Looks wrong" option to search manually instead
      On confirm: add all items to the current meal in one operation.

- [ ] **1.4 Fallback handling**
      If photo recognition fails or returns no results:
      Show "Couldn't identify food" message with two options:
      "Try again" (retakes photo) and "Search manually" (opens food search).
      Never leave user stranded.

---

## Section 2 — AI Weekly Insights (Claude API)

- [ ] **2.1 Weekly digest screen**
      File: new `app/(tabs)/insights.tsx` or accessible from home dashboard
      A new screen that generates a personalised weekly summary using
      the Claude API (already used in the project).
      Add an "Insights" option to the home screen header or settings.

- [ ] **2.2 Data aggregation for AI**
      File: new `core/utils/insightsSummary.ts`
      Before calling Claude API, aggregate the past 7 days of data:
      - Daily calorie totals + goals + macro averages
      - Workout sessions: exercises, volume, PRs
      - Step counts vs goal per day
      - Water intake vs goal per day
      - Sleep (if logged)
      - Budget: spending by category, income, net
      Format as a structured summary string (not raw SQL data).

- [ ] **2.3 Claude API call for insights**
      File: `core/utils/insightsSummary.ts`
      Call the Anthropic API with the aggregated data.
      System prompt: "You are a personal health and finance coach.
      Analyse this week's data and provide 3–5 specific, actionable
      insights. Be direct and specific — reference actual numbers from
      the data. Do not be generic. Format as a numbered list."
      Model: claude-haiku (cost-efficient for weekly generation).
      Cache result in MMKV with the week's Monday date as key —
      only regenerate once per week or on manual refresh.

- [ ] **2.4 Insights UI**
      File: insights screen
      Show: week date range, generated insights as cards, a "Regenerate"
      button (manual refresh), last generated timestamp.
      Loading state: animated skeleton cards while API call runs.
      Error state: "Couldn't generate insights" with retry button.

---

## Section 3 — Habit Tracker Module

- [ ] **3.1 DB schema for habits**
      File: new migration in `core/db/migrations/`
      ```sql
      CREATE TABLE habits (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        frequency TEXT NOT NULL,  -- 'daily' | 'weekdays' | 'weekends' | 'custom'
        custom_days TEXT,         -- JSON array of day numbers [1,3,5] for custom
        reminder_time TEXT,       -- 'HH:MM' or null
        sort_order INTEGER DEFAULT 0,
        is_archived INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE TABLE habit_logs (
        id TEXT PRIMARY KEY,
        habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        date TEXT NOT NULL,       -- YYYY-MM-DD
        completed_at TEXT NOT NULL,
        UNIQUE(habit_id, date)
      );
      ```

- [ ] **3.2 Habits hub screen**
      File: new `app/habits/index.tsx`
      Add Habits to the bottom nav bar (5th tab).
      Hub screen shows all active habits as cards.
      Each card: icon + name + today's status (done/not done) +
      current streak + tap to complete.
      Completing animates a checkmark and updates the streak.
      "+" button → create new habit.

- [ ] **3.3 Create/edit habit**
      File: new `app/habits/habit-add.tsx`
      Fields: name, icon picker (from preset set), color picker,
      frequency (Daily / Weekdays / Weekends / Custom days),
      optional reminder time.
      Custom days: 7-day pill row (M T W T F S S), tap to toggle.

- [ ] **3.4 Habit streak calculation**
      File: new `modules/habits/habitUtils.ts`
      Streak = consecutive days where habit was completed on scheduled days.
      Non-scheduled days (e.g. weekends for a weekday habit) do not break
      the streak.
      Longest streak also tracked and shown on habit detail.

- [ ] **3.5 Habit history screen**
      File: new `app/habits/habit-detail.tsx`
      Calendar heatmap showing completion for the last 3 months.
      Green = completed, empty = missed, grey = not scheduled.
      Stats: current streak, longest streak, completion rate this month,
      total completions all time.

- [ ] **3.6 Habit reminders**
      File: habit creation + notification scheduler
      If reminder time set: schedule a daily local notification at that time.
      Notification: "[Habit icon] Time for [habit name]!"
      Cancel notification when habit is archived or reminder is removed.

- [ ] **3.7 Habits on dashboard**
      File: `app/(tabs)/index.tsx`
      Add a Habits card to the home dashboard.
      Shows: X of Y habits done today + horizontal row of habit icons
      (green circle if done, empty circle if pending).
      Tap each icon → marks that habit complete directly from dashboard.
      Tap card body → habits hub.

---

## Section 4 — Sleep Tracker Module

- [ ] **4.1 DB schema for sleep**
      File: new migration
      ```sql
      CREATE TABLE sleep_logs (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,         -- YYYY-MM-DD (the morning date)
        bedtime TEXT NOT NULL,      -- ISO datetime when went to bed
        wake_time TEXT NOT NULL,    -- ISO datetime when woke up
        duration_minutes INTEGER NOT NULL,
        quality INTEGER,            -- 1-5 user rating
        notes TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(date)
      );
      ```

- [ ] **4.2 Sleep logging screen**
      File: new `app/health/sleep.tsx`
      Add Sleep card to Health hub between Steps and Water.
      Sleep screen: two time pickers — "Went to bed" and "Woke up".
      Duration calculated automatically and shown large.
      Quality rating: 5-star or 5-emoji picker (terrible → great).
      Optional notes field.
      Save button → writes to DB.

- [ ] **4.3 Sleep history**
      File: `app/health/sleep.tsx`
      Below log form: bar chart of last 7 nights' sleep duration.
      Horizontal dashed line at 8 hours (recommended).
      Bars colored: green ≥ 7h, amber 5–7h, red < 5h.
      Weekly average shown as a stat below chart.

- [ ] **4.4 Sleep on dashboard**
      File: `app/(tabs)/index.tsx`
      Add sleep to the day score ring calculation (5th ring or replace
      a less important metric).
      Add a small sleep card on dashboard: last night's duration + quality
      rating dots. Tap → sleep screen.

- [ ] **4.5 Bedtime reminder**
      File: sleep settings
      Add a bedtime reminder in sleep settings.
      If set: notification at configured time "Time to wind down for bed."
      Also a wake-up reminder option (alarm-style notification).

---

## Section 5 — Dev Tools Module

- [ ] **5.1 Dev Tools hub**
      File: new `app/dev-tools/index.tsx`
      Accessible from Settings (not a main nav tab — this is a power user tool).
      Hub screen with 4 tools: JSON Formatter, Base64, URL Encoder, Timestamp.
      Clean card grid, same design as Health hub.

- [ ] **5.2 JSON Formatter**
      File: new `app/dev-tools/json-formatter.tsx`
      Large text input for raw JSON.
      Format button → pretty-prints with 2-space indent.
      Syntax highlighting (minimal — strings green, numbers amber,
      keys white, brackets muted).
      Copy formatted output button.
      Error display if JSON is invalid: show parse error with line number.
      Minify button → removes all whitespace.

- [ ] **5.3 Base64 Encoder/Decoder**
      File: new `app/dev-tools/base64.tsx`
      Two text areas: input and output.
      Toggle: Encode / Decode.
      Live conversion as user types (debounced 300ms).
      Copy output button.
      Clear button.
      Error display if decode input is not valid base64.

- [ ] **5.4 URL Encoder/Decoder**
      File: new `app/dev-tools/url-encoder.tsx`
      Same pattern as Base64 — input, output, encode/decode toggle,
      live conversion, copy button.
      Uses `encodeURIComponent` / `decodeURIComponent`.

- [ ] **5.5 Timestamp Converter**
      File: new `app/dev-tools/timestamp.tsx`
      Two inputs: Unix timestamp (seconds or milliseconds) ↔ human date.
      "Now" button fills current timestamp.
      Shows: UTC, local time, relative ("3 hours ago").
      Copy each format button.
      Detects automatically if input is seconds or milliseconds
      (if > 1e12 treat as ms).

---

## Section 6 — Currency Converter

- [ ] **6.1 Currency converter screen**
      File: new `app/tools/currency.tsx`
      Accessible from Settings or a Tools section.
      Two currency pickers + amount input.
      Pre-loaded pairs: EUR ↔ MKD, EUR ↔ USD, USD ↔ MKD.
      User can add/reorder favourite pairs.

- [ ] **6.2 Exchange rate fetching**
      File: `core/utils/currencyRates.ts`
      Free API: `https://open.er-api.com/v6/latest/EUR` (no key needed).
      Cache rates in MMKV with timestamp. Refresh if older than 1 hour.
      Show last updated timestamp on converter screen.
      Offline: use cached rates with "Rates may be outdated" warning.

---

## Phase 6 Done When

- [ ] All tasks above are checked
- [ ] AI food recognition opens camera and logs foods
- [ ] Weekly insights generate from real user data
- [ ] Habit tracker works with streaks and reminders
- [ ] Sleep tracker logs and shows history
- [ ] Dev tools all work correctly offline
- [ ] Currency converter shows live rates
- [ ] Dashboard updated with habits and sleep cards
- [ ] No regressions — all v4 and v5 features still working

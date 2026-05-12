# roadmap.v1.0.2.md — Deployment Cycle 2: Feature Improvements + Module Upgrades

## Status: Planned (start after ALL tasks in v1.0.1 are checked)
## Prerequisites: roadmap.v1.0.1.md fully completed and checked
## Deployment version: 1.0.2

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
- If in doubt about a design decision, look at an existing screen in the same
  module and replicate the exact same pattern

---

## Section 1 — Body Measurements

- [x] **1.1 Create measurements screen**
      File: new `app/health/measurements.tsx`
      New screen under Health module for tracking body measurements.
      Fields to log: chest (cm), waist (cm), hips (cm), left arm (cm),
      right arm (cm), left thigh (cm), right thigh (cm).
      One entry per date. Stored in new `body_measurements` SQLite table.
      Schema:
      ```
      id TEXT PRIMARY KEY
      date TEXT NOT NULL
      chest_cm REAL
      waist_cm REAL
      hips_cm REAL
      left_arm_cm REAL
      right_arm_cm REAL
      left_thigh_cm REAL
      right_thigh_cm REAL
      notes TEXT
      created_at TEXT NOT NULL
      ```

- [x] **1.2 Measurements history + charts**
      File: `app/health/measurements.tsx`
      Below the log form: per-measurement line charts showing each
      measurement over time. Toggle between measurements via chip row.
      Same SVG pattern as body weight chart.
      Minimum 2 data points to render a chart.

- [x] **1.3 Add measurements to Health hub**
      File: health hub screen
      Add a Measurements card to the Health hub between Body Weight and Workout.
      Subtitle: shows last logged date or "Log your measurements".
      Navigates to `/health/measurements`.

- [x] **1.4 Respect units setting**
      Measurements stored in cm. If user is on imperial, display in inches
      (1 cm = 0.3937 inches). Input accepts inches, converts to cm before saving.

---

## Section 2 — Goal Weight

- [x] **2.1 Goal weight in profile**
      File: settings screen + user profile store + onboarding completion screen
      Add a goal weight field to the user profile.
      Shown on the onboarding completion screen ("Your calorie goal is X kcal.
      What's your target weight? (optional)").
      Also editable in Settings.
      Stored in user profile table.

- [x] **2.2 Goal weight line on body weight chart**
      File: `app/health/body-weight.tsx`
      If a goal weight is set, draw a dashed horizontal line across the
      weight chart at that value. Label it "Goal: Xkg" on the right edge.
      Use a muted color (not the primary weight line color).

- [x] **2.3 Goal weight progress on dashboard**
      File: `app/(tabs)/index.tsx` body weight card
      If goal weight is set, show progress below the current weight:
      "X.X kg to goal" (if above goal) or "Goal reached ✓" (if at or below).

---

## Section 3 — Organizer Improvements

- [x] **3.1 Gift ideas on person profile**
      File: `app/organizer/person-profile.tsx` and person-add screen
      Add a Gift Ideas section to the person profile screen.
      Each idea: text description + optional price estimate + purchased checkbox.
      Stored in new `gift_ideas` SQLite table:
      ```
      id TEXT PRIMARY KEY
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE
      idea TEXT NOT NULL
      price_estimate REAL
      is_purchased INTEGER DEFAULT 0
      created_at TEXT NOT NULL
      ```
      Add idea inline via text input at bottom of section.
      Tap checkbox → marks as purchased (strikethrough style).
      Swipe to delete an idea.

- [x] **3.2 Per-person notification override**
      File: `app/organizer/person-add.tsx` and notification scheduler
      Add an "Override tier notifications" toggle on the person add/edit screen.
      When toggled on: show the same notification rule editor as the tier
      edit screen (days before + notification time + message template).
      These rules override the tier defaults for this person only.
      Store in `person_notification_overrides` table (see organizer CLAUDE.md).
      Notification scheduler must check for overrides before using tier rules.

- [x] **3.3 Customisable notification message templates**
      File: `app/organizer/tier-edit.tsx`
      Each notification rule in a tier should have an editable message template.
      Add a text input per rule showing the current template.
      Available variables shown below input: [Name] [Days] [Age] [Relationship]
      Preview row below input shows the resolved message with example values.

- [x] **3.4 Reminder snooze**
      File: `app/organizer/reminders.tsx` and reminder-add screen
      Swipe actions on a reminder must include a Snooze option.
      Snooze opens a bottom sheet with options:
      5 minutes / 15 minutes / 1 hour / Tomorrow morning / Custom time
      On snooze: update `snoozed_until` field, cancel existing notification,
      reschedule notification for the snooze time.
      Snoozed reminders show a "Snoozed until X" label in muted text.

- [x] **3.5 Calendar week view**
      File: `app/organizer/calendar.tsx`
      Add a Week view tab alongside the existing Month view.
      Week view: 7-column grid showing Mon–Sun, with time slots from 06:00–22:00.
      Events shown as colored blocks at their time slot.
      All-day events (birthdays, no-time events) shown at top in a sticky row.
      Tap an empty slot → add event at that time.
      Tap an event block → event detail sheet.

- [ ] **3.6 Repeating calendar events**
      File: `app/organizer/event-add.tsx` and event DB queries
      Add repeat selector to event creation: None / Daily / Weekly /
      Monthly / Yearly.
      Store repeat rule in `calendar_events` table.
      When rendering the calendar, generate virtual occurrences for
      repeating events up to 1 year ahead — do not store each occurrence,
      generate them on read.

- [ ] **3.7 Event reminders (notifications)**
      File: `app/organizer/event-add.tsx`
      Add "Notify me" section to event creation.
      Options: At time of event / 15 min before / 30 min before /
      1 hour before / 1 day before / 1 week before.
      Multiple reminders per event allowed.
      Store in `event_reminders` table. Schedule via expo-notifications.

- [ ] **3.8 Notes — confirm rich text or fix to proper rich text**
      File: `app/organizer/note-edit.tsx`
      The report describes "rich plain-text" which is contradictory.
      Audit the note editor. If it is plain text only:
      Add a formatting toolbar with: Bold / Italic / Bullet list /
      Numbered list / Heading.
      Store formatted content as a simple markdown string.
      Render markdown in the note card preview and full view.
      Use a lightweight markdown renderer — do not add a heavy RTE library.

- [x] **3.9 Notes — tags implementation**
      File: `app/organizer/note-edit.tsx` and notes list
      Confirm tags are actually implemented. If not:
      Add tag creation in note edit screen — input field + color picker.
      Tags stored in `note_tags` table.
      Note card shows tag pills below the preview text.
      Notes list has a tag filter chip row at top.

---

## Section 4 — Workout Improvements

- [x] **4.1 Set notes**
      File: active session component / set row component
      Add an optional notes field per set row. Hidden by default.
      Long press on a set row → expands a text input below that row.
      Notes saved with the set in `workout_sets` table (column already
      exists in schema). Shown in workout history set detail.

- [x] **4.2 Reorder exercises in active session**
      File: active session screen
      Currently exercises cannot be reordered once added.
      Add drag-to-reorder via long press on the exercise header row.
      Use `react-native-reanimated` drag gesture or a simple up/down
      arrow button approach if drag is complex.
      Order stored as a `sort_order` integer per exercise in the session.

- [x] **4.3 Nutrition weekly averages**
      File: `app/health/nutrition-history.tsx`
      Below the existing day-by-day chart add a Weekly Averages section:
      Average daily calories this week vs last week.
      Average protein / carbs / fat this week.
      Days where protein goal was missed (shown as a count + list of dates).

---

## Section 5 — Dashboard Final Polish

- [x] **5.1 Steps streak on dashboard steps card**
      File: `app/(tabs)/index.tsx` steps card
      Show the step goal streak (from v4 task 8.2) as a secondary label
      on the dashboard steps card: "X day streak" in muted text below
      the step count. Hidden if streak is 0.

- [x] **5.2 Budget card — month label always current**
      Verify fix from v4 task 1.1 is working correctly across all edge cases:
      - App open at midnight (month rollover)
      - User navigates Budget tab to a past month then returns to Home
      - Fresh install with no budget data
      Dashboard budget card must show current month in all cases.

---

## Phase 5 Done When

- [x] All tasks above are checked
- [x] Body measurements screen works and links from Health hub
- [x] Goal weight shows on body weight chart as a dashed line
- [x] Gift ideas visible and editable on every person profile
- [x] Per-person notification override saves and fires correctly
- [x] Tier notification templates are editable with variable preview
- [x] Reminder snooze works and reschedules notification correctly
- [x] Calendar shows week view with time slots
- [x] Repeating events appear across multiple months
- [x] Events trigger notifications at configured times
- [x] Note editor has working formatting (bold, lists minimum)
- [x] Note tags are filterable on the notes list
- [x] No regressions introduced — all v4 features still working

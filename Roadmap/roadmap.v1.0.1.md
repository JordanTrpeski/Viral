# roadmap.v1.0.1.md — Deployment Cycle 1: Critical Fixes + Missing Core Features

## Status: Active (start immediately)
## Prerequisites: v1, v2, v3 build phases completed
## Deployment version: 1.0.1
## Priority: These are broken or missing features that affect daily usability

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

## Section 1 — Dashboard Critical Bugs

- [x] **1.1 Budget card wrong month**
      File: `app/(tabs)/index.tsx` and budget store
      The dashboard budget card reads from `budgetStore.viewMonth/viewYear`
      which reflects the last month the user viewed in the Budget tab.
      Fix: Dashboard must always read current calendar month regardless
      of what month is selected in the Budget tab.
      Create a separate `getCurrentMonthBudgetSummary()` query that
      ignores viewMonth and always uses `new Date()` month/year.
      Do not change the Budget tab's own month navigation.

- [x] **1.2 Body weight delta condition too strict**
      File: `app/(tabs)/index.tsx` body weight card section
      Delta (arrow up/down vs yesterday) only shows if 2 entries exist
      within the last 7 days. Change condition to: show delta if any
      2 entries exist in the entire history, not specifically within 7 days.

- [x] **1.3 Organizer birthday cutoff too short**
      File: `app/(tabs)/index.tsx` organizer card section
      Birthdays only show if within 7 days. Change to 14 days minimum.
      Very Important tier sends notifications at 30 days — dashboard
      should surface these earlier. Show up to 5 birthdays within 14 days,
      not 3 within 7.

- [x] **1.4 Budget progress bar thresholds wrong**
      File: `app/(tabs)/index.tsx` budget card progress bar
      Currently: green below 75%, amber 75–100%, red at 100%+
      Fix to: green below 60%, amber 60–85%, red at 85%+
      Spending 85% of income with days left in the month should be a warning.

---

## Section 2 — Onboarding Bugs

- [x] **2.1 Onboarding shows on every launch**
      File: `app/_layout.tsx` and onboarding completion logic
      The onboarding completion flag is not persisting correctly between
      app launches. Find where the flag is saved (MMKV or SQLite) and
      where `_layout.tsx` reads it. Fix so once onboarding is completed
      it never shows again unless user resets from settings.
      Test: complete onboarding → close app fully → reopen → must go
      straight to home dashboard.

- [x] **2.2 Continue button invisible on mobile**
      File: onboarding step components
      The Next/Continue button exists mechanically but is not visible
      on mobile. Find the button component used across onboarding steps.
      Ensure it has explicit background color, text color white, padding
      16px vertical, border radius 12, full width. Must be visible on
      both web and mobile.

- [x] **2.3 Continue button changes appearance when user types**
      File: onboarding step components
      Button style changes when an input has a value. Remove all style
      logic tied to input state from the button. Button must look
      identical whether inputs are empty or filled.

- [x] **2.4 Name input text disappears after second character**
      File: onboarding name input step
      Controlled input state bug. Find the name input and fix the value
      binding so text persists as user types. Likely a setState call
      that resets the value on re-render.

- [x] **2.5 Metric/Imperial toggle invisible selected state**
      File: onboarding units step
      Selected option has invisible text (black on black or similar).
      Fix: selected state = primary color background (#6C63FF) with
      white text. Unselected state = surface background (#1C1C1E) with
      muted text (#636366). Both must be clearly readable.

- [x] **2.6 Onboarding too many steps**
      Currently 10 steps. Consolidate to maximum 6:
      Step 1: Name
      Step 2: Physical stats (weight + height + DOB on one screen)
      Step 3: Sex + activity level (one screen)
      Step 4: Goal picker
      Step 5: Units preference
      Step 6: Completion screen (calorie goal calculated silently, shown here)
      Remove the standalone calorie goal step — calculate it automatically
      from the data collected and show it on the completion screen.

---

## Section 3 — Mobile/Web UI Discrepancies

- [x] **3.1 Health hub screen — rows stacking vertically on mobile**
      File: `app/(tabs)/health/index.tsx` or health hub component
      Each module row (Body Weight, Workout, Diet, Steps, Water) stacks
      vertically on mobile instead of horizontal row.
      Fix: each row must be `flexDirection: 'row'`, `alignItems: 'center'`,
      icon on left (40x40 rounded square), title + subtitle stacked in middle
      with `flex: 1`, chevron on right. Must match web layout on mobile.

- [x] **3.2 Budget hub screen — action buttons unstyled on mobile**
      File: budget home screen component
      Add Expense, Add Income, Templates, Balance buttons have no visible
      container on mobile — just floating icon + text.
      Fix: 2x2 grid of proper Pressable buttons each with:
      background `#1C1C1E`, border `0.5px solid rgba(255,255,255,0.1)`,
      borderRadius 12, padding 14, icon + text in a row centered.
      Add Expense and Add Income must look identical by default (no amber fill).
      Amber fill only on press via Pressable pressed state, not useState.

- [x] **3.3 Budget hub screen — Income History row broken on mobile**
      File: budget home screen component
      Income History stacks vertically on mobile. Fix to single horizontal
      row: icon left, "Income history" text middle flex 1, chevron right.

- [x] **3.4 Budget hub screen — Log First Expense button cut off**
      File: budget home screen component empty state
      Add `paddingBottom: 32` to the empty state container so the
      Log First Expense button is never hidden behind the bottom nav bar.

---

## Section 4 — Workout Missing Features

- [x] **4.1 Rest timer in active session**
      File: `app/health/workout-active.tsx` or active session component
      Rest timer is not mentioned in the functionality report — confirm
      if built. If not: after a user checks off a set, automatically
      start a countdown timer. Default 90 seconds, configurable in
      workout settings (60s / 90s / 2min / custom).
      Timer shows as a persistent bottom bar — does not push content up.
      Shows: countdown number, progress bar, Skip button.
      If app is backgrounded, schedule a local notification for when
      timer ends.

- [x] **4.2 Personal best detection on finish screen**
      File: `app/health/workout-finish.tsx`
      The finish screen shows total sets, volume, duration but no PR
      detection. After saving a session, compare each exercise's best
      set (highest weight × reps) against all-time history.
      If any exercise beat its previous best: show a highlighted PR card
      on the finish screen with exercise name + new best + previous best.
      Add a subtle animation (star or pulse) on the PR card.

- [x] **4.3 Create template from completed session**
      File: `app/health/workout-finish.tsx`
      Add a "Save as Template" button on the finish screen.
      One tap → prompts for template name (pre-filled with session name)
      → saves all exercises and set structure as a template.
      No need to rebuild the session manually in the template editor.

- [x] **4.4 Progress graph per exercise**
      File: `app/health/exercise-detail.tsx`
      Exercise detail shows history and best set but no graph.
      Add a line chart showing max weight per session over time for
      that exercise. Toggle: Max Weight / Total Volume.
      Minimum 2 data points to render. Same SVG pattern as body weight chart.

---

## Section 5 — Diet Missing Features

- [x] **5.1 Custom food creation**
      File: `app/health/food-search.tsx` or food search component
      Users can only search the seeded database. Add a "Create custom food"
      button on the food search screen (shown when search returns no results
      or always visible at bottom of results).
      Fields: name, brand (optional), calories per 100g, protein per 100g,
      carbs per 100g, fat per 100g, fiber per 100g (optional).
      Saved to foods table with `is_custom = 1`.
      Custom foods appear in search results with a "Custom" badge.

- [x] **5.2 Edit logged food entry**
      File: meal card / food entry component
      Currently food entries can only be deleted and re-added.
      Add swipe-to-edit on each food entry row that opens a bottom sheet
      with the grams input pre-filled. User adjusts grams → save updates
      the entry in place. Calories and macros recalculate immediately.

- [x] **5.3 Barcode scanner**
      File: new screen `app/health/barcode-scanner.tsx`
      Add a barcode icon button on the food search screen.
      Tap → opens camera with barcode overlay.
      On scan → query Open Food Facts API:
      `https://world.openfoodfacts.org/api/v0/product/{barcode}.json`
      Parse: product_name, brands, nutriments (energy-kcal_100g,
      proteins_100g, carbohydrates_100g, fat_100g).
      If found → show product card with nutrition info → user confirms
      → amount input → adds to meal.
      If not found → show "Product not found" with option to create custom.
      Uses expo-camera. No API key required (Open Food Facts is free).

---

## Section 6 — Budget Missing Features

- [x] **6.1 Balance screen — full financial overview**
      File: `app/budget/balance.tsx`
      Currently just shows 3 numbers. Replace with:
      - Running all-time balance (total income − total spending from app data)
      - Monthly net chart: 6-month bar chart (positive = green, negative = red)
      - Savings rate: (income − spending) / income × 100 for current month
      - Money left this month: this month income − this month spending
      - Projected end of month: based on confirmed + pending recurring entries
      - Savings goal: optional monthly target with progress bar
        (set via input field on this screen, stored in MMKV)

- [x] **6.2 Spending alerts — category limit notifications**
      File: budget DB query layer and notification logic
      When an expense is saved, check if the category's monthly spending
      has crossed 80% of its monthly limit. If yes, schedule a local
      push notification: "[Category] is at 80% of your monthly limit."
      Only fire once per category per month (store last-alerted month
      in MMKV per category ID).
      Also check global monthly spending vs total income — notify at 85%.

- [x] **6.3 Cancel/manage recurring expenses**
      File: templates or recurring expenses management screen
      Recurring expenses can be created but not managed.
      Add a "Recurring" section to the Templates screen or create
      `app/budget/recurring.tsx`. Lists all active recurring expenses
      with: name, amount, frequency, next due date.
      Actions: pause (skip next occurrence), cancel (delete recurring flag).

- [x] **6.4 Weekly view — comparison to previous week**
      File: `app/budget/weekly.tsx`
      Current week shows bar chart and totals. Add a comparison row below:
      "vs last week: +€X.XX" or "−€X.XX" with green/red color.
      Also show: "You spent X% more/less than last week" as a single line.

---

## Section 7 — Dashboard Improvements

- [x] **7.1 Day score combined number**
      File: `app/(tabs)/index.tsx` day overview card
      Add a single combined score below or inside the rings.
      Calculation: average of 4 ring percentages capped at 100% each.
      Display as a percentage: "74%" or as "3/4 goals".
      Show in large text in the centre of the rings SVG or below the card.

- [x] **7.2 Weekly strip — tappable days**
      File: `app/(tabs)/index.tsx` weekly strip section
      Each day column should be tappable. Tap a past day → navigate to
      a daily summary screen showing: calories logged that day, workout
      session if any, water intake, step count.
      Reuse existing daily view screens where possible.

- [x] **7.3 Workout PR surfaced on dashboard**
      File: `app/(tabs)/index.tsx` workout card done state
      When workout state is Done, check if the session had any PRs
      (from the PR detection built in 4.2).
      If yes: show "New PR" badge on the workout card with the exercise name.

- [x] **7.4 Quick log bottom sheet**
      File: `app/(tabs)/index.tsx`
      Add a floating "+" button (bottom right, above nav bar) that opens
      a bottom sheet with quick log options:
      - Log weight (number input → save)
      - Add expense (amount + category → save)
      - Add water (quick amounts same as water card)
      This lets the user log common things without navigating away from home.

- [x] **7.5 Empty state for new users**
      File: `app/(tabs)/index.tsx`
      When user has no data at all (first launch after onboarding):
      Do not show 9 empty cards. Instead show a single welcome card:
      "Welcome [Name] — let's get started" with 3 suggested first actions:
      "Log your first workout", "Set your budget", "Add someone's birthday"
      Each button navigates to the relevant screen.
      Once any data exists the normal dashboard renders.

---

## Section 8 — Steps Integration

- [x] **8.1 Steps feed into dashboard day score**
      File: `app/(tabs)/index.tsx` day score rings and score calculation
      Steps ring already exists visually (inner ring) but confirm it is
      included in the combined day score calculation from 7.1.
      Steps goal completion = steps logged today / step goal.

- [x] **8.2 Steps goal streak**
      File: `app/health/steps.tsx` and steps DB queries
      Add a streak counter: consecutive days where step count >= step goal.
      Show on steps screen below the main ring.
      Also show on the steps card on the dashboard as a secondary label.

- [x] **8.3 Native pedometer permission prompt**
      File: `app/health/steps.tsx`
      Currently fails silently if permission is denied.
      On first open of steps screen: explicitly request pedometer permission
      with an explanation bottom sheet: "Allow step tracking to automatically
      count your steps without manual entry."
      If denied: show a banner on the steps screen explaining that automatic
      tracking is off and steps must be logged manually.

---

## Phase 4 Done When

- [x] All tasks above are checked
- [x] Onboarding completes and never shows again on relaunch
- [x] Budget dashboard card always shows current month
- [x] Active workout session has a working rest timer
- [x] Finish screen shows PRs if any were set
- [x] Custom food creation works
- [x] Barcode scanner opens and queries Open Food Facts
- [x] Balance screen shows full financial overview
- [x] All mobile/web UI discrepancies resolved
- [x] No regressions introduced — all existing features still work

# roadmap.v2.md — Phase 2: Budget Module

## Status: Planned (start after Phase 1 is marked Done)
## Module CLAUDE.md: /modules/budget/CLAUDE.md
## Prerequisite: roadmap.v1.md completed

---

## Goal

A complete personal finance tracker. Log every euro in and out.
Know exactly where money went today, this week, this month.
Fast to log, clear to read, useful enough to open daily.

---

## Build Order

1. Budget shell + DB
2. Income tracking
3. Spending — quick log
4. Spending — categories + limits
5. Templates
6. Daily view
7. Weekly summary
8. Monthly summary
9. Balance overview
10. Dashboard card

---

## 1. Budget Shell + DB

- [ ] Add Budget tab to bottom nav
- [ ] SQLite migrations for all budget tables (see budget CLAUDE.md for schema)
- [ ] Seed default categories — 16 expense + 6 income (see budget CLAUDE.md)
- [ ] Budget home screen skeleton

---

## 2. Income Tracking

- [ ] Add income screen:
      Source name · amount · date · category · optional note
- [ ] Income categories: Salary / Freelance / Side Income / Gift / Refund / Other
- [ ] Mark as recurring — daily / weekly / monthly
- [ ] Recurring income: auto-logs on schedule, shows pending confirmation
      "Your salary of €1,200 is due today — confirm?" banner on home screen
- [ ] Income history list — chronological, filterable by category + date range
- [ ] Income summary card:
      This month total · breakdown bar chart · month-over-month delta
- [ ] Projected monthly income (confirmed + pending recurring)

---

## 3. Spending — Quick Log

**Primary flow — must be under 5 taps for a full shopping trip.**

- [ ] "Add Expense" button on budget home → bottom sheet
- [ ] Two modes in the sheet:
      - **Quick** — just amount + category (2 taps, for a single item)
      - **Full** — merchant name + item rows + category
- [ ] Full mode item rows:
      - Item name + price per row
      - "Add item" button adds a new row
      - Total calculated live as prices are entered
      - Category auto-suggested (editable)
- [ ] Payment method tag: Cash / Card / Online (optional)
- [ ] Receipt photo: camera button → photo stored locally with the entry
- [ ] Save → entry appears on today's view immediately

---

## 4. Spending — Categories + Limits

- [ ] Categories management screen:
      - List of all categories with emoji + color
      - Edit name, emoji, color (color picker)
      - Add custom category
      - Archive category (hides from picker, keeps history)
      - Reorder drag-and-drop
- [ ] Monthly limit per category:
      - Optional — not forced
      - Set from category edit screen or from monthly summary
- [ ] Progress bars on category cards:
      - Green until 75% of limit
      - Amber from 75% to 100%
      - Red when over limit
- [ ] Alert notification when a category hits 80% of its monthly limit

---

## 5. Templates

- [ ] Save expense as template (from any saved expense, one tap)
- [ ] Templates screen — list of saved templates, sorted by last used
- [ ] Template card — name, item count, estimated total, last used date
- [ ] Load template → opens pre-filled full expense entry
      User edits actual amounts → save as new entry (template unchanged)
- [ ] Template history — last 5 uses per template with actual totals
- [ ] Edit template (name, items, default amounts)
- [ ] Delete template

---

## 6. Daily View

**What:** Everything logged on one day. Default shows today. Navigate to any day.

- [ ] Date header with ← → arrows (navigate day by day)
- [ ] "Today" button to jump back to today
- [ ] Income section — entries logged this day (green, + amount)
- [ ] Spending section — entries grouped by category
      Each entry: merchant + item list (expandable) + total + category icon
- [ ] Day total row: income − spending = net for the day
      Net positive = green, negative = red
- [ ] Quick-add FAB → bottom sheet (same as home screen)
- [ ] Swipe left on any entry → edit / delete

---

## 7. Weekly Summary

- [ ] Accessible from budget home via "This Week" section header tap
- [ ] 7-day bar chart — spending per day
      Income days highlighted with a marker
- [ ] Week totals: income / spent / net
- [ ] Top 3 spending categories this week (with amounts)
- [ ] Day-by-day net bar (above = saved, below = overspent)

---

## 8. Monthly Summary

- [ ] Month selector header with ← →
- [ ] Hero numbers: total income / total spending / net (big, color-coded)
- [ ] Spending donut chart — breakdown by category
- [ ] Category list — each shows: limit / spent / remaining
      Progress bar per row
      Tap any category → category drill-down screen
- [ ] Category drill-down screen:
      - All transactions for that category in selected month
      - Filter: this week / this month / last 30 days / custom range
      - 6-month spending trend graph for this category
      - Average monthly spend label
- [ ] Biggest single expense this month — highlighted card
- [ ] Day-by-day spending bar chart for the full month
- [ ] Month vs previous month delta (% change in spending + income)
- [ ] Annual overview (bonus — 12-month chart, best/worst months, total saved)

---

## 9. Balance Overview

- [ ] Running balance — all-time income minus all-time spending (from app data)
- [ ] Monthly net chart — 6-month bar chart (positive = green, negative = red)
- [ ] Savings rate — (income − spending) / income × 100 for current month
- [ ] "Money left this month" — income logged minus spending this month
- [ ] Projected end-of-month — based on confirmed + pending recurring entries
- [ ] Savings goal:
      - Set a monthly savings target (€ amount or % of income)
      - Progress bar: actual net vs goal

---

## 10. Dashboard Card

When Phase 2 completes, this card is added to the Home dashboard
below the weekly strip:

```
┌─────────────────────────────────┐
│  Budget               April     │
│  Spent: €342  /  €1,200 income  │
│  ████████░░░░░░  28%            │
│  Left this month: €858           │
└─────────────────────────────────┘
```

- Tap → opens Budget home
- Shows current month always
- Color of progress bar follows green/amber/red rules

---

## Phase 2 Done When

- [ ] Can log income (one-time + recurring)
- [ ] Can log a full shopping trip with itemised products in one session
- [ ] Can log a quick single expense in 2 taps
- [ ] Categories have limits and show progress bars
- [ ] Templates save and load correctly
- [ ] Daily view shows all entries for any date
- [ ] Weekly and monthly summaries display correctly
- [ ] Balance overview shows running totals
- [ ] Budget card appears on home dashboard
- [ ] No placeholder screens in Phase 2 scope

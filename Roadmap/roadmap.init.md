# roadmap.init — Master Project Index

## What This Is

The master index for the MyOS personal super-app project.
Each phase has its own versioned roadmap file in /docs/.
Claude reads only the file relevant to the current phase — not all of them at once.

---

## How To Use These Files

When starting a session:
1. Read CLAUDE.md (root)
2. Read this file (roadmap.init) to find the current active phase
3. Read only the roadmap file for that phase
4. Read the relevant module CLAUDE.md

Do NOT read all roadmap versions at once.

---

## Phase Index

| File | Version | Content | Status |
|---|---|---|---|
| roadmap.v1.md | Build 1 | App Shell + Health + Dashboard | Complete |
| roadmap.v2.md | Build 2 | Budget Module | Complete |
| roadmap.v3.md | Build 3 | Organizer Module | Complete |
| roadmap.v1.0.1.md | Deploy 1.0.1 | Critical Fixes + Missing Core Features | Complete |
| roadmap.v1.0.2.md | Deploy 1.0.2 | Feature Improvements + Module Upgrades | Complete |
| roadmap.v1.0.3.md | Deploy 1.0.3 | New Modules (Habits, Sleep, Dev Tools, AI) | Complete |

### Versioning Logic
- **v1, v2, v3** — initial build phases. App did not exist yet. Never touch these.
- **v1.0.1, v1.0.2, v1.0.3** — deployment update cycles. App is live, updates
  pushed via EAS OTA. Each cycle = one `eas update` deployment when complete.
- **Next cycle** → create roadmap.v1.0.4.md and add it to this table.
- Never edit a completed file — it is a permanent record.
- Never mark a cycle complete unless every checkbox in the file is checked.

---

## Current Active Cycle

**No active cycle — create/read roadmap.v1.0.4.md before starting the next phase**

---

## Full Overview (summary only)

- **Build v1** — App shell, onboarding, health module, dashboard
- **Build v2** — Budget module
- **Build v3** — Organizer module
- **Deploy v1.0.1** — Critical fixes: onboarding bugs, mobile/web UI, rest timer,
  PRs, custom foods, barcode scanner, balance screen, dashboard bugs, alerts
- **Deploy v1.0.2** — Improvements: body measurements, goal weight, gift ideas,
  notification overrides, calendar week view, repeating events, rich text,
  snooze, workout reorder, nutrition averages
- **Deploy v1.0.3** — New modules: AI food recognition, AI weekly insights,
  habit tracker, sleep tracker, dev tools, currency converter

---

## Design Reference (shared across all phases)

### Color Tokens — Dark Mode Primary

| Token | Purpose | Value |
|---|---|---|
| `bg` | Main background | #0F0F0F |
| `surface` | Cards, sheets | #1C1C1E |
| `surface2` | Inputs, nested cards | #2A2A2A |
| `border` | Dividers | rgba(255,255,255,0.07) |
| `primary` | Main CTAs | #6C63FF |
| `success` | On track, income, done | #30D158 |
| `warning` | Approaching limit | #FFD60A |
| `danger` | Over limit, overdue | #FF453A |
| `text` | Primary text | #F5F5F5 |
| `textMuted` | Labels, secondary | #636366 |

### Module Accent Colors

| Module | Color | Hex |
|---|---|---|
| Workout | Purple | #6C63FF |
| Diet | Green | #30D158 |
| Water | Sky | #64D2FF |
| Budget | Amber | #FFD60A |
| Organizer | Teal | #2DD4BF |
| — Notes | Orange | #FB923C |
| — Calendar | Blue | #60A5FA |
| — People | Pink | #FF6B9D |
| — Reminders | Red | #FF453A |

### Importance Tier Colors

| Tier | Color | Hex |
|---|---|---|
| Very Important | Purple | #A855F7 |
| Family | Red | #EF4444 |
| Close Friends | Yellow | #EAB308 |
| Friends | Green | #22C55E |
| Acquaintances | Grey | #6B7280 |

### Typography Scale

| Role | Size | Weight |
|---|---|---|
| Screen title | 24px | 700 |
| Section header | 18px | 600 |
| Card title | 16px | 600 |
| Body | 14px | 400 |
| Label / caption | 12px | 400 |
| Micro | 11px | 400 |

### UI Principles (enforced in every phase)

- Dark mode first
- Phone first — 375–430px wide, thumb-friendly, 48px min tap targets
- One primary action per screen
- Bottom sheet over new screen for quick actions
- Micro-animations on completions (checkmark pop, ring fill, confetti)
- Color-coded feedback: green on track, amber warning, red over/missed
- Friendly empty states with inline action buttons
- Never hardcode colors — always use tokens above
- Modules never import from each other — only through core/store or core/db

---

## Future Modules (not scheduled)

| Module | Description |
|---|---|
| Habits | Daily streaks — read, meditate, stretch |
| Sleep | Log sleep hours, quality, trends |
| Documents | Personal vault — IDs, contracts, receipts |
| Recipes | Recipe book linked to diet module |
| Goals | Long-term milestones with progress |
| Mood | Daily log with trend graph |

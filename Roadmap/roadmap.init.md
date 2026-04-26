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

| File | Phase | Module | Status |
|---|---|---|---|
| roadmap.v1.md | Phase 1 | App Shell + Health + Dashboard | Active |
| roadmap.v2.md | Phase 2 | Budget | Planned |
| roadmap.v3.md | Phase 3 | Organizer (Notes + Calendar + People + Reminders) | Planned |

> New phases get a new file: roadmap.v4.md, roadmap.v5.md, etc.
> Never edit a completed version file — it's a record of what was built.

---

## Current Active Phase

**Phase 1 — read roadmap.v1.md**

---

## Full Phase Overview (summary only)

- **v1** — App shell, onboarding, settings, body weight log, workout module,
  checklist, diet module, home dashboard
- **v2** — Budget module: income, spending, templates, daily/weekly/monthly
  summaries, category limits, balance overview
- **v3** — Organizer module: people profiles, importance tiers, birthday
  reminders, calendar, reminders, notes
- **v4+** — AI food recognition, cloud sync, web support, wearables, new modules

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

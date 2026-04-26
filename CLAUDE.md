# CLAUDE.md — Root Project Instructions

## What This Project Is

A personal super-app ("MyOS") — a unified mobile and desktop environment that hosts multiple
self-contained modules (Health, Budget, Notes, Checklist, etc.), all sharing a single data layer,
auth system, and UI shell. Built for one user (private, not a SaaS product). The app must work
offline-first, sync across devices in the future, and be updatable without app store submissions.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | React Native + Expo (SDK 52+) | iOS, Android, Web from one codebase |
| Language | TypeScript (strict mode) | All files .tsx / .ts |
| Navigation | Expo Router (file-based) | Screens live in /app |
| Local Storage | Expo SQLite (structured data) + MMKV (preferences/settings) | SQLite for logs/records, MMKV for fast key-value |
| State Management | Zustand | Lightweight, module-friendly |
| Styling | NativeWind (Tailwind for RN) | Utility classes, dark mode via class strategy |
| OTA Updates | Expo EAS Update | Push JS bundle updates without app store |
| Future Backend | Supabase | Postgres + auth + real-time sync + row-level security |

---

## Module Registry

| Module | Folder | Status | Description |
|---|---|---|---|
| Health | /modules/health | 🔨 Active | Workout tracking + diet/nutrition logging |
| Budget | /modules/budget | 📋 Planned | Income, expenses, balance tracking |
| Notes | /modules/notes | 📋 Planned | Free-form notes with tags |
| Checklist | /modules/checklist | 📋 Planned | Tasks, to-dos, recurring items |

---

## Project Structure

```
/
├── CLAUDE.md                        ← YOU ARE HERE — read this first, always
├── app/                             ← Expo Router screens (navigation only, no logic)
│   ├── index.tsx                    ← Home dashboard
│   └── (modules)/
│       ├── health/
│       ├── budget/
│       ├── notes/
│       └── checklist/
├── core/
│   ├── components/                  ← Shared UI (Button, Card, Input, Modal, etc.)
│   ├── db/                          ← SQLite setup, migrations, schema
│   ├── store/                       ← Zustand global stores (user profile, theme, auth)
│   ├── sync/                        ← Future: Supabase sync queue
│   ├── types/                       ← Shared TypeScript types (User, DailyLog, etc.)
│   └── utils/                       ← Date helpers, formatters, validators
├── modules/
│   ├── health/
│   │   ├── CLAUDE.md                ← Health module instructions — read when working on health
│   │   ├── workout/
│   │   ├── diet/
│   │   └── shared/
│   ├── budget/
│   │   └── CLAUDE.md
│   ├── notes/
│   │   └── CLAUDE.md
│   └── checklist/
│       └── CLAUDE.md
├── docs/
│   ├── data-schema.md               ← All tables and fields
│   ├── module-contracts.md          ← How modules communicate through core
│   └── roadmap.md                   ← Build order, completed features, next up
└── assets/
    ├── fonts/
    └── icons/
```

---

## Core Rules — Always Follow These

### Reading files
- When starting a task, read only: this file + the relevant module's CLAUDE.md + the specific files needed
- Do NOT read all modules at once — each is self-contained
- If unsure which files are needed, ask before reading broadly

### Architecture rules
- Modules NEVER import from each other directly
- Modules read shared data only through `core/store` or `core/db` queries
- All reusable UI components go in `core/components`, never inside a module
- All TypeScript types shared between modules go in `core/types`
- Navigation logic goes in `app/`, business logic stays in `modules/`

### Code style
- TypeScript strict mode — no `any` types
- Functional components only — no class components
- Every component file exports one default component
- Zustand stores are one file per domain (e.g. `core/store/userStore.ts`)
- Database migrations are numbered and never edited after creation (e.g. `001_init.sql`)

### What NOT to do
- Do not add a new dependency without checking if an existing one covers the need
- Do not put business logic in screen files (`app/`) — screens are thin wrappers
- Do not hardcode user data or mock data into components
- Do not skip TypeScript types — always define interfaces for data structures
- Do not modify the database schema directly — create a new migration file

---

## Core Data (Shared Between Modules)

These types live in `core/types` and any module can read them:

```typescript
// User profile — written once, read by all modules
UserProfile {
  id: string
  name: string
  dateOfBirth: string
  weightKg: number
  heightCm: number
  goals: string[]
  createdAt: string
  updatedAt: string
}

// Daily log — one entry per day, modules attach their data here
DailyLog {
  id: string
  date: string                  // YYYY-MM-DD, unique
  notes: string | null
  createdAt: string
}
```

Modules extend `DailyLog` with their own related tables (e.g. `WorkoutSession`, `MealEntry`)
linked by `date`, not by foreign key to `DailyLog.id` — keeps modules independent.

---

## Current Focus

**Phase 1 — Health Module (Workout + Diet)**
See `/modules/health/CLAUDE.md` for full details.

Build order:
1. App shell + navigation skeleton
2. Core DB setup + UserProfile
3. Health module — Workout
4. Health module — Diet
5. Home dashboard with daily summary

---

## When Starting a New Session

1. Read this file
2. Read `docs/roadmap.md` to see current status
3. Read the relevant module's CLAUDE.md
4. Ask the user what task to work on if not specified

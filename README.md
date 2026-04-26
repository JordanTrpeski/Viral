# Viral — MyOS

A personal super-app. One app that handles health, budget, and life organisation — offline-first, built for daily use, owned entirely by you.

---

## What It Is

MyOS is a unified mobile environment that hosts self-contained modules sharing a single data layer, auth system, and UI shell. It is a private personal tool, not a SaaS product. No accounts, no subscriptions, no cloud dependency (sync comes later as an optional layer).

---

## Modules

| Module | Status | Description |
|---|---|---|
| Health — Workout | Phase 1 | Log training sessions, exercises, sets, reps, weight. Track history and progress. |
| Health — Diet | Phase 1 | Log meals and food items. Track calories and macros. |
| Health — Water | Phase 1 | Daily water intake log with goal tracking. |
| Body Weight | Phase 1 | Daily weigh-in with history graph and trend line. |
| Checklist | Phase 1 | Tap-to-check lists. Attach to workout sessions. Recurring templates. |
| Budget | Phase 2 | Income, expenses, categories, limits, daily/weekly/monthly summaries. |
| Organizer | Phase 3 | People directory, birthday reminders with tier-based notifications, calendar, reminders, notes. |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Language | TypeScript (strict mode) |
| Navigation | Expo Router (file-based) |
| Styling | NativeWind (Tailwind for React Native) |
| Local Storage | Expo SQLite + MMKV |
| State | Zustand |
| OTA Updates | Expo EAS Update (planned) |
| Backend | Supabase (Phase 4 — optional cloud sync) |

---

## Project Structure

```
/
├── app/                    # Expo Router screens (navigation only)
│   └── (tabs)/             # Bottom tab screens
├── core/
│   ├── components/         # Shared UI component library (12 components)
│   ├── db/                 # SQLite setup and migrations
│   ├── store/              # Zustand global stores
│   ├── types/              # Shared TypeScript types
│   └── theme.ts            # All design tokens — colors, typography, spacing
├── modules/
│   ├── health/             # Workout + Diet + Water
│   ├── budget/             # Budget (Phase 2)
│   └── organizer/          # Organizer (Phase 3)
├── Roadmap/
│   ├── roadmap.init.md     # Master index + design reference
│   ├── roadmap.v1.md       # Phase 1: App Shell + Health + Dashboard
│   ├── roadmap.v2.md       # Phase 2: Budget
│   └── roadmap.v3.md       # Phase 3: Organizer
└── CLAUDE.md               # AI assistant instructions for this project
```

---

## Design System

Dark mode first. All colors are tokens — never hardcoded.

| Token | Value |
|---|---|
| Background | `#0F0F0F` |
| Surface | `#1C1C1E` |
| Primary | `#6C63FF` |
| Success | `#30D158` |
| Warning | `#FFD60A` |
| Danger | `#FF453A` |

Full token reference in [`core/theme.ts`](core/theme.ts) and [`Roadmap/roadmap.init.md`](Roadmap/roadmap.init.md).

---

## Getting Started

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone, or press `a` for Android emulator / `i` for iOS simulator.

---

## Build Phase

Currently on **Phase 1 — App Shell + Health + Dashboard**.  
See [`Roadmap/roadmap.v1.md`](Roadmap/roadmap.v1.md) for the full task list and build order.

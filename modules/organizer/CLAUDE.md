# CLAUDE.md — Organizer Module

## What This Module Does

Unified module for people, birthdays, reminders, calendar, and notes.
Everything you need to remember — about your life and the people in it.
The birthday reminder system with importance tiers is the headline feature.

---

## File Structure

```
modules/organizer/
├── CLAUDE.md                    ← YOU ARE HERE
├── organizerSeed.ts             ← Seeds default importance tiers + rules on first launch
├── organizerStore.ts            ← Zustand store (tiers, people, reminders, notes)
├── people/
│   └── components/              ← PersonCard, GiftIdeaRow, etc.
├── reminders/
│   └── components/              ← ReminderRow, PriorityBadge, etc.
├── calendar/
│   └── components/              ← MonthGrid, DaySheet, EventBlock, etc.
├── notes/
│   └── components/              ← NoteCard, TagChip, RichTextEditor, etc.
└── shared/
    ├── organizerUtils.ts        ← resolveTemplate, nextBirthday, daysUntil, etc.
    └── notificationScheduler.ts ← Schedules all birthday + reminder notifications
```

Screens live in `app/organizer/` — module only contains business logic and components.

---

## Database Schema

All tables prefixed `organizer_`. Queries in `core/db/organizerQueries.ts`.

### organizer_tiers
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| name | TEXT | e.g. "Very Important" |
| color | TEXT | hex |
| emoji | TEXT | |
| daily_countdown | INTEGER | 0/1 boolean |
| daily_countdown_start_days | INTEGER | how many days out to start daily pings |
| order_index | INTEGER | display order |
| is_system | INTEGER | 0/1 — system tiers can't be deleted |
| created_at | TEXT | ISO |

### organizer_tier_rules
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| tier_id | TEXT FK → organizer_tiers | CASCADE delete |
| days_before | INTEGER | 0 = day-of |
| notification_time | TEXT | HH:MM |
| message_template | TEXT | supports [Name] [Days] [Age] [Relationship] |
| is_enabled | INTEGER | 0/1 |
| created_at | TEXT | ISO |

### organizer_people
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| name | TEXT | required |
| birthday_day | INTEGER | nullable |
| birthday_month | INTEGER | nullable |
| birthday_year | INTEGER | nullable — if known, shows age |
| photo_uri | TEXT | local file path |
| tier_id | TEXT FK → organizer_tiers | |
| relationship | TEXT | freetext label |
| phone | TEXT | |
| notes | TEXT | |
| override_notifications | INTEGER | 0/1 — if 1, use person_rules instead of tier_rules |
| created_at | TEXT | ISO |

### organizer_person_rules
Same structure as organizer_tier_rules but with `person_id` FK instead of `tier_id`.
Only active when `organizer_people.override_notifications = 1`.

### organizer_gift_ideas
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| person_id | TEXT FK → organizer_people | CASCADE delete |
| idea | TEXT | |
| price_estimate | REAL | nullable |
| is_purchased | INTEGER | 0/1 |
| created_at | TEXT | ISO |

### organizer_reminders
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| title | TEXT | |
| due_date | TEXT | YYYY-MM-DD |
| due_time | TEXT | HH:MM, nullable |
| repeat | TEXT | none/daily/weekly/monthly/yearly |
| priority | TEXT | low/medium/high/urgent |
| person_id | TEXT FK → organizer_people | nullable, ON DELETE SET NULL |
| note_id | TEXT | nullable — linked note id |
| is_completed | INTEGER | 0/1 |
| completed_at | TEXT | ISO, nullable |
| snoozed_until | TEXT | ISO, nullable |
| created_at | TEXT | ISO |

### organizer_events
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| title | TEXT | |
| date | TEXT | YYYY-MM-DD |
| start_time | TEXT | HH:MM, nullable |
| end_time | TEXT | HH:MM, nullable |
| is_all_day | INTEGER | 0/1 |
| location | TEXT | nullable |
| repeat | TEXT | none/daily/weekly/monthly/yearly |
| color | TEXT | hex, nullable |
| notes | TEXT | nullable |
| person_id | TEXT FK → organizer_people | nullable, ON DELETE SET NULL |
| created_at | TEXT | ISO |

### organizer_event_reminders
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| event_id | TEXT FK → organizer_events | CASCADE delete |
| minutes_before | INTEGER | e.g. 15, 60, 1440 (1 day) |
| created_at | TEXT | ISO |

### organizer_notes
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| title | TEXT | nullable |
| body | TEXT | rich text (stored as plain/markdown) |
| is_pinned | INTEGER | 0/1 |
| is_archived | INTEGER | 0/1 — never deleted, always archived |
| person_id | TEXT FK → organizer_people | nullable, ON DELETE SET NULL |
| event_id | TEXT FK → organizer_events | nullable, ON DELETE SET NULL |
| created_at | TEXT | ISO |
| updated_at | TEXT | ISO |

### organizer_tags
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| name | TEXT UNIQUE | |
| color | TEXT | hex |
| created_at | TEXT | ISO |

### organizer_note_tags
| Column | Type | Notes |
|---|---|---|
| note_id | TEXT FK → organizer_notes | CASCADE delete |
| tag_id | TEXT FK → organizer_tags | CASCADE delete |
| PRIMARY KEY | (note_id, tag_id) | |

---

## Default Importance Tiers (seeded on first launch)

| Tier | Color | Rules |
|---|---|---|
| Very Important | #A855F7 👑 | 30d, 14d, 7d, 3d, 1d, 0d + daily countdown from 7d |
| Family | #EF4444 ❤️ | 14d, 7d, 1d, 0d |
| Close Friends | #EAB308 ⭐ | 7d, 3d, 1d, 0d |
| Friends | #22C55E 🤝 | 3d, 1d, 0d |
| Acquaintances | #6B7280 👋 | 1d, 0d |

System tiers (`is_system = 1`) cannot be deleted — only edited.

---

## Message Template Variables

Available in all tier and person rule message templates:

| Variable | Resolves to |
|---|---|
| [Name] | Person's first name |
| [Days] | Days until birthday (e.g. "3") |
| [Age] | Age they're turning (requires birthday_year) |
| [Relationship] | Person's relationship label |

Resolution happens in `modules/organizer/shared/organizerUtils.ts → resolveTemplate()`.

---

## Notification Scheduling

`notificationScheduler.ts` runs:
1. On every organizer screen mount
2. On a daily background task (expo-task-manager)

Logic per person:
- Resolve effective rules: person_rules if override_notifications=1, else tier_rules
- For each enabled rule: calculate `notifyDate = nextBirthday(person) - daysBefore`
- If `notifyDate === today`: schedule local push at `rule.notification_time`
- If `daily_countdown = true` and `daysUntil <= daily_countdown_start_days`:
  schedule a daily notification with [Days] resolved to the countdown value

---

## Key Utilities (to build in organizerUtils.ts)

```typescript
nextBirthday(birthdayDay, birthdayMonth, fromDate?): string   // → YYYY-MM-DD
daysUntil(targetDate: string, fromDate?): number
resolveTemplate(template: string, person: OrganizerPerson, daysUntil: number): string
getDaysUntilBirthday(person: OrganizerPerson): number | null
```

---

## Architecture Rules

- Business logic stays in `modules/organizer/` — never in `app/organizer/`
- Screens in `app/organizer/` are thin wrappers that read from the store
- `organizerStore.ts` is the only place that calls DB query functions directly
- Notification scheduling is a side effect — triggered from the store or a dedicated scheduler, never from screen components
- Gift ideas, person rules, event reminders loaded on-demand (not in global store) — use local component state + direct DB calls via queries

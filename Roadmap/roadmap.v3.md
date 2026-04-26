# roadmap.v3.md — Phase 3: Organizer Module

## Status: Planned (start after Phase 2 is marked Done)
## Module CLAUDE.md: /modules/organizer/CLAUDE.md
## Prerequisite: roadmap.v2.md completed

---

## Goal

One unified module for people, birthdays, reminders, calendar, and notes.
Everything you need to remember — about your life and the people in it.
The birthday reminder system with importance tiers is the headline feature.

---

## Build Order

1. Organizer shell + DB
2. Importance tiers
3. People directory
4. Birthday reminders + notifications
5. Reminders
6. Calendar
7. Notes
8. Dashboard card

---

## 1. Organizer Shell + DB

- [ ] Add Organizer tab to bottom nav
- [ ] SQLite migrations for all organizer tables (see organizer CLAUDE.md for schema)
- [ ] Seed default importance tiers + notification rules (see organizer CLAUDE.md)
- [ ] Install expo-notifications + configure permissions request on first launch
- [ ] Organizer home screen skeleton with 4 sub-sections:
      People · Reminders · Calendar · Notes

---

## 2. Importance Tiers

**What:** The system that controls how much attention each person gets,
especially for birthday reminders. Fully customizable.

**Default tiers shipped:**
- Very Important — 30d, 14d, 7d, 3d, 1d, day-of + daily countdown from 7d
- Family — 14d, 7d, 1d, day-of
- Close Friends — 7d, 3d, 1d, day-of
- Friends — 3d, 1d, day-of
- Acquaintances — 1d, day-of

- [ ] Tier list screen — shows all tiers with color + name + rule count
- [ ] Edit tier screen:
      - Name input
      - Color picker (from preset palette)
      - Emoji picker
      - Notification rules list:
            Each rule: days before + notification time + message template
            Toggle enable/disable per rule
            Add rule / delete rule
      - Daily countdown toggle: "Send daily from X days before"
      - Daily countdown start day picker
- [ ] Add custom tier from scratch
- [ ] Delete tier — must reassign people before confirming
- [ ] Reorder tiers (drag to set display priority)
- [ ] Template variables available in message templates:
      [Name] [Days] [Age] [Relationship]
      Preview shows resolved example

---

## 3. People Directory

- [ ] People list screen:
      - Sorted by: upcoming birthday (nearest first) — default
      - Toggle sort: name A–Z / tier
      - Filter by tier (chip row)
      - Search by name
      - Upcoming birthdays strip: horizontal scroll, next 30 days
- [ ] Person card in list:
      - Avatar (photo or initial)
      - Name + relationship label
      - Tier badge (colored)
      - Days until birthday (red if ≤3, amber if ≤7, normal otherwise)
- [ ] Add/edit person screen:
      - Name (required)
      - Birthday: day + month (required for reminders), year (optional — shows age)
      - Photo: camera or gallery picker
      - Importance tier — picker with tier preview (shows notification schedule)
      - Relationship label (freetext)
      - Phone number
      - Notes (freetext)
      - Custom notification override:
            Toggle "Override tier defaults for this person"
            If on: same rule editor as tier screen, applies only to this person
- [ ] Person profile screen:
      - Header: photo, name, tier badge, days until birthday, age (if year known)
      - Contact: phone number with tap-to-call
      - Relationship + notes
      - Gift ideas section:
            List of ideas with checkbox (mark as purchased)
            Add idea inline
            Price estimate field (optional)
      - Linked notes (notes tagged to this person)
      - Linked events (calendar events linked to this person)
- [ ] Swipe left on person in list → edit / delete
- [ ] Birthday passed within 7 days → shown in "Recent Birthdays" section

---

## 4. Birthday Reminders + Notifications

**Core feature — must be reliable.**

- [ ] Notification scheduler (notificationScheduler.ts):
      - Runs on app open
      - Runs on a daily background task (expo-background-fetch or expo-task-manager)
      - For each person with a birthday:
            Resolve effective rules (overrides beat tier defaults)
            For each rule: calculate notify date = nextBirthday − daysBefore
            If notify date is today: schedule local push at rule.notificationTime
            If daily countdown active + daysUntil ≤ daysBefore:
              Schedule notification with [Days] resolved to countdown value
- [ ] Message template resolver (resolveTemplate in organizerUtils.ts):
      Substitutes [Name] [Days] [Age] [Relationship] from person data
- [ ] Birthday list screen:
      - "This month" section
      - "Next month" section
      - "Later" section
      - "Recent" section (passed in last 7 days)
      - Each row: person name + tier badge + age (if known) + days until
- [ ] Notification permission check on first organizer open
      Friendly prompt explaining why notifications are needed
- [ ] Test notification button in settings (sends a fake birthday notification)

---

## 5. Reminders

- [ ] Reminders list screen:
      - Sections: Overdue (red) · Today · Tomorrow · This Week · Later · Completed
      - Overdue items float to top within their section
      - Priority indicator: colored left border (low=grey, medium=sky, high=amber, urgent=red)
      - Swipe left → edit / snooze / delete
- [ ] Add/edit reminder screen:
      - Title
      - Date + time picker
      - Repeat: None / Daily / Weekly / Monthly / Yearly / Custom interval
      - Priority picker: Low / Medium / High / Urgent
      - Link to person (optional — shows their avatar in notification)
      - Link to note (optional)
      - Snooze options: 5min / 15min / 1h / tomorrow / custom
- [ ] Tap to complete — animated strikethrough, moves to Completed section
- [ ] Completed section is collapsible, archived (not deleted)
- [ ] Recurring reminders show next occurrence date below the title
- [ ] Overdue badge on Organizer nav tab when items are past due

---

## 6. Calendar

### Views

- [ ] Monthly view:
      - Standard calendar grid
      - Dot indicators: pink = birthday, blue = event/reminder
      - Tap a day → DaySheet slides up from bottom
      - DaySheet: all items for that day in time order
      - Long press empty day → quick add event
- [ ] Weekly view:
      - 7-column time grid (6:00 → 22:00)
      - Events shown as colored blocks with title
      - All-day events at top
      - Tap empty slot → add event at that time
- [ ] Day view:
      - Vertical timeline
      - All events, reminders, birthdays in time order
      - Scrolls to current time on open
- [ ] View toggle: Month / Week / Day (tab switcher at top)

### Events

- [ ] Add/edit event screen:
      - Title
      - Date
      - Start + end time (or all-day toggle)
      - Location (freetext)
      - Repeat: None / Daily / Weekly / Monthly / Yearly
      - Color tag (from preset palette)
      - Notes
      - Event reminders — add multiple:
            e.g. "15 min before" + "1 day before"
            Each reminder schedules a local push notification
      - Link to person (optional)
- [ ] Auto-population (no manual entry needed):
      - Birthdays from People appear on correct dates with tier color
      - Reminders appear on their due date
      - These are read-only in the calendar (tap → go to source)

---

## 7. Notes

- [ ] Notes list screen:
      - Pinned notes at top (horizontal scroll row)
      - All other notes in reverse-chronological list
      - Search bar — full-text search
      - Filter by tag (chip row appears when tags exist)
      - Archived notes accessible via "Archived" toggle
- [ ] Note detail / edit screen:
      - Title (optional)
      - Rich text body: bold, italic, bullet list, numbered list, heading
      - Tags: add / remove / create new (with color picker)
      - Pin toggle
      - Set reminder: date + time picker → schedules notification
      - Link to person: shows their name + opens their profile on tap
      - Link to calendar event
      - "Archived" toggle
      - Created + last edited timestamps at bottom
- [ ] Notes are never permanently deleted — always archived
- [ ] Pinned notes appear on dashboard card

---

## 8. Dashboard Card

When Phase 3 completes, this card is added to the Home dashboard:

```
┌─────────────────────────────────┐
│  Organizer                      │
│  Ana's birthday in 3 days       │
│  Dentist — tomorrow 14:00       │
│  2 pinned notes                 │
└─────────────────────────────────┘
```

- Shows the 2 most urgent upcoming items (birthday or reminder, whichever sooner)
- Shows pinned note count if any
- Urgent items (≤3 days) shown in red
- Tap → opens Organizer home

---

## Phase 3 Done When

- [ ] Default tiers seeded and editable
- [ ] Can add a person with a birthday and a tier
- [ ] Birthday notifications fire correctly based on tier rules
- [ ] Daily countdown works for Very Important tier
- [ ] Can add, complete, and repeat reminders
- [ ] Monthly calendar shows birthdays and events with dot indicators
- [ ] Can create and pin notes with rich text
- [ ] Notes can be tagged and searched
- [ ] Organizer card appears on home dashboard
- [ ] No placeholder screens in Phase 3 scope

# Health Module v1 Backup

Created before roadmap v1.1.0 teardown on 2026-05-17.

## What's in this folder

| File | Contents |
|---|---|
| `schema_snapshot.sql` | DDL for all old Health tables as they existed before v1.1.0 |
| `exerciseSeed_backup.ts` | Old exercise seed (64 exercises, flat schema: name + muscleGroup + equipment) |
| `foodSeed_backup.ts` | Old food seed (100 foods, per-100g macros) |

## Tables that were dropped

- `exercises` — flat schema, no form cues / muscle JSON / difficulty
- `workout_sessions` — had name, duration_minutes; no perceived_difficulty
- `workout_sets` — had reps/weight_kg only; no target vs performed, no RPE, no tempo
- `workout_templates` — just name + id; no goal_type / days_per_week
- `template_exercises` — just order_index + exercise_id; no sets/reps/rest
- `meal_templates` — old diet template system
- `meal_template_entries` — old diet template entries

## Tables kept (removed in later sections)

- `body_weight_log` — removed in Section 9
- `body_measurements` — removed in Section 9
- `sleep_logs` — removed in Section 9
- `step_sessions` — removed in Section 8
- `water_log` — replaced in Section 8

## Notes

- The user never had real workout/diet data to lose (app was in dev)
- Food seed data is preserved and re-imported in the new schema
- Exercise seed data is preserved and expanded with form cues, muscles JSON, substitutes

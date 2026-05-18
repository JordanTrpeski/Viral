import { isProgramSeeded, insertTemplateV2, insertTemplateExerciseV2 } from '@core/db/workoutQueriesV2'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeedExerciseEntry {
  id: string
  exerciseId: string
  dayNumber: number
  orderIndex: number
  sets: number
  repMin?: number
  repMax?: number
  restSeconds?: number
}

interface SeedProgram {
  id: string
  name: string
  description: string
  goalType: 'strength' | 'hypertrophy' | 'endurance' | 'weight_loss' | 'general'
  durationWeeks: number
  daysPerWeek: number
  exercises: SeedExerciseEntry[]
}

// ─── Program Definitions ──────────────────────────────────────────────────────

const PROGRAMS: SeedProgram[] = [
  // ── Program 1: Full Body Strength 3x/week ─────────────────────────────────
  {
    id: 'prog_full_body_strength',
    name: 'Full Body Strength',
    description: 'Classic 3-day full body split. Hit every major muscle group 3x per week with compound lifts.',
    goalType: 'strength',
    durationWeeks: 8,
    daysPerWeek: 3,
    exercises: [
      // Day 1 — Mon (Squat focus)
      { id: 'te_fbs_d1_1', exerciseId: 'ex_barbell_squat',    dayNumber: 1, orderIndex: 0, sets: 4, repMin: 4, repMax: 6, restSeconds: 180 },
      { id: 'te_fbs_d1_2', exerciseId: 'ex_bench_press',       dayNumber: 1, orderIndex: 1, sets: 3, repMin: 5, repMax: 7, restSeconds: 150 },
      { id: 'te_fbs_d1_3', exerciseId: 'ex_barbell_row',       dayNumber: 1, orderIndex: 2, sets: 3, repMin: 6, repMax: 8, restSeconds: 120 },
      { id: 'te_fbs_d1_4', exerciseId: 'ex_overhead_press',    dayNumber: 1, orderIndex: 3, sets: 3, repMin: 6, repMax: 8, restSeconds: 120 },
      { id: 'te_fbs_d1_5', exerciseId: 'ex_rdl',               dayNumber: 1, orderIndex: 4, sets: 3, repMin: 8, repMax: 10, restSeconds: 120 },

      // Day 2 — Wed (Deadlift focus)
      { id: 'te_fbs_d2_1', exerciseId: 'ex_deadlift',          dayNumber: 2, orderIndex: 0, sets: 3, repMin: 4, repMax: 5, restSeconds: 210 },
      { id: 'te_fbs_d2_2', exerciseId: 'ex_incline_bench',     dayNumber: 2, orderIndex: 1, sets: 3, repMin: 7, repMax: 9, restSeconds: 120 },
      { id: 'te_fbs_d2_3', exerciseId: 'ex_lat_pulldown',      dayNumber: 2, orderIndex: 2, sets: 3, repMin: 8, repMax: 10, restSeconds: 90 },
      { id: 'te_fbs_d2_4', exerciseId: 'ex_db_shoulder_press', dayNumber: 2, orderIndex: 3, sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
      { id: 'te_fbs_d2_5', exerciseId: 'ex_leg_press',         dayNumber: 2, orderIndex: 4, sets: 3, repMin: 10, repMax: 12, restSeconds: 90 },

      // Day 3 — Fri (Volume day)
      { id: 'te_fbs_d3_1', exerciseId: 'ex_front_squat',       dayNumber: 3, orderIndex: 0, sets: 3, repMin: 5, repMax: 7, restSeconds: 150 },
      { id: 'te_fbs_d3_2', exerciseId: 'ex_db_row',            dayNumber: 3, orderIndex: 1, sets: 3, repMin: 10, repMax: 12, restSeconds: 90 },
      { id: 'te_fbs_d3_3', exerciseId: 'ex_incline_db_press',  dayNumber: 3, orderIndex: 2, sets: 3, repMin: 10, repMax: 12, restSeconds: 90 },
      { id: 'te_fbs_d3_4', exerciseId: 'ex_barbell_curl',      dayNumber: 3, orderIndex: 3, sets: 3, repMin: 10, repMax: 12, restSeconds: 60 },
      { id: 'te_fbs_d3_5', exerciseId: 'ex_skull_crusher',     dayNumber: 3, orderIndex: 4, sets: 3, repMin: 10, repMax: 12, restSeconds: 60 },
    ],
  },

  // ── Program 2: Push / Pull / Legs 6x/week ─────────────────────────────────
  {
    id: 'prog_ppl',
    name: 'Push / Pull / Legs',
    description: 'High-frequency 6-day split for maximum hypertrophy. Each muscle group trained twice per week.',
    goalType: 'hypertrophy',
    durationWeeks: 12,
    daysPerWeek: 6,
    exercises: [
      // Day 1 — Push A
      { id: 'te_ppl_d1_1', exerciseId: 'ex_bench_press',        dayNumber: 1, orderIndex: 0, sets: 4, repMin: 6, repMax: 8, restSeconds: 150 },
      { id: 'te_ppl_d1_2', exerciseId: 'ex_overhead_press',     dayNumber: 1, orderIndex: 1, sets: 3, repMin: 8, repMax: 10, restSeconds: 120 },
      { id: 'te_ppl_d1_3', exerciseId: 'ex_incline_bench',      dayNumber: 1, orderIndex: 2, sets: 3, repMin: 10, repMax: 12, restSeconds: 90 },
      { id: 'te_ppl_d1_4', exerciseId: 'ex_cable_fly',          dayNumber: 1, orderIndex: 3, sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
      { id: 'te_ppl_d1_5', exerciseId: 'ex_lateral_raise',      dayNumber: 1, orderIndex: 4, sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
      { id: 'te_ppl_d1_6', exerciseId: 'ex_tricep_pushdown',    dayNumber: 1, orderIndex: 5, sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },

      // Day 2 — Pull A
      { id: 'te_ppl_d2_1', exerciseId: 'ex_deadlift',           dayNumber: 2, orderIndex: 0, sets: 3, repMin: 4, repMax: 6, restSeconds: 210 },
      { id: 'te_ppl_d2_2', exerciseId: 'ex_barbell_row',        dayNumber: 2, orderIndex: 1, sets: 4, repMin: 6, repMax: 8, restSeconds: 120 },
      { id: 'te_ppl_d2_3', exerciseId: 'ex_lat_pulldown',       dayNumber: 2, orderIndex: 2, sets: 3, repMin: 8, repMax: 10, restSeconds: 90 },
      { id: 'te_ppl_d2_4', exerciseId: 'ex_cable_row',          dayNumber: 2, orderIndex: 3, sets: 3, repMin: 10, repMax: 12, restSeconds: 90 },
      { id: 'te_ppl_d2_5', exerciseId: 'ex_barbell_curl',       dayNumber: 2, orderIndex: 4, sets: 3, repMin: 10, repMax: 12, restSeconds: 60 },
      { id: 'te_ppl_d2_6', exerciseId: 'ex_face_pull',          dayNumber: 2, orderIndex: 5, sets: 3, repMin: 15, repMax: 20, restSeconds: 60 },

      // Day 3 — Legs A
      { id: 'te_ppl_d3_1', exerciseId: 'ex_barbell_squat',      dayNumber: 3, orderIndex: 0, sets: 4, repMin: 6, repMax: 8, restSeconds: 180 },
      { id: 'te_ppl_d3_2', exerciseId: 'ex_leg_press',          dayNumber: 3, orderIndex: 1, sets: 3, repMin: 10, repMax: 12, restSeconds: 120 },
      { id: 'te_ppl_d3_3', exerciseId: 'ex_rdl',                dayNumber: 3, orderIndex: 2, sets: 3, repMin: 8, repMax: 10, restSeconds: 120 },
      { id: 'te_ppl_d3_4', exerciseId: 'ex_leg_curl',           dayNumber: 3, orderIndex: 3, sets: 3, repMin: 10, repMax: 12, restSeconds: 90 },
      { id: 'te_ppl_d3_5', exerciseId: 'ex_leg_extension',      dayNumber: 3, orderIndex: 4, sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },

      // Day 4 — Push B
      { id: 'te_ppl_d4_1', exerciseId: 'ex_overhead_press',     dayNumber: 4, orderIndex: 0, sets: 4, repMin: 6, repMax: 8, restSeconds: 150 },
      { id: 'te_ppl_d4_2', exerciseId: 'ex_incline_db_press',   dayNumber: 4, orderIndex: 1, sets: 3, repMin: 10, repMax: 12, restSeconds: 90 },
      { id: 'te_ppl_d4_3', exerciseId: 'ex_db_shoulder_press',  dayNumber: 4, orderIndex: 2, sets: 3, repMin: 10, repMax: 12, restSeconds: 90 },
      { id: 'te_ppl_d4_4', exerciseId: 'ex_dip',                dayNumber: 4, orderIndex: 3, sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
      { id: 'te_ppl_d4_5', exerciseId: 'ex_skull_crusher',      dayNumber: 4, orderIndex: 4, sets: 3, repMin: 10, repMax: 12, restSeconds: 60 },
      { id: 'te_ppl_d4_6', exerciseId: 'ex_lateral_raise',      dayNumber: 4, orderIndex: 5, sets: 3, repMin: 15, repMax: 20, restSeconds: 60 },

      // Day 5 — Pull B
      { id: 'te_ppl_d5_1', exerciseId: 'ex_barbell_row',        dayNumber: 5, orderIndex: 0, sets: 4, repMin: 6, repMax: 8, restSeconds: 120 },
      { id: 'te_ppl_d5_2', exerciseId: 'ex_db_row',             dayNumber: 5, orderIndex: 1, sets: 3, repMin: 10, repMax: 12, restSeconds: 90 },
      { id: 'te_ppl_d5_3', exerciseId: 'ex_cable_row',          dayNumber: 5, orderIndex: 2, sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
      { id: 'te_ppl_d5_4', exerciseId: 'ex_chin_up',            dayNumber: 5, orderIndex: 3, sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
      { id: 'te_ppl_d5_5', exerciseId: 'ex_hammer_curl',        dayNumber: 5, orderIndex: 4, sets: 3, repMin: 10, repMax: 12, restSeconds: 60 },
      { id: 'te_ppl_d5_6', exerciseId: 'ex_cable_curl',         dayNumber: 5, orderIndex: 5, sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },

      // Day 6 — Legs B
      { id: 'te_ppl_d6_1', exerciseId: 'ex_front_squat',        dayNumber: 6, orderIndex: 0, sets: 4, repMin: 6, repMax: 8, restSeconds: 180 },
      { id: 'te_ppl_d6_2', exerciseId: 'ex_hack_squat',         dayNumber: 6, orderIndex: 1, sets: 3, repMin: 8, repMax: 10, restSeconds: 120 },
      { id: 'te_ppl_d6_3', exerciseId: 'ex_db_lunge',           dayNumber: 6, orderIndex: 2, sets: 3, repMin: 10, repMax: 12, restSeconds: 90 },
      { id: 'te_ppl_d6_4', exerciseId: 'ex_db_rdl',             dayNumber: 6, orderIndex: 3, sets: 3, repMin: 10, repMax: 12, restSeconds: 90 },
      { id: 'te_ppl_d6_5', exerciseId: 'ex_leg_curl',           dayNumber: 6, orderIndex: 4, sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
      { id: 'te_ppl_d6_6', exerciseId: 'ex_leg_extension',      dayNumber: 6, orderIndex: 5, sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
    ],
  },

  // ── Program 3: Upper / Lower 4x/week ──────────────────────────────────────
  {
    id: 'prog_upper_lower',
    name: 'Upper / Lower Split',
    description: '4-day upper/lower split. Balances strength and size with focused upper and lower body days.',
    goalType: 'strength',
    durationWeeks: 8,
    daysPerWeek: 4,
    exercises: [
      // Day 1 — Upper A (horizontal emphasis)
      { id: 'te_ul_d1_1', exerciseId: 'ex_bench_press',        dayNumber: 1, orderIndex: 0, sets: 4, repMin: 5, repMax: 7, restSeconds: 150 },
      { id: 'te_ul_d1_2', exerciseId: 'ex_overhead_press',     dayNumber: 1, orderIndex: 1, sets: 3, repMin: 7, repMax: 9, restSeconds: 120 },
      { id: 'te_ul_d1_3', exerciseId: 'ex_barbell_row',        dayNumber: 1, orderIndex: 2, sets: 4, repMin: 6, repMax: 8, restSeconds: 120 },
      { id: 'te_ul_d1_4', exerciseId: 'ex_lat_pulldown',       dayNumber: 1, orderIndex: 3, sets: 3, repMin: 8, repMax: 10, restSeconds: 90 },
      { id: 'te_ul_d1_5', exerciseId: 'ex_barbell_curl',       dayNumber: 1, orderIndex: 4, sets: 3, repMin: 10, repMax: 12, restSeconds: 60 },
      { id: 'te_ul_d1_6', exerciseId: 'ex_skull_crusher',      dayNumber: 1, orderIndex: 5, sets: 3, repMin: 10, repMax: 12, restSeconds: 60 },

      // Day 2 — Lower A (squat focus)
      { id: 'te_ul_d2_1', exerciseId: 'ex_barbell_squat',      dayNumber: 2, orderIndex: 0, sets: 4, repMin: 5, repMax: 7, restSeconds: 180 },
      { id: 'te_ul_d2_2', exerciseId: 'ex_rdl',                dayNumber: 2, orderIndex: 1, sets: 3, repMin: 7, repMax: 9, restSeconds: 120 },
      { id: 'te_ul_d2_3', exerciseId: 'ex_leg_press',          dayNumber: 2, orderIndex: 2, sets: 3, repMin: 10, repMax: 12, restSeconds: 90 },
      { id: 'te_ul_d2_4', exerciseId: 'ex_leg_curl',           dayNumber: 2, orderIndex: 3, sets: 3, repMin: 10, repMax: 12, restSeconds: 90 },
      { id: 'te_ul_d2_5', exerciseId: 'ex_leg_extension',      dayNumber: 2, orderIndex: 4, sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },

      // Day 3 — Upper B (vertical / dumbbell emphasis)
      { id: 'te_ul_d3_1', exerciseId: 'ex_incline_bench',      dayNumber: 3, orderIndex: 0, sets: 4, repMin: 7, repMax: 9, restSeconds: 120 },
      { id: 'te_ul_d3_2', exerciseId: 'ex_db_shoulder_press',  dayNumber: 3, orderIndex: 1, sets: 3, repMin: 10, repMax: 12, restSeconds: 90 },
      { id: 'te_ul_d3_3', exerciseId: 'ex_db_row',             dayNumber: 3, orderIndex: 2, sets: 3, repMin: 10, repMax: 12, restSeconds: 90 },
      { id: 'te_ul_d3_4', exerciseId: 'ex_cable_row',          dayNumber: 3, orderIndex: 3, sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
      { id: 'te_ul_d3_5', exerciseId: 'ex_hammer_curl',        dayNumber: 3, orderIndex: 4, sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
      { id: 'te_ul_d3_6', exerciseId: 'ex_tricep_pushdown',    dayNumber: 3, orderIndex: 5, sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },

      // Day 4 — Lower B (deadlift focus)
      { id: 'te_ul_d4_1', exerciseId: 'ex_deadlift',           dayNumber: 4, orderIndex: 0, sets: 3, repMin: 4, repMax: 5, restSeconds: 210 },
      { id: 'te_ul_d4_2', exerciseId: 'ex_front_squat',        dayNumber: 4, orderIndex: 1, sets: 3, repMin: 6, repMax: 8, restSeconds: 150 },
      { id: 'te_ul_d4_3', exerciseId: 'ex_hack_squat',         dayNumber: 4, orderIndex: 2, sets: 3, repMin: 10, repMax: 12, restSeconds: 90 },
      { id: 'te_ul_d4_4', exerciseId: 'ex_db_lunge',           dayNumber: 4, orderIndex: 3, sets: 3, repMin: 10, repMax: 12, restSeconds: 90 },
      { id: 'te_ul_d4_5', exerciseId: 'ex_db_rdl',             dayNumber: 4, orderIndex: 4, sets: 3, repMin: 10, repMax: 12, restSeconds: 90 },
    ],
  },
]

// ─── Seeder ───────────────────────────────────────────────────────────────────

export function seedProgramsIfNeeded(): void {
  if (isProgramSeeded()) return

  const now = new Date().toISOString()

  for (const prog of PROGRAMS) {
    insertTemplateV2({
      id: prog.id,
      name: prog.name,
      description: prog.description,
      goalType: prog.goalType,
      durationWeeks: prog.durationWeeks,
      daysPerWeek: prog.daysPerWeek,
      createdAt: now,
    })

    for (const ex of prog.exercises) {
      insertTemplateExerciseV2({
        id: ex.id,
        templateId: prog.id,
        exerciseId: ex.exerciseId,
        dayNumber: ex.dayNumber,
        orderIndex: ex.orderIndex,
        sets: ex.sets,
        repMin: ex.repMin,
        repMax: ex.repMax,
        restSeconds: ex.restSeconds,
        createdAt: now,
      })
    }
  }
}

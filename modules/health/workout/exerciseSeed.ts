import { db } from '@core/db/database'
import type { MuscleGroup, Equipment } from '@modules/health/shared/types'

interface SeedExercise {
  id: string
  name: string
  muscleGroup: MuscleGroup
  equipment: Equipment | null
}

const SEEDS: SeedExercise[] = [
  // Chest
  { id: 'ex_bench_press',          name: 'Bench Press',              muscleGroup: 'chest',     equipment: 'barbell' },
  { id: 'ex_incline_bench',        name: 'Incline Bench Press',      muscleGroup: 'chest',     equipment: 'barbell' },
  { id: 'ex_decline_bench',        name: 'Decline Bench Press',      muscleGroup: 'chest',     equipment: 'barbell' },
  { id: 'ex_db_fly',               name: 'Dumbbell Fly',             muscleGroup: 'chest',     equipment: 'dumbbell' },
  { id: 'ex_incline_db_press',     name: 'Incline Dumbbell Press',   muscleGroup: 'chest',     equipment: 'dumbbell' },
  { id: 'ex_cable_fly',            name: 'Cable Fly',                muscleGroup: 'chest',     equipment: 'cable' },
  { id: 'ex_push_up',              name: 'Push-Up',                  muscleGroup: 'chest',     equipment: 'bodyweight' },
  { id: 'ex_chest_dip',            name: 'Chest Dip',                muscleGroup: 'chest',     equipment: 'bodyweight' },
  { id: 'ex_pec_deck',             name: 'Pec Deck',                 muscleGroup: 'chest',     equipment: 'machine' },

  // Back
  { id: 'ex_deadlift',             name: 'Deadlift',                 muscleGroup: 'back',      equipment: 'barbell' },
  { id: 'ex_barbell_row',          name: 'Barbell Row',              muscleGroup: 'back',      equipment: 'barbell' },
  { id: 'ex_pull_up',              name: 'Pull-Up',                  muscleGroup: 'back',      equipment: 'bodyweight' },
  { id: 'ex_chin_up',              name: 'Chin-Up',                  muscleGroup: 'back',      equipment: 'bodyweight' },
  { id: 'ex_lat_pulldown',         name: 'Lat Pulldown',             muscleGroup: 'back',      equipment: 'cable' },
  { id: 'ex_seated_cable_row',     name: 'Seated Cable Row',         muscleGroup: 'back',      equipment: 'cable' },
  { id: 'ex_db_row',               name: 'Dumbbell Row',             muscleGroup: 'back',      equipment: 'dumbbell' },
  { id: 'ex_tbar_row',             name: 'T-Bar Row',                muscleGroup: 'back',      equipment: 'barbell' },
  { id: 'ex_face_pull',            name: 'Face Pull',                muscleGroup: 'back',      equipment: 'cable' },
  { id: 'ex_rack_pull',            name: 'Rack Pull',                muscleGroup: 'back',      equipment: 'barbell' },

  // Legs
  { id: 'ex_squat',                name: 'Squat',                    muscleGroup: 'legs',      equipment: 'barbell' },
  { id: 'ex_rdl',                  name: 'Romanian Deadlift',        muscleGroup: 'legs',      equipment: 'barbell' },
  { id: 'ex_leg_press',            name: 'Leg Press',                muscleGroup: 'legs',      equipment: 'machine' },
  { id: 'ex_leg_extension',        name: 'Leg Extension',            muscleGroup: 'legs',      equipment: 'machine' },
  { id: 'ex_leg_curl',             name: 'Leg Curl',                 muscleGroup: 'legs',      equipment: 'machine' },
  { id: 'ex_bulgarian_split',      name: 'Bulgarian Split Squat',    muscleGroup: 'legs',      equipment: 'dumbbell' },
  { id: 'ex_hack_squat',           name: 'Hack Squat',               muscleGroup: 'legs',      equipment: 'machine' },
  { id: 'ex_calf_raise',           name: 'Standing Calf Raise',      muscleGroup: 'legs',      equipment: 'machine' },
  { id: 'ex_walking_lunge',        name: 'Walking Lunge',            muscleGroup: 'legs',      equipment: 'dumbbell' },
  { id: 'ex_goblet_squat',         name: 'Goblet Squat',             muscleGroup: 'legs',      equipment: 'dumbbell' },
  { id: 'ex_sumo_deadlift',        name: 'Sumo Deadlift',            muscleGroup: 'legs',      equipment: 'barbell' },

  // Shoulders
  { id: 'ex_ohp',                  name: 'Overhead Press',           muscleGroup: 'shoulders', equipment: 'barbell' },
  { id: 'ex_db_shoulder_press',    name: 'Dumbbell Shoulder Press',  muscleGroup: 'shoulders', equipment: 'dumbbell' },
  { id: 'ex_lateral_raise',        name: 'Lateral Raise',            muscleGroup: 'shoulders', equipment: 'dumbbell' },
  { id: 'ex_front_raise',          name: 'Front Raise',              muscleGroup: 'shoulders', equipment: 'dumbbell' },
  { id: 'ex_arnold_press',         name: 'Arnold Press',             muscleGroup: 'shoulders', equipment: 'dumbbell' },
  { id: 'ex_cable_lateral_raise',  name: 'Cable Lateral Raise',      muscleGroup: 'shoulders', equipment: 'cable' },
  { id: 'ex_upright_row',          name: 'Upright Row',              muscleGroup: 'shoulders', equipment: 'barbell' },
  { id: 'ex_reverse_fly',          name: 'Reverse Fly',              muscleGroup: 'shoulders', equipment: 'dumbbell' },

  // Arms
  { id: 'ex_barbell_curl',         name: 'Barbell Curl',             muscleGroup: 'arms',      equipment: 'barbell' },
  { id: 'ex_db_curl',              name: 'Dumbbell Curl',            muscleGroup: 'arms',      equipment: 'dumbbell' },
  { id: 'ex_hammer_curl',          name: 'Hammer Curl',              muscleGroup: 'arms',      equipment: 'dumbbell' },
  { id: 'ex_ez_curl',              name: 'EZ Bar Curl',              muscleGroup: 'arms',      equipment: 'barbell' },
  { id: 'ex_concentration_curl',   name: 'Concentration Curl',       muscleGroup: 'arms',      equipment: 'dumbbell' },
  { id: 'ex_tricep_pushdown',      name: 'Tricep Pushdown',          muscleGroup: 'arms',      equipment: 'cable' },
  { id: 'ex_skull_crusher',        name: 'Skull Crusher',            muscleGroup: 'arms',      equipment: 'barbell' },
  { id: 'ex_oh_tricep_ext',        name: 'Overhead Tricep Extension',muscleGroup: 'arms',      equipment: 'dumbbell' },
  { id: 'ex_diamond_push_up',      name: 'Diamond Push-Up',          muscleGroup: 'arms',      equipment: 'bodyweight' },
  { id: 'ex_cable_curl',           name: 'Cable Curl',               muscleGroup: 'arms',      equipment: 'cable' },
  { id: 'ex_tricep_kickback',      name: 'Tricep Kickback',          muscleGroup: 'arms',      equipment: 'dumbbell' },
  { id: 'ex_dips',                 name: 'Dips',                     muscleGroup: 'arms',      equipment: 'bodyweight' },

  // Core
  { id: 'ex_plank',               name: 'Plank',                    muscleGroup: 'core',      equipment: 'bodyweight' },
  { id: 'ex_crunch',              name: 'Crunch',                   muscleGroup: 'core',      equipment: 'bodyweight' },
  { id: 'ex_hanging_leg_raise',   name: 'Hanging Leg Raise',        muscleGroup: 'core',      equipment: 'bodyweight' },
  { id: 'ex_ab_wheel',            name: 'Ab Wheel Rollout',         muscleGroup: 'core',      equipment: 'other' },
  { id: 'ex_russian_twist',       name: 'Russian Twist',            muscleGroup: 'core',      equipment: 'dumbbell' },
  { id: 'ex_cable_crunch',        name: 'Cable Crunch',             muscleGroup: 'core',      equipment: 'cable' },
  { id: 'ex_mountain_climber',    name: 'Mountain Climber',         muscleGroup: 'core',      equipment: 'bodyweight' },
  { id: 'ex_sit_up',              name: 'Sit-Up',                   muscleGroup: 'core',      equipment: 'bodyweight' },

  // Cardio
  { id: 'ex_running',             name: 'Running',                  muscleGroup: 'cardio',    equipment: 'other' },
  { id: 'ex_cycling',             name: 'Cycling',                  muscleGroup: 'cardio',    equipment: 'machine' },
  { id: 'ex_jump_rope',           name: 'Jump Rope',                muscleGroup: 'cardio',    equipment: 'other' },
  { id: 'ex_rowing_machine',      name: 'Rowing Machine',           muscleGroup: 'cardio',    equipment: 'machine' },
  { id: 'ex_elliptical',          name: 'Elliptical',               muscleGroup: 'cardio',    equipment: 'machine' },
  { id: 'ex_stair_master',        name: 'Stair Master',             muscleGroup: 'cardio',    equipment: 'machine' },
]

export function seedExercisesIfNeeded(): void {
  const row = db.getFirstSync<{ c: number }>('SELECT COUNT(*) as c FROM exercises')
  if (row && row.c > 0) return

  const now = new Date().toISOString()
  for (const ex of SEEDS) {
    db.runSync(
      'INSERT INTO exercises (id, name, muscle_group, equipment, is_custom, created_at) VALUES (?, ?, ?, ?, 0, ?)',
      [ex.id, ex.name, ex.muscleGroup, ex.equipment ?? null, now],
    )
  }
}

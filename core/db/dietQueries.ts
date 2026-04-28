import { db } from './database'
import type { Food, Meal, MealEntry, MealType } from '@modules/health/shared/types'

// ─── Foods ────────────────────────────────────────────────────────────────────

interface RawFood {
  id: string; name: string; brand: string | null
  calories_per_100g: number; protein_per_100g: number
  carbs_per_100g: number; fat_per_100g: number
  fiber_per_100g: number | null; is_custom: number; created_at: string
}

function rowToFood(r: RawFood): Food {
  return {
    id: r.id, name: r.name, brand: r.brand ?? undefined,
    caloriesPer100g: r.calories_per_100g, proteinPer100g: r.protein_per_100g,
    carbsPer100g: r.carbs_per_100g, fatPer100g: r.fat_per_100g,
    fiberPer100g: r.fiber_per_100g ?? undefined,
    isCustom: r.is_custom === 1, createdAt: r.created_at,
  }
}

export function dbSearchFoods(query: string): Food[] {
  if (!query.trim()) {
    return db.getAllSync<RawFood>('SELECT * FROM foods ORDER BY name ASC LIMIT 50').map(rowToFood)
  }
  return db.getAllSync<RawFood>(
    'SELECT * FROM foods WHERE name LIKE ? OR brand LIKE ? ORDER BY name ASC LIMIT 50',
    [`%${query}%`, `%${query}%`],
  ).map(rowToFood)
}

export function dbInsertFood(food: Food): void {
  db.runSync(
    `INSERT INTO foods (id, name, brand, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, is_custom, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [food.id, food.name, food.brand ?? null, food.caloriesPer100g, food.proteinPer100g,
     food.carbsPer100g, food.fatPer100g, food.fiberPer100g ?? null, food.isCustom ? 1 : 0, food.createdAt],
  )
}

export function dbGetFoodCount(): number {
  return db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM foods')?.count ?? 0
}

// ─── Meals ────────────────────────────────────────────────────────────────────

interface RawMeal {
  id: string; date: string; meal_type: string
  name: string | null; logged_at: string; created_at: string
}

function rowToMeal(r: RawMeal): Meal {
  return {
    id: r.id, date: r.date, mealType: r.meal_type as MealType,
    name: r.name ?? undefined, loggedAt: r.logged_at, createdAt: r.created_at,
  }
}

export function dbInsertMeal(meal: Meal): void {
  db.runSync(
    'INSERT INTO meals (id, date, meal_type, name, logged_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [meal.id, meal.date, meal.mealType, meal.name ?? null, meal.loggedAt, meal.createdAt],
  )
}

export function dbDeleteMeal(id: string): void {
  db.runSync('DELETE FROM meals WHERE id = ?', [id])
}

export function dbGetMealsForDate(date: string): Meal[] {
  return db.getAllSync<RawMeal>(
    'SELECT * FROM meals WHERE date = ? ORDER BY logged_at ASC',
    [date],
  ).map(rowToMeal)
}

// ─── Entries ──────────────────────────────────────────────────────────────────

export interface EntryWithFood {
  entryId: string
  mealId: string
  foodId: string
  foodName: string
  brand?: string
  amountGrams: number
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

export function dbGetEntriesForDate(date: string): EntryWithFood[] {
  return db.getAllSync<{
    entry_id: string; meal_id: string; food_id: string; amount_grams: number
    food_name: string; brand: string | null
    calories_per_100g: number; protein_per_100g: number
    carbs_per_100g: number; fat_per_100g: number
  }>(
    `SELECT me.id as entry_id, me.meal_id, me.food_id, me.amount_grams,
            f.name as food_name, f.brand,
            f.calories_per_100g, f.protein_per_100g, f.carbs_per_100g, f.fat_per_100g
     FROM meal_entries me
     JOIN meals m ON me.meal_id = m.id
     JOIN foods f ON me.food_id = f.id
     WHERE m.date = ?`,
    [date],
  ).map((r) => ({
    entryId: r.entry_id,
    mealId: r.meal_id,
    foodId: r.food_id,
    foodName: r.food_name,
    brand: r.brand ?? undefined,
    amountGrams: r.amount_grams,
    calories: Math.round(r.calories_per_100g * r.amount_grams / 100),
    proteinG: Math.round(r.protein_per_100g * r.amount_grams / 10) / 10,
    carbsG: Math.round(r.carbs_per_100g * r.amount_grams / 10) / 10,
    fatG: Math.round(r.fat_per_100g * r.amount_grams / 10) / 10,
  }))
}

export function dbInsertMealEntry(entry: MealEntry): void {
  db.runSync(
    'INSERT INTO meal_entries (id, meal_id, food_id, amount_grams, created_at) VALUES (?, ?, ?, ?, ?)',
    [entry.id, entry.mealId, entry.foodId, entry.amountGrams, entry.createdAt],
  )
}

export function dbUpdateMealEntryGrams(id: string, amountGrams: number): void {
  db.runSync('UPDATE meal_entries SET amount_grams = ? WHERE id = ?', [amountGrams, id])
}

export function dbDeleteMealEntry(id: string): void {
  db.runSync('DELETE FROM meal_entries WHERE id = ?', [id])
}

// ─── Nutrition history ────────────────────────────────────────────────────────

export function dbGetCalorieHistory(days: number): { date: string; calories: number }[] {
  return db.getAllSync<{ date: string; calories: number }>(
    `SELECT m.date, ROUND(SUM(f.calories_per_100g * me.amount_grams / 100)) as calories
     FROM meal_entries me
     JOIN meals m ON me.meal_id = m.id
     JOIN foods f ON me.food_id = f.id
     GROUP BY m.date
     ORDER BY m.date DESC
     LIMIT ?`,
    [days],
  ).reverse()
}

// ─── Water ────────────────────────────────────────────────────────────────────

export function dbGetWaterForDate(date: string): number {
  return db.getFirstSync<{ amount_ml: number }>(
    'SELECT amount_ml FROM water_log WHERE date = ?',
    [date],
  )?.amount_ml ?? 0
}

export function dbAddWater(date: string, addMl: number): number {
  const existing = dbGetWaterForDate(date)
  const newTotal = existing + addMl
  if (existing === 0) {
    db.runSync(
      'INSERT INTO water_log (id, date, amount_ml, created_at) VALUES (?, ?, ?, ?)',
      [Math.random().toString(36).slice(2), date, newTotal, new Date().toISOString()],
    )
  } else {
    db.runSync('UPDATE water_log SET amount_ml = ? WHERE date = ?', [newTotal, date])
  }
  return newTotal
}

export function dbSetWater(date: string, totalMl: number): void {
  const existing = dbGetWaterForDate(date)
  if (existing === 0) {
    db.runSync(
      'INSERT INTO water_log (id, date, amount_ml, created_at) VALUES (?, ?, ?, ?)',
      [Math.random().toString(36).slice(2), date, totalMl, new Date().toISOString()],
    )
  } else {
    db.runSync('UPDATE water_log SET amount_ml = ? WHERE date = ?', [totalMl, date])
  }
}

export function dbGetWaterHistory(days: number): { date: string; amountMl: number }[] {
  return db.getAllSync<{ date: string; amount_ml: number }>(
    'SELECT date, amount_ml FROM water_log ORDER BY date DESC LIMIT ?',
    [days],
  ).reverse().map((r) => ({ date: r.date, amountMl: r.amount_ml }))
}

// ─── Meal Templates ───────────────────────────────────────────────────────────

export interface MealTemplateEntry {
  id: string
  templateId: string
  foodId: string
  foodName: string
  amountGrams: number
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  createdAt: string
}

export interface MealTemplateRow {
  id: string
  name: string
  mealType: string
  entryCount: number
  totalCalories: number
  createdAt: string
}

export function dbGetMealTemplates(): MealTemplateRow[] {
  const rows = db.getAllSync<{ id: string; name: string; meal_type: string; created_at: string }>(
    'SELECT * FROM meal_templates ORDER BY created_at DESC',
  )
  return rows.map((r) => {
    const entries = db.getAllSync<{ calories: number }>(
      'SELECT calories FROM meal_template_entries WHERE template_id=?', [r.id],
    )
    return {
      id: r.id, name: r.name, mealType: r.meal_type,
      entryCount: entries.length,
      totalCalories: Math.round(entries.reduce((s, e) => s + e.calories, 0)),
      createdAt: r.created_at,
    }
  })
}

export function dbGetMealTemplateEntries(templateId: string): MealTemplateEntry[] {
  const rows = db.getAllSync<{
    id: string; template_id: string; food_id: string; food_name: string
    amount_grams: number; calories: number; protein_g: number; carbs_g: number; fat_g: number; created_at: string
  }>('SELECT * FROM meal_template_entries WHERE template_id=? ORDER BY created_at ASC', [templateId])
  return rows.map((r) => ({
    id: r.id, templateId: r.template_id, foodId: r.food_id, foodName: r.food_name,
    amountGrams: r.amount_grams, calories: r.calories,
    proteinG: r.protein_g, carbsG: r.carbs_g, fatG: r.fat_g, createdAt: r.created_at,
  }))
}

export function dbInsertMealTemplate(id: string, name: string, mealType: string): void {
  db.runSync(
    'INSERT INTO meal_templates (id, name, meal_type, created_at) VALUES (?, ?, ?, ?)',
    [id, name, mealType, new Date().toISOString()],
  )
}

export function dbInsertMealTemplateEntry(
  id: string, templateId: string, foodId: string, foodName: string,
  amountGrams: number, calories: number, proteinG: number, carbsG: number, fatG: number,
): void {
  db.runSync(
    `INSERT INTO meal_template_entries
     (id, template_id, food_id, food_name, amount_grams, calories, protein_g, carbs_g, fat_g, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, templateId, foodId, foodName, amountGrams, calories, proteinG, carbsG, fatG, new Date().toISOString()],
  )
}

export function dbDeleteMealTemplate(id: string): void {
  db.runSync('DELETE FROM meal_templates WHERE id=?', [id])
}

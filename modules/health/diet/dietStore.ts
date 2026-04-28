import { create } from 'zustand'
import { createStorage } from '@core/utils/storage'
import * as Crypto from 'expo-crypto'
import {
  dbSearchFoods, dbInsertMeal, dbDeleteMeal,
  dbGetMealsForDate, dbGetEntriesForDate,
  dbInsertMealEntry, dbUpdateMealEntryGrams, dbDeleteMealEntry,
  dbGetCalorieHistory, dbGetWaterForDate, dbAddWater,
  dbGetMealTemplates, dbGetMealTemplateEntries,
  dbInsertMealTemplate, dbInsertMealTemplateEntry, dbDeleteMealTemplate,
  type EntryWithFood, type MealTemplateRow,
} from '@core/db/dietQueries'
import { useUserStore } from '@core/store/userStore'
import { getMacroGoals, MEAL_TYPE_ORDER, type MacroGoals } from './dietUtils'
import type { Food, Meal, MealType } from '@modules/health/shared/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MealWithEntries {
  meal: Meal
  entries: EntryWithFood[]
  totalCalories: number
  totalProteinG: number
  totalCarbsG: number
  totalFatG: number
}

const mmkv = createStorage('diet-store')
const DEFAULT_WATER_GOAL_ML = 2500

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function buildMeals(date: string): MealWithEntries[] {
  const meals = dbGetMealsForDate(date)
  const entries = dbGetEntriesForDate(date)

  const sorted = [...meals].sort((a, b) => {
    const ai = MEAL_TYPE_ORDER.indexOf(a.mealType as never)
    const bi = MEAL_TYPE_ORDER.indexOf(b.mealType as never)
    return ai - bi
  })

  return sorted.map((meal) => {
    const mealEntries = entries.filter((e) => e.mealId === meal.id)
    return {
      meal,
      entries: mealEntries,
      totalCalories: mealEntries.reduce((s, e) => s + e.calories, 0),
      totalProteinG: mealEntries.reduce((s, e) => s + e.proteinG, 0),
      totalCarbsG:   mealEntries.reduce((s, e) => s + e.carbsG, 0),
      totalFatG:     mealEntries.reduce((s, e) => s + e.fatG, 0),
    }
  })
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface DietState {
  // Today
  todayDate: string
  meals: MealWithEntries[]
  macroGoals: MacroGoals
  totalCalories: number
  totalProteinG: number
  totalCarbsG: number
  totalFatG: number

  // Water
  waterMl: number
  waterGoalMl: number

  // Food search
  searchResults: Food[]

  // History
  historyRange: 7 | 30
  calorieHistory: { date: string; calories: number }[]

  // Templates
  mealTemplates: MealTemplateRow[]

  // ── Actions ────────────────────────────────────────────────────────────────

  loadToday: () => void
  createMeal: (mealType: MealType) => string
  deleteMeal: (mealId: string) => void
  addEntry: (mealId: string, food: Food, amountGrams: number) => void
  updateEntry: (entryId: string, mealId: string, amountGrams: number, food: Food) => void
  deleteEntry: (entryId: string, mealId: string) => void

  searchFoods: (query: string) => void

  addWater: (ml: number) => void
  setWaterGoal: (ml: number) => void

  loadHistory: (range: 7 | 30) => void

  loadMealTemplates: () => void
  saveMealAsTemplate: (mealId: string, name: string) => void
  loadMealTemplate: (templateId: string, targetMealId: string) => void
  deleteMealTemplate: (templateId: string) => void
}

export const useDietStore = create<DietState>((set, get) => ({
  todayDate: todayStr(),
  meals: [],
  macroGoals: { calorieGoal: 2000, proteinGoalG: 150, carbsGoalG: 200, fatGoalG: 56 },
  totalCalories: 0,
  totalProteinG: 0,
  totalCarbsG: 0,
  totalFatG: 0,
  waterMl: 0,
  waterGoalMl: mmkv.getNumber('water_goal_ml') ?? DEFAULT_WATER_GOAL_ML,
  searchResults: [],
  historyRange: 7,
  calorieHistory: [],
  mealTemplates: [],

  // ── Today ──────────────────────────────────────────────────────────────────

  loadToday: () => {
    const profile = useUserStore.getState().profile
    const date = todayStr()
    const meals = buildMeals(date)
    const macroGoals = profile
      ? getMacroGoals(profile)
      : { calorieGoal: 2000, proteinGoalG: 150, carbsGoalG: 200, fatGoalG: 56 }

    set({
      todayDate: date,
      meals,
      macroGoals,
      totalCalories: meals.reduce((s, m) => s + m.totalCalories, 0),
      totalProteinG: Math.round(meals.reduce((s, m) => s + m.totalProteinG, 0) * 10) / 10,
      totalCarbsG:   Math.round(meals.reduce((s, m) => s + m.totalCarbsG, 0) * 10) / 10,
      totalFatG:     Math.round(meals.reduce((s, m) => s + m.totalFatG, 0) * 10) / 10,
      waterMl: dbGetWaterForDate(date),
    })
  },

  createMeal: (mealType) => {
    const now = new Date().toISOString()
    const date = todayStr()
    const meal: Meal = {
      id: Crypto.randomUUID(),
      date,
      mealType,
      loggedAt: now,
      createdAt: now,
    }
    dbInsertMeal(meal)
    get().loadToday()
    return meal.id
  },

  deleteMeal: (mealId) => {
    dbDeleteMeal(mealId)
    get().loadToday()
  },

  addEntry: (mealId, food, amountGrams) => {
    dbInsertMealEntry({
      id: Crypto.randomUUID(),
      mealId,
      foodId: food.id,
      amountGrams,
      createdAt: new Date().toISOString(),
    })
    get().loadToday()
  },

  updateEntry: (entryId, _mealId, amountGrams, _food) => {
    dbUpdateMealEntryGrams(entryId, amountGrams)
    get().loadToday()
  },

  deleteEntry: (entryId, _mealId) => {
    dbDeleteMealEntry(entryId)
    get().loadToday()
  },

  // ── Food search ────────────────────────────────────────────────────────────

  searchFoods: (query) => {
    set({ searchResults: dbSearchFoods(query) })
  },

  // ── Water ──────────────────────────────────────────────────────────────────

  addWater: (ml) => {
    const date = todayStr()
    dbAddWater(date, ml)
    set({ waterMl: Math.max(0, get().waterMl + ml) })
  },

  setWaterGoal: (ml) => {
    mmkv.set('water_goal_ml', ml)
    set({ waterGoalMl: ml })
  },

  // ── History ────────────────────────────────────────────────────────────────

  loadHistory: (range) => {
    set({
      historyRange: range,
      calorieHistory: dbGetCalorieHistory(range),
    })
  },

  // ── Meal templates ─────────────────────────────────────────────────────────

  loadMealTemplates: () => {
    set({ mealTemplates: dbGetMealTemplates() })
  },

  saveMealAsTemplate: (mealId, name) => {
    const { meals } = get()
    const mealWithEntries = meals.find((m) => m.meal.id === mealId)
    if (!mealWithEntries || mealWithEntries.entries.length === 0) return

    const templateId = Crypto.randomUUID()
    dbInsertMealTemplate(templateId, name, mealWithEntries.meal.mealType)
    for (const entry of mealWithEntries.entries) {
      dbInsertMealTemplateEntry(
        Crypto.randomUUID(), templateId,
        entry.foodId, entry.foodName,
        entry.amountGrams, entry.calories,
        entry.proteinG, entry.carbsG, entry.fatG,
      )
    }
    get().loadMealTemplates()
  },

  loadMealTemplate: (templateId, targetMealId) => {
    const entries = dbGetMealTemplateEntries(templateId)
    for (const te of entries) {
      dbInsertMealEntry({
        id: Crypto.randomUUID(),
        mealId: targetMealId,
        foodId: te.foodId,
        amountGrams: te.amountGrams,
        createdAt: new Date().toISOString(),
      })
    }
    get().loadToday()
  },

  deleteMealTemplate: (templateId) => {
    dbDeleteMealTemplate(templateId)
    get().loadMealTemplates()
  },
}))

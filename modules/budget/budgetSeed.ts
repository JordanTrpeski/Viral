import { dbGetCategoryCount, dbInsertCategory } from '@core/db/budgetQueries'

// [name, emoji, color, type]
const EXPENSE_CATEGORIES: [string, string, string][] = [
  ['Groceries',     '🛒', '#34C759'],
  ['Dining Out',    '🍽️', '#FF9F0A'],
  ['Transport',     '🚗', '#64D2FF'],
  ['Rent',          '🏠', '#6C63FF'],
  ['Utilities',     '⚡', '#FFD60A'],
  ['Health',        '💊', '#FF453A'],
  ['Entertainment', '🎬', '#BF5AF2'],
  ['Shopping',      '🛍️', '#FF6B9D'],
  ['Travel',        '✈️', '#30D158'],
  ['Education',     '📚', '#0A84FF'],
  ['Subscriptions', '📱', '#5E5CE6'],
  ['Personal Care', '💆', '#FF9F0A'],
  ['Fitness',       '💪', '#30D158'],
  ['Home',          '🏡', '#34C759'],
  ['Savings',       '💰', '#FFD60A'],
  ['Other',         '📦', '#636366'],
]

const INCOME_CATEGORIES: [string, string, string][] = [
  ['Salary',      '💼', '#30D158'],
  ['Freelance',   '💻', '#64D2FF'],
  ['Side Income', '📈', '#FFD60A'],
  ['Gift',        '🎁', '#FF6B9D'],
  ['Refund',      '🔄', '#6C63FF'],
  ['Other',       '➕', '#636366'],
]

export function seedBudgetCategoriesIfNeeded(): void {
  const count = dbGetCategoryCount()
  if (count > 0) return

  EXPENSE_CATEGORIES.forEach(([name, emoji, color], i) => {
    dbInsertCategory(name, 'expense', emoji, color, i)
  })

  INCOME_CATEGORIES.forEach(([name, emoji, color], i) => {
    dbInsertCategory(name, 'income', emoji, color, i)
  })
}

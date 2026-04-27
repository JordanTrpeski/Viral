import { create } from 'zustand'
import * as Notifications from 'expo-notifications'
import {
  BudgetCategory,
  BudgetTemplate,
  BudgetTemplateItem,
  IncomeEntryWithCategory,
  ExpenseEntryWithCategory,
  RecurringIncomeSummary,
  dbGetCategories,
  dbGetCategoriesByType,
  dbGetIncomeForMonth,
  dbGetExpensesForMonth,
  dbInsertIncome,
  dbInsertExpense,
  dbInsertExpenseItem,
  dbDeleteIncome,
  dbDeleteExpense,
  dbGetCategorySpendingForMonth,
  dbGetRecurringIncomeSummaries,
  dbInsertCategory,
  dbUpdateCategory,
  dbUpdateCategoryLimit,
  dbArchiveCategory,
  dbReorderCategories,
  dbGetTemplates,
  dbInsertTemplate,
  dbInsertTemplateItem,
  dbGetTemplateItems,
  dbDeleteTemplate,
  dbRenameTemplate,
  dbDeleteTemplateItems,
  dbRecordTemplateUse,
} from '@core/db/budgetQueries'

// ── Pending recurring helpers ──────────────────────────────────────────────────

function isDue(summary: RecurringIncomeSummary, today: string): boolean {
  const last = new Date(summary.lastDate + 'T12:00:00')
  const now  = new Date(today + 'T12:00:00')
  if (summary.recurrencePeriod === 'daily') {
    return summary.lastDate < today
  }
  if (summary.recurrencePeriod === 'weekly') {
    const diff = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
    return diff >= 7
  }
  // monthly: different month or year
  return (
    last.getFullYear() < now.getFullYear() ||
    (last.getFullYear() === now.getFullYear() && last.getMonth() < now.getMonth())
  )
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface MonthKey { year: number; month: number }

interface BudgetStore {
  viewYear: number
  viewMonth: number

  allCategories: BudgetCategory[]
  incomeCategories: BudgetCategory[]
  expenseCategories: BudgetCategory[]
  incomeEntries: IncomeEntryWithCategory[]
  expenseEntries: ExpenseEntryWithCategory[]
  categorySpending: Record<string, number>
  pendingRecurring: RecurringIncomeSummary[]

  totalIncome: number
  totalSpending: number
  netBalance: number
  projectedIncome: number

  setViewMonth: (year: number, month: number) => void
  loadMonth: (year?: number, month?: number) => void
  loadCategories: () => void
  loadPendingRecurring: () => void
  createCategory: (name: string, type: 'income' | 'expense', emoji: string, color: string) => void
  updateCat: (id: string, name: string, emoji: string, color: string) => void
  setCategoryLimit: (id: string, limit: number | null) => void
  archiveCat: (id: string, archived: boolean) => void
  reorderCategories: (type: 'income' | 'expense', orderedIds: string[]) => void

  // templates
  templates: BudgetTemplate[]
  loadTemplates: () => void
  saveAsTemplate: (name: string, categoryId: string | null, items: { name: string; amount: number }[]) => string
  updateTemplate: (id: string, name: string, items: { name: string; amount: number }[]) => void
  removeTemplate: (id: string) => void
  recordUse: (templateId: string, expenseId: string | null, total: number) => void
  getTemplateItems: (templateId: string) => BudgetTemplateItem[]
  confirmRecurring: (
    summary: RecurringIncomeSummary,
    date: string,
  ) => void
  addIncome: (
    sourceName: string,
    amount: number,
    date: string,
    categoryId: string,
    note: string | null,
    isRecurring: boolean,
    recurrencePeriod: 'daily' | 'weekly' | 'monthly' | null,
  ) => void
  addExpense: (
    merchantName: string | null,
    date: string,
    categoryId: string,
    paymentMethod: 'cash' | 'card' | 'online' | null,
    note: string | null,
    items: { name: string; amount: number }[],
    receiptPhoto?: string | null,
  ) => void
  removeIncome: (id: string) => void
  removeExpense: (id: string) => void
}

function currentMonth(): MonthKey {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── Store ──────────────────────────────────────────────────────────────────────

// Request notification permission once at startup
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

async function maybeNotifyLimitBreach(
  categoryId: string,
  categories: BudgetCategory[],
  spending: Record<string, number>,
) {
  const cat = categories.find((c) => c.id === categoryId)
  if (!cat?.monthlyLimit) return
  const spent = spending[categoryId] ?? 0
  const pct   = spent / cat.monthlyLimit
  if (pct < 0.8) return
  const { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') return
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${cat.emoji} ${cat.name} at ${Math.round(pct * 100)}%`,
      body: `You've spent €${spent.toFixed(2)} of your €${cat.monthlyLimit.toFixed(0)} limit.`,
    },
    trigger: null,
  })
}

export const useBudgetStore = create<BudgetStore>((set, get) => ({
  viewYear: currentMonth().year,
  viewMonth: currentMonth().month,

  allCategories: [],
  incomeCategories: [],
  templates: [],
  expenseCategories: [],
  incomeEntries: [],
  expenseEntries: [],
  categorySpending: {},
  pendingRecurring: [],

  totalIncome: 0,
  totalSpending: 0,
  netBalance: 0,
  projectedIncome: 0,

  setViewMonth(year, month) {
    set({ viewYear: year, viewMonth: month })
    get().loadMonth(year, month)
  },

  loadCategories() {
    set({
      allCategories: dbGetCategories(),
      incomeCategories: dbGetCategoriesByType('income'),
      expenseCategories: dbGetCategoriesByType('expense'),
    })
  },

  createCategory(name, type, emoji, color) {
    const all = dbGetCategories()
    const sameType = all.filter((c) => c.type === type)
    dbInsertCategory(name, type, emoji, color, sameType.length)
    get().loadCategories()
  },

  updateCat(id, name, emoji, color) {
    dbUpdateCategory(id, name, emoji, color)
    get().loadCategories()
  },

  setCategoryLimit(id, limit) {
    dbUpdateCategoryLimit(id, limit)
    get().loadCategories()
  },

  archiveCat(id, archived) {
    dbArchiveCategory(id, archived)
    get().loadCategories()
  },

  reorderCategories(type, orderedIds) {
    dbReorderCategories(orderedIds)
    get().loadCategories()
  },

  loadTemplates() {
    set({ templates: dbGetTemplates() })
  },

  saveAsTemplate(name, categoryId, items) {
    const id = dbInsertTemplate(name, categoryId)
    items.forEach(({ name: n, amount }) => dbInsertTemplateItem(id, n, amount))
    get().loadTemplates()
    return id
  },

  updateTemplate(id, name, items) {
    dbRenameTemplate(id, name)
    dbDeleteTemplateItems(id)
    items.forEach(({ name: n, amount }) => dbInsertTemplateItem(id, n, amount))
    get().loadTemplates()
  },

  removeTemplate(id) {
    dbDeleteTemplate(id)
    get().loadTemplates()
  },

  recordUse(templateId, expenseId, total) {
    dbRecordTemplateUse(templateId, expenseId, total)
    get().loadTemplates()
  },

  getTemplateItems(templateId) {
    return dbGetTemplateItems(templateId)
  },

  loadPendingRecurring() {
    const today = todayStr()
    const summaries = dbGetRecurringIncomeSummaries()
    const pending = summaries.filter((s) => isDue(s, today))
    set({ pendingRecurring: pending })
  },

  confirmRecurring(summary, date) {
    dbInsertIncome(
      summary.sourceName,
      summary.amount,
      date,
      summary.categoryId,
      null,
      true,
      summary.recurrencePeriod,
    )
    get().loadMonth()
    get().loadPendingRecurring()
  },

  loadMonth(year, month) {
    const y = year ?? get().viewYear
    const m = month ?? get().viewMonth
    const income   = dbGetIncomeForMonth(y, m)
    const expenses = dbGetExpensesForMonth(y, m)
    const spending = dbGetCategorySpendingForMonth(y, m)

    const totalIncome   = income.reduce((s, e) => s + e.amount, 0)
    const totalSpending = expenses.reduce((s, e) => s + e.total, 0)

    const categorySpending: Record<string, number> = {}
    spending.forEach(({ categoryId, total }) => { categorySpending[categoryId] = total })

    // Projected = confirmed + pending recurring amounts (for current month only)
    const { pendingRecurring, viewYear, viewMonth } = get()
    const isCurrentMonth = y === viewYear && m === viewMonth
    const pendingTotal = isCurrentMonth
      ? pendingRecurring.reduce((s, p) => s + p.amount, 0)
      : 0

    set({
      incomeEntries: income,
      expenseEntries: expenses,
      categorySpending,
      totalIncome,
      totalSpending,
      netBalance: totalIncome - totalSpending,
      projectedIncome: totalIncome + pendingTotal,
    })
  },

  addIncome(sourceName, amount, date, categoryId, note, isRecurring, recurrencePeriod) {
    dbInsertIncome(sourceName, amount, date, categoryId, note, isRecurring, recurrencePeriod)
    get().loadMonth()
    get().loadPendingRecurring()
  },

  addExpense(merchantName, date, categoryId, paymentMethod, note, items, receiptPhoto = null) {
    const expenseId = dbInsertExpense(merchantName, date, categoryId, paymentMethod, note, receiptPhoto)
    items.forEach(({ name, amount }) => dbInsertExpenseItem(expenseId, name, amount))
    get().loadMonth()
    // Check limit breach after state updated
    const { expenseCategories, categorySpending } = get()
    maybeNotifyLimitBreach(categoryId, expenseCategories, categorySpending)
  },

  removeIncome(id) {
    dbDeleteIncome(id)
    get().loadMonth()
  },

  removeExpense(id) {
    dbDeleteExpense(id)
    get().loadMonth()
  },
}))

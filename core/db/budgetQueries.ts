import * as Crypto from 'expo-crypto'
import { db } from './database'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface BudgetCategory {
  id: string
  name: string
  type: 'income' | 'expense'
  emoji: string
  color: string
  monthlyLimit: number | null
  orderIndex: number
  isArchived: boolean
  createdAt: string
}

export interface IncomeEntry {
  id: string
  sourceName: string
  amount: number
  date: string
  categoryId: string
  note: string | null
  isRecurring: boolean
  recurrencePeriod: 'daily' | 'weekly' | 'monthly' | null
  createdAt: string
}

export interface IncomeEntryWithCategory extends IncomeEntry {
  categoryName: string
  categoryEmoji: string
  categoryColor: string
}

export interface ExpenseEntry {
  id: string
  merchantName: string | null
  date: string
  categoryId: string
  paymentMethod: 'cash' | 'card' | 'online' | null
  note: string | null
  receiptPhoto: string | null
  total: number
  createdAt: string
}

export interface ExpenseEntryWithCategory extends ExpenseEntry {
  categoryName: string
  categoryEmoji: string
  categoryColor: string
}

export interface ExpenseItem {
  id: string
  expenseId: string
  itemName: string
  amount: number
  createdAt: string
}

export interface BudgetTemplate {
  id: string
  name: string
  categoryId: string | null
  lastUsedAt: string | null
  createdAt: string
  itemCount: number
  estimatedTotal: number
}

export interface BudgetTemplateItem {
  id: string
  templateId: string
  itemName: string
  defaultAmount: number
  createdAt: string
}

// ── Category raw row helper ────────────────────────────────────────────────────

function mapCategory(row: Record<string, unknown>): BudgetCategory {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as 'income' | 'expense',
    emoji: row.emoji as string,
    color: row.color as string,
    monthlyLimit: row.monthly_limit != null ? (row.monthly_limit as number) : null,
    orderIndex: row.order_index as number,
    isArchived: (row.is_archived as number) === 1,
    createdAt: row.created_at as string,
  }
}

// ── Categories ─────────────────────────────────────────────────────────────────

export function dbGetCategories(): BudgetCategory[] {
  const rows = db.getAllSync<Record<string, unknown>>(
    `SELECT * FROM budget_categories ORDER BY type DESC, order_index ASC`,
  )
  return rows.map(mapCategory)
}

export function dbGetCategoriesByType(type: 'income' | 'expense'): BudgetCategory[] {
  const rows = db.getAllSync<Record<string, unknown>>(
    `SELECT * FROM budget_categories WHERE type = ? AND is_archived = 0 ORDER BY order_index ASC`,
    [type],
  )
  return rows.map(mapCategory)
}

export function dbGetCategoryCount(): number {
  const row = db.getFirstSync<{ count: number }>(`SELECT COUNT(*) as count FROM budget_categories`)
  return row?.count ?? 0
}

export function dbInsertCategory(
  name: string,
  type: 'income' | 'expense',
  emoji: string,
  color: string,
  orderIndex: number,
): BudgetCategory {
  const id = Crypto.randomUUID()
  const now = new Date().toISOString()
  db.runSync(
    `INSERT INTO budget_categories (id, name, type, emoji, color, monthly_limit, order_index, is_archived, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, 0, ?)`,
    [id, name, type, emoji, color, orderIndex, now],
  )
  return { id, name, type, emoji, color, monthlyLimit: null, orderIndex, isArchived: false, createdAt: now }
}

export function dbUpdateCategoryLimit(categoryId: string, limit: number | null): void {
  db.runSync(`UPDATE budget_categories SET monthly_limit = ? WHERE id = ?`, [limit, categoryId])
}

export function dbUpdateCategory(categoryId: string, name: string, emoji: string, color: string): void {
  db.runSync(`UPDATE budget_categories SET name = ?, emoji = ?, color = ? WHERE id = ?`, [name, emoji, color, categoryId])
}

export function dbArchiveCategory(categoryId: string, archived: boolean): void {
  db.runSync(`UPDATE budget_categories SET is_archived = ? WHERE id = ?`, [archived ? 1 : 0, categoryId])
}

export function dbReorderCategories(orderedIds: string[]): void {
  orderedIds.forEach((id, i) => {
    db.runSync(`UPDATE budget_categories SET order_index = ? WHERE id = ?`, [i, id])
  })
}

// ── Income ─────────────────────────────────────────────────────────────────────

export function dbGetIncomeForDate(date: string): IncomeEntryWithCategory[] {
  const rows = db.getAllSync<Record<string, unknown>>(
    `SELECT i.*, c.name as category_name, c.emoji as category_emoji, c.color as category_color
     FROM budget_income i
     JOIN budget_categories c ON c.id = i.category_id
     WHERE i.date = ?
     ORDER BY i.created_at ASC`,
    [date],
  )
  return rows.map((r) => ({
    id: r.id as string,
    sourceName: r.source_name as string,
    amount: r.amount as number,
    date: r.date as string,
    categoryId: r.category_id as string,
    note: r.note as string | null,
    isRecurring: (r.is_recurring as number) === 1,
    recurrencePeriod: (r.recurrence_period as 'daily' | 'weekly' | 'monthly' | null) ?? null,
    createdAt: r.created_at as string,
    categoryName: r.category_name as string,
    categoryEmoji: r.category_emoji as string,
    categoryColor: r.category_color as string,
  }))
}

export interface ExpenseWithItems extends ExpenseEntryWithCategory {
  items: ExpenseItem[]
}

export function dbGetExpensesForDate(date: string): ExpenseWithItems[] {
  const rows = db.getAllSync<Record<string, unknown>>(
    `SELECT e.*,
            COALESCE((SELECT SUM(ei.amount) FROM budget_expense_items ei WHERE ei.expense_id = e.id), 0) as total,
            c.name as category_name, c.emoji as category_emoji, c.color as category_color
     FROM budget_expenses e
     JOIN budget_categories c ON c.id = e.category_id
     WHERE e.date = ?
     ORDER BY e.created_at ASC`,
    [date],
  )
  return rows.map((r) => ({
    id: r.id as string,
    merchantName: r.merchant_name as string | null,
    date: r.date as string,
    categoryId: r.category_id as string,
    paymentMethod: (r.payment_method as 'cash' | 'card' | 'online' | null) ?? null,
    note: r.note as string | null,
    receiptPhoto: r.receipt_photo as string | null,
    total: r.total as number,
    createdAt: r.created_at as string,
    categoryName: r.category_name as string,
    categoryEmoji: r.category_emoji as string,
    categoryColor: r.category_color as string,
    items: db.getAllSync<ExpenseItem>(
      `SELECT id, expense_id as expenseId, item_name as itemName, amount, created_at as createdAt
       FROM budget_expense_items WHERE expense_id = ? ORDER BY created_at ASC`,
      [r.id as string],
    ),
  }))
}

export function dbGetIncomeForMonth(year: number, month: number): IncomeEntryWithCategory[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const rows = db.getAllSync<Record<string, unknown>>(
    `SELECT i.*, c.name as category_name, c.emoji as category_emoji, c.color as category_color
     FROM budget_income i
     JOIN budget_categories c ON c.id = i.category_id
     WHERE i.date LIKE ?
     ORDER BY i.date DESC, i.created_at DESC`,
    [`${prefix}%`],
  )
  return rows.map((r) => ({
    id: r.id as string,
    sourceName: r.source_name as string,
    amount: r.amount as number,
    date: r.date as string,
    categoryId: r.category_id as string,
    note: r.note as string | null,
    isRecurring: (r.is_recurring as number) === 1,
    recurrencePeriod: (r.recurrence_period as 'daily' | 'weekly' | 'monthly' | null) ?? null,
    createdAt: r.created_at as string,
    categoryName: r.category_name as string,
    categoryEmoji: r.category_emoji as string,
    categoryColor: r.category_color as string,
  }))
}

export function dbInsertIncome(
  sourceName: string,
  amount: number,
  date: string,
  categoryId: string,
  note: string | null,
  isRecurring: boolean,
  recurrencePeriod: 'daily' | 'weekly' | 'monthly' | null,
): string {
  const id = Crypto.randomUUID()
  const now = new Date().toISOString()
  db.runSync(
    `INSERT INTO budget_income (id, source_name, amount, date, category_id, note, is_recurring, recurrence_period, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, sourceName, amount, date, categoryId, note, isRecurring ? 1 : 0, recurrencePeriod, now],
  )
  return id
}

export function dbDeleteIncome(id: string): void {
  db.runSync(`DELETE FROM budget_income WHERE id = ?`, [id])
}

export function dbGetMonthlyIncomeTotals(months: number): { month: string; total: number }[] {
  const rows = db.getAllSync<{ month: string; total: number }>(
    `SELECT strftime('%Y-%m', date) as month, SUM(amount) as total
     FROM budget_income
     GROUP BY month
     ORDER BY month DESC
     LIMIT ?`,
    [months],
  )
  return rows
}

export interface RecurringIncomeSummary {
  sourceName: string
  amount: number
  categoryId: string
  categoryName: string
  categoryEmoji: string
  categoryColor: string
  recurrencePeriod: 'daily' | 'weekly' | 'monthly'
  lastDate: string
}

// Returns the most-recent entry per recurring template so callers can compute
// whether the next occurrence is due today.
export function dbGetRecurringIncomeSummaries(): RecurringIncomeSummary[] {
  const rows = db.getAllSync<Record<string, unknown>>(
    `SELECT i.source_name, i.amount, i.category_id, i.recurrence_period,
            MAX(i.date) as last_date,
            c.name as category_name, c.emoji as category_emoji, c.color as category_color
     FROM budget_income i
     JOIN budget_categories c ON c.id = i.category_id
     WHERE i.is_recurring = 1
     GROUP BY i.source_name, i.category_id, i.recurrence_period`,
  )
  return rows.map((r) => ({
    sourceName: r.source_name as string,
    amount: r.amount as number,
    categoryId: r.category_id as string,
    categoryName: r.category_name as string,
    categoryEmoji: r.category_emoji as string,
    categoryColor: r.category_color as string,
    recurrencePeriod: r.recurrence_period as 'daily' | 'weekly' | 'monthly',
    lastDate: r.last_date as string,
  }))
}

export function dbGetIncomeHistory(
  categoryId: string | null,
  fromDate: string,
): IncomeEntryWithCategory[] {
  const rows = db.getAllSync<Record<string, unknown>>(
    `SELECT i.*, c.name as category_name, c.emoji as category_emoji, c.color as category_color
     FROM budget_income i
     JOIN budget_categories c ON c.id = i.category_id
     WHERE i.date >= ?
       ${categoryId ? 'AND i.category_id = ?' : ''}
     ORDER BY i.date DESC, i.created_at DESC`,
    categoryId ? [fromDate, categoryId] : [fromDate],
  )
  return rows.map((r) => ({
    id: r.id as string,
    sourceName: r.source_name as string,
    amount: r.amount as number,
    date: r.date as string,
    categoryId: r.category_id as string,
    note: r.note as string | null,
    isRecurring: (r.is_recurring as number) === 1,
    recurrencePeriod: (r.recurrence_period as 'daily' | 'weekly' | 'monthly' | null) ?? null,
    createdAt: r.created_at as string,
    categoryName: r.category_name as string,
    categoryEmoji: r.category_emoji as string,
    categoryColor: r.category_color as string,
  }))
}

export function dbGetIncomeCategoryBreakdown(
  year: number,
  month: number,
): { categoryId: string; categoryName: string; categoryEmoji: string; categoryColor: string; total: number }[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return db.getAllSync<Record<string, unknown>>(
    `SELECT i.category_id, c.name as category_name, c.emoji as category_emoji,
            c.color as category_color, SUM(i.amount) as total
     FROM budget_income i
     JOIN budget_categories c ON c.id = i.category_id
     WHERE i.date LIKE ?
     GROUP BY i.category_id
     ORDER BY total DESC`,
    [`${prefix}%`],
  ).map((r) => ({
    categoryId: r.category_id as string,
    categoryName: r.category_name as string,
    categoryEmoji: r.category_emoji as string,
    categoryColor: r.category_color as string,
    total: r.total as number,
  }))
}

// ── Expenses ───────────────────────────────────────────────────────────────────

export function dbGetExpensesForMonth(year: number, month: number): ExpenseEntryWithCategory[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const rows = db.getAllSync<Record<string, unknown>>(
    `SELECT e.*,
            COALESCE((SELECT SUM(ei.amount) FROM budget_expense_items ei WHERE ei.expense_id = e.id), 0) as total,
            c.name as category_name, c.emoji as category_emoji, c.color as category_color
     FROM budget_expenses e
     JOIN budget_categories c ON c.id = e.category_id
     WHERE e.date LIKE ?
     ORDER BY e.date DESC, e.created_at DESC`,
    [`${prefix}%`],
  )
  return rows.map((r) => ({
    id: r.id as string,
    merchantName: r.merchant_name as string | null,
    date: r.date as string,
    categoryId: r.category_id as string,
    paymentMethod: (r.payment_method as 'cash' | 'card' | 'online' | null) ?? null,
    note: r.note as string | null,
    receiptPhoto: r.receipt_photo as string | null,
    total: r.total as number,
    createdAt: r.created_at as string,
    categoryName: r.category_name as string,
    categoryEmoji: r.category_emoji as string,
    categoryColor: r.category_color as string,
  }))
}

export function dbInsertExpense(
  merchantName: string | null,
  date: string,
  categoryId: string,
  paymentMethod: 'cash' | 'card' | 'online' | null,
  note: string | null,
  receiptPhoto: string | null = null,
): string {
  const id = Crypto.randomUUID()
  const now = new Date().toISOString()
  db.runSync(
    `INSERT INTO budget_expenses (id, merchant_name, date, category_id, payment_method, note, receipt_photo, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, merchantName, date, categoryId, paymentMethod, note, receiptPhoto, now],
  )
  return id
}

export function dbInsertExpenseItem(expenseId: string, itemName: string, amount: number): string {
  const id = Crypto.randomUUID()
  const now = new Date().toISOString()
  db.runSync(
    `INSERT INTO budget_expense_items (id, expense_id, item_name, amount, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, expenseId, itemName, amount, now],
  )
  return id
}

export function dbGetExpenseItems(expenseId: string): ExpenseItem[] {
  return db.getAllSync<ExpenseItem>(
    `SELECT id, expense_id as expenseId, item_name as itemName, amount, created_at as createdAt
     FROM budget_expense_items WHERE expense_id = ? ORDER BY created_at ASC`,
    [expenseId],
  )
}

export function dbDeleteExpense(id: string): void {
  db.runSync(`DELETE FROM budget_expenses WHERE id = ?`, [id])
}

export function dbUpdateExpenseCategory(expenseId: string, categoryId: string): void {
  db.runSync(`UPDATE budget_expenses SET category_id = ? WHERE id = ?`, [categoryId, expenseId])
}

export function dbGetMonthlyExpenseTotals(months: number): { month: string; total: number }[] {
  const rows = db.getAllSync<{ month: string; total: number }>(
    `SELECT strftime('%Y-%m', e.date) as month,
            SUM(ei.amount) as total
     FROM budget_expenses e
     JOIN budget_expense_items ei ON ei.expense_id = e.id
     GROUP BY month
     ORDER BY month DESC
     LIMIT ?`,
    [months],
  )
  return rows
}

// ── Weekly queries ─────────────────────────────────────────────────────────────

export interface DailyTotal {
  date: string
  income: number
  spending: number
  net: number
}

export function dbGetDailyTotals(startDate: string, endDate: string): DailyTotal[] {
  const incomeRows = db.getAllSync<{ date: string; total: number }>(
    `SELECT date, SUM(amount) as total FROM budget_income
     WHERE date BETWEEN ? AND ? GROUP BY date`,
    [startDate, endDate],
  )
  const spendRows = db.getAllSync<{ date: string; total: number }>(
    `SELECT e.date, SUM(ei.amount) as total
     FROM budget_expenses e
     JOIN budget_expense_items ei ON ei.expense_id = e.id
     WHERE e.date BETWEEN ? AND ? GROUP BY e.date`,
    [startDate, endDate],
  )

  const incomeMap: Record<string, number> = {}
  incomeRows.forEach((r) => { incomeMap[r.date] = r.total })
  const spendMap: Record<string, number> = {}
  spendRows.forEach((r) => { spendMap[r.date] = r.total })

  // Build a full 7-day array filled with 0 where there's no data
  const result: DailyTotal[] = []
  const start = new Date(startDate + 'T12:00:00')
  const end   = new Date(endDate + 'T12:00:00')
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = d.toISOString().slice(0, 10)
    const income   = incomeMap[date]  ?? 0
    const spending = spendMap[date]   ?? 0
    result.push({ date, income, spending, net: income - spending })
  }
  return result
}

export interface WeeklyCategoryTotal {
  categoryId: string
  categoryName: string
  categoryEmoji: string
  categoryColor: string
  total: number
}

export function dbGetWeeklyCategoryBreakdown(startDate: string, endDate: string): WeeklyCategoryTotal[] {
  return db.getAllSync<Record<string, unknown>>(
    `SELECT e.category_id, c.name as category_name, c.emoji as category_emoji,
            c.color as category_color, SUM(ei.amount) as total
     FROM budget_expenses e
     JOIN budget_expense_items ei ON ei.expense_id = e.id
     JOIN budget_categories c ON c.id = e.category_id
     WHERE e.date BETWEEN ? AND ?
     GROUP BY e.category_id
     ORDER BY total DESC`,
    [startDate, endDate],
  ).map((r) => ({
    categoryId:    r.category_id    as string,
    categoryName:  r.category_name  as string,
    categoryEmoji: r.category_emoji as string,
    categoryColor: r.category_color as string,
    total:         r.total          as number,
  }))
}

// ── Monthly detail queries ─────────────────────────────────────────────────────

export function dbGetMonthDailySpending(year: number, month: number): { day: number; total: number }[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return db.getAllSync<{ day: number; total: number }>(
    `SELECT CAST(strftime('%d', e.date) AS INTEGER) as day, SUM(ei.amount) as total
     FROM budget_expenses e
     JOIN budget_expense_items ei ON ei.expense_id = e.id
     WHERE e.date LIKE ?
     GROUP BY day ORDER BY day ASC`,
    [`${prefix}%`],
  )
}

export function dbGetBiggestExpenseForMonth(year: number, month: number): ExpenseEntryWithCategory | null {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const row = db.getFirstSync<Record<string, unknown>>(
    `SELECT e.*,
            COALESCE((SELECT SUM(ei2.amount) FROM budget_expense_items ei2 WHERE ei2.expense_id = e.id), 0) as total,
            c.name as category_name, c.emoji as category_emoji, c.color as category_color
     FROM budget_expenses e
     JOIN budget_categories c ON c.id = e.category_id
     WHERE e.date LIKE ?
     ORDER BY total DESC LIMIT 1`,
    [`${prefix}%`],
  )
  if (!row) return null
  return {
    id: row.id as string,
    merchantName: row.merchant_name as string | null,
    date: row.date as string,
    categoryId: row.category_id as string,
    paymentMethod: (row.payment_method as 'cash' | 'card' | 'online' | null) ?? null,
    note: row.note as string | null,
    receiptPhoto: row.receipt_photo as string | null,
    total: row.total as number,
    createdAt: row.created_at as string,
    categoryName: row.category_name as string,
    categoryEmoji: row.category_emoji as string,
    categoryColor: row.category_color as string,
  }
}

export function dbGetAnnualOverview(year: number): { month: number; income: number; spending: number }[] {
  const incomeRows = db.getAllSync<{ month: number; total: number }>(
    `SELECT CAST(strftime('%m', date) AS INTEGER) as month, SUM(amount) as total
     FROM budget_income WHERE date LIKE ? GROUP BY month`,
    [`${year}%`],
  )
  const spendRows = db.getAllSync<{ month: number; total: number }>(
    `SELECT CAST(strftime('%m', e.date) AS INTEGER) as month, SUM(ei.amount) as total
     FROM budget_expenses e
     JOIN budget_expense_items ei ON ei.expense_id = e.id
     WHERE e.date LIKE ? GROUP BY month`,
    [`${year}%`],
  )
  const incomeMap: Record<number, number> = {}
  incomeRows.forEach((r) => { incomeMap[r.month] = r.total })
  const spendMap: Record<number, number> = {}
  spendRows.forEach((r) => { spendMap[r.month] = r.total })

  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income:   incomeMap[i + 1]  ?? 0,
    spending: spendMap[i + 1]   ?? 0,
  }))
}

// ── Balance overview queries ───────────────────────────────────────────────────

export function dbGetAllTimeBalance(): { totalIncome: number; totalSpending: number } {
  const incRow = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM budget_income`,
  )
  const spendRow = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(ei.amount), 0) as total
     FROM budget_expense_items ei`,
  )
  return {
    totalIncome: incRow?.total ?? 0,
    totalSpending: spendRow?.total ?? 0,
  }
}

// Returns last N months of net (income - spending), oldest first
export function dbGetMonthlyNetHistory(months: number): { month: string; income: number; spending: number; net: number }[] {
  const rows = db.getAllSync<{ month: string; income: number; spending: number }>(
    `SELECT m.month,
            COALESCE(i.income, 0) as income,
            COALESCE(s.spending, 0) as spending
     FROM (
       SELECT strftime('%Y-%m', date) as month FROM budget_income
       UNION
       SELECT strftime('%Y-%m', date) as month FROM budget_expenses
     ) m
     LEFT JOIN (
       SELECT strftime('%Y-%m', date) as month, SUM(amount) as income
       FROM budget_income GROUP BY month
     ) i ON i.month = m.month
     LEFT JOIN (
       SELECT strftime('%Y-%m', e.date) as month, SUM(ei.amount) as spending
       FROM budget_expenses e
       JOIN budget_expense_items ei ON ei.expense_id = e.id
       GROUP BY month
     ) s ON s.month = m.month
     GROUP BY m.month
     ORDER BY m.month DESC
     LIMIT ?`,
    [months],
  )
  return [...rows].reverse().map(r => ({
    month: r.month,
    income: r.income,
    spending: r.spending,
    net: r.income - r.spending,
  }))
}

// ── Category drill-down queries ────────────────────────────────────────────────

export function dbGetCategoryTransactions(
  categoryId: string,
  startDate: string,
  endDate: string,
): ExpenseEntryWithCategory[] {
  const rows = db.getAllSync<Record<string, unknown>>(
    `SELECT e.*,
            COALESCE((SELECT SUM(ei.amount) FROM budget_expense_items ei WHERE ei.expense_id = e.id), 0) as total,
            c.name as category_name, c.emoji as category_emoji, c.color as category_color
     FROM budget_expenses e
     JOIN budget_categories c ON c.id = e.category_id
     WHERE e.category_id = ? AND e.date BETWEEN ? AND ?
     ORDER BY e.date DESC, e.created_at DESC`,
    [categoryId, startDate, endDate],
  )
  return rows.map((r) => ({
    id: r.id as string,
    merchantName: r.merchant_name as string | null,
    date: r.date as string,
    categoryId: r.category_id as string,
    paymentMethod: (r.payment_method as 'cash' | 'card' | 'online' | null) ?? null,
    note: r.note as string | null,
    receiptPhoto: r.receipt_photo as string | null,
    total: r.total as number,
    createdAt: r.created_at as string,
    categoryName: r.category_name as string,
    categoryEmoji: r.category_emoji as string,
    categoryColor: r.category_color as string,
  }))
}

export function dbGetCategoryMonthlyTrend(
  categoryId: string,
  months: number,
): { month: string; total: number }[] {
  const rows = db.getAllSync<{ month: string; total: number }>(
    `SELECT strftime('%Y-%m', e.date) as month, SUM(ei.amount) as total
     FROM budget_expenses e
     JOIN budget_expense_items ei ON ei.expense_id = e.id
     WHERE e.category_id = ?
     GROUP BY month
     ORDER BY month DESC
     LIMIT ?`,
    [categoryId, months],
  )
  return [...rows].reverse()
}

export function dbGetCategorySpendingForMonth(year: number, month: number): { categoryId: string; total: number }[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return db.getAllSync<{ categoryId: string; total: number }>(
    `SELECT e.category_id as categoryId, SUM(ei.amount) as total
     FROM budget_expenses e
     JOIN budget_expense_items ei ON ei.expense_id = e.id
     WHERE e.date LIKE ?
     GROUP BY e.category_id`,
    [`${prefix}%`],
  )
}

// ── Templates ──────────────────────────────────────────────────────────────────

export function dbGetTemplates(): BudgetTemplate[] {
  const rows = db.getAllSync<Record<string, unknown>>(
    `SELECT t.*,
            COUNT(ti.id) as item_count,
            COALESCE(SUM(ti.default_amount), 0) as estimated_total
     FROM budget_templates t
     LEFT JOIN budget_template_items ti ON ti.template_id = t.id
     GROUP BY t.id
     ORDER BY t.last_used_at DESC, t.created_at DESC`,
  )
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    categoryId: r.category_id as string | null,
    lastUsedAt: r.last_used_at as string | null,
    createdAt: r.created_at as string,
    itemCount: r.item_count as number,
    estimatedTotal: r.estimated_total as number,
  }))
}

export function dbInsertTemplate(name: string, categoryId: string | null): string {
  const id = Crypto.randomUUID()
  const now = new Date().toISOString()
  db.runSync(
    `INSERT INTO budget_templates (id, name, category_id, last_used_at, created_at) VALUES (?, ?, ?, NULL, ?)`,
    [id, name, categoryId, now],
  )
  return id
}

export function dbInsertTemplateItem(templateId: string, itemName: string, defaultAmount: number): void {
  const id = Crypto.randomUUID()
  const now = new Date().toISOString()
  db.runSync(
    `INSERT INTO budget_template_items (id, template_id, item_name, default_amount, created_at) VALUES (?, ?, ?, ?, ?)`,
    [id, templateId, itemName, defaultAmount, now],
  )
}

export function dbGetTemplateItems(templateId: string): BudgetTemplateItem[] {
  return db.getAllSync<BudgetTemplateItem>(
    `SELECT id, template_id as templateId, item_name as itemName, default_amount as defaultAmount, created_at as createdAt
     FROM budget_template_items WHERE template_id = ? ORDER BY created_at ASC`,
    [templateId],
  )
}

export function dbDeleteTemplate(id: string): void {
  db.runSync(`DELETE FROM budget_templates WHERE id = ?`, [id])
}

export function dbUpdateTemplateLastUsed(id: string): void {
  db.runSync(`UPDATE budget_templates SET last_used_at = ? WHERE id = ?`, [new Date().toISOString(), id])
}

export function dbRenameTemplate(id: string, name: string): void {
  db.runSync(`UPDATE budget_templates SET name = ? WHERE id = ?`, [name, id])
}

export function dbDeleteTemplateItems(templateId: string): void {
  db.runSync(`DELETE FROM budget_template_items WHERE template_id = ?`, [templateId])
}

// ── Template uses ──────────────────────────────────────────────────────────────

export interface TemplateUse {
  id: string
  templateId: string
  expenseId: string | null
  total: number
  usedAt: string
}

export function dbRecordTemplateUse(templateId: string, expenseId: string | null, total: number): void {
  const id  = Crypto.randomUUID()
  const now = new Date().toISOString()
  db.runSync(
    `INSERT INTO budget_template_uses (id, template_id, expense_id, total, used_at) VALUES (?, ?, ?, ?, ?)`,
    [id, templateId, expenseId, total, now],
  )
  db.runSync(`UPDATE budget_templates SET last_used_at = ? WHERE id = ?`, [now, templateId])
}

export function dbGetTemplateHistory(templateId: string): TemplateUse[] {
  return db.getAllSync<TemplateUse>(
    `SELECT id, template_id as templateId, expense_id as expenseId, total, used_at as usedAt
     FROM budget_template_uses
     WHERE template_id = ?
     ORDER BY used_at DESC
     LIMIT 5`,
    [templateId],
  )
}

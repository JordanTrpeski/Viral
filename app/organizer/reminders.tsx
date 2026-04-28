import { useEffect, useRef, useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable, Animated } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { Ionicons } from '@expo/vector-icons'
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useOrganizerStore } from '@modules/organizer/organizerStore'
import SwipeableRow from '@core/components/SwipeableRow'
import type { OrganizerReminder, OrganizerPerson } from '@core/types'
import { dbInsertReminder } from '@core/db/organizerQueries'

// ── Constants ──────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  low:    '#636366',
  medium: '#64D2FF',
  high:   '#FFD60A',
  urgent: '#FF453A',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
}

const REPEAT_LABELS: Record<string, string> = {
  none: '', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayStr()    { return new Date().toISOString().slice(0, 10) }
function tomorrowStr() {
  const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10)
}
function weekLaterStr() {
  const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10)
}

function nextOccurrence(dueDate: string, repeat: string): string {
  const d = new Date(dueDate + 'T12:00:00')
  if (repeat === 'daily')   d.setDate(d.getDate() + 1)
  if (repeat === 'weekly')  d.setDate(d.getDate() + 7)
  if (repeat === 'monthly') d.setMonth(d.getMonth() + 1)
  if (repeat === 'yearly')  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

let _idCounter = 0
function genId() { return `reminder_${Date.now()}_${++_idCounter}` }

// ── Reminder row ───────────────────────────────────────────────────────────────

function ReminderRow({
  reminder, person, isCompleted,
  onComplete, onUncomplete, onSnooze, onEdit, onDelete,
}: {
  reminder: OrganizerReminder
  person?: OrganizerPerson
  isCompleted: boolean
  onComplete: () => void
  onUncomplete: () => void
  onSnooze: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const today    = todayStr()
  const isOverdue = !isCompleted && reminder.dueDate < today
  const priorityColor = PRIORITY_COLORS[reminder.priority] ?? colors.textMuted
  const repeatLabel   = reminder.repeat && reminder.repeat !== 'none' ? REPEAT_LABELS[reminder.repeat] : null
  const isSnoozed     = !isCompleted && !!reminder.snoozedUntil

  const rightActions = isCompleted
    ? [
        { label: 'Undo', icon: 'arrow-undo-outline' as const, color: colors.surface2, onPress: onUncomplete },
        { label: 'Delete', icon: 'trash-outline' as const, color: colors.danger, onPress: onDelete },
      ]
    : [
        { label: 'Snooze', icon: 'alarm-outline' as const, color: colors.organizer, onPress: onSnooze },
        { label: 'Edit', icon: 'pencil' as const, color: colors.calendar, onPress: onEdit },
        { label: 'Delete', icon: 'trash-outline' as const, color: colors.danger, onPress: onDelete },
      ]

  return (
    <SwipeableRow rightActions={rightActions}>
      <Pressable
        onPress={isCompleted ? onUncomplete : onComplete}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'flex-start',
          backgroundColor: colors.surface, borderRadius: radius.md,
          borderWidth: 1, borderColor: colors.border,
          borderLeftWidth: 4, borderLeftColor: isCompleted ? colors.surface2 : priorityColor,
          overflow: 'hidden', opacity: pressed ? 0.85 : 1,
        })}
      >
        {/* Checkbox */}
        <View style={{ padding: spacing.sm, paddingTop: spacing.sm + 2 }}>
          <Ionicons
            name={isCompleted ? 'checkbox' : 'square-outline'}
            size={20}
            color={isCompleted ? colors.success : priorityColor}
          />
        </View>

        {/* Content */}
        <View style={{ flex: 1, paddingVertical: spacing.sm, paddingRight: spacing.sm, gap: 3 }}>
          <Text style={{
            color: isCompleted ? colors.textMuted : colors.text,
            fontSize: fontSize.body, fontWeight: '500',
            textDecorationLine: isCompleted ? 'line-through' : 'none',
          }}>
            {reminder.title}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs }}>
            {/* Date/time */}
            <Text style={{ color: isOverdue ? colors.danger : colors.textMuted, fontSize: fontSize.micro }}>
              {isOverdue ? '⚠ ' : ''}{reminder.dueDate}{reminder.dueTime ? ` · ${reminder.dueTime}` : ''}
            </Text>

            {/* Repeat */}
            {repeatLabel && (
              <View style={{ backgroundColor: colors.surface2, borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>↻ {repeatLabel}</Text>
              </View>
            )}

            {/* Snoozed */}
            {isSnoozed && (
              <View style={{ backgroundColor: `${colors.organizer}22`, borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ color: colors.organizer, fontSize: fontSize.micro }}>Snoozed</Text>
              </View>
            )}

            {/* Person link */}
            {person && (
              <Text style={{ color: colors.people, fontSize: fontSize.micro }}>👤 {person.name.split(' ')[0]}</Text>
            )}
          </View>

          {/* Next occurrence for recurring */}
          {!isCompleted && repeatLabel && (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
              Next: {nextOccurrence(reminder.dueDate, reminder.repeat!)}
            </Text>
          )}
        </View>

        {/* Priority dot */}
        <View style={{
          width: 8, height: 8, borderRadius: 4,
          backgroundColor: isCompleted ? colors.surface2 : priorityColor,
          marginTop: spacing.sm + 6, marginRight: spacing.sm,
        }} />
      </Pressable>
    </SwipeableRow>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ title, color, count }: { title: string; color?: string; count: number }) {
  return (
    <Text style={{
      color: color ?? colors.textMuted, fontSize: fontSize.micro, fontWeight: '600',
      marginTop: spacing.sm, marginBottom: spacing.xs, paddingHorizontal: spacing.xs,
    }}>
      {title} · {count}
    </Text>
  )
}

// ── Snooze sheet content ───────────────────────────────────────────────────────

function SnoozeSheet({ onSnooze }: { onSnooze: (dueDate: string, dueTime: string | null) => void }) {
  const options = [
    { label: '5 minutes',    fn: () => { const d = new Date(); d.setMinutes(d.getMinutes() + 5); return { date: d.toISOString().slice(0,10), time: d.toTimeString().slice(0,5) } } },
    { label: '15 minutes',   fn: () => { const d = new Date(); d.setMinutes(d.getMinutes() + 15); return { date: d.toISOString().slice(0,10), time: d.toTimeString().slice(0,5) } } },
    { label: '1 hour',       fn: () => { const d = new Date(); d.setHours(d.getHours() + 1); return { date: d.toISOString().slice(0,10), time: d.toTimeString().slice(0,5) } } },
    { label: 'Tomorrow 9am', fn: () => ({ date: tomorrowStr(), time: '09:00' }) },
    { label: 'Next week',    fn: () => ({ date: weekLaterStr(), time: null }) },
  ]

  return (
    <BottomSheetView style={{ padding: spacing.lg, gap: spacing.sm }}>
      <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', marginBottom: spacing.xs }}>
        Snooze until…
      </Text>
      {options.map((opt) => (
        <Pressable
          key={opt.label}
          onPress={() => { const r = opt.fn(); onSnooze(r.date, r.time) }}
          style={({ pressed }) => ({
            backgroundColor: colors.surface2, borderRadius: radius.md,
            padding: spacing.md, opacity: pressed ? 0.8 : 1,
            borderWidth: 1, borderColor: colors.border,
          })}
        >
          <Text style={{ color: colors.text, fontSize: fontSize.body }}>{opt.label}</Text>
        </Pressable>
      ))}
    </BottomSheetView>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function RemindersScreen() {
  const router = useRouter()
  const { reminders, people, loadReminders, loadPeople, completeReminder, uncompleteReminder, removeReminder, snoozeReminder, addReminder } = useOrganizerStore()
  const snoozeSheetRef = useRef<BottomSheet>(null)
  const [snoozeTargetId, setSnoozeTargetId] = useState<string | null>(null)
  const [completedOpen, setCompletedOpen]   = useState(false)

  useFocusEffect(useCallback(() => {
    loadReminders()
    loadPeople()
  }, []))

  const personMap = useMemo(() =>
    Object.fromEntries(people.map((p) => [p.id, p]))
  , [people])

  const today    = todayStr()
  const tomorrow = tomorrowStr()
  const weekEnd  = weekLaterStr()

  const active    = reminders.filter((r) => !r.isCompleted)
  const completed = reminders.filter((r) => r.isCompleted)

  const overdue    = active.filter((r) => r.dueDate < today)
  const todayList  = active.filter((r) => r.dueDate === today)
  const tomorrowList = active.filter((r) => r.dueDate === tomorrow)
  const thisWeek   = active.filter((r) => r.dueDate > tomorrow && r.dueDate <= weekEnd)
  const later      = active.filter((r) => r.dueDate > weekEnd)

  function handleComplete(reminder: OrganizerReminder) {
    completeReminder(reminder.id)
    // Auto-create next occurrence for recurring reminders
    if (reminder.repeat && reminder.repeat !== 'none') {
      const nextDate = nextOccurrence(reminder.dueDate, reminder.repeat)
      addReminder(reminder.title, nextDate, reminder.dueTime, reminder.repeat, reminder.priority, reminder.personId, reminder.noteId)
    }
  }

  function handleSnooze(id: string) {
    setSnoozeTargetId(id)
    snoozeSheetRef.current?.expand()
  }

  function applySnooze(dueDate: string, dueTime: string | null) {
    if (snoozeTargetId) snoozeReminder(snoozeTargetId, dueDate, dueTime)
    snoozeSheetRef.current?.close()
    setSnoozeTargetId(null)
  }

  function renderRow(r: OrganizerReminder, isCompleted = false) {
    return (
      <ReminderRow
        key={r.id} reminder={r}
        person={r.personId ? personMap[r.personId] : undefined}
        isCompleted={isCompleted}
        onComplete={() => handleComplete(r)}
        onUncomplete={() => uncompleteReminder(r.id)}
        onSnooze={() => handleSnooze(r.id)}
        onEdit={() => router.push(`/organizer/reminder-add?id=${r.id}` as never)}
        onDelete={() => removeReminder(r.id)}
      />
    )
  }

  const isEmpty = active.length === 0 && completed.length === 0

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.sm }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', marginLeft: spacing.xs }}>
          Reminders
        </Text>
        <Pressable onPress={() => router.push('/organizer/reminder-add' as never)} style={{ padding: spacing.sm }}>
          <Ionicons name="add" size={26} color={colors.reminders} />
        </Pressable>
      </View>

      {isEmpty ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
          <Ionicons name="alarm-outline" size={48} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>No reminders yet</Text>
          <Pressable
            onPress={() => router.push('/organizer/reminder-add' as never)}
            style={{ backgroundColor: colors.reminders, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: fontSize.body }}>Add reminder</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>

          {overdue.length > 0 && (
            <>
              <SectionHeader title="OVERDUE" color={colors.danger} count={overdue.length} />
              <View style={{ gap: spacing.xs }}>{overdue.map((r) => renderRow(r))}</View>
            </>
          )}

          {todayList.length > 0 && (
            <>
              <SectionHeader title="TODAY" color={colors.text} count={todayList.length} />
              <View style={{ gap: spacing.xs }}>{todayList.map((r) => renderRow(r))}</View>
            </>
          )}

          {tomorrowList.length > 0 && (
            <>
              <SectionHeader title="TOMORROW" count={tomorrowList.length} />
              <View style={{ gap: spacing.xs }}>{tomorrowList.map((r) => renderRow(r))}</View>
            </>
          )}

          {thisWeek.length > 0 && (
            <>
              <SectionHeader title="THIS WEEK" count={thisWeek.length} />
              <View style={{ gap: spacing.xs }}>{thisWeek.map((r) => renderRow(r))}</View>
            </>
          )}

          {later.length > 0 && (
            <>
              <SectionHeader title="LATER" count={later.length} />
              <View style={{ gap: spacing.xs }}>{later.map((r) => renderRow(r))}</View>
            </>
          )}

          {completed.length > 0 && (
            <>
              <Pressable
                onPress={() => setCompletedOpen((o) => !o)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm, marginBottom: spacing.xs, paddingHorizontal: spacing.xs }}
              >
                <Ionicons
                  name={completedOpen ? 'chevron-down' : 'chevron-forward'}
                  size={14} color={colors.textMuted}
                />
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600' }}>
                  COMPLETED · {completed.length}
                </Text>
              </Pressable>
              {completedOpen && (
                <View style={{ gap: spacing.xs }}>{completed.map((r) => renderRow(r, true))}</View>
              )}
            </>
          )}

        </ScrollView>
      )}

      {/* Snooze sheet */}
      <BottomSheet
        ref={snoozeSheetRef}
        index={-1}
        snapPoints={['50%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <SnoozeSheet onSnooze={applySnooze} />
      </BottomSheet>
    </SafeAreaView>
  )
}

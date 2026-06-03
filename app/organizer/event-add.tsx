import { useState, useRef, useEffect } from 'react'
import { View, Text, ScrollView, FlatList, Pressable, TextInput, Switch, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import BottomSheet from '@gorhom/bottom-sheet'
import * as Crypto from 'expo-crypto'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { scheduleNotification, cancelNotificationsByPrefix } from '@core/utils/notificationManager'
import { useOrganizerStore } from '@modules/organizer/organizerStore'
import {
  dbGetEventById, dbGetEventReminders,
  dbInsertEventReminder, dbDeleteEventReminders,
} from '@core/db/organizerQueries'
import { localDateStr } from '@core/utils/units'
import type { EventRepeat } from '@core/types'

const BottomSheetFlatList = FlatList

// ── Color options ──────────────────────────────────────────────────────────────

const EVENT_COLORS = [
  '#FF453A', '#FF9F0A', '#FFD60A', '#30D158',
  '#64D2FF', '#0A84FF', '#BF5AF2', '#FF375F',
  colors.organizer, colors.people, colors.reminders,
]

// ── Repeat options ─────────────────────────────────────────────────────────────

const REPEAT_OPTIONS: { value: EventRepeat | null; label: string }[] = [
  { value: null,      label: 'None' },
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly' },
]

// ── Reminder presets ───────────────────────────────────────────────────────────

const REMINDER_PRESETS: { minutes: number; label: string }[] = [
  { minutes: 0,    label: 'At event' },
  { minutes: 15,   label: '15 min' },
  { minutes: 30,   label: '30 min' },
  { minutes: 60,   label: '1 hour' },
  { minutes: 1440, label: '1 day' },
  { minutes: 10080, label: '1 week' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function isValidDate(str: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false
  return !isNaN(new Date(str + 'T12:00:00').getTime())
}

function isValidTime(str: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(str)
}

function toDate(date: string): Date {
  return new Date(date + 'T12:00:00')
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addOneYear(date: string): string {
  const d = toDate(date)
  d.setFullYear(d.getFullYear() + 1)
  return formatDate(d)
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function nextRepeatDate(currentDate: string, repeat: Exclude<EventRepeat, 'none'>, originalDay: number): string {
  const d = toDate(currentDate)
  if (repeat === 'daily') d.setDate(d.getDate() + 1)
  if (repeat === 'weekly') d.setDate(d.getDate() + 7)
  if (repeat === 'monthly') {
    const nextMonth = d.getMonth() + 1
    d.setMonth(nextMonth, Math.min(originalDay, daysInMonth(d.getFullYear(), nextMonth)))
  }
  if (repeat === 'yearly') d.setFullYear(d.getFullYear() + 1)
  return formatDate(d)
}

function occurrenceDates(startDate: string, repeat: EventRepeat | null): string[] {
  if (!repeat || repeat === 'none') return [startDate]

  const dates = [startDate]
  const endDate = addOneYear(startDate)
  const originalDay = toDate(startDate).getDate()
  let cursor = startDate

  while (dates.length < 64) {
    cursor = nextRepeatDate(cursor, repeat, originalDay)
    if (cursor > endDate) break
    dates.push(cursor)
  }

  return dates
}

function Label({ text }: { text: string }) {
  return (
    <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600', marginBottom: spacing.xs }}>
      {text}
    </Text>
  )
}

// ── Schedule notification for event reminder ───────────────────────────────────

async function scheduleEventReminder(
  eventId: string,
  title: string,
  date: string,
  startTime: string | null,
  minutesBefore: number,
): Promise<void> {
  const timeStr = startTime ?? '09:00'
  const [hh, mm] = timeStr.split(':').map(Number)
  const eventDt  = new Date(`${date}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`)
  const notifyDt = new Date(eventDt.getTime() - minutesBefore * 60_000)

  const bodyText = minutesBefore === 0
    ? 'Your event is starting now'
    : `Starts in ${minutesBefore < 60 ? `${minutesBefore} min` : minutesBefore < 1440 ? `${minutesBefore / 60}h` : minutesBefore < 10080 ? '1 day' : '1 week'}`

  await scheduleNotification(
    `event-${eventId}-${date}-${minutesBefore}`,
    title,
    bodyText,
    notifyDt,
    { type: 'event', eventId, eventDate: date },
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function EventAddScreen() {
  const router = useRouter()
  const { date: dateParam, time: timeParam, id: editId } = useLocalSearchParams<{
    date?: string; time?: string; id?: string
  }>()
  const isEditing = !!editId

  const { people, loadPeople, addEvent, editEvent } = useOrganizerStore()

  const [title,     setTitle]     = useState('')
  const [date,      setDate]      = useState(dateParam ?? localDateStr())
  const [startTime, setStartTime] = useState(timeParam ?? '')
  const [endTime,   setEndTime]   = useState('')
  const [isAllDay,  setIsAllDay]  = useState(false)
  const [location,  setLocation]  = useState('')
  const [noteText,  setNoteText]  = useState('')
  const [color,     setColor]     = useState<string>(colors.organizer)
  const [personId,  setPersonId]  = useState<string | null>(null)
  const [repeat,    setRepeat]    = useState<EventRepeat | null>(null)
  const [reminders, setReminders] = useState<Set<number>>(new Set())

  const personSheetRef = useRef<BottomSheet>(null)

  useEffect(() => { loadPeople() }, [])

  // Prefill form when editing an existing event
  useEffect(() => {
    if (!editId) return
    const event = dbGetEventById(editId)
    if (!event) return
    setTitle(event.title)
    setDate(event.date)
    setStartTime(event.startTime ?? '')
    setEndTime(event.endTime ?? '')
    setIsAllDay(event.isAllDay)
    setLocation(event.location ?? '')
    setNoteText(event.notes ?? '')
    setColor(event.color ?? colors.organizer)
    setRepeat(event.repeat ?? null)
    setPersonId(event.personId ?? null)
    // Pre-select reminder chips from existing DB rows
    const existing = dbGetEventReminders(editId)
    setReminders(new Set(existing.map((r) => r.minutesBefore)))
  }, [editId])

  const selectedPerson = personId ? people.find((p) => p.id === personId) : null

  function toggleReminder(minutes: number) {
    setReminders((prev) => {
      const next = new Set(prev)
      if (next.has(minutes)) next.delete(minutes)
      else next.add(minutes)
      return next
    })
  }

  async function handleSave() {
    const t = title.trim()
    if (!t) { Alert.alert('Title required', 'Please enter an event title.'); return }
    if (!isValidDate(date)) { Alert.alert('Invalid date', 'Enter a date in YYYY-MM-DD format.'); return }
    if (!isAllDay && startTime && !isValidTime(startTime)) {
      Alert.alert('Invalid time', 'Start time must be HH:MM.')
      return
    }
    if (!isAllDay && endTime && !isValidTime(endTime)) {
      Alert.alert('Invalid time', 'End time must be HH:MM.')
      return
    }

    const st   = isAllDay ? null : (startTime.trim() || null)
    const et   = isAllDay ? null : (endTime.trim() || null)
    const [y, m] = date.split('-').map(Number)

    if (isEditing && editId) {
      // ── Edit mode ──────────────────────────────────────────────────────────
      // NOTE: editing a repeating event updates the base record (all occurrences).
      // "Edit this occurrence only" requires organizer_event_exceptions (Phase 2).
      const baseId = editId.includes('__occurs__') ? editId.split('__occurs__')[0] : editId

      editEvent(baseId, t, date, st, et, isAllDay, location.trim() || null, repeat, color, noteText.trim() || null, personId, y, m)

      // Reminder diff: cancel all old notifications, wipe old rows, re-insert desired set
      await cancelNotificationsByPrefix(`event-${baseId}-`)
      dbDeleteEventReminders(baseId)
      for (const minutesBefore of reminders) {
        dbInsertEventReminder(Crypto.randomUUID(), baseId, minutesBefore)
        for (const occurrenceDate of occurrenceDates(date, repeat)) {
          await scheduleEventReminder(baseId, t, occurrenceDate, st, minutesBefore)
        }
      }
    } else {
      // ── Create mode ────────────────────────────────────────────────────────
      const eventId = addEvent(t, date, st, et, isAllDay, location.trim() || null, repeat, color, noteText.trim() || null, personId)

      if (reminders.size > 0 && eventId) {
        for (const minutesBefore of reminders) {
          dbInsertEventReminder(Crypto.randomUUID(), eventId, minutesBefore)
          for (const occurrenceDate of occurrenceDates(date, repeat)) {
            await scheduleEventReminder(eventId, t, occurrenceDate, st, minutesBefore)
          }
        }
      }
    }

    router.back()
  }

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
          {isEditing ? 'Edit Event' : 'New Event'}
        </Text>
        <Pressable onPress={handleSave} style={{ padding: spacing.sm }}>
          <Text style={{ color: colors.organizer, fontSize: fontSize.body, fontWeight: '700' }}>
            {isEditing ? 'Save Changes' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.md, gap: spacing.lg }}
      >

        {/* Title */}
        <View>
          <Label text="TITLE" />
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Event name"
            placeholderTextColor={colors.textMuted}
            autoFocus={!isEditing}
            style={{
              backgroundColor: colors.surface, borderRadius: radius.md,
              borderWidth: 1, borderColor: colors.border,
              color: colors.text, fontSize: fontSize.body,
              padding: spacing.md,
            }}
          />
        </View>

        {/* Date */}
        <View>
          <Label text="DATE" />
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            style={{
              backgroundColor: colors.surface, borderRadius: radius.md,
              borderWidth: 1, borderColor: isValidDate(date) ? colors.border : colors.danger,
              color: colors.text, fontSize: fontSize.body,
              padding: spacing.md,
            }}
          />
        </View>

        {/* All day toggle */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: colors.surface, borderRadius: radius.md,
          borderWidth: 1, borderColor: colors.border,
          padding: spacing.md,
        }}>
          <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.body }}>All day</Text>
          <Switch
            value={isAllDay}
            onValueChange={setIsAllDay}
            trackColor={{ false: colors.surface2, true: `${colors.organizer}88` }}
            thumbColor={isAllDay ? colors.organizer : colors.textMuted}
          />
        </View>

        {/* Time */}
        {!isAllDay && (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Label text="START TIME" />
              <TextInput
                value={startTime}
                onChangeText={setStartTime}
                placeholder="09:00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                style={{
                  backgroundColor: colors.surface, borderRadius: radius.md,
                  borderWidth: 1, borderColor: startTime && !isValidTime(startTime) ? colors.danger : colors.border,
                  color: colors.text, fontSize: fontSize.body,
                  padding: spacing.md,
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Label text="END TIME" />
              <TextInput
                value={endTime}
                onChangeText={setEndTime}
                placeholder="10:00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                style={{
                  backgroundColor: colors.surface, borderRadius: radius.md,
                  borderWidth: 1, borderColor: endTime && !isValidTime(endTime) ? colors.danger : colors.border,
                  color: colors.text, fontSize: fontSize.body,
                  padding: spacing.md,
                }}
              />
            </View>
          </View>
        )}

        {/* Repeat */}
        <View>
          <Label text="REPEAT" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {REPEAT_OPTIONS.map((opt) => {
              const isActive = repeat === opt.value
              return (
                <Pressable
                  key={String(opt.value)}
                  onPress={() => setRepeat(opt.value)}
                  style={({ pressed }) => ({
                    paddingHorizontal: spacing.sm + 2,
                    paddingVertical: spacing.xs + 2,
                    borderRadius: radius.full,
                    backgroundColor: isActive ? colors.organizer : colors.surface,
                    borderWidth: 1,
                    borderColor: isActive ? colors.organizer : colors.border,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: isActive ? '#fff' : colors.textMuted, fontSize: fontSize.label, fontWeight: '600' }}>
                    {opt.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* Notify me */}
        <View>
          <Label text="NOTIFY ME" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {REMINDER_PRESETS.map((preset) => {
              const isActive = reminders.has(preset.minutes)
              return (
                <Pressable
                  key={preset.minutes}
                  onPress={() => toggleReminder(preset.minutes)}
                  style={({ pressed }) => ({
                    paddingHorizontal: spacing.sm + 2,
                    paddingVertical: spacing.xs + 2,
                    borderRadius: radius.full,
                    backgroundColor: isActive ? `${colors.organizer}33` : colors.surface,
                    borderWidth: 1,
                    borderColor: isActive ? colors.organizer : colors.border,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: isActive ? colors.organizer : colors.textMuted, fontSize: fontSize.label, fontWeight: isActive ? '700' : '400' }}>
                    {preset.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          {isAllDay && reminders.size > 0 && (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: spacing.xs }}>
              All-day event reminders fire at 09:00 on the event day.
            </Text>
          )}
        </View>

        {/* Location */}
        <View>
          <Label text="LOCATION (OPTIONAL)" />
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Where?"
            placeholderTextColor={colors.textMuted}
            style={{
              backgroundColor: colors.surface, borderRadius: radius.md,
              borderWidth: 1, borderColor: colors.border,
              color: colors.text, fontSize: fontSize.body,
              padding: spacing.md,
            }}
          />
        </View>

        {/* Color */}
        <View>
          <Label text="COLOR" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {EVENT_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: c,
                  borderWidth: color === c ? 3 : 0,
                  borderColor: '#fff',
                  shadowColor: color === c ? c : 'transparent',
                  shadowOpacity: 0.6, shadowRadius: 4,
                }}
              />
            ))}
          </View>
        </View>

        {/* Link to person */}
        <View>
          <Label text="LINK TO PERSON (OPTIONAL)" />
          <Pressable
            onPress={() => personSheetRef.current?.expand()}
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.surface, borderRadius: radius.md,
              borderWidth: 1, borderColor: colors.border,
              padding: spacing.md, gap: spacing.sm,
            }}
          >
            <Ionicons name="person-outline" size={18} color={colors.textMuted} />
            <Text style={{ flex: 1, color: selectedPerson ? colors.text : colors.textMuted, fontSize: fontSize.body }}>
              {selectedPerson ? selectedPerson.name : 'No person linked'}
            </Text>
            {selectedPerson && (
              <Pressable onPress={(e) => { e.stopPropagation(); setPersonId(null) }} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Notes */}
        <View>
          <Label text="NOTES (OPTIONAL)" />
          <TextInput
            value={noteText}
            onChangeText={setNoteText}
            placeholder="Any extra details…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: colors.surface, borderRadius: radius.md,
              borderWidth: 1, borderColor: colors.border,
              color: colors.text, fontSize: fontSize.body,
              padding: spacing.md, textAlignVertical: 'top', minHeight: 80,
            }}
          />
        </View>

      </ScrollView>

      {/* Person picker sheet */}
      <BottomSheet
        ref={personSheetRef}
        index={-1}
        snapPoints={['60%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetFlatList
          data={people}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.xs }}
          ListHeaderComponent={
            <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', marginBottom: spacing.sm }}>
              Link to person
            </Text>
          }
          ListEmptyComponent={
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body, textAlign: 'center', paddingVertical: spacing.xl }}>
              No people yet
            </Text>
          }
          renderItem={({ item: p }) => (
            <Pressable
              onPress={() => { setPersonId(p.id); personSheetRef.current?.close() }}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: personId === p.id ? `${colors.people}22` : colors.surface2,
                borderRadius: radius.md, padding: spacing.md, gap: spacing.sm,
                borderWidth: 1, borderColor: personId === p.id ? `${colors.people}66` : colors.border,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Ionicons name="person-circle-outline" size={28} color={personId === p.id ? colors.people : colors.textMuted} />
              <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.body, fontWeight: '500' }}>{p.name}</Text>
              {personId === p.id && <Ionicons name="checkmark" size={18} color={colors.people} />}
            </Pressable>
          )}
        />
      </BottomSheet>
    </SafeAreaView>
  )
}

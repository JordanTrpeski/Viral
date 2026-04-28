import { useState, useMemo, useRef } from 'react'
import { View, Text, ScrollView, Pressable, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { Ionicons } from '@expo/vector-icons'
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useOrganizerStore } from '@modules/organizer/organizerStore'
import type { OrganizerEvent, OrganizerPerson } from '@core/types'
import { localDateStr } from '@core/utils/units'

// ── Constants ──────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayStr() { return localDateStr() }

function dateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay()
}

// ── Event dot ──────────────────────────────────────────────────────────────────

function EventDots({ colors: dotColors }: { colors: string[] }) {
  const shown = dotColors.slice(0, 3)
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 2, marginTop: 2 }}>
      {shown.map((c, i) => (
        <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: c }} />
      ))}
    </View>
  )
}

// ── Day cell ───────────────────────────────────────────────────────────────────

function DayCell({
  day, isToday, isSelected, dotColors, hasBirthday,
  onPress,
}: {
  day: number
  isToday: boolean
  isSelected: boolean
  dotColors: string[]
  hasBirthday: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1, alignItems: 'center', paddingVertical: spacing.xs,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{
        width: 32, height: 32, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: isSelected ? colors.organizer : isToday ? `${colors.organizer}33` : 'transparent',
        borderWidth: isToday && !isSelected ? 1 : 0,
        borderColor: colors.organizer,
      }}>
        <Text style={{
          color: isSelected ? '#fff' : isToday ? colors.organizer : colors.text,
          fontSize: fontSize.micro, fontWeight: isToday || isSelected ? '700' : '400',
        }}>
          {day}
        </Text>
      </View>
      {hasBirthday && !isSelected && (
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.people, marginTop: 2 }} />
      )}
      {dotColors.length > 0 && !hasBirthday && (
        <EventDots colors={dotColors} />
      )}
      {hasBirthday && dotColors.length > 0 && (
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.people, marginTop: 2 }} />
      )}
    </Pressable>
  )
}

// ── Day sheet content ──────────────────────────────────────────────────────────

function DaySheet({
  date, events, birthdays, onAddEvent, onDeleteEvent,
}: {
  date: string
  events: OrganizerEvent[]
  birthdays: OrganizerPerson[]
  onAddEvent: () => void
  onDeleteEvent: (id: string) => void
}) {
  const [d, m, day] = [
    new Date(date + 'T12:00:00').getDate(),
    new Date(date + 'T12:00:00').getMonth(),
    new Date(date + 'T12:00:00').getDay(),
  ]
  const label = `${DAY_NAMES[day]}, ${MONTH_NAMES[m]} ${d}`

  return (
    <BottomSheetScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '700' }}>
          {label}
        </Text>
        <Pressable
          onPress={onAddEvent}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
            backgroundColor: `${colors.organizer}22`, borderRadius: radius.full,
            paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
            borderWidth: 1, borderColor: `${colors.organizer}66`,
          }}
        >
          <Ionicons name="add" size={16} color={colors.organizer} />
          <Text style={{ color: colors.organizer, fontSize: fontSize.micro, fontWeight: '700' }}>Add event</Text>
        </Pressable>
      </View>

      {/* Birthdays */}
      {birthdays.map((person) => (
        <View
          key={person.id}
          style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: `${colors.people}11`, borderRadius: radius.md,
            borderWidth: 1, borderColor: `${colors.people}33`,
            padding: spacing.sm, marginBottom: spacing.xs, gap: spacing.sm,
          }}
        >
          <Text style={{ fontSize: 18 }}>🎂</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }}>
              {person.name}'s Birthday
            </Text>
            {person.birthdayYear && (
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
                Turns {new Date().getFullYear() - person.birthdayYear}
              </Text>
            )}
          </View>
          <View style={{
            backgroundColor: `${colors.people}22`, borderRadius: radius.full,
            paddingHorizontal: 6, paddingVertical: 2,
          }}>
            <Text style={{ color: colors.people, fontSize: fontSize.micro, fontWeight: '700' }}>Birthday</Text>
          </View>
        </View>
      ))}

      {/* Events */}
      {events.length === 0 && birthdays.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm }}>
          <Ionicons name="calendar-outline" size={36} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>Nothing scheduled</Text>
        </View>
      )}

      {events.map((ev) => (
        <Pressable
          key={ev.id}
          onLongPress={() => onDeleteEvent(ev.id)}
          style={{
            flexDirection: 'row', alignItems: 'flex-start',
            backgroundColor: colors.surface, borderRadius: radius.md,
            borderWidth: 1, borderColor: colors.border,
            borderLeftWidth: 4, borderLeftColor: ev.color ?? colors.organizer,
            padding: spacing.sm, marginBottom: spacing.xs, gap: spacing.sm,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }}>{ev.title}</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: 2 }}>
              {ev.isAllDay
                ? 'All day'
                : ev.startTime
                  ? `${ev.startTime}${ev.endTime ? ` – ${ev.endTime}` : ''}`
                  : ''}
            </Text>
            {ev.location && (
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>📍 {ev.location}</Text>
            )}
          </View>
          <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
        </Pressable>
      ))}

      <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, textAlign: 'center', marginTop: spacing.sm }}>
        Long-press an event to delete
      </Text>
    </BottomSheetScrollView>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const router = useRouter()
  const { events, people, loadEvents, loadPeople, removeEvent } = useOrganizerStore()

  const today = todayStr()
  const todayDate = new Date()

  const [year,  setYear]  = useState(todayDate.getFullYear())
  const [month, setMonth] = useState(todayDate.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState(today)

  const daySheetRef = useRef<BottomSheet>(null)

  useFocusEffect(useCallback(() => {
    loadEvents(year, month)
    loadPeople()
  }, [year, month]))

  // Build dot map: date → colors[]
  const dotMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const ev of events) {
      if (!map[ev.date]) map[ev.date] = []
      map[ev.date].push(ev.color ?? colors.organizer)
    }
    return map
  }, [events])

  // Build birthday map: date key (MM-DD) → persons
  const birthdayMap = useMemo(() => {
    const map: Record<string, OrganizerPerson[]> = {}
    for (const p of people) {
      if (p.birthdayDay === null || p.birthdayMonth === null) continue
      const key = `${String(p.birthdayMonth).padStart(2, '0')}-${String(p.birthdayDay).padStart(2, '0')}`
      if (!map[key]) map[key] = []
      map[key].push(p)
    }
    return map
  }, [people])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  function handleDayPress(day: number) {
    const ds = dateStr(year, month, day)
    setSelectedDate(ds)
    daySheetRef.current?.expand()
  }

  const selectedEvents = useMemo(() => {
    return events.filter((e) => e.date === selectedDate)
  }, [events, selectedDate])

  const selectedBirthdays = useMemo(() => {
    const [, mm, dd] = selectedDate.split('-')
    const key = `${mm}-${dd}`
    return birthdayMap[key] ?? []
  }, [selectedDate, birthdayMap])

  // Build calendar grid
  const firstDay  = firstDayOfMonth(year, month)
  const totalDays = daysInMonth(year, month)
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  // Pad to complete final row
  while (cells.length % 7 !== 0) cells.push(null)

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
          Calendar
        </Text>
        <Pressable
          onPress={() => {
            const d = new Date()
            setYear(d.getFullYear()); setMonth(d.getMonth() + 1)
            setSelectedDate(today)
          }}
          style={{ padding: spacing.sm }}
        >
          <Text style={{ color: colors.organizer, fontSize: fontSize.micro, fontWeight: '700' }}>Today</Text>
        </Pressable>
      </View>

      {/* Month nav */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      }}>
        <Pressable onPress={prevMonth} style={{ padding: spacing.sm }}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.body, fontWeight: '700', textAlign: 'center' }}>
          {MONTH_NAMES[month - 1]} {year}
        </Text>
        <Pressable onPress={nextMonth} style={{ padding: spacing.sm }}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      {/* Day name row */}
      <View style={{ flexDirection: 'row', paddingHorizontal: spacing.md, marginBottom: spacing.xs }}>
        {DAY_NAMES.map((d) => (
          <Text key={d} style={{
            flex: 1, textAlign: 'center',
            color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600',
          }}>
            {d}
          </Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={{ paddingHorizontal: spacing.md }}>
        {Array.from({ length: cells.length / 7 }, (_, row) => (
          <View key={row} style={{ flexDirection: 'row' }}>
            {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
              if (!day) return <View key={col} style={{ flex: 1 }} />
              const ds = dateStr(year, month, day)
              const mmdd = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              return (
                <DayCell
                  key={col}
                  day={day}
                  isToday={ds === today}
                  isSelected={ds === selectedDate}
                  dotColors={dotMap[ds] ?? []}
                  hasBirthday={!!(birthdayMap[mmdd]?.length)}
                  onPress={() => handleDayPress(day)}
                />
              )
            })}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.people }} />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Birthday</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.organizer }} />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Event</Text>
        </View>
      </View>

      {/* Upcoming events list below calendar */}
      {events.length > 0 && (
        <ScrollView
          style={{ flex: 1, marginTop: spacing.sm }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl }}
        >
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600', marginBottom: spacing.xs }}>
            THIS MONTH · {events.length}
          </Text>
          <View style={{ gap: spacing.xs }}>
            {events.map((ev) => (
              <Pressable
                key={ev.id}
                onPress={() => {
                  setSelectedDate(ev.date)
                  daySheetRef.current?.expand()
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: colors.surface, borderRadius: radius.md,
                  borderWidth: 1, borderColor: colors.border,
                  borderLeftWidth: 4, borderLeftColor: ev.color ?? colors.organizer,
                  padding: spacing.sm, gap: spacing.sm,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <View style={{ width: 36, alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '700' }}>
                    {MONTH_NAMES[Number(ev.date.split('-')[1]) - 1].slice(0, 3).toUpperCase()}
                  </Text>
                  <Text style={{ color: colors.text, fontSize: fontSize.label, fontWeight: '700' }}>
                    {Number(ev.date.split('-')[2])}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '500' }}>{ev.title}</Text>
                  {ev.startTime && (
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
                      {ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      {events.length === 0 && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>Tap a day to add an event</Text>
        </View>
      )}

      {/* Day detail sheet */}
      <BottomSheet
        ref={daySheetRef}
        index={-1}
        snapPoints={['50%', '85%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <DaySheet
          date={selectedDate}
          events={selectedEvents}
          birthdays={selectedBirthdays}
          onAddEvent={() => {
            daySheetRef.current?.close()
            router.push(`/organizer/event-add?date=${selectedDate}` as never)
          }}
          onDeleteEvent={(id) => {
            const [y, m] = selectedDate.split('-').map(Number)
            removeEvent(id, y, m)
          }}
        />
      </BottomSheet>
    </SafeAreaView>
  )
}

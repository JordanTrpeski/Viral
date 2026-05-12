import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import BottomSheet from '@gorhom/bottom-sheet'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useOrganizerStore } from '@modules/organizer/organizerStore'
import { dbGetEventsForDate } from '@core/db/organizerQueries'
import type { OrganizerEvent, OrganizerPerson } from '@core/types'
import { localDateStr } from '@core/utils/units'

const BottomSheetScrollView = ScrollView

// ── Constants ──────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Week view constants
const HOUR_HEIGHT = 60          // px per hour
const TIME_COL_W  = 42          // width of time-label column
const WEEK_HOURS  = Array.from({ length: 17 }, (_, i) => i + 6) // 06..22

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

/** Returns the Monday of the week containing `d` */
function getMondayOf(d: Date): Date {
  const copy = new Date(d)
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6)
  const sM = MONTH_SHORT[weekStart.getMonth()]
  const eM = MONTH_SHORT[weekEnd.getMonth()]
  const sD = weekStart.getDate()
  const eD = weekEnd.getDate()
  if (sM === eM) return `${sM} ${sD}–${eD}, ${weekStart.getFullYear()}`
  return `${sM} ${sD} – ${eM} ${eD}, ${weekEnd.getFullYear()}`
}

/** Parse "HH:MM" → fraction of hours from midnight */
function timeFrac(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h + m / 60
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

// ── Month grid cell ────────────────────────────────────────────────────────────

function DayCell({
  day, isToday, isSelected, dotColors, hasBirthday, onPress,
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

// ── Timed event block (week view) ──────────────────────────────────────────────

function TimeEventBlock({
  event, onPress,
}: {
  event: OrganizerEvent
  onPress: () => void
}) {
  const startF = timeFrac(event.startTime!)
  const top    = (startF - 6) * HOUR_HEIGHT

  let heightF = 1
  if (event.endTime) {
    heightF = timeFrac(event.endTime) - startF
    if (heightF < 0.3) heightF = 0.3
  }
  const height = heightF * HOUR_HEIGHT

  const bg    = event.color ?? colors.organizer
  const short = heightF < 0.5

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        position: 'absolute',
        top: top + 1,
        left: 1,
        right: 1,
        height: height - 2,
        backgroundColor: `${bg}CC`,
        borderRadius: 4,
        borderLeftWidth: 2,
        borderLeftColor: bg,
        paddingHorizontal: 3,
        paddingVertical: 2,
        overflow: 'hidden',
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }} numberOfLines={1}>
        {event.title}
      </Text>
      {!short && (
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 8 }} numberOfLines={1}>
          {event.startTime}
        </Text>
      )}
    </Pressable>
  )
}

// ── Week view ──────────────────────────────────────────────────────────────────

function WeekView({
  weekDates,
  weekDateStrs,
  eventsMap,
  birthdayMap,
  today,
  selectedDate,
  onDayHeaderPress,
  onSlotPress,
  onEventPress,
}: {
  weekDates: Date[]
  weekDateStrs: string[]
  eventsMap: Record<string, OrganizerEvent[]>
  birthdayMap: Record<string, OrganizerPerson[]>
  today: string
  selectedDate: string
  onDayHeaderPress: (ds: string) => void
  onSlotPress: (ds: string, hour: number) => void
  onEventPress: (ds: string) => void
}) {
  // Check which columns have all-day content
  const hasAllDay = weekDateStrs.some((ds) => {
    const [, mm, dd] = ds.split('-')
    const key = `${mm}-${dd}`
    const evs = eventsMap[ds] ?? []
    return !!(birthdayMap[key]?.length) || evs.some((e) => e.isAllDay || !e.startTime)
  })

  return (
    <View style={{ flex: 1 }}>
      {/* Column headers: time spacer + Mon–Sun */}
      <View style={{
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: spacing.xs,
      }}>
        <View style={{ width: TIME_COL_W }} />
        {weekDates.map((d, i) => {
          const ds   = weekDateStrs[i]
          const isT  = ds === today
          const isSel = ds === selectedDate
          return (
            <Pressable
              key={i}
              onPress={() => onDayHeaderPress(ds)}
              style={{ flex: 1, alignItems: 'center', paddingTop: 4 }}
            >
              <Text style={{
                color: colors.textMuted,
                fontSize: 9,
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
              </Text>
              <View style={{
                width: 26, height: 26, borderRadius: 13,
                alignItems: 'center', justifyContent: 'center', marginTop: 2,
                backgroundColor: isSel ? colors.organizer : isT ? `${colors.organizer}33` : 'transparent',
                borderWidth: isT && !isSel ? 1 : 0,
                borderColor: colors.organizer,
              }}>
                <Text style={{
                  color: isSel ? '#fff' : isT ? colors.organizer : colors.text,
                  fontSize: fontSize.micro,
                  fontWeight: isT || isSel ? '700' : '400',
                }}>
                  {d.getDate()}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>

      {/* All-day row */}
      {hasAllDay && (
        <View style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          minHeight: 28,
        }}>
          <View style={{ width: TIME_COL_W, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: colors.textMuted, fontSize: 8 }}>all{'\n'}day</Text>
          </View>
          {weekDateStrs.map((ds) => {
            const [, mm, dd] = ds.split('-')
            const key = `${mm}-${dd}`
            const birthdays = birthdayMap[key] ?? []
            const allDayEvs = (eventsMap[ds] ?? []).filter((e) => e.isAllDay || !e.startTime)
            return (
              <View key={ds} style={{ flex: 1, paddingVertical: 2, paddingHorizontal: 1, gap: 2 }}>
                {birthdays.slice(0, 1).map((p) => (
                  <View
                    key={p.id}
                    style={{
                      backgroundColor: `${colors.people}22`,
                      borderRadius: 3,
                      paddingHorizontal: 2,
                      paddingVertical: 1,
                      borderLeftWidth: 2,
                      borderLeftColor: colors.people,
                    }}
                  >
                    <Text style={{ color: colors.people, fontSize: 8, fontWeight: '700' }} numberOfLines={1}>
                      🎂 {p.name.split(' ')[0]}
                    </Text>
                  </View>
                ))}
                {allDayEvs.slice(0, 2).map((ev) => (
                  <Pressable
                    key={ev.id}
                    onPress={() => onEventPress(ds)}
                    style={{
                      backgroundColor: `${ev.color ?? colors.organizer}22`,
                      borderRadius: 3,
                      paddingHorizontal: 2,
                      paddingVertical: 1,
                      borderLeftWidth: 2,
                      borderLeftColor: ev.color ?? colors.organizer,
                    }}
                  >
                    <Text
                      style={{ color: ev.color ?? colors.organizer, fontSize: 8, fontWeight: '600' }}
                      numberOfLines={1}
                    >
                      {ev.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )
          })}
        </View>
      )}

      {/* Scrollable time grid */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      >
        <View style={{ flexDirection: 'row' }}>
          {/* Time label column */}
          <View style={{ width: TIME_COL_W }}>
            {WEEK_HOURS.map((h) => (
              <View key={h} style={{ height: HOUR_HEIGHT, justifyContent: 'flex-start', alignItems: 'flex-end', paddingRight: 6, paddingTop: 2 }}>
                <Text style={{ color: colors.textMuted, fontSize: 9 }}>
                  {String(h).padStart(2, '0')}:00
                </Text>
              </View>
            ))}
          </View>

          {/* Event columns */}
          {weekDateStrs.map((ds) => {
            const timedEvs = (eventsMap[ds] ?? []).filter((e) => !e.isAllDay && !!e.startTime)
            return (
              <View key={ds} style={{ flex: 1, position: 'relative' }}>
                {/* Hour slot rows (tappable) */}
                {WEEK_HOURS.map((h) => (
                  <Pressable
                    key={h}
                    onPress={() => onSlotPress(ds, h)}
                    style={({ pressed }) => ({
                      height: HOUR_HEIGHT,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      borderRightWidth: 1,
                      borderRightColor: colors.border,
                      backgroundColor: pressed ? `${colors.organizer}08` : 'transparent',
                    })}
                  />
                ))}

                {/* Timed event blocks (absolutely positioned) */}
                {timedEvs.map((ev) => (
                  <TimeEventBlock
                    key={ev.id}
                    event={ev}
                    onPress={() => onEventPress(ds)}
                  />
                ))}
              </View>
            )
          })}
        </View>
      </ScrollView>
    </View>
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
  const dateObj = new Date(date + 'T12:00:00')
  const label   = `${DAY_NAMES[dateObj.getDay()]}, ${MONTH_NAMES[dateObj.getMonth()]} ${dateObj.getDate()}`

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

  const today     = todayStr()
  const todayDate = new Date()

  // Month view state
  const [year,  setYear]  = useState(todayDate.getFullYear())
  const [month, setMonth] = useState(todayDate.getMonth() + 1)

  // View mode + week state
  const [viewMode,   setViewMode]   = useState<'month' | 'week'>('month')
  const [weekStart,  setWeekStart]  = useState<Date>(() => getMondayOf(todayDate))
  const [selectedDate, setSelectedDate] = useState(today)

  // Week events (loaded separately from month events)
  const [weekEventsMap, setWeekEventsMap] = useState<Record<string, OrganizerEvent[]>>({})

  const daySheetRef = useRef<BottomSheet>(null)

  // Derived: 7 dates for the week view
  const weekDates = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )
  const weekDateStrs = useMemo(() =>
    weekDates.map((d) => dateStr(d.getFullYear(), d.getMonth() + 1, d.getDate())),
    [weekDates],
  )

  function loadWeekEvents(strs: string[]) {
    const map: Record<string, OrganizerEvent[]> = {}
    for (const ds of strs) {
      map[ds] = dbGetEventsForDate(ds)
    }
    setWeekEventsMap(map)
  }

  useFocusEffect(useCallback(() => {
    loadPeople()
    if (viewMode === 'month') {
      loadEvents(year, month)
    } else {
      loadWeekEvents(weekDateStrs)
    }
  }, [viewMode, year, month, weekDateStrs.join(',')]))

  // Reload week events when week changes
  useEffect(() => {
    if (viewMode !== 'week') return
    loadWeekEvents(weekDateStrs)
  }, [weekDateStrs.join(','), viewMode])

  // ── Birthday map (MM-DD → persons) ──
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

  // ── Month view helpers ──
  const dotMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const ev of events) {
      if (!map[ev.date]) map[ev.date] = []
      map[ev.date].push(ev.color ?? colors.organizer)
    }
    return map
  }, [events])

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else setMonth((m) => m + 1)
  }

  function handleDayPress(day: number) {
    const ds = dateStr(year, month, day)
    setSelectedDate(ds)
    daySheetRef.current?.expand()
  }

  const selectedEvents = useMemo(() => {
    if (viewMode === 'month') return events.filter((e) => e.date === selectedDate)
    return weekEventsMap[selectedDate] ?? []
  }, [events, weekEventsMap, selectedDate, viewMode])

  const selectedBirthdays = useMemo(() => {
    const [, mm, dd] = selectedDate.split('-')
    return birthdayMap[`${mm}-${dd}`] ?? []
  }, [selectedDate, birthdayMap])

  // Month grid cells
  const firstDay  = firstDayOfMonth(year, month)
  const totalDays = daysInMonth(year, month)
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  // ── View mode switch helpers ──
  function switchToWeek() {
    // Show the week containing selectedDate
    const selD = new Date(selectedDate + 'T12:00:00')
    setWeekStart(getMondayOf(selD))
    setViewMode('week')
  }

  function switchToMonth() {
    // Show the month containing weekStart
    setYear(weekStart.getFullYear())
    setMonth(weekStart.getMonth() + 1)
    setViewMode('month')
    loadEvents(weekStart.getFullYear(), weekStart.getMonth() + 1)
  }

  function goToday() {
    const d = new Date()
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
    setSelectedDate(today)
    setWeekStart(getMondayOf(d))
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* ── Header ── */}
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

        {/* Month | Week toggle */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: colors.surface2,
          borderRadius: 8,
          padding: 2,
          marginRight: spacing.sm,
        }}>
          {(['month', 'week'] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => mode === 'month' ? switchToMonth() : switchToWeek()}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 6,
                backgroundColor: viewMode === mode ? colors.organizer : 'transparent',
              }}
            >
              <Text style={{
                color: viewMode === mode ? '#fff' : colors.textMuted,
                fontSize: fontSize.micro,
                fontWeight: '600',
                textTransform: 'capitalize',
              }}>
                {mode}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={goToday} style={{ padding: spacing.sm }}>
          <Text style={{ color: colors.organizer, fontSize: fontSize.micro, fontWeight: '700' }}>Today</Text>
        </Pressable>
      </View>

      {/* ── Nav row (month or week title + prev/next) ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      }}>
        <Pressable
          onPress={() => viewMode === 'month' ? prevMonth() : setWeekStart((w) => addDays(w, -7))}
          style={{ padding: spacing.sm }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.body, fontWeight: '700', textAlign: 'center' }}>
          {viewMode === 'month'
            ? `${MONTH_NAMES[month - 1]} ${year}`
            : formatWeekRange(weekStart)}
        </Text>
        <Pressable
          onPress={() => viewMode === 'month' ? nextMonth() : setWeekStart((w) => addDays(w, 7))}
          style={{ padding: spacing.sm }}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      {/* ── Month view ── */}
      {viewMode === 'month' && (
        <>
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
                  const ds   = dateStr(year, month, day)
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

          {/* Upcoming events list */}
          {events.length > 0 ? (
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
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>Tap a day to add an event</Text>
            </View>
          )}
        </>
      )}

      {/* ── Week view ── */}
      {viewMode === 'week' && (
        <WeekView
          weekDates={weekDates}
          weekDateStrs={weekDateStrs}
          eventsMap={weekEventsMap}
          birthdayMap={birthdayMap}
          today={today}
          selectedDate={selectedDate}
          onDayHeaderPress={(ds) => {
            setSelectedDate(ds)
            daySheetRef.current?.expand()
          }}
          onSlotPress={(ds, hour) => {
            const hh = String(hour).padStart(2, '0')
            router.push(`/organizer/event-add?date=${ds}&time=${hh}:00` as never)
          }}
          onEventPress={(ds) => {
            setSelectedDate(ds)
            daySheetRef.current?.expand()
          }}
        />
      )}

      {/* ── Day detail sheet ── */}
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
            // Reload week events if in week mode
            if (viewMode === 'week') {
              loadWeekEvents(weekDateStrs)
            }
          }}
        />
      </BottomSheet>
    </SafeAreaView>
  )
}

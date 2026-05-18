import { useCallback, useState, useMemo } from 'react'
import { View, Text, FlatList, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius, fonts } from '@core/theme'
import { getAllSessionsV2, type SessionSummaryRowV2 } from '@core/db/workoutQueriesV2'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDuration(s: number | null): string {
  if (!s) return '—'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function fmtVolume(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)} kg`
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function monthKey(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type ViewMode = 'list' | 'calendar'

function SessionRow({ session, onPress }: { session: SessionSummaryRowV2; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginBottom: spacing.sm })}>
      <View style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.sm,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
          <View style={{
            width: 40, height: 40, borderRadius: radius.md,
            backgroundColor: `${colors.workout}18`,
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Ionicons name="barbell-outline" size={18} color={colors.workout} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{
              color: colors.text, fontSize: fontSize.cardTitle,
              fontWeight: '700', fontFamily: `${fonts.ui}_700Bold`,
            }}>
              {session.templateName ?? 'Free Workout'}
            </Text>
            <Text style={{
              color: colors.textMuted, fontSize: fontSize.micro,
              fontFamily: `${fonts.ui}_400Regular`,
            }}>
              {fmtDate(session.date)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {[
            { icon: 'time-outline' as const, val: fmtDuration(session.durationSeconds) },
            { icon: 'barbell-outline' as const, val: `${session.exerciseCount} ex` },
            { icon: 'layers-outline' as const, val: `${session.totalSets} sets` },
            { icon: 'trending-up-outline' as const, val: fmtVolume(session.totalVolume) },
          ].map(({ icon, val }) => (
            <View key={icon} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name={icon} size={12} color={colors.textMuted} />
              <Text style={{
                color: colors.textMuted, fontSize: fontSize.micro,
                fontFamily: `${fonts.ui}_400Regular`,
              }}>
                {val}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  )
}

// ─── Calendar view ────────────────────────────────────────────────────────────

function CalendarView({ sessions, onPress }: {
  sessions: SessionSummaryRowV2[]
  onPress: (s: SessionSummaryRowV2) => void
}) {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const sessionDates = useMemo(() => {
    const map = new Map<string, SessionSummaryRowV2[]>()
    for (const s of sessions) {
      const key = s.date.slice(0, 10)
      const arr = map.get(key) ?? []
      arr.push(s)
      map.set(key, arr)
    }
    return map
  }, [sessions])

  const { year, month } = viewMonth
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset = (firstDay + 6) % 7 // Monday start

  const today = new Date().toISOString().slice(0, 10)
  const monthLabel = new Date(year, month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  function pad(n: number): string {
    return String(n).padStart(2, '0')
  }

  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <View style={{ gap: spacing.md }}>
      {/* Month nav */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md }}>
        <Pressable
          onPress={() => setViewMonth((v) => {
            const d = new Date(v.year, v.month - 1)
            return { year: d.getFullYear(), month: d.getMonth() }
          })}
          style={{ padding: spacing.xs }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={{
          flex: 1, textAlign: 'center',
          color: colors.text, fontSize: fontSize.cardTitle,
          fontWeight: '700', fontFamily: `${fonts.ui}_700Bold`,
        }}>
          {monthLabel}
        </Text>
        <Pressable
          onPress={() => setViewMonth((v) => {
            const d = new Date(v.year, v.month + 1)
            return { year: d.getFullYear(), month: d.getMonth() }
          })}
          style={{ padding: spacing.xs }}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      {/* Day headers */}
      <View style={{ flexDirection: 'row', paddingHorizontal: spacing.md }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Text key={i} style={{
            flex: 1, textAlign: 'center',
            color: colors.textMuted, fontSize: fontSize.micro,
            fontFamily: `${fonts.ui}_600SemiBold`,
          }}>
            {d}
          </Text>
        ))}
      </View>

      {/* Grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md }}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />
          const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`
          const daySessions = sessionDates.get(dateStr) ?? []
          const isToday = dateStr === today
          const hasSession = daySessions.length > 0

          return (
            <Pressable
              key={day}
              onPress={() => daySessions.length > 0 && onPress(daySessions[0])}
              style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}
            >
              <View style={{
                flex: 1, alignItems: 'center', justifyContent: 'center',
                borderRadius: radius.sm,
                backgroundColor: hasSession ? `${colors.workout}33` : isToday ? `${colors.primary}18` : 'transparent',
                borderWidth: isToday ? 1 : 0,
                borderColor: colors.primary,
              }}>
                <Text style={{
                  color: hasSession ? colors.workout : isToday ? colors.primary : colors.textMuted,
                  fontSize: 12,
                  fontWeight: hasSession || isToday ? '700' : '400',
                  fontFamily: hasSession || isToday ? `${fonts.mono}_700Bold` : `${fonts.ui}_400Regular`,
                }}>
                  {day}
                </Text>
                {hasSession && (
                  <View style={{
                    width: 4, height: 4, borderRadius: 2,
                    backgroundColor: colors.workout, marginTop: 1,
                  }} />
                )}
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function WorkoutHistoryScreen() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionSummaryRowV2[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  useFocusEffect(
    useCallback(() => {
      setSessions(getAllSessionsV2())
    }, []),
  )

  const grouped = useMemo(() => {
    const map = new Map<string, SessionSummaryRowV2[]>()
    for (const s of sessions) {
      const key = monthKey(s.date)
      const arr = map.get(key) ?? []
      arr.push(s)
      map.set(key, arr)
    }
    return [...map.entries()]
  }, [sessions])

  function goToDetail(s: SessionSummaryRowV2) {
    router.push(`/health/workout/history/${s.id}` as never)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm,
      }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.xs }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{
          flex: 1, color: colors.text, fontSize: fontSize.sectionHeader,
          fontWeight: '700', fontFamily: `${fonts.ui}_700Bold`,
        }}>
          Workout History
        </Text>
        <Text style={{
          color: colors.textMuted, fontSize: fontSize.label,
          fontFamily: `${fonts.ui}_400Regular`,
        }}>
          {sessions.length}
        </Text>

        {/* Toggle */}
        <View style={{
          flexDirection: 'row', backgroundColor: colors.surface2,
          borderRadius: radius.md, padding: 2, gap: 2,
        }}>
          {(['list', 'calendar'] as ViewMode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => setViewMode(m)}
              style={{
                paddingHorizontal: spacing.sm, paddingVertical: 4,
                borderRadius: radius.sm - 2,
                backgroundColor: viewMode === m ? colors.surface : 'transparent',
              }}
            >
              <Ionicons
                name={m === 'list' ? 'list-outline' : 'calendar-outline'}
                size={16}
                color={viewMode === m ? colors.text : colors.textMuted}
              />
            </Pressable>
          ))}
        </View>
      </View>

      {sessions.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
          <Ionicons name="barbell-outline" size={48} color={colors.textMuted} />
          <Text style={{
            color: colors.textMuted, fontSize: fontSize.body,
            fontFamily: `${fonts.ui}_400Regular`,
          }}>
            No workouts logged yet.
          </Text>
        </View>
      ) : viewMode === 'calendar' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: spacing.md }}>
          <CalendarView sessions={sessions} onPress={goToDetail} />
        </ScrollView>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={([month]) => month}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.md }}
          renderItem={({ item: [month, items] }) => (
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={{
                color: colors.textMuted, fontSize: fontSize.label,
                fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8,
                fontFamily: `${fonts.ui}_600SemiBold`, marginBottom: spacing.sm,
              }}>
                {month}
              </Text>
              {items.map((s) => (
                <SessionRow key={s.id} session={s} onPress={() => goToDetail(s)} />
              ))}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  )
}

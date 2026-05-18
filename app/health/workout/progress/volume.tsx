import { useCallback, useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius, fonts } from '@core/theme'
import { getWeeklyVolumeByMuscleV2, type WeeklyMuscleVolumeV2 } from '@core/db/workoutQueriesV2'

// ─── Constants ────────────────────────────────────────────────────────────────

const MUSCLE_COLORS: Record<string, string> = {
  chest:     '#d97a4a',
  back:      '#b08a55',
  legs:      '#6c8f6c',
  quads:     '#6c8f6c',
  hamstrings:'#6c8f6c',
  glutes:    '#8f6c8f',
  shoulders: '#5a8fbf',
  'front delts': '#5a8fbf',
  'side delts':  '#5a8fbf',
  'rear delts':  '#5a8fbf',
  biceps:    '#bf8f5a',
  triceps:   '#bf5a5a',
  core:      '#8fbfbf',
  abs:       '#8fbfbf',
  calves:    '#9fbf8f',
}

function muscleColor(m: string): string {
  return MUSCLE_COLORS[m.toLowerCase()] ?? colors.primary
}

const WEEKS_BACK = 4
const MIN_SETS_WARN = 10
const MAX_SETS_WARN = 30

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtWeek(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MuscleBar({ muscle, sets, maxSets, weekCount }: {
  muscle: string; sets: number; maxSets: number; weekCount: number
}) {
  const avg = weekCount > 0 ? sets / weekCount : 0
  const pct = maxSets > 0 ? sets / maxSets : 0
  const color = muscleColor(muscle)
  const warn = avg < MIN_SETS_WARN ? 'low' : avg > MAX_SETS_WARN ? 'high' : null

  return (
    <Pressable>
      <View style={{
        backgroundColor: colors.surface, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.border,
        padding: spacing.md, gap: spacing.sm, marginBottom: spacing.sm,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
          <Text style={{
            flex: 1, color: colors.text, fontSize: fontSize.body,
            fontWeight: '600', fontFamily: `${fonts.ui}_600SemiBold`,
            textTransform: 'capitalize',
          }}>
            {muscle}
          </Text>
          <Text style={{
            color: colors.textMuted, fontSize: fontSize.micro,
            fontFamily: `${fonts.mono}_500Medium`,
          }}>
            {sets} sets · {avg.toFixed(1)}/wk
          </Text>
          {warn && (
            <View style={{
              backgroundColor: warn === 'low' ? `${colors.warning}22` : `#c0533a22`,
              borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 2,
            }}>
              <Text style={{
                color: warn === 'low' ? colors.warning : '#c0533a',
                fontSize: 9, fontFamily: `${fonts.ui}_600SemiBold`,
              }}>
                {warn === 'low' ? 'LOW' : 'HIGH'}
              </Text>
            </View>
          )}
        </View>

        {/* Bar */}
        <View style={{
          height: 6, backgroundColor: colors.surface2, borderRadius: 3, overflow: 'hidden',
        }}>
          <View style={{
            width: `${Math.min(pct * 100, 100)}%`,
            height: '100%', borderRadius: 3,
            backgroundColor: warn === 'low' ? colors.warning : warn === 'high' ? '#c0533a' : color,
          }} />
        </View>
      </View>
    </Pressable>
  )
}

function WeekChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: active ? colors.primary : colors.surface2,
        borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 5,
        borderWidth: 1, borderColor: active ? colors.primary : colors.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{
        color: active ? '#fff' : colors.textMuted,
        fontSize: fontSize.label, fontWeight: active ? '600' : '400',
        fontFamily: active ? `${fonts.ui}_600SemiBold` : `${fonts.ui}_400Regular`,
      }}>
        {label}
      </Text>
    </Pressable>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function VolumeScreen() {
  const router = useRouter()
  const [rows, setRows] = useState<WeeklyMuscleVolumeV2[]>([])
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      const data = getWeeklyVolumeByMuscleV2(WEEKS_BACK)
      setRows(data)
      if (data.length > 0) {
        const latest = [...new Set(data.map((r) => r.weekStart))].sort().reverse()[0]
        setSelectedWeek(latest)
      }
    }, []),
  )

  const weeks = useMemo(() => {
    return [...new Set(rows.map((r) => r.weekStart))].sort().reverse()
  }, [rows])

  const filteredRows = useMemo(() => {
    if (!selectedWeek) return []
    return rows.filter((r) => r.weekStart === selectedWeek)
  }, [rows, selectedWeek])

  const totalSets = filteredRows.reduce((s, r) => s + r.sets, 0)
  const maxSets = filteredRows.reduce((m, r) => Math.max(m, r.sets), 0)
  const weekCount = selectedWeek ? 1 : weeks.length

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
          Volume Analytics
        </Text>
      </View>

      {rows.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
          <Ionicons name="bar-chart-outline" size={48} color={colors.textMuted} />
          <Text style={{
            color: colors.textMuted, fontSize: fontSize.body,
            fontFamily: `${fonts.ui}_400Regular`, textAlign: 'center',
          }}>
            No data yet.{'\n'}Complete workouts to see volume trends.
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
          {/* Week selector */}
          <View style={{ gap: spacing.sm }}>
            <Text style={{
              color: colors.textMuted, fontSize: fontSize.label,
              fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8,
              fontFamily: `${fonts.ui}_600SemiBold`,
            }}>
              Week Starting
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
              {weeks.map((w) => (
                <WeekChip
                  key={w}
                  label={fmtWeek(w)}
                  active={selectedWeek === w}
                  onPress={() => setSelectedWeek(w)}
                />
              ))}
            </ScrollView>
          </View>

          {/* Summary */}
          <View style={{
            backgroundColor: colors.surface, borderRadius: radius.lg,
            borderWidth: 1, borderColor: `${colors.workout}44`, padding: spacing.md,
            flexDirection: 'row', gap: spacing.lg,
          }}>
            <View style={{ gap: 2 }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontFamily: `${fonts.ui}_400Regular` }}>
                Total Sets
              </Text>
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', fontFamily: `${fonts.mono}_700Bold` }}>
                {totalSets}
              </Text>
            </View>
            <View style={{ gap: 2 }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontFamily: `${fonts.ui}_400Regular` }}>
                Muscles Hit
              </Text>
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', fontFamily: `${fonts.mono}_700Bold` }}>
                {filteredRows.length}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontFamily: `${fonts.ui}_400Regular` }}>
                Target
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontFamily: `${fonts.ui}_400Regular` }}>
                10–30 sets/muscle
              </Text>
            </View>
          </View>

          {/* Muscle bars */}
          <View style={{ gap: 0 }}>
            <Text style={{
              color: colors.textMuted, fontSize: fontSize.label,
              fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8,
              fontFamily: `${fonts.ui}_600SemiBold`, marginBottom: spacing.sm,
            }}>
              By Muscle Group
            </Text>
            {filteredRows
              .sort((a, b) => b.sets - a.sets)
              .map((r) => (
                <MuscleBar
                  key={r.muscle}
                  muscle={r.muscle}
                  sets={r.sets}
                  maxSets={maxSets}
                  weekCount={weekCount}
                />
              ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

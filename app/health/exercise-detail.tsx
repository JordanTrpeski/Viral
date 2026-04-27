import { useState, useEffect } from 'react'
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { dbGetExercise, dbGetExerciseHistory } from '@core/db/exerciseQueries'
import MuscleGroupBadge from '@modules/health/workout/components/MuscleGroupBadge'
import { formatVolume } from '@modules/health/workout/workoutUtils'
import type { Exercise } from '@modules/health/shared/types'

type ChartMode = 'weight' | 'volume'

// ─── Chart ────────────────────────────────────────────────────────────────────

const PAD = { l: 44, r: 12, t: 16, b: 32 }
const CHART_H = 160

function ExerciseChart({ data, mode }: {
  data: { date: string; maxWeightKg: number; totalVolumeKg: number }[]
  mode: ChartMode
}) {
  const screenW = Dimensions.get('window').width
  const chartW = screenW - spacing.lg * 2

  if (data.length < 2) {
    return (
      <View style={{ height: CHART_H, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Log more sessions to see progress</Text>
      </View>
    )
  }

  const values = data.map((d) => mode === 'weight' ? d.maxWeightKg : d.totalVolumeKg)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const range = maxV - minV || 1

  const innerW = chartW - PAD.l - PAD.r
  const innerH = CHART_H - PAD.t - PAD.b

  const xs = data.map((_, i) => PAD.l + (i / (data.length - 1)) * innerW)
  const ys = values.map((v) => PAD.t + (1 - (v - minV) / range) * innerH)

  const pathD = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')

  // Y-axis labels: min and max
  const fmtY = (v: number) => mode === 'weight' ? `${v}kg` : formatVolume(v)

  // X-axis: show first, middle, last date labels
  const labelIndices = data.length <= 3
    ? data.map((_, i) => i)
    : [0, Math.floor((data.length - 1) / 2), data.length - 1]

  return (
    <Svg width={chartW} height={CHART_H}>
      {/* Y axis ticks */}
      <SvgText x={PAD.l - 4} y={PAD.t + 4} fill={colors.textMuted} fontSize={9} textAnchor="end">
        {fmtY(maxV)}
      </SvgText>
      <SvgText x={PAD.l - 4} y={CHART_H - PAD.b} fill={colors.textMuted} fontSize={9} textAnchor="end">
        {fmtY(minV)}
      </SvgText>

      {/* Grid line */}
      <Line
        x1={PAD.l} y1={PAD.t + innerH / 2}
        x2={chartW - PAD.r} y2={PAD.t + innerH / 2}
        stroke={colors.border} strokeWidth={1} strokeDasharray="4 4"
      />

      {/* X-axis date labels */}
      {labelIndices.map((idx) => (
        <SvgText
          key={idx}
          x={xs[idx]}
          y={CHART_H - 4}
          fill={colors.textMuted}
          fontSize={9}
          textAnchor="middle"
        >
          {data[idx].date.slice(5)}
        </SvgText>
      ))}

      {/* Line */}
      <Path d={pathD} stroke={colors.primary} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {xs.map((x, i) => (
        <Circle key={i} cx={x} cy={ys[i]} r={3.5} fill={colors.primary} />
      ))}
    </Svg>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ExerciseDetailScreen() {
  const router = useRouter()
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>()

  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [history, setHistory] = useState<{ date: string; maxWeightKg: number; totalVolumeKg: number }[]>([])
  const [mode, setMode] = useState<ChartMode>('weight')

  useEffect(() => {
    if (!exerciseId) return
    setExercise(dbGetExercise(exerciseId))
    setHistory(dbGetExerciseHistory(exerciseId))
  }, [exerciseId])

  if (!exercise) return null

  const hasHistory = history.length > 0
  const latestEntry = hasHistory ? history[history.length - 1] : null
  const firstEntry  = hasHistory ? history[0] : null
  const weightDelta = hasHistory && history.length > 1
    ? latestEntry!.maxWeightKg - firstEntry!.maxWeightKg
    : null

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
        <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600' }} numberOfLines={1}>
          {exercise.name}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>

        {/* Exercise meta */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <MuscleGroupBadge muscleGroup={exercise.muscleGroup} />
          {exercise.equipment && (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>
              {exercise.equipment}
            </Text>
          )}
          {exercise.isCustom && (
            <View style={{ backgroundColor: `${colors.primary}22`, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 }}>
              <Text style={{ color: colors.primary, fontSize: fontSize.micro, fontWeight: '600' }}>CUSTOM</Text>
            </View>
          )}
        </View>

        {/* Quick stats */}
        {hasHistory && (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '700' }}>
                {latestEntry!.maxWeightKg} kg
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: 2 }}>Best Weight</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '700' }}>
                {history.length}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: 2 }}>Sessions</Text>
            </View>
            {weightDelta !== null && (
              <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center' }}>
                <Text style={{ color: weightDelta >= 0 ? colors.success : colors.danger, fontSize: fontSize.cardTitle, fontWeight: '700' }}>
                  {weightDelta >= 0 ? '+' : ''}{weightDelta.toFixed(1)} kg
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: 2 }}>Progress</Text>
              </View>
            )}
          </View>
        )}

        {/* Progress chart */}
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
            <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' }}>
              Progress
            </Text>
            {/* Toggle */}
            <View style={{ flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 2 }}>
              {(['weight', 'volume'] as ChartMode[]).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  style={{
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 3,
                    borderRadius: radius.sm - 2,
                    backgroundColor: mode === m ? colors.primary : 'transparent',
                  }}
                >
                  <Text style={{ color: mode === m ? '#fff' : colors.textMuted, fontSize: fontSize.micro, fontWeight: '600', textTransform: 'capitalize' }}>
                    {m === 'weight' ? 'Max Weight' : 'Volume'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <ExerciseChart data={history} mode={mode} />
        </View>

        {/* Session history list */}
        {hasHistory && (
          <View>
            <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', marginBottom: spacing.sm }}>
              Session History
            </Text>
            <View style={{ gap: spacing.sm }}>
              {[...history].reverse().map((entry, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }}>
                      {entry.maxWeightKg} kg
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginTop: 2 }}>
                      {formatVolume(entry.totalVolumeKg)} total volume
                    </Text>
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>{entry.date}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {!hasHistory && (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
            <Ionicons name="stats-chart-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body, textAlign: 'center' }}>
              No history yet. Log some sets to see your progress!
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

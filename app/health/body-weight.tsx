import { useEffect, useState } from 'react'
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Polyline, Line, Circle, Text as SvgText } from 'react-native-svg'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { Button } from '@core/components'
import { useUserStore } from '@core/store/userStore'
import { useBodyWeightStore, type WeightRange } from '@modules/health/shared/bodyWeightStore'
import { kgToLbs } from '@core/utils/units'

// ─── BMI helpers ────────────────────────────────────────────────────────────

function calcBMI(weightKg: number, heightCm: number): number {
  const m = heightCm / 100
  return Math.round((weightKg / (m * m)) * 10) / 10
}

function bmiLabel(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Underweight',   color: colors.water }
  if (bmi < 25)   return { label: 'Healthy range', color: colors.success }
  if (bmi < 30)   return { label: 'Overweight',    color: colors.warning }
  return              { label: 'High',             color: colors.danger }
}

// ─── Trend line (linear regression) ────────────────────────────────────────

function trendLine(values: number[]): [number, number] {
  const n = values.length
  if (n < 2) return [values[0] ?? 0, values[0] ?? 0]
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
  for (let i = 0; i < n; i++) {
    sumX  += i
    sumY  += values[i]
    sumXY += i * values[i]
    sumX2 += i * i
  }
  const denom = n * sumX2 - sumX * sumX
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return [intercept, intercept + slope * (n - 1)]
}

// ─── Weight chart ────────────────────────────────────────────────────────────

const CHART_W = 320
const CHART_H = 180
const PAD = { top: 16, right: 8, bottom: 24, left: 36 }

function WeightChart({
  data,
  todayDate,
}: {
  data: { date: string; weightKg: number }[]
  todayDate: string
}) {
  if (data.length < 2) {
    return (
      <View style={{ height: CHART_H, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>
          Log at least 2 days to see the graph
        </Text>
      </View>
    )
  }

  const weights  = data.map((d) => d.weightKg)
  const minW     = Math.min(...weights)
  const maxW     = Math.max(...weights)
  const rangeW   = maxW - minW || 1
  const innerW   = CHART_W - PAD.left - PAD.right
  const innerH   = CHART_H - PAD.top  - PAD.bottom

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * innerW
  const toY = (w: number) => PAD.top  + ((maxW - w) / rangeW) * innerH

  const points = data.map((d, i) => `${toX(i)},${toY(d.weightKg)}`).join(' ')
  const [tStart, tEnd] = trendLine(weights)
  const trendPoints = `${toX(0)},${toY(tStart)} ${toX(data.length - 1)},${toY(tEnd)}`

  return (
    <View style={{ width: CHART_W, alignSelf: 'center' }}>
      <Svg width={CHART_W} height={CHART_H}>

        {/* Y axis labels */}
        <SvgText x={PAD.left - 4} y={PAD.top + 4}          fill={colors.textMuted} fontSize={9} textAnchor="end">{maxW.toFixed(1)}</SvgText>
        <SvgText x={PAD.left - 4} y={PAD.top + innerH + 4} fill={colors.textMuted} fontSize={9} textAnchor="end">{minW.toFixed(1)}</SvgText>

        {/* X axis labels */}
        <SvgText x={PAD.left}            y={CHART_H - 4} fill={colors.textMuted} fontSize={9} textAnchor="middle">{data[0].date.slice(5)}</SvgText>
        <SvgText x={PAD.left + innerW}   y={CHART_H - 4} fill={colors.textMuted} fontSize={9} textAnchor="middle">{data[data.length - 1].date.slice(5)}</SvgText>

        {/* Trend line */}
        <Polyline
          points={trendPoints}
          fill="none"
          stroke={colors.primary}
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.5}
        />

        {/* Data line */}
        <Polyline
          points={points}
          fill="none"
          stroke={colors.primary}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {data.map((d, i) => {
          const isToday = d.date === todayDate
          const cx = toX(i)
          const cy = toY(d.weightKg)
          return isToday ? (
            <Circle key={i} cx={cx} cy={cy} r={5} fill={colors.primary} />
          ) : (
            <Circle key={i} cx={cx} cy={cy} r={3} fill={colors.surface} stroke={colors.primary} strokeWidth={1.5} />
          )
        })}
      </Svg>
    </View>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────

const RANGES: WeightRange[] = ['7d', '30d', '90d', 'all']

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function offsetDate(base: string, days: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function BodyWeightScreen() {
  const router    = useRouter()
  const { profile, units } = useUserStore()
  const { todayEntry, history, streak, range, loadToday, loadHistory, logWeight, setRange } = useBodyWeightStore()

  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [inputVal, setInputVal]         = useState('')

  const isToday = selectedDate === todayStr()

  useEffect(() => {
    loadToday(selectedDate)
    loadHistory(range)
  }, [])

  useEffect(() => {
    loadToday(selectedDate)
    const existing = history.find((e) => e.date === selectedDate)
    if (existing) {
      setInputVal(
        units === 'metric'
          ? String(existing.weightKg)
          : String(kgToLbs(existing.weightKg)),
      )
    } else {
      setInputVal('')
    }
  }, [selectedDate])

  function handleSave() {
    const raw = Number(inputVal)
    if (!raw) return
    const kg = units === 'metric' ? raw : raw / 2.20462
    logWeight(selectedDate, Math.round(kg * 10) / 10)
  }

  function changeDate(delta: number) {
    const next = offsetDate(selectedDate, delta)
    if (next > todayStr()) return
    setSelectedDate(next)
  }

  // BMI from latest weight
  const latestKg    = todayEntry?.weightKg ?? history[history.length - 1]?.weightKg
  const bmi         = latestKg && profile?.heightCm ? calcBMI(latestKg, profile.heightCm) : null
  const bmiInfo     = bmi ? bmiLabel(bmi) : null
  const displayUnit = units === 'metric' ? 'kg' : 'lbs'

  // Yesterday delta
  const sorted  = [...history].sort((a, b) => a.date.localeCompare(b.date))
  const todayW  = sorted.find((e) => e.date === todayStr())?.weightKg
  const yestW   = sorted.find((e) => e.date === offsetDate(todayStr(), -1))?.weightKg
  const delta   = todayW && yestW ? todayW - yestW : null

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.sm }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', marginLeft: spacing.xs }}>
          Body Weight
        </Text>
        {streak > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${colors.warning}22`, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 }}>
            <Text style={{ fontSize: 14 }}>🔥</Text>
            <Text style={{ color: colors.warning, fontSize: fontSize.label, fontWeight: '700' }}>{streak}d</Text>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>

        {/* Date navigator */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, gap: spacing.lg }}>
          <Pressable onPress={() => changeDate(-1)} style={{ padding: spacing.sm }}>
            <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
          </Pressable>
          <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600', minWidth: 100, textAlign: 'center' }}>
            {isToday ? 'Today' : selectedDate}
          </Text>
          <Pressable
            onPress={() => changeDate(1)}
            disabled={isToday}
            style={{ padding: spacing.sm, opacity: isToday ? 0.3 : 1 }}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Log input */}
        <View style={{ marginHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.lg,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.md }}>
              {isToday ? "Today's weight" : `Weight on ${selectedDate}`}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.lg }}>
              <TextInput
                value={inputVal}
                onChangeText={setInputVal}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor={colors.textMuted}
                style={{ color: colors.text, fontSize: 56, fontWeight: '700', minWidth: 120, textAlign: 'center' }}
                selectionColor={colors.primary}
              />
              <Text style={{ color: colors.textMuted, fontSize: fontSize.sectionHeader, paddingBottom: 10 }}>
                {displayUnit}
              </Text>
            </View>
            {delta !== null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.md }}>
                <Ionicons
                  name={delta <= 0 ? 'arrow-down' : 'arrow-up'}
                  size={14}
                  color={delta <= 0 ? colors.success : colors.danger}
                />
                <Text style={{ color: delta <= 0 ? colors.success : colors.danger, fontSize: fontSize.label, fontWeight: '600' }}>
                  {Math.abs(units === 'metric' ? delta : delta * 2.20462).toFixed(1)} {displayUnit} vs yesterday
                </Text>
              </View>
            )}
            <Button label="Save" onPress={handleSave} disabled={!inputVal} fullWidth />
          </View>
        </View>

        {/* BMI */}
        {bmi && bmiInfo && profile?.heightCm && (
          <View style={{ marginHorizontal: spacing.lg, marginBottom: spacing.lg, flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.xs }}>BMI</Text>
              <Text style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}>{bmi}</Text>
              <Text style={{ color: bmiInfo.color, fontSize: fontSize.label, fontWeight: '600', marginTop: 2 }}>{bmiInfo.label}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.xs }}>Streak</Text>
              <Text style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}>{streak}</Text>
              <Text style={{ color: colors.warning, fontSize: fontSize.label, fontWeight: '600', marginTop: 2 }}>
                {streak === 1 ? 'day' : 'days'} 🔥
              </Text>
            </View>
          </View>
        )}

        {/* History chart */}
        <View style={{ marginHorizontal: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' }}>History</Text>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              {RANGES.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setRange(r)}
                  style={({ pressed }) => ({
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 4,
                    borderRadius: radius.sm,
                    backgroundColor: range === r ? colors.primary : colors.surface,
                    borderWidth: 1,
                    borderColor: range === r ? colors.primary : colors.border,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: range === r ? '#fff' : colors.textMuted, fontSize: fontSize.micro, fontWeight: '600' }}>
                    {r.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.md }}>
            <WeightChart data={history} todayDate={todayStr()} />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

import { useEffect, useState } from 'react'
import {
  View, Text, Pressable, ScrollView, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Polyline, Circle, Text as SvgText } from 'react-native-svg'
import * as Crypto from 'expo-crypto'
import { colors, fontSize, spacing, radius, fonts } from '@core/theme'
import { Button } from '@core/components'
import { useUserStore } from '@core/store/userStore'
import { cmToInches, inchesToCm, localDateStr } from '@core/utils/units'
import {
  dbGetMeasurementForDate,
  dbGetMeasurementHistory,
  dbUpsertMeasurement,
} from '@core/db/measurementQueries'
import type { BodyMeasurement } from '@modules/health/shared/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FieldDef {
  key: keyof FieldInputs
  dbKey: keyof BodyMeasurement
  label: string
  shortLabel: string
}

interface FieldInputs {
  chest: string
  waist: string
  hips: string
  leftArm: string
  rightArm: string
  leftThigh: string
  rightThigh: string
}

const FIELDS: FieldDef[] = [
  { key: 'chest',      dbKey: 'chestCm',      label: 'Chest',       shortLabel: 'Chest' },
  { key: 'waist',      dbKey: 'waistCm',      label: 'Waist',       shortLabel: 'Waist' },
  { key: 'hips',       dbKey: 'hipsCm',       label: 'Hips',        shortLabel: 'Hips'  },
  { key: 'leftArm',    dbKey: 'leftArmCm',    label: 'Left Arm',    shortLabel: 'L.Arm' },
  { key: 'rightArm',   dbKey: 'rightArmCm',   label: 'Right Arm',   shortLabel: 'R.Arm' },
  { key: 'leftThigh',  dbKey: 'leftThighCm',  label: 'Left Thigh',  shortLabel: 'L.Thigh' },
  { key: 'rightThigh', dbKey: 'rightThighCm', label: 'Right Thigh', shortLabel: 'R.Thigh' },
]

const EMPTY_INPUTS: FieldInputs = {
  chest: '', waist: '', hips: '',
  leftArm: '', rightArm: '', leftThigh: '', rightThigh: '',
}

// ─── Chart ────────────────────────────────────────────────────────────────────

const CW = 320
const CH = 160
const PAD = { top: 12, right: 8, bottom: 24, left: 36 }

function MeasurementChart({
  data,
  field,
  isImperial,
}: {
  data: BodyMeasurement[]
  field: FieldDef
  isImperial: boolean
}) {
  // Filter to entries that have this field, sorted oldest → newest
  const points = data
    .filter((m) => m[field.dbKey] != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => {
      const raw = m[field.dbKey] as number
      return { date: m.date, value: isImperial ? cmToInches(raw) : raw }
    })

  if (points.length < 2) {
    return (
      <View style={{ height: CH, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>
          Log at least 2 entries to see the chart
        </Text>
      </View>
    )
  }

  const vals   = points.map((p) => p.value)
  const minV   = Math.min(...vals)
  const maxV   = Math.max(...vals)
  const rangeV = maxV - minV || 1
  const innerW = CW - PAD.left - PAD.right
  const innerH = CH - PAD.top  - PAD.bottom

  const toX = (i: number) => PAD.left + (i / (points.length - 1)) * innerW
  const toY = (v: number) => PAD.top  + ((maxV - v) / rangeV) * innerH

  const svgPoints = points.map((p, i) => `${toX(i)},${toY(p.value)}`).join(' ')

  return (
    <View style={{ width: CW, alignSelf: 'center' }}>
      <Svg width={CW} height={CH}>
        <SvgText x={PAD.left - 4} y={PAD.top + 4}          fill={colors.textMuted} fontSize={9} textAnchor="end">{maxV.toFixed(1)}</SvgText>
        <SvgText x={PAD.left - 4} y={PAD.top + innerH + 4} fill={colors.textMuted} fontSize={9} textAnchor="end">{minV.toFixed(1)}</SvgText>
        <SvgText x={PAD.left}          y={CH - 4} fill={colors.textMuted} fontSize={9} textAnchor="middle">{points[0].date.slice(5)}</SvgText>
        <SvgText x={PAD.left + innerW} y={CH - 4} fill={colors.textMuted} fontSize={9} textAnchor="middle">{points[points.length - 1].date.slice(5)}</SvgText>
        <Polyline
          points={svgPoints}
          fill="none"
          stroke={colors.primary}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={toX(i)} cy={toY(p.value)}
            r={3}
            fill={colors.surface}
            stroke={colors.primary}
            strokeWidth={1.5}
          />
        ))}
      </Svg>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

function todayStr() { return localDateStr() }

export default function MeasurementsScreen() {
  const router = useRouter()
  const { units } = useUserStore()
  const isImperial = units === 'imperial'
  const unit = isImperial ? 'in' : 'cm'

  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [inputs, setInputs] = useState<FieldInputs>(EMPTY_INPUTS)
  const [history, setHistory] = useState<BodyMeasurement[]>([])
  const [activeChart, setActiveChart] = useState<FieldDef>(FIELDS[0])

  const isToday = selectedDate === todayStr()

  function loadAll() {
    setHistory(dbGetMeasurementHistory(90))
  }

  function loadForDate(date: string) {
    const entry = dbGetMeasurementForDate(date)
    if (entry) {
      setInputs({
        chest:      fmtVal(entry.chestCm),
        waist:      fmtVal(entry.waistCm),
        hips:       fmtVal(entry.hipsCm),
        leftArm:    fmtVal(entry.leftArmCm),
        rightArm:   fmtVal(entry.rightArmCm),
        leftThigh:  fmtVal(entry.leftThighCm),
        rightThigh: fmtVal(entry.rightThighCm),
      })
    } else {
      setInputs(EMPTY_INPUTS)
    }
  }

  function fmtVal(cmVal: number | undefined): string {
    if (cmVal == null) return ''
    return String(isImperial ? cmToInches(cmVal) : cmVal)
  }

  useEffect(() => {
    loadAll()
    loadForDate(selectedDate)
  }, [])

  useEffect(() => {
    loadForDate(selectedDate)
  }, [selectedDate])

  function changeDate(delta: number) {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + delta)
    const next = localDateStr(d)
    if (next > todayStr()) return
    setSelectedDate(next)
  }

  function parseCm(raw: string): number | undefined {
    const n = parseFloat(raw)
    if (isNaN(n) || n <= 0) return undefined
    return isImperial ? inchesToCm(n) : n
  }

  function handleSave() {
    const m: BodyMeasurement = {
      id: Crypto.randomUUID(),
      date: selectedDate,
      chestCm:      parseCm(inputs.chest),
      waistCm:      parseCm(inputs.waist),
      hipsCm:       parseCm(inputs.hips),
      leftArmCm:    parseCm(inputs.leftArm),
      rightArmCm:   parseCm(inputs.rightArm),
      leftThighCm:  parseCm(inputs.leftThigh),
      rightThighCm: parseCm(inputs.rightThigh),
      createdAt: new Date().toISOString(),
    }
    // Only save if at least one field has a value
    const hasAny = Object.values(m).some((v, i) => {
      const keys: (keyof BodyMeasurement)[] = [
        'chestCm','waistCm','hipsCm','leftArmCm','rightArmCm','leftThighCm','rightThighCm',
      ]
      return keys.some((k) => m[k] != null)
    })
    if (!hasAny) return
    dbUpsertMeasurement(m)
    loadAll()
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
          borderBottomWidth: 1, borderBottomColor: colors.border,
        }}>
          <Pressable onPress={() => router.back()} style={{ padding: spacing.sm }}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={{
            flex: 1, color: colors.text,
            fontSize: fontSize.sectionHeader, fontWeight: '600',
            marginLeft: spacing.xs, fontFamily: `${fonts.ui}_600SemiBold`,
          }}>
            Body Measurements
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
        >

          {/* Date navigator */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            paddingVertical: spacing.md, gap: spacing.lg,
          }}>
            <Pressable onPress={() => changeDate(-1)} style={{ padding: spacing.sm }}>
              <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
            </Pressable>
            <Text style={{
              color: colors.text, fontSize: fontSize.body, fontWeight: '600',
              minWidth: 110, textAlign: 'center',
            }}>
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

          {/* Measurement inputs */}
          <View style={{
            marginHorizontal: spacing.lg, marginBottom: spacing.lg,
            backgroundColor: colors.surface, borderRadius: radius.lg,
            borderWidth: 1, borderColor: colors.border, padding: spacing.md,
            gap: spacing.sm,
          }}>
            <Text style={{
              color: colors.textMuted, fontSize: fontSize.label,
              marginBottom: spacing.xs,
            }}>
              Log measurements ({unit})
            </Text>

            {/* Two-column grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {FIELDS.map((f) => (
                <View key={f.key} style={{ width: '47%' }}>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginBottom: 3 }}>
                    {f.label}
                  </Text>
                  <TextInput
                    value={inputs[f.key]}
                    onChangeText={(v) => setInputs((prev) => ({ ...prev, [f.key]: v }))}
                    keyboardType="decimal-pad"
                    placeholder={`0.0 ${unit}`}
                    placeholderTextColor={colors.textMuted}
                    style={{
                      backgroundColor: colors.surface2,
                      borderRadius: radius.sm,
                      borderWidth: 1,
                      borderColor: colors.border,
                      color: colors.text,
                      fontSize: fontSize.body,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                    }}
                    selectionColor={colors.primary}
                  />
                </View>
              ))}
            </View>

            <Button label="Save" onPress={handleSave} fullWidth />
          </View>

          {/* Latest summary row */}
          {history.length > 0 && (() => {
            const latest = history[0]
            const items = FIELDS.map((f) => ({
              label: f.shortLabel,
              value: latest[f.dbKey] as number | undefined,
            })).filter((x) => x.value != null)
            if (items.length === 0) return null
            return (
              <View style={{
                marginHorizontal: spacing.lg, marginBottom: spacing.lg,
                backgroundColor: colors.surface, borderRadius: radius.lg,
                borderWidth: 1, borderColor: colors.border, padding: spacing.md,
              }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.sm }}>
                  Latest ({history[0].date})
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
                  {items.map(({ label, value }) => (
                    <View key={label} style={{ alignItems: 'center', minWidth: 60 }}>
                      <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '700' }}>
                        {isImperial ? cmToInches(value!) : value}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>{label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )
          })()}

          {/* Chart section */}
          {history.length >= 2 && (
            <View style={{ marginHorizontal: spacing.lg }}>
              <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', marginBottom: spacing.sm }}>
                Progress
              </Text>

              {/* Chip row */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: spacing.sm }}
                contentContainerStyle={{ gap: spacing.xs }}
              >
                {FIELDS.map((f) => {
                  const hasData = history.some((m) => m[f.dbKey] != null)
                  if (!hasData) return null
                  const isActive = activeChart.key === f.key
                  return (
                    <Pressable
                      key={f.key}
                      onPress={() => setActiveChart(f)}
                      style={({ pressed }) => ({
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 5,
                        borderRadius: radius.sm,
                        backgroundColor: isActive ? colors.primary : colors.surface,
                        borderWidth: 1,
                        borderColor: isActive ? colors.primary : colors.border,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text style={{
                        color: isActive ? '#fff' : colors.textMuted,
                        fontSize: fontSize.micro,
                        fontWeight: '600',
                      }}>
                        {f.shortLabel}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>

              {/* Chart */}
              <View style={{
                backgroundColor: colors.surface, borderRadius: radius.lg,
                borderWidth: 1, borderColor: colors.border,
                paddingVertical: spacing.md,
              }}>
                <Text style={{
                  color: colors.textMuted, fontSize: fontSize.micro,
                  textAlign: 'center', marginBottom: spacing.xs,
                }}>
                  {activeChart.label} ({unit})
                </Text>
                <MeasurementChart
                  data={history}
                  field={activeChart}
                  isImperial={isImperial}
                />
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

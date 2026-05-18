import React, { useCallback, useState, useMemo } from 'react'
import {
  View, Text, ScrollView, Pressable, StyleSheet, StatusBar,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle } from 'react-native-svg'
import { useDietStore } from '@modules/health/diet/dietStore'
import { dbGetWaterHistory, dbSetWater } from '@core/db/dietQueries'
import { localDateStr } from '@core/utils/units'
import { colors, fonts, fontSize, spacing, radius } from '@core/theme'

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_ADD_ML = [250, 500, 750, 1000]
const GOAL_PRESETS_ML = [1500, 2000, 2500, 3000]
const RING_SIZE = 200
const STROKE = 16
const R = (RING_SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * R

function fmtVolume(ml: number): string {
  return ml >= 1000 ? `${(ml / 1000).toFixed(1)}L` : `${ml}ml`
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Ring component ───────────────────────────────────────────────────────────

function WaterRing({ waterMl, goalMl }: { waterMl: number; goalMl: number }) {
  const progress = goalMl > 0 ? Math.min(1, waterMl / goalMl) : 0
  const offset = CIRC * (1 - progress)
  const pct = Math.round(progress * 100)
  const ringColor = progress >= 1 ? colors.success : progress >= 0.6 ? colors.water : colors.primary

  return (
    <View style={styles.ringWrapper}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
        <Circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={R}
          stroke={colors.surface2} strokeWidth={STROKE} fill="none"
        />
        <Circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={R}
          stroke={ringColor} strokeWidth={STROKE} fill="none"
          strokeDasharray={`${CIRC}`} strokeDashoffset={offset}
          strokeLinecap="round" rotation="-90"
          origin={`${RING_SIZE / 2},${RING_SIZE / 2}`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={[styles.ringMain, { color: ringColor }]}>{fmtVolume(waterMl)}</Text>
        <Text style={styles.ringGoal}>of {fmtVolume(goalMl)}</Text>
        <Text style={[styles.ringPct, { color: ringColor }]}>{pct}%</Text>
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WaterDetail() {
  const router = useRouter()
  const { waterMl, waterGoalMl, addWater, setWaterGoal, loadToday } = useDietStore()

  const [goalExpanded, setGoalExpanded] = useState(false)
  const [goalInput, setGoalInput] = useState(String(waterGoalMl))
  const [customInput, setCustomInput] = useState('')

  const today = localDateStr()

  useFocusEffect(useCallback(() => { loadToday() }, []))

  const weekHistory = useMemo(() => {
    const rows = dbGetWaterHistory(7)
    const map = new Map(rows.map((r) => [r.date, r.amountMl]))
    const days: { date: string; amountMl: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      days.push({ date: dateStr, amountMl: map.get(dateStr) ?? 0 })
    }
    return days
  }, [waterMl])

  const maxMl = useMemo(
    () => Math.max(...weekHistory.map((d) => d.amountMl), waterGoalMl, 1),
    [weekHistory, waterGoalMl],
  )

  const handleCustomAdd = () => {
    const ml = parseInt(customInput)
    if (!ml || ml <= 0) { Alert.alert('Enter a valid amount'); return }
    addWater(ml)
    setCustomInput('')
  }

  const handleSaveGoal = () => {
    const ml = parseInt(goalInput)
    if (!ml || ml < 500 || ml > 10000) {
      Alert.alert('Enter a goal between 500ml and 10,000ml')
      return
    }
    setWaterGoal(ml)
    setGoalExpanded(false)
  }

  const handleReset = () => {
    Alert.alert('Reset today\'s water', 'Set water intake back to 0?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive',
        onPress: () => {
          dbSetWater(today, 0)
          loadToday()
        },
      },
    ])
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 }}>
          <Ionicons name="water" size={18} color={colors.water} />
          <Text style={styles.headerTitle}>Water</Text>
        </View>
        <Pressable onPress={() => setGoalExpanded((e) => !e)} style={styles.headerIconBtn}>
          <Ionicons name="settings-outline" size={22} color={goalExpanded ? colors.water : colors.textMuted} />
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Goal editor */}
          {goalExpanded && (
            <View style={styles.goalCard}>
              <Text style={styles.goalTitle}>Daily Water Goal</Text>
              <View style={styles.goalPresets}>
                {GOAL_PRESETS_ML.map((ml) => (
                  <Pressable
                    key={ml}
                    style={[styles.presetChip, goalInput === String(ml) && styles.presetChipActive]}
                    onPress={() => setGoalInput(String(ml))}
                  >
                    <Text style={[styles.presetChipText, goalInput === String(ml) && styles.presetChipTextActive]}>
                      {fmtVolume(ml)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.goalInputRow}>
                <TextInput
                  style={styles.goalInput}
                  value={goalInput}
                  onChangeText={setGoalInput}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <Text style={styles.goalUnit}>ml</Text>
              </View>
              <Pressable style={styles.goalSaveBtn} onPress={handleSaveGoal}>
                <Text style={styles.goalSaveBtnText}>Save Goal</Text>
              </Pressable>
            </View>
          )}

          {/* Ring */}
          <View style={styles.ringContainer}>
            <WaterRing waterMl={waterMl} goalMl={waterGoalMl} />
            <View style={styles.ringStats}>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{fmtVolume(waterMl)}</Text>
                <Text style={styles.statKey}>consumed</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{fmtVolume(Math.max(0, waterGoalMl - waterMl))}</Text>
                <Text style={styles.statKey}>remaining</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{fmtVolume(waterGoalMl)}</Text>
                <Text style={styles.statKey}>goal</Text>
              </View>
            </View>
          </View>

          {/* Quick-add */}
          <View style={styles.quickCard}>
            <Text style={styles.sectionLabel}>Quick Add</Text>
            <View style={styles.quickGrid}>
              {QUICK_ADD_ML.map((ml) => (
                <Pressable key={ml} style={styles.quickBtn} onPress={() => addWater(ml)}>
                  <Ionicons name="water-outline" size={14} color={colors.water} />
                  <Text style={styles.quickBtnText}>+{fmtVolume(ml)}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.customRow}>
              <View style={styles.customInputWrap}>
                <TextInput
                  style={styles.customInput}
                  value={customInput}
                  onChangeText={setCustomInput}
                  placeholder="Custom ml..."
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              <Pressable style={styles.customAddBtn} onPress={handleCustomAdd}>
                <Text style={styles.customAddBtnText}>Add</Text>
              </Pressable>
            </View>
          </View>

          {/* Weekly chart */}
          {weekHistory.some((d) => d.amountMl > 0) && (
            <View style={styles.chartCard}>
              <Text style={styles.sectionLabel}>Last 7 Days</Text>
              <View style={styles.chartBars}>
                {weekHistory.map((day) => {
                  const barH = Math.max(4, (day.amountMl / maxMl) * 80)
                  const isToday = day.date === today
                  const metGoal = day.amountMl >= waterGoalMl
                  const barColor = isToday
                    ? colors.water
                    : metGoal ? colors.success : `${colors.water}55`

                  return (
                    <View key={day.date} style={styles.chartBarCol}>
                      {/* Goal line reference */}
                      <View style={styles.chartBarTrack}>
                        <View style={[styles.chartBarFill, { height: barH, backgroundColor: barColor }]} />
                      </View>
                      <Text style={[styles.chartBarDate, isToday && { color: colors.water }]}>
                        {isToday ? 'T' : fmtDate(day.date).slice(0, 3)}
                      </Text>
                    </View>
                  )
                })}
              </View>
              <View style={styles.chartLegend}>
                <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                <Text style={styles.legendText}>Goal met</Text>
                <View style={[styles.legendDot, { backgroundColor: `${colors.water}55` }]} />
                <Text style={styles.legendText}>Below goal</Text>
              </View>
            </View>
          )}

          {/* Reset */}
          {waterMl > 0 && (
            <Pressable style={styles.resetBtn} onPress={handleReset}>
              <Ionicons name="refresh-outline" size={14} color={colors.textMuted} />
              <Text style={styles.resetText}>Reset today's water</Text>
            </Pressable>
          )}

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.xs },
  headerTitle: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.sectionHeader, color: colors.text,
  },
  headerIconBtn: { padding: spacing.xs },

  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md },

  goalCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm,
  },
  goalTitle: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.cardTitle, color: colors.text,
  },
  goalPresets: { flexDirection: 'row', gap: spacing.sm },
  presetChip: {
    flex: 1, paddingVertical: spacing.xs, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  presetChipActive: { backgroundColor: colors.water, borderColor: colors.water },
  presetChipText: {
    fontFamily: `${fonts.mono}_500Medium`, fontSize: fontSize.label, color: colors.textMuted,
  },
  presetChipTextActive: { color: colors.bg, fontFamily: `${fonts.mono}_600SemiBold` },
  goalInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface2, borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  goalInput: {
    flex: 1, padding: spacing.sm,
    fontFamily: `${fonts.mono}_600SemiBold`, fontSize: fontSize.sectionHeader, color: colors.text,
    textAlign: 'right',
  },
  goalUnit: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.body, color: colors.textMuted,
    paddingLeft: spacing.xs,
  },
  goalSaveBtn: {
    backgroundColor: colors.water, borderRadius: radius.md,
    padding: spacing.sm, alignItems: 'center',
  },
  goalSaveBtnText: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.body, color: colors.bg,
  },

  ringContainer: { alignItems: 'center', paddingVertical: spacing.md },
  ringWrapper: {
    width: RING_SIZE, height: RING_SIZE,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  ringCenter: { alignItems: 'center' },
  ringMain: {
    fontFamily: `${fonts.mono}_700Bold`, fontSize: 28, color: colors.water,
  },
  ringGoal: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },
  ringPct: {
    fontFamily: `${fonts.mono}_600SemiBold`, fontSize: fontSize.body, color: colors.water,
    marginTop: 2,
  },
  ringStats: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.md,
  },
  statItem: { alignItems: 'center' },
  statVal: {
    fontFamily: `${fonts.mono}_600SemiBold`, fontSize: fontSize.body, color: colors.text,
  },
  statKey: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.micro, color: colors.textMuted,
  },
  statSep: { width: 1, height: 28, backgroundColor: colors.border },

  quickCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  sectionLabel: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.label,
    color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  quickGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  quickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4,
    backgroundColor: `${colors.water}18`, borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: `${colors.water}33`,
  },
  quickBtnText: {
    fontFamily: `${fonts.mono}_600SemiBold`, fontSize: fontSize.label, color: colors.water,
  },
  customRow: { flexDirection: 'row', gap: spacing.sm },
  customInputWrap: {
    flex: 1, backgroundColor: colors.surface2, borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  customInput: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.body, color: colors.text,
    paddingVertical: spacing.sm,
  },
  customAddBtn: {
    backgroundColor: colors.water, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, justifyContent: 'center',
  },
  customAddBtnText: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.body, color: colors.bg,
  },

  chartCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  chartBars: {
    flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  chartBarCol: { flex: 1, alignItems: 'center', gap: 4 },
  chartBarTrack: { flex: 1, justifyContent: 'flex-end', width: '100%' },
  chartBarFill: { width: '100%', borderRadius: radius.sm, minHeight: 4 },
  chartBarDate: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: 9, color: colors.textMuted,
  },
  chartLegend: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    justifyContent: 'flex-end',
  },
  legendDot: { width: 8, height: 8, borderRadius: radius.full },
  legendText: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.micro, color: colors.textMuted,
    marginRight: spacing.sm,
  },

  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm,
  },
  resetText: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },
})

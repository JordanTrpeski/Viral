import React from 'react'
import { View, Text, ScrollView, Pressable, Switch, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fonts, fontSize, spacing, radius } from '@core/theme'
import {
  useHealthSettingsStore,
  type Equipment,
  type TrainingExperience,
  type TrainingGoal,
} from '@core/store/healthSettingsStore'
import { useUserStore } from '@core/store/userStore'

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={styles.sectionHeader}>{title}</Text>
  )
}

// ─── Row item ─────────────────────────────────────────────────────────────────

function SettingRow({
  label, sublabel, right,
}: {
  label: string; sublabel?: string; right: React.ReactNode
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, marginRight: spacing.md }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel && <Text style={styles.rowSublabel}>{sublabel}</Text>}
      </View>
      {right}
    </View>
  )
}

// ─── Chip selector ────────────────────────────────────────────────────────────

function ChipRow<T extends string>({
  options, value, onSelect, colorMap,
}: {
  options: { id: T; label: string }[]
  value: T
  onSelect: (v: T) => void
  colorMap?: Partial<Record<T, string>>
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
      {options.map((opt) => {
        const selected = value === opt.id
        const color = colorMap?.[opt.id] ?? colors.primary
        return (
          <Pressable
            key={opt.id}
            onPress={() => onSelect(opt.id)}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <View style={[
              styles.chip,
              selected && { backgroundColor: `${color}22`, borderColor: color },
            ]}>
              <Text style={[styles.chipText, selected && { color }]}>{opt.label}</Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

// ─── Equipment toggle grid ────────────────────────────────────────────────────

const ALL_EQUIPMENT: { id: Equipment; label: string; icon: string }[] = [
  { id: 'barbell',    label: 'Barbell',    icon: 'barbell-outline' },
  { id: 'dumbbell',   label: 'Dumbbell',   icon: 'barbell-outline' },
  { id: 'machine',    label: 'Machine',    icon: 'cog-outline' },
  { id: 'cable',      label: 'Cable',      icon: 'git-branch-outline' },
  { id: 'band',       label: 'Band',       icon: 'resize-outline' },
  { id: 'bodyweight', label: 'Bodyweight', icon: 'body-outline' },
]

function EquipmentGrid() {
  const { equipment, toggleEquipment } = useHealthSettingsStore()

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
      {ALL_EQUIPMENT.map((item) => {
        const selected = equipment.includes(item.id)
        return (
          <Pressable
            key={item.id}
            onPress={() => toggleEquipment(item.id)}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <View style={[
              styles.equipChip,
              selected && { backgroundColor: `${colors.workout}22`, borderColor: colors.workout },
            ]}>
              <Ionicons name={item.icon as never} size={14} color={selected ? colors.workout : colors.textMuted} />
              <Text style={[styles.chipText, selected && { color: colors.workout }]}>{item.label}</Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const REST_OPTIONS = [
  { id: 60,  label: '60s' },
  { id: 90,  label: '90s' },
  { id: 120, label: '2 min' },
  { id: 180, label: '3 min' },
] as const

const EXPERIENCE_OPTIONS: { id: TrainingExperience; label: string }[] = [
  { id: 'beginner',     label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced',     label: 'Advanced' },
]

const TRAINING_GOAL_OPTIONS: { id: TrainingGoal; label: string }[] = [
  { id: 'strength',    label: 'Strength' },
  { id: 'hypertrophy', label: 'Hypertrophy' },
  { id: 'endurance',   label: 'Endurance' },
  { id: 'general',     label: 'General' },
]

const DAYS_OPTIONS = [2, 3, 4, 5, 6] as const

export default function HealthSettingsScreen() {
  const router = useRouter()
  const { units, setUnits } = useUserStore()
  const {
    defaultRestTimerSeconds, setDefaultRestTimer,
    workoutReminder, setWorkoutReminder,
    volumeWarnings, setVolumeWarnings,
    trainingExperience, setTrainingExperience,
    trainingGoal, setTrainingGoal,
    daysPerWeek, setDaysPerWeek,
    nutritionGoalSource, setNutritionGoalSource,
    stepsGoalSource, setStepsGoalSource,
  } = useHealthSettingsStore()

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginRight: spacing.sm }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Health Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── General ─────────────────────────────────────────────────────── */}
        <SectionHeader title="General" />
        <View style={styles.card}>
          <SettingRow
            label="Units"
            sublabel="Affects weight and distance display"
            right={
              <ChipRow
                options={[{ id: 'metric', label: 'Metric' }, { id: 'imperial', label: 'Imperial' }]}
                value={units}
                onSelect={(v) => setUnits(v as 'metric' | 'imperial')}
              />
            }
          />
        </View>

        {/* ── Workout ─────────────────────────────────────────────────────── */}
        <SectionHeader title="Workout" />
        <View style={styles.card}>
          <View style={styles.cardSection}>
            <Text style={styles.rowLabel}>Training experience</Text>
            <View style={{ marginTop: spacing.xs }}>
              <ChipRow
                options={EXPERIENCE_OPTIONS}
                value={trainingExperience}
                onSelect={setTrainingExperience}
              />
            </View>
          </View>

          <View style={[styles.cardSection, styles.divider]}>
            <Text style={styles.rowLabel}>Training goal</Text>
            <View style={{ marginTop: spacing.xs }}>
              <ChipRow
                options={TRAINING_GOAL_OPTIONS}
                value={trainingGoal}
                onSelect={setTrainingGoal}
              />
            </View>
          </View>

          <View style={[styles.cardSection, styles.divider]}>
            <Text style={styles.rowLabel}>Days per week</Text>
            <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
              {DAYS_OPTIONS.map((d) => (
                <Pressable key={d} onPress={() => setDaysPerWeek(d)} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
                  <View style={[styles.chip, daysPerWeek === d && { backgroundColor: `${colors.primary}22`, borderColor: colors.primary }]}>
                    <Text style={[styles.chipText, daysPerWeek === d && { color: colors.primary }]}>{d}x</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.cardSection, styles.divider]}>
            <Text style={styles.rowLabel}>Default rest timer</Text>
            <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
              {REST_OPTIONS.map((opt) => (
                <Pressable key={opt.id} onPress={() => setDefaultRestTimer(opt.id)} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
                  <View style={[styles.chip, defaultRestTimerSeconds === opt.id && { backgroundColor: `${colors.workout}22`, borderColor: colors.workout }]}>
                    <Text style={[styles.chipText, defaultRestTimerSeconds === opt.id && { color: colors.workout }]}>{opt.label}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.cardSection, styles.divider]}>
            <Text style={styles.rowLabel}>Available equipment</Text>
            <Text style={styles.rowSublabel}>Used for AI exercise suggestions</Text>
            <View style={{ marginTop: spacing.sm }}>
              <EquipmentGrid />
            </View>
          </View>

          <View style={[styles.row, styles.divider]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Workout reminder</Text>
              <Text style={styles.rowSublabel}>Notify if scheduled session missed</Text>
            </View>
            <Switch
              value={workoutReminder}
              onValueChange={setWorkoutReminder}
              trackColor={{ false: colors.surface2, true: `${colors.workout}88` }}
              thumbColor={workoutReminder ? colors.workout : colors.textMuted}
            />
          </View>

          <View style={[styles.row, styles.divider]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Volume warnings</Text>
              <Text style={styles.rowSublabel}>Alert when weekly volume spikes</Text>
            </View>
            <Switch
              value={volumeWarnings}
              onValueChange={setVolumeWarnings}
              trackColor={{ false: colors.surface2, true: `${colors.workout}88` }}
              thumbColor={volumeWarnings ? colors.workout : colors.textMuted}
            />
          </View>
        </View>

        {/* ── Nutrition ────────────────────────────────────────────────────── */}
        <SectionHeader title="Nutrition" />
        <View style={styles.card}>
          <View style={styles.cardSection}>
            <Text style={styles.rowLabel}>Calorie goal source</Text>
            <Text style={styles.rowSublabel}>Auto-calculates from profile (TDEE) or use your own number</Text>
            <View style={{ marginTop: spacing.xs }}>
              <ChipRow
                options={[{ id: 'auto', label: 'Auto (TDEE)' }, { id: 'manual', label: 'Manual override' }]}
                value={nutritionGoalSource}
                onSelect={setNutritionGoalSource}
                colorMap={{ auto: colors.diet, manual: colors.primary }}
              />
            </View>
          </View>
        </View>

        {/* ── Steps ───────────────────────────────────────────────────────── */}
        <SectionHeader title="Steps" />
        <View style={styles.card}>
          <View style={styles.cardSection}>
            <Text style={styles.rowLabel}>Steps goal</Text>
            <Text style={styles.rowSublabel}>Auto adjusts based on your age, or set a fixed target</Text>
            <View style={{ marginTop: spacing.xs }}>
              <ChipRow
                options={[{ id: 'auto', label: 'Auto (age-based)' }, { id: 'custom', label: 'Custom target' }]}
                value={stepsGoalSource}
                onSelect={setStepsGoalSource}
                colorMap={{ auto: colors.steps, custom: colors.primary }}
              />
            </View>
          </View>
        </View>

        {/* ── AI ──────────────────────────────────────────────────────────── */}
        <SectionHeader title="AI Features" />
        <View style={styles.card}>
          <View style={styles.cardSection}>
            <Text style={styles.rowLabel}>AI integrations</Text>
            <Text style={[styles.rowSublabel, { marginTop: spacing.xs, lineHeight: 18 }]}>
              AI features (weekly summaries, exercise swap suggestions, food photo recognition) require API keys.
              {'\n\n'}Add your Anthropic API key in{' '}
              <Text style={{ color: colors.primary, fontFamily: `${fonts.mono}_400Regular` }}>
                core/utils/ai/workoutSummary.ts
              </Text>
              {' '}and your Gemini key in{' '}
              <Text style={{ color: colors.primary, fontFamily: `${fonts.mono}_400Regular` }}>
                core/utils/ai/foodRecognition.ts
              </Text>
              .
            </Text>
          </View>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.screenTitle, color: colors.text,
  },
  scroll: { padding: spacing.md, gap: spacing.xs },
  sectionHeader: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.label,
    color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1,
    marginTop: spacing.md, marginBottom: spacing.xs, paddingHorizontal: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  cardSection: { padding: spacing.md },
  row: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.body, color: colors.text,
  },
  rowSublabel: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.textMuted, marginTop: 2,
  },
  chip: {
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  equipChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  chipText: {
    fontFamily: `${fonts.ui}_500Medium`, fontSize: fontSize.label, color: colors.textMuted,
  },
})

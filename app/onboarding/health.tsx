import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useOnboardingStore } from '@core/store/onboardingStore'
import type { TrainingExperience, TrainingGoal, Equipment } from '@core/store/healthSettingsStore'

const TOTAL_STEPS = 7
const CURRENT_STEP = 4  // 0-indexed → step 5 of 7

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const EXPERIENCE_OPTIONS: { id: TrainingExperience; label: string; sublabel: string; icon: IoniconsName }[] = [
  { id: 'beginner',     label: 'Beginner',     sublabel: 'Less than 1 year of consistent training',  icon: 'leaf-outline' },
  { id: 'intermediate', label: 'Intermediate', sublabel: '1–3 years, solid technique on main lifts',  icon: 'barbell-outline' },
  { id: 'advanced',     label: 'Advanced',     sublabel: '3+ years, training near genetic potential', icon: 'trophy-outline' },
]

const TRAINING_GOAL_OPTIONS: { id: TrainingGoal; label: string; sublabel: string; color: string }[] = [
  { id: 'strength',    label: 'Strength',    sublabel: 'Max lifts, low reps, heavy weight',       color: colors.workout },
  { id: 'hypertrophy', label: 'Hypertrophy', sublabel: 'Muscle size, moderate reps, volume focus', color: '#c46ab0' },
  { id: 'endurance',   label: 'Endurance',   sublabel: 'Conditioning, high reps, shorter rest',   color: colors.steps },
  { id: 'general',     label: 'General',     sublabel: 'Balanced fitness, no specific focus',      color: colors.primary },
]

const EQUIPMENT_OPTIONS: { id: Equipment; label: string; icon: IoniconsName }[] = [
  { id: 'barbell',    label: 'Barbell',    icon: 'barbell-outline' },
  { id: 'dumbbell',   label: 'Dumbbell',   icon: 'barbell-outline' },
  { id: 'machine',    label: 'Machine',    icon: 'cog-outline' },
  { id: 'cable',      label: 'Cable',      icon: 'git-branch-outline' },
  { id: 'band',       label: 'Band',       icon: 'resize-outline' },
  { id: 'bodyweight', label: 'Bodyweight', icon: 'body-outline' },
]

const DAYS_OPTIONS = [2, 3, 4, 5, 6] as const

export default function OnboardingHealthScreen() {
  const router = useRouter()
  const {
    trainingExperience, setTrainingExperience,
    trainingGoal, setTrainingGoal,
    equipment, toggleEquipment,
    daysPerWeek, setDaysPerWeek,
  } = useOnboardingStore()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingTop: spacing.xl, marginBottom: spacing.xl }}>
          <Text style={{
            color: colors.workout, fontSize: fontSize.label, fontWeight: '600',
            letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: spacing.sm,
          }}>
            Training Setup
          </Text>
          <Text style={{ color: colors.text, fontSize: 30, fontWeight: '700', lineHeight: 38 }}>
            How do you{'\n'}train?
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.body, marginTop: spacing.sm }}>
            This helps us suggest the right programs and defaults.
          </Text>
        </View>

        {/* Experience */}
        <Text style={styles.sectionLabel}>Experience level</Text>
        <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
          {EXPERIENCE_OPTIONS.map((opt) => {
            const selected = trainingExperience === opt.id
            return (
              <Pressable
                key={opt.id}
                onPress={() => setTrainingExperience(opt.id)}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <View style={[styles.optionCard, selected && { borderColor: colors.workout, backgroundColor: `${colors.workout}12` }]}>
                  <View style={[styles.optionIcon, { backgroundColor: selected ? `${colors.workout}25` : colors.surface2 }]}>
                    <Ionicons name={opt.icon} size={18} color={selected ? colors.workout : colors.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }}>{opt.label}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginTop: 2 }}>{opt.sublabel}</Text>
                  </View>
                  <View style={[styles.radio, selected && { borderColor: colors.workout, backgroundColor: colors.workout }]}>
                    {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                </View>
              </Pressable>
            )
          })}
        </View>

        {/* Training goal */}
        <Text style={styles.sectionLabel}>Training focus</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
          {TRAINING_GOAL_OPTIONS.map((opt) => {
            const selected = trainingGoal === opt.id
            return (
              <Pressable
                key={opt.id}
                onPress={() => setTrainingGoal(opt.id)}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, flex: 1, minWidth: '45%' })}
              >
                <View style={[styles.goalCard, selected && { borderColor: opt.color, backgroundColor: `${opt.color}12` }]}>
                  <Text style={[styles.goalLabel, selected && { color: opt.color }]}>{opt.label}</Text>
                  <Text style={styles.goalSublabel}>{opt.sublabel}</Text>
                </View>
              </Pressable>
            )
          })}
        </View>

        {/* Equipment */}
        <Text style={styles.sectionLabel}>Available equipment</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
          {EQUIPMENT_OPTIONS.map((item) => {
            const selected = equipment.includes(item.id)
            return (
              <Pressable
                key={item.id}
                onPress={() => toggleEquipment(item.id)}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              >
                <View style={[styles.equipChip, selected && { borderColor: colors.primary, backgroundColor: `${colors.primary}18` }]}>
                  <Ionicons name={item.icon} size={14} color={selected ? colors.primary : colors.textMuted} />
                  <Text style={[styles.chipText, selected && { color: colors.primary }]}>{item.label}</Text>
                </View>
              </Pressable>
            )
          })}
        </View>

        {/* Days per week */}
        <Text style={styles.sectionLabel}>Days per week</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
          {DAYS_OPTIONS.map((d) => {
            const selected = daysPerWeek === d
            return (
              <Pressable
                key={d}
                onPress={() => setDaysPerWeek(d)}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, flex: 1 })}
              >
                <View style={[styles.dayChip, selected && { borderColor: colors.primary, backgroundColor: `${colors.primary}18` }]}>
                  <Text style={[styles.dayText, selected && { color: colors.primary }]}>{d}</Text>
                  <Text style={[styles.daySubtext, selected && { color: colors.primary }]}>days</Text>
                </View>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      {/* Footer: progress + Continue */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md }}>
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1, height: 3, borderRadius: radius.full,
                  backgroundColor: i <= CURRENT_STEP ? colors.primary : colors.surface2,
                }}
              />
            ))}
          </View>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, textAlign: 'center' }}>
            Step {CURRENT_STEP + 1} of {TOTAL_STEPS}
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/onboarding/units')}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <View style={{
            backgroundColor: colors.primary, borderRadius: radius.lg,
            borderWidth: 1, borderColor: `${colors.primary}88`,
            height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
          }}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 }}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = {
  sectionLabel: {
    color: colors.textMuted, fontSize: fontSize.label, fontWeight: '600' as const,
    textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: spacing.sm,
  },
  optionCard: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border, padding: spacing.md,
  },
  optionIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: 'transparent',
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  goalCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border, padding: spacing.md, gap: 4,
  },
  goalLabel: {
    color: colors.text, fontSize: fontSize.body, fontWeight: '600' as const,
  },
  goalSublabel: {
    color: colors.textMuted, fontSize: fontSize.label,
  },
  equipChip: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: {
    color: colors.textMuted, fontSize: fontSize.body, fontWeight: '500' as const,
  },
  dayChip: {
    alignItems: 'center' as const, paddingVertical: spacing.md,
    borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dayText: {
    color: colors.text, fontSize: 20, fontWeight: '700' as const,
  },
  daySubtext: {
    color: colors.textMuted, fontSize: fontSize.label,
  },
}

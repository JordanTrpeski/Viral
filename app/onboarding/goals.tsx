import { View, Text, Pressable, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useOnboardingStore, type OnboardingGoal } from '@core/store/onboardingStore'

const TOTAL_STEPS = 10
const CURRENT_STEP = 6

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const GOALS: {
  id: OnboardingGoal
  label: string
  sublabel: string
  icon: IoniconsName
  color: string
}[] = [
  { id: 'lose_weight',    label: 'Lose Weight',     sublabel: 'Burn fat, get leaner',      icon: 'flame',         color: colors.danger },
  { id: 'maintain',       label: 'Maintain',         sublabel: 'Stay where you are',         icon: 'scale-outline', color: colors.warning },
  { id: 'build_muscle',   label: 'Build Muscle',     sublabel: 'Gain strength and size',     icon: 'barbell',       color: colors.workout },
  { id: 'general_health', label: 'General Health',   sublabel: 'Feel better every day',      icon: 'heart',         color: colors.success },
]

export default function GoalsScreen() {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const { goal, setGoal } = useOnboardingStore()
  const titleSize = width < 360 ? 26 : width < 390 ? 29 : 32

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>

        {/* Header */}
        <View style={{ paddingTop: spacing.xl, marginBottom: spacing.xl }}>
          <Text style={{
            color: colors.primary, fontSize: fontSize.label, fontWeight: '600',
            letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: spacing.sm,
          }}>
            Your Goal
          </Text>
          <Text style={{ color: colors.text, fontSize: titleSize, fontWeight: '700', lineHeight: titleSize * 1.25 }}>
            What are you{'\n'}working towards?
          </Text>
        </View>

        {/* Goal cards */}
        <View style={{ gap: spacing.sm, flex: 1 }}>
          {GOALS.map((g) => {
            const selected = goal === g.id
            return (
              <Pressable
                key={g.id}
                onPress={() => setGoal(g.id)}
                style={({ pressed }) => ({
                  backgroundColor: selected ? `${g.color}18` : colors.surface,
                  borderRadius: radius.lg,
                  borderWidth: 1.5,
                  borderColor: selected ? g.color : colors.border,
                  padding: spacing.md,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                {/* Row: icon + text + checkmark */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{
                    width: 44, height: 44, borderRadius: radius.md,
                    backgroundColor: selected ? `${g.color}25` : colors.surface2,
                    alignItems: 'center', justifyContent: 'center',
                    marginRight: spacing.md,
                  }}>
                    <Ionicons name={g.icon} size={22} color={selected ? g.color : colors.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' }}>
                      {g.label}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.body, marginTop: 2 }}>
                      {g.sublabel}
                    </Text>
                  </View>
                  <View style={{
                    width: 24, height: 24, borderRadius: 12,
                    borderWidth: 2,
                    borderColor: selected ? g.color : colors.border,
                    backgroundColor: selected ? g.color : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                    marginLeft: spacing.sm,
                  }}>
                    {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </View>
              </Pressable>
            )
          })}
        </View>

        {/* Bottom: progress + Continue button */}
        <View style={{ paddingVertical: spacing.lg, gap: spacing.md }}>
          {/* Progress bar */}
          <View style={{ gap: spacing.xs }}>
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

          {/* Continue button — prominent, full width */}
          <Pressable
            onPress={() => { if (!goal) return; router.push('/onboarding/units') }}
            style={({ pressed }) => ({
              backgroundColor: colors.primary,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.borderHero,
              height: 56,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{
              color: '#fff',
              fontSize: 17,
              fontWeight: '700',
              letterSpacing: 0.3,
            }}>
              Continue
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

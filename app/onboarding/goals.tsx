import { View, Text, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { Button } from '@core/components'
import { useOnboardingStore, type OnboardingGoal } from '@core/store/onboardingStore'

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
  const { goal, setGoal } = useOnboardingStore()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>

        <View style={{ paddingTop: spacing.xl, marginBottom: spacing.xl }}>
          <Text
            style={{
              color: colors.primary,
              fontSize: fontSize.label,
              fontWeight: '600',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: spacing.sm,
            }}
          >
            Your Goal
          </Text>
          <Text style={{ color: colors.text, fontSize: 32, fontWeight: '700', lineHeight: 40 }}>
            What are you{'\n'}working towards?
          </Text>
        </View>

        <View style={{ gap: spacing.sm, flex: 1 }}>
          {GOALS.map((g) => {
            const selected = goal === g.id
            return (
              <Pressable
                key={g.id}
                onPress={() => setGoal(g.id)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: selected ? colors.surface2 : colors.surface,
                  borderRadius: radius.lg,
                  borderWidth: 1.5,
                  borderColor: selected ? g.color : colors.border,
                  padding: spacing.md,
                  gap: spacing.md,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: radius.md,
                    backgroundColor: selected ? `${g.color}22` : colors.surface2,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={g.icon} size={24} color={selected ? g.color : colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: selected ? colors.text : colors.text,
                      fontSize: fontSize.cardTitle,
                      fontWeight: '600',
                    }}
                  >
                    {g.label}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.body, marginTop: 2 }}>
                    {g.sublabel}
                  </Text>
                </View>
                {selected && (
                  <Ionicons name="checkmark-circle" size={22} color={g.color} />
                )}
              </Pressable>
            )
          })}
        </View>

        <View style={{ paddingVertical: spacing.lg, gap: spacing.sm }}>
          <Button
            label="Continue"
            onPress={() => router.push('/onboarding/units')}
            fullWidth
          />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, textAlign: 'center' }}>
            Step 3 of 6
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

import { useEffect, useState } from 'react'
import { View, Text, Pressable, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { Button } from '@core/components'
import { useOnboardingStore } from '@core/store/onboardingStore'
import { calculateTDEE, goalAdjustedCalories } from '@core/utils/tdee'

const TOTAL_STEPS = 10
const CURRENT_STEP = 8  // 0-indexed → step 9 of 10

export default function CaloriesScreen() {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const { weightKg, heightCm, dateOfBirth, sex, activityLevel, goal, calorieGoal, setCalorieGoal } = useOnboardingStore()
  const titleSize = width < 360 ? 26 : width < 390 ? 29 : 32

  const [tdee] = useState(() => calculateTDEE(weightKg, heightCm, dateOfBirth, sex, activityLevel))

  useEffect(() => {
    if (calorieGoal === 0) {
      setCalorieGoal(goalAdjustedCalories(tdee, goal))
    }
  }, [])

  function adjust(delta: number) {
    setCalorieGoal(Math.max(1200, calorieGoal + delta))
  }

  const goalLabel: Record<string, string> = {
    lose_weight:    'Deficit of 300 kcal/day',
    build_muscle:   'Surplus of 200 kcal/day',
    maintain:       'Maintenance',
    general_health: 'Maintenance',
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>

          <View style={{ paddingTop: spacing.xl, marginBottom: spacing.xl }}>
            <Text style={{
              color: colors.primary, fontSize: fontSize.label, fontWeight: '600',
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: spacing.sm,
            }}>
              Calorie Goal
            </Text>
            <Text style={{ color: colors.text, fontSize: titleSize, fontWeight: '700', lineHeight: titleSize * 1.25 }}>
              Your daily{'\n'}calorie target
            </Text>
          </View>

          {/* TDEE reference */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.md,
              marginBottom: spacing.lg,
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.xs }}>
              Estimated maintenance (TDEE)
            </Text>
            <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' }}>
              {tdee.toLocaleString()} kcal/day
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginTop: spacing.xs }}>
              {goalLabel[goal]}
            </Text>
          </View>

          {/* Calorie adjuster */}
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
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.sm }}>
              Your goal
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 52,
                fontWeight: '700',
                letterSpacing: -1,
              }}
            >
              {calorieGoal.toLocaleString()}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>kcal / day</Text>

            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
              {[-100, -50, +50, +100].map((delta) => (
                <Pressable
                  key={delta}
                  onPress={() => adjust(delta)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  {/* All visual + layout styles on View — fixes new-arch Pressable style-fn bug */}
                  <View style={{
                    backgroundColor: colors.surface2,
                    borderRadius: radius.sm,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.sm,
                    minWidth: 52,
                    alignItems: 'center',
                  }}>
                    <Text style={{ color: delta > 0 ? colors.success : colors.danger, fontWeight: '600', fontSize: fontSize.body }}>
                      {delta > 0 ? '+' : ''}{delta}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
            <Button
              label="Looks good"
              onPress={() => router.push('/onboarding/complete')}
              fullWidth
            />
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

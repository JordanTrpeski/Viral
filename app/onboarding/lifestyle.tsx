import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { Button } from '@core/components'
import { useOnboardingStore } from '@core/store/onboardingStore'
import { ACTIVITY_LABELS, ACTIVITY_DESCRIPTIONS } from '@core/utils/tdee'
import type { Sex, ActivityLevel } from '@core/types'

const TOTAL_STEPS = 7
const CURRENT_STEP = 2  // 0-indexed → step 3 of 6

const SEX_OPTIONS: { id: Sex; label: string; description: string }[] = [
  { id: 'male',   label: 'Male',   description: 'Used for accurate BMR calculation' },
  { id: 'female', label: 'Female', description: 'Used for accurate BMR calculation' },
]

const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active']

export default function LifestyleScreen() {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const { sex, activityLevel, setSex, setActivityLevel } = useOnboardingStore()
  const titleSize = width < 360 ? 26 : width < 390 ? 29 : 32

  function canAdvance(): boolean {
    return sex !== undefined && activityLevel !== undefined
  }

  function handleNext() {
    if (!canAdvance()) return
    router.push('/onboarding/goals')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ paddingTop: spacing.lg, marginBottom: spacing.xl }}>
            <Text style={{
              color: colors.primary, fontSize: fontSize.label, fontWeight: '600',
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: spacing.sm,
            }}>
              About You
            </Text>
            <Text style={{ color: colors.text, fontSize: titleSize, fontWeight: '700', lineHeight: titleSize * 1.25 }}>
              A bit more{'\n'}about your life
            </Text>
          </View>

          {/* Sex */}
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontWeight: '600', marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Biological Sex
          </Text>
          <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
            {SEX_OPTIONS.map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => setSex(opt.id)}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: sex === opt.id ? `${colors.primary}15` : colors.surface,
                  borderRadius: radius.lg, borderWidth: 1.5,
                  borderColor: sex === opt.id ? colors.primary : colors.border,
                  padding: spacing.md, gap: spacing.md,
                }}>
                  <View style={{
                    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
                    borderColor: sex === opt.id ? colors.primary : colors.border,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {sex === opt.id && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }}>{opt.label}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>{opt.description}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Activity level */}
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontWeight: '600', marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Activity Level
          </Text>
          <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
            {ACTIVITY_LEVELS.map((lvl) => (
              <Pressable
                key={lvl}
                onPress={() => setActivityLevel(lvl)}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: activityLevel === lvl ? `${colors.primary}15` : colors.surface,
                  borderRadius: radius.lg, borderWidth: 1.5,
                  borderColor: activityLevel === lvl ? colors.primary : colors.border,
                  padding: spacing.md, gap: spacing.md,
                }}>
                  <View style={{
                    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
                    borderColor: activityLevel === lvl ? colors.primary : colors.border,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {activityLevel === lvl && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }}>
                      {ACTIVITY_LABELS[lvl]}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>
                      {ACTIVITY_DESCRIPTIONS[lvl]}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Fixed footer */}
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md }}>
          <Button
            label="Next"
            onPress={handleNext}
            fullWidth
          />
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

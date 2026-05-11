import { useRef, useState, forwardRef } from 'react'
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { Button } from '@core/components'
import { useOnboardingStore } from '@core/store/onboardingStore'
import { ACTIVITY_LABELS, ACTIVITY_DESCRIPTIONS } from '@core/utils/tdee'
import type { Sex, ActivityLevel } from '@core/types'

type Step = 0 | 1 | 2 | 3 | 4

const TOTAL_STEPS = 10
// Profile sub-steps occupy global steps 2–6
const PROFILE_STEP_OFFSET = 2

const STEP_QUESTIONS: string[] = [
  'How much do you weigh?',
  'How tall are you?',
  'When were you born?',
  'What\'s your biological sex?',
  'What describes your daily activity?',
]

const SEX_OPTIONS: { id: Sex; label: string; description: string }[] = [
  { id: 'male',   label: 'Male',   description: 'Used for accurate BMR calculation' },
  { id: 'female', label: 'Female', description: 'Used for accurate BMR calculation' },
]

const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active']

export default function ProfileScreen() {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const { setWeight, setHeight, setDateOfBirth, setSex, setActivityLevel } = useOnboardingStore()
  const [step, setStep] = useState<Step>(0)

  const [weight,  setWeightVal] = useState('')
  const [height,  setHeightVal] = useState('')
  const [day,     setDay]       = useState('')
  const [month,   setMonth]     = useState('')
  const [year,    setYear]      = useState('')
  const [sex,     setSexVal]    = useState<Sex | null>(null)
  const [level,   setLevel]     = useState<ActivityLevel | null>(null)

  const monthRef = useRef<TextInput>(null)
  const yearRef  = useRef<TextInput>(null)

  const titleSize = width < 360 ? 26 : width < 390 ? 29 : 32
  const currentGlobalStep = PROFILE_STEP_OFFSET + step  // 2, 3, 4, 5, 6

  function canAdvance(): boolean {
    if (step === 0) return Number(weight) > 0
    if (step === 1) return Number(height) > 0
    if (step === 2) return day.length === 2 && month.length === 2 && year.length === 4
    if (step === 3) return sex !== null
    return level !== null
  }

  function handleNext() {
    if (!canAdvance()) return
    if (step < 4) {
      setStep((s) => (s + 1) as Step)
      return
    }
    setWeight(Number(weight))
    setHeight(Number(height))
    setDateOfBirth(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    if (sex) setSex(sex)
    if (level) setActivityLevel(level)
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
          {/* Header + title */}
          <View style={{ paddingTop: spacing.lg, marginBottom: spacing.xl }}>
            <Text style={{
              color: colors.primary, fontSize: fontSize.label, fontWeight: '600',
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: spacing.sm,
            }}>
              About You
            </Text>
            <Text style={{ color: colors.text, fontSize: titleSize, fontWeight: '700', lineHeight: titleSize * 1.25 }}>
              {STEP_QUESTIONS[step]}
            </Text>
          </View>

          {/* Fields */}
          {step === 0 && (
            <NumberField value={weight} onChange={setWeightVal} suffix="kg" autoFocus
              onSubmit={canAdvance() ? handleNext : undefined} />
          )}

          {step === 1 && (
            <NumberField value={height} onChange={setHeightVal} suffix="cm" autoFocus
              onSubmit={canAdvance() ? handleNext : undefined} />
          )}

          {step === 2 && (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <DOBField
                value={day}
                onChange={(v) => {
                  setDay(v)
                  // advance once both digits are in
                  if (v.length === 2) monthRef.current?.focus()
                }}
                placeholder="DD" maxLength={2} autoFocus
              />
              <DOBField
                ref={monthRef}
                value={month}
                onChange={(v) => {
                  setMonth(v)
                  if (v.length === 2) yearRef.current?.focus()
                }}
                placeholder="MM" maxLength={2}
              />
              <DOBField
                ref={yearRef}
                value={year}
                onChange={setYear}
                placeholder="YYYY" maxLength={4} flex={2}
              />
            </View>
          )}

          {step === 3 && (
            <View style={{ gap: spacing.sm }}>
              {SEX_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => setSexVal(opt.id)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                >
                  {/* All visual + layout styles on View — fixes new-arch Pressable style-fn bug */}
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
          )}

          {step === 4 && (
            <View style={{ gap: spacing.sm }}>
              {ACTIVITY_LEVELS.map((lvl) => (
                <Pressable
                  key={lvl}
                  onPress={() => setLevel(lvl)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                >
                  {/* All visual + layout styles on View — fixes new-arch Pressable style-fn bug */}
                  <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: level === lvl ? `${colors.primary}15` : colors.surface,
                    borderRadius: radius.lg, borderWidth: 1.5,
                    borderColor: level === lvl ? colors.primary : colors.border,
                    padding: spacing.md, gap: spacing.md,
                  }}>
                    <View style={{
                      width: 22, height: 22, borderRadius: 11, borderWidth: 2,
                      borderColor: level === lvl ? colors.primary : colors.border,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {level === lvl && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />}
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
          )}

        </ScrollView>

        {/* Fixed footer — sits above keyboard, never scrolls away */}
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md }}>
          <Button
            label={step < 4 ? 'Next' : 'Continue'}
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
                    backgroundColor: i <= currentGlobalStep ? colors.primary : colors.surface2,
                  }}
                />
              ))}
            </View>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, textAlign: 'center' }}>
              Step {currentGlobalStep + 1} of {TOTAL_STEPS}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function NumberField({
  value, onChange, suffix, autoFocus, onSubmit,
}: {
  value: string; onChange: (v: string) => void
  suffix: string; autoFocus?: boolean; onSubmit?: () => void
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.surface2, borderRadius: radius.md,
      borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: spacing.md, minHeight: 64,
    }}>
      <TextInput
        value={value} onChangeText={onChange}
        keyboardType="numeric" autoFocus={autoFocus}
        returnKeyType="done" onSubmitEditing={onSubmit}
        style={{ flex: 1, color: colors.text, fontSize: 32, fontWeight: '600' }}
        placeholderTextColor={colors.textMuted} selectionColor={colors.primary}
      />
      <Text style={{ color: colors.textMuted, fontSize: fontSize.sectionHeader, fontWeight: '500' }}>{suffix}</Text>
    </View>
  )
}

const DOBField = forwardRef<TextInput, {
  value: string; onChange: (v: string) => void
  placeholder: string; maxLength: number; autoFocus?: boolean; flex?: number
}>(function DOBField({ value, onChange, placeholder, maxLength, autoFocus, flex = 1 }, ref) {
  return (
    <View style={{
      flex, backgroundColor: colors.surface2, borderRadius: radius.md,
      borderWidth: 1, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center', minHeight: 64,
    }}>
      <TextInput
        ref={ref} value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, ''))}
        keyboardType="number-pad" maxLength={maxLength} autoFocus={autoFocus}
        placeholder={placeholder} placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        style={{ color: colors.text, fontSize: 24, fontWeight: '600', textAlign: 'center', width: '100%', paddingVertical: spacing.sm }}
      />
    </View>
  )
})

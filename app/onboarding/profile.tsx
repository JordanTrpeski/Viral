import { useRef, useState } from 'react'
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { Button } from '@core/components'
import { useOnboardingStore } from '@core/store/onboardingStore'

type Step = 0 | 1 | 2

const STEPS: { label: string; hint: string }[] = [
  { label: 'How much do you weigh?', hint: 'Weight in kg' },
  { label: 'How tall are you?',      hint: 'Height in cm' },
  { label: 'When were you born?',    hint: '' },
]

export default function ProfileScreen() {
  const router = useRouter()
  const { setWeight, setHeight, setDateOfBirth } = useOnboardingStore()
  const [step, setStep] = useState<Step>(0)

  const [weight, setWeightVal] = useState('')
  const [height, setHeightVal] = useState('')
  const [day,    setDay]    = useState('')
  const [month,  setMonth]  = useState('')
  const [year,   setYear]   = useState('')

  const monthRef = useRef<TextInput>(null)
  const yearRef  = useRef<TextInput>(null)

  function canAdvance(): boolean {
    if (step === 0) return Number(weight) > 0
    if (step === 1) return Number(height) > 0
    return day.length === 2 && month.length === 2 && year.length === 4
  }

  function handleNext() {
    if (step < 2) {
      setStep((s) => (s + 1) as Step)
      return
    }
    // commit all three fields
    setWeight(Number(weight))
    setHeight(Number(height))
    const dob = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    setDateOfBirth(dob)
    router.push('/onboarding/goals')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Progress dots */}
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.xs,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
          }}
        >
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={{
                height: 3,
                flex: 1,
                borderRadius: radius.full,
                backgroundColor: i <= step ? colors.primary : colors.surface2,
              }}
            />
          ))}
        </View>

        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg }}>
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
            About You
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: 32,
              fontWeight: '700',
              lineHeight: 40,
              marginBottom: spacing.xl,
            }}
          >
            {STEPS[step].label}
          </Text>

          {step === 0 && (
            <NumberField
              value={weight}
              onChange={setWeightVal}
              suffix="kg"
              autoFocus
              onSubmit={canAdvance() ? handleNext : undefined}
            />
          )}

          {step === 1 && (
            <NumberField
              value={height}
              onChange={setHeightVal}
              suffix="cm"
              autoFocus
              onSubmit={canAdvance() ? handleNext : undefined}
            />
          )}

          {step === 2 && (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <DOBField
                value={day}
                onChange={(v) => {
                  setDay(v)
                  if (v.length === 2) monthRef.current?.focus()
                }}
                placeholder="DD"
                maxLength={2}
                autoFocus
              />
              <DOBField
                ref={monthRef}
                value={month}
                onChange={(v) => {
                  setMonth(v)
                  if (v.length === 2) yearRef.current?.focus()
                }}
                placeholder="MM"
                maxLength={2}
              />
              <DOBField
                ref={yearRef}
                value={year}
                onChange={setYear}
                placeholder="YYYY"
                maxLength={4}
                flex={2}
              />
            </View>
          )}

          <View style={{ marginTop: spacing.xl }}>
            <Button
              label={step < 2 ? 'Next' : 'Continue'}
              onPress={handleNext}
              disabled={!canAdvance()}
              fullWidth
            />
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, textAlign: 'center' }}>
            Step 2 of 6
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function NumberField({
  value,
  onChange,
  suffix,
  autoFocus,
  onSubmit,
}: {
  value: string
  onChange: (v: string) => void
  suffix: string
  autoFocus?: boolean
  onSubmit?: () => void
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface2,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.md,
        minHeight: 64,
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        autoFocus={autoFocus}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        style={{ flex: 1, color: colors.text, fontSize: 32, fontWeight: '600' }}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
      />
      <Text style={{ color: colors.textMuted, fontSize: fontSize.sectionHeader, fontWeight: '500' }}>
        {suffix}
      </Text>
    </View>
  )
}

const DOBField = ({
  ref,
  value,
  onChange,
  placeholder,
  maxLength,
  autoFocus,
  flex = 1,
}: {
  ref?: React.RefObject<TextInput | null>
  value: string
  onChange: (v: string) => void
  placeholder: string
  maxLength: number
  autoFocus?: boolean
  flex?: number
}) => (
  <View
    style={{
      flex,
      backgroundColor: colors.surface2,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 64,
    }}
  >
    <TextInput
      ref={ref}
      value={value}
      onChangeText={(v) => onChange(v.replace(/\D/g, ''))}
      keyboardType="number-pad"
      maxLength={maxLength}
      autoFocus={autoFocus}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      selectionColor={colors.primary}
      style={{
        color: colors.text,
        fontSize: 24,
        fontWeight: '600',
        textAlign: 'center',
        width: '100%',
        paddingVertical: spacing.sm,
      }}
    />
  </View>
)

import { useRef, useState, forwardRef } from 'react'
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { Button } from '@core/components'
import { useOnboardingStore } from '@core/store/onboardingStore'

const TOTAL_STEPS = 7
const CURRENT_STEP = 1  // 0-indexed → step 2 of 6

export default function PhysicalStatsScreen() {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const { weightKg, heightCm, dateOfBirth, setWeight, setHeight, setDateOfBirth } = useOnboardingStore()
  const titleSize = width < 360 ? 26 : width < 390 ? 29 : 32

  // Local string state for text inputs
  const [weightStr, setWeightStr] = useState(weightKg > 0 ? String(weightKg) : '')
  const [heightStr, setHeightStr] = useState(heightCm > 0 ? String(heightCm) : '')
  const [day,   setDay]   = useState(dateOfBirth ? dateOfBirth.split('-')[2] ?? '' : '')
  const [month, setMonth] = useState(dateOfBirth ? dateOfBirth.split('-')[1] ?? '' : '')
  const [year,  setYear]  = useState(dateOfBirth ? dateOfBirth.split('-')[0] ?? '' : '')

  const heightRef = useRef<TextInput>(null)
  const monthRef  = useRef<TextInput>(null)
  const yearRef   = useRef<TextInput>(null)

  function canAdvance(): boolean {
    const w = Number(weightStr)
    const h = Number(heightStr)
    const d = parseInt(day, 10)
    const m = parseInt(month, 10)
    const y = parseInt(year, 10)
    return (
      w > 0 && h > 0 &&
      d >= 1 && d <= 31 &&
      m >= 1 && m <= 12 &&
      y >= 1900 && y <= new Date().getFullYear()
    )
  }

  function handleNext() {
    if (!canAdvance()) return
    setWeight(Number(weightStr))
    setHeight(Number(heightStr))
    setDateOfBirth(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    router.push('/onboarding/lifestyle')
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
              Your Stats
            </Text>
            <Text style={{ color: colors.text, fontSize: titleSize, fontWeight: '700', lineHeight: titleSize * 1.25 }}>
              Tell us about{'\n'}your body
            </Text>
          </View>

          {/* Weight */}
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontWeight: '600', marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Weight
          </Text>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: colors.surface2, borderRadius: radius.md,
            borderWidth: 1, borderColor: colors.border,
            paddingHorizontal: spacing.md, minHeight: 56, marginBottom: spacing.md,
          }}>
            <TextInput
              value={weightStr}
              onChangeText={setWeightStr}
              keyboardType="numeric"
              autoFocus
              returnKeyType="next"
              onSubmitEditing={() => heightRef.current?.focus()}
              style={{ flex: 1, color: colors.text, fontSize: 28, fontWeight: '600' }}
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.primary}
              placeholder="0"
            />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sectionHeader, fontWeight: '500' }}>kg</Text>
          </View>

          {/* Height */}
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontWeight: '600', marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Height
          </Text>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: colors.surface2, borderRadius: radius.md,
            borderWidth: 1, borderColor: colors.border,
            paddingHorizontal: spacing.md, minHeight: 56, marginBottom: spacing.md,
          }}>
            <TextInput
              ref={heightRef}
              value={heightStr}
              onChangeText={setHeightStr}
              keyboardType="numeric"
              returnKeyType="next"
              onSubmitEditing={() => monthRef.current?.focus()}
              style={{ flex: 1, color: colors.text, fontSize: 28, fontWeight: '600' }}
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.primary}
              placeholder="0"
            />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sectionHeader, fontWeight: '500' }}>cm</Text>
          </View>

          {/* Date of Birth */}
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontWeight: '600', marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Date of Birth
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
            <DOBField
              value={day}
              onChange={(v) => { setDay(v); if (v.length === 2) monthRef.current?.focus() }}
              placeholder="DD"
              maxLength={2}
            />
            <DOBField
              ref={monthRef}
              value={month}
              onChange={(v) => { setMonth(v); if (v.length === 2) yearRef.current?.focus() }}
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DOBField = forwardRef<TextInput, {
  value: string; onChange: (v: string) => void
  placeholder: string; maxLength: number; flex?: number
}>(function DOBField({ value, onChange, placeholder, maxLength, flex = 1 }, ref) {
  return (
    <View style={{
      flex, backgroundColor: colors.surface2, borderRadius: radius.md,
      borderWidth: 1, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center', minHeight: 56,
    }}>
      <TextInput
        ref={ref} value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, ''))}
        keyboardType="number-pad" maxLength={maxLength}
        placeholder={placeholder} placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        style={{ color: colors.text, fontSize: 22, fontWeight: '600', textAlign: 'center', width: '100%', paddingVertical: spacing.sm }}
      />
    </View>
  )
})

import { useState } from 'react'
import { View, Text, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { Button } from '@core/components'
import { Input } from '@core/components'
import { useOnboardingStore } from '@core/store/onboardingStore'

const TOTAL_STEPS = 10

export default function WelcomeScreen() {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const setName = useOnboardingStore((s) => s.setName)
  const [value, setValue] = useState('')

  const canContinue = value.trim().length >= 2
  const titleSize = width < 360 ? 26 : width < 390 ? 29 : 32

  function handleContinue() {
    setName(value.trim())
    router.push('/onboarding/profile')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>

          {/* Title floats in the center of the remaining space */}
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={{
              color: colors.primary,
              fontSize: fontSize.label,
              fontWeight: '600',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: spacing.sm,
            }}>
              Welcome
            </Text>
            <Text style={{ color: colors.text, fontSize: titleSize, fontWeight: '700', lineHeight: titleSize * 1.25 }}>
              What's your{'\n'}name?
            </Text>
          </View>

          {/* Input + button always above keyboard */}
          <Input
            value={value}
            onChangeText={setValue}
            placeholder="Your name"
            autoFocus
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={canContinue ? handleContinue : undefined}
            containerStyle={{ marginBottom: spacing.md }}
          />

          <Button
            label="Continue"
            onPress={handleContinue}
            disabled={!canContinue}
            fullWidth
          />

          {/* Progress */}
          <View style={{ paddingTop: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1, height: 3, borderRadius: radius.full,
                    backgroundColor: i === 0 ? colors.primary : colors.surface2,
                  }}
                />
              ))}
            </View>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, textAlign: 'center' }}>
              Step 1 of {TOTAL_STEPS}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

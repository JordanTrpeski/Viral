import { useState } from 'react'
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { colors, fontSize, spacing } from '@core/theme'
import { Button } from '@core/components'
import { Input } from '@core/components'
import { useOnboardingStore } from '@core/store/onboardingStore'

export default function WelcomeScreen() {
  const router = useRouter()
  const setName = useOnboardingStore((s) => s.setName)
  const [value, setValue] = useState('')

  const canContinue = value.trim().length >= 2

  function handleContinue() {
    setName(value.trim())
    router.push('/onboarding/profile')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg }}>

          <View style={{ marginBottom: spacing.xxl }}>
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
              Welcome
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 32,
                fontWeight: '700',
                lineHeight: 40,
              }}
            >
              What's your{'\n'}name?
            </Text>
          </View>

          <Input
            value={value}
            onChangeText={setValue}
            placeholder="Your name"
            autoFocus
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={canContinue ? handleContinue : undefined}
            containerStyle={{ marginBottom: spacing.lg }}
          />

          <Button
            label="Continue"
            onPress={handleContinue}
            disabled={!canContinue}
            fullWidth
          />
        </View>

        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, textAlign: 'center' }}>
            Step 1 of 6
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

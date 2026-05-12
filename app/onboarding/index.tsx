import { View, Text, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { colors, fontSize, spacing, radius, fonts } from '@core/theme'
import { Button } from '@core/components'
import { Input } from '@core/components'
import { useOnboardingStore } from '@core/store/onboardingStore'

const TOTAL_STEPS = 6

export default function WelcomeScreen() {
  const router = useRouter()
  const { width } = useWindowDimensions()
  // Bind directly to the store so text persists through any re-render
  const name = useOnboardingStore((s) => s.name)
  const setName = useOnboardingStore((s) => s.setName)

  const canContinue = name.trim().length >= 2
  const titleSize = width < 360 ? 26 : width < 390 ? 29 : 32

  function handleContinue() {
    if (!canContinue) return
    router.push('/onboarding/profile')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/*
        behavior="padding" on both platforms:
        adds paddingBottom = keyboard height so children shift up
        without the view shrinking — button stays visible on every re-render
      */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
      >
        {/* Title area — fills all space not taken by footer */}
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg }}>
          <Text style={{
            color: colors.primary,
            fontSize: fontSize.label,
            fontWeight: '600',
            fontFamily: `${fonts.ui}_600SemiBold`,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            marginBottom: spacing.sm,
          }}>
            Welcome
          </Text>
          <Text style={{
            color: colors.text,
            fontSize: titleSize,
            fontWeight: '700',
            fontFamily: `${fonts.ui}_700Bold`,
            lineHeight: titleSize * 1.25,
          }}>
            What's your{'\n'}name?
          </Text>
        </View>

        {/* Footer — anchored at bottom, rises above keyboard */}
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md }}>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoFocus
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={canContinue ? handleContinue : undefined}
          />

          <Button
            label="Continue"
            onPress={handleContinue}
            fullWidth
          />

          {/* Progress */}
          <View style={{ gap: spacing.xs }}>
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
            <Text style={{
              color: colors.textMuted,
              fontSize: fontSize.label,
              textAlign: 'center',
              fontFamily: `${fonts.ui}_400Regular`,
            }}>
              Step 1 of {TOTAL_STEPS}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

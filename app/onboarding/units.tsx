import { View, Text, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { Button } from '@core/components'
import { useOnboardingStore, type Units } from '@core/store/onboardingStore'

const OPTIONS: { id: Units; label: string; sublabel: string; icon: string }[] = [
  { id: 'metric',   label: 'Metric',   sublabel: 'Kilograms · Centimetres', icon: '🌍' },
  { id: 'imperial', label: 'Imperial', sublabel: 'Pounds · Feet & Inches',  icon: '🇺🇸' },
]

export default function UnitsScreen() {
  const router = useRouter()
  const { units, setUnits } = useOnboardingStore()

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
            Preferences
          </Text>
          <Text style={{ color: colors.text, fontSize: 32, fontWeight: '700', lineHeight: 40 }}>
            Which units{'\n'}do you prefer?
          </Text>
        </View>

        <View style={{ gap: spacing.md }}>
          {OPTIONS.map((opt) => {
            const selected = units === opt.id
            return (
              <Pressable
                key={opt.id}
                onPress={() => setUnits(opt.id)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: selected ? colors.surface2 : colors.surface,
                  borderRadius: radius.lg,
                  borderWidth: 1.5,
                  borderColor: selected ? colors.primary : colors.border,
                  padding: spacing.lg,
                  gap: spacing.md,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ fontSize: 32 }}>{opt.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600' }}>
                    {opt.label}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.body, marginTop: 2 }}>
                    {opt.sublabel}
                  </Text>
                </View>
                {selected && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </Pressable>
            )
          })}
        </View>

        <View style={{ position: 'absolute', bottom: spacing.lg, left: spacing.lg, right: spacing.lg, gap: spacing.sm }}>
          <Button
            label="Continue"
            onPress={() => router.push('/onboarding/calories')}
            fullWidth
          />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, textAlign: 'center' }}>
            Step 4 of 6
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

import { View, Text, Pressable, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { colors, fontSize, spacing, radius, fonts } from '@core/theme'
import { useOnboardingStore, type Units } from '@core/store/onboardingStore'

const TOTAL_STEPS = 7
const CURRENT_STEP = 5  // 0-indexed → step 6 of 7

const OPTIONS: {
  id: Units
  label: string
  sublabel: string
  examples: string[]
}[] = [
  {
    id: 'metric',
    label: 'Metric',
    sublabel: 'International standard',
    examples: ['kg', 'cm', 'km', 'L'],
  },
  {
    id: 'imperial',
    label: 'Imperial',
    sublabel: 'US & UK customary',
    examples: ['lbs', 'ft', 'mi', 'fl oz'],
  },
]

export default function UnitsScreen() {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const { units, setUnits } = useOnboardingStore()
  const titleSize = width < 360 ? 26 : width < 390 ? 29 : 32

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>

        {/* Title */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{
            color: colors.primary,
            fontSize: fontSize.label,
            fontWeight: '600',
            fontFamily: `${fonts.ui}_600SemiBold`,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            marginBottom: spacing.sm,
          }}>
            Preferences
          </Text>
          <Text style={{
            color: colors.text,
            fontSize: titleSize,
            fontWeight: '700',
            fontFamily: `${fonts.ui}_700Bold`,
            lineHeight: titleSize * 1.2,
            marginBottom: spacing.xs,
          }}>
            Which units{'\n'}do you prefer?
          </Text>
          <Text style={{
            color: colors.textMuted,
            fontSize: fontSize.body,
            fontFamily: `${fonts.ui}_400Regular`,
          }}>
            Used across all health and body metrics.
          </Text>
        </View>

        {/* Pill toggles */}
        <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
          {/* Pill row */}
          <View style={{
            flexDirection: 'row',
            gap: spacing.sm,
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.xs,
          }}>
            {OPTIONS.map((opt) => {
              const selected = units === opt.id
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setUnits(opt.id)}
                  style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.85 : 1 })}
                >
                  {/* All visual + layout styles on View — fixes new-arch Pressable style-fn bug */}
                  <View style={{
                    paddingVertical: spacing.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: radius.sm,
                    backgroundColor: selected ? colors.primary : colors.surface2,
                    borderWidth: 1,
                    borderColor: selected ? colors.borderHero : colors.border,
                    gap: spacing.xs,
                  }}>
                    <Text style={{
                      color: selected ? '#fff' : colors.text,
                      fontSize: fontSize.cardTitle,
                      fontWeight: '700',
                      fontFamily: `${fonts.ui}_700Bold`,
                      letterSpacing: 0.5,
                    }}>
                      {opt.label}
                    </Text>
                    <Text style={{
                      color: selected ? 'rgba(255,255,255,0.75)' : colors.textMuted,
                      fontSize: fontSize.micro,
                      fontFamily: `${fonts.ui}_400Regular`,
                    }}>
                      {opt.sublabel}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </View>

          {/* Unit examples card */}
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.md,
          }}>
            <Text style={{
              color: colors.textMuted,
              fontSize: fontSize.micro,
              fontFamily: `${fonts.ui}_600SemiBold`,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: spacing.sm,
            }}>
              You'll see
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              {OPTIONS.find(o => o.id === units)!.examples.map((ex) => (
                <View
                  key={ex}
                  style={{
                    backgroundColor: `${colors.primary}18`,
                    borderWidth: 1,
                    borderColor: `${colors.primary}44`,
                    borderRadius: radius.sm,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{
                    color: colors.primary,
                    fontSize: fontSize.label,
                    fontWeight: '600',
                    fontFamily: `${fonts.mono}_700Bold`,
                  }}>
                    {ex}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Button + progress */}
        <View style={{ paddingBottom: spacing.md, gap: spacing.md }}>
          <Pressable
            onPress={() => router.push('/onboarding/complete')}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            {/* All visual + layout styles on View — fixes new-arch Pressable style-fn bug */}
            <View style={{
              backgroundColor: colors.primary,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.borderHero,
              paddingVertical: spacing.md,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 52,
            }}>
              <Text style={{
                color: colors.bg,
                fontSize: 14,
                fontWeight: '600',
                fontFamily: `${fonts.ui}_600SemiBold`,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}>
                Continue
              </Text>
            </View>
          </Pressable>

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
            <Text style={{
              color: colors.textMuted,
              fontSize: fontSize.label,
              textAlign: 'center',
              fontFamily: `${fonts.ui}_400Regular`,
            }}>
              Step {CURRENT_STEP + 1} of {TOTAL_STEPS}
            </Text>
          </View>
        </View>

      </View>
    </SafeAreaView>
  )
}

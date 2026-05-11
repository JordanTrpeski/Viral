import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius, fonts } from '@core/theme'
import { useBodyWeightStore } from '@modules/health/shared/bodyWeightStore'
import { useStepsStore } from '@modules/health/steps/stepsStore'
import { useUserStore } from '@core/store/userStore'
import { formatWeight, localDateStr } from '@core/utils/units'
import { formatSteps, defaultGoal } from '@modules/health/steps/stepsUtils'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

interface HubCard {
  title: string
  subtitle: string
  icon: IoniconsName
  color: string
  route: string
  valueLabel?: string
  available: boolean
}

export default function HealthScreen() {
  const router  = useRouter()
  const { units, profile } = useUserStore()
  const { todayEntry, streak } = useBodyWeightStore()
  const { todayEntry: stepsEntry } = useStepsStore()

  const today = localDateStr()
  const dob = profile?.dateOfBirth ?? '1990-01-01'
  const stepCount = stepsEntry?.stepCount ?? 0
  const stepGoal = stepsEntry?.goal ?? defaultGoal(dob)

  const cards: HubCard[] = [
    {
      title: 'Body Weight',
      subtitle: todayEntry
        ? `${formatWeight(todayEntry.weightKg, units)} · ${streak > 0 ? `${streak}d streak 🔥` : 'logged today'}`
        : 'Log today\'s weight',
      icon: 'scale-outline',
      color: colors.primary,
      route: '/health/body-weight',
      available: true,
    },
    {
      title: 'Workout',
      subtitle: 'Track training sessions',
      icon: 'barbell-outline',
      color: colors.workout,
      route: '/health/workout',
      available: true,
    },
    {
      title: 'Diet',
      subtitle: 'Log meals & calories',
      icon: 'nutrition-outline',
      color: colors.diet,
      route: '/health/diet',
      available: true,
    },
    {
      title: 'Steps',
      subtitle: stepCount > 0
        ? `${formatSteps(stepCount)} / ${formatSteps(stepGoal)} steps`
        : 'Track daily steps',
      icon: 'footsteps-outline',
      color: colors.steps,
      route: '/health/steps',
      available: true,
    },
    {
      title: 'Water',
      subtitle: 'Daily intake tracking',
      icon: 'water-outline',
      color: colors.water,
      route: '/health/water',
      available: true,
    },
  ]

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: fontSize.screenTitle, fontWeight: '700', fontFamily: `${fonts.ui}_700Bold` }}>
          Health
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}>
        {cards.map((card) => (
          <Pressable
            key={card.title}
            onPress={() => card.available && router.push(card.route as never)}
            disabled={!card.available}
            style={({ pressed }) => ({
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed && card.available ? 0.85 : card.available ? 1 : 0.5,
            })}
          >
            {/* Row layout lives on a View, not Pressable — fixes new-arch flexDirection bug */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.md,
            }}>
              {/* Icon */}
              <View style={{
                width: 44,
                height: 44,
                borderRadius: radius.md,
                backgroundColor: `${card.color}22`,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.md,
              }}>
                <Ionicons name={card.icon} size={22} color={card.color} />
              </View>

              {/* Title + Subtitle stacked in middle column */}
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', fontFamily: `${fonts.ui}_600SemiBold` }}>
                  {card.title}
                </Text>
                {card.subtitle ? (
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginTop: 2 }} numberOfLines={1}>
                    {card.subtitle}
                  </Text>
                ) : null}
              </View>

              {/* Action indicator */}
              {card.available ? (
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              ) : (
                <View style={{ backgroundColor: colors.surface2, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 }}>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600' }}>SOON</Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

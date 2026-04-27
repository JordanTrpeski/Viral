import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useBodyWeightStore } from '@modules/health/shared/bodyWeightStore'
import { useUserStore } from '@core/store/userStore'
import { formatWeight } from '@core/utils/units'

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
  const { units } = useUserStore()
  const { todayEntry, streak } = useBodyWeightStore()

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
      title: 'Water',
      subtitle: 'Daily intake tracking',
      icon: 'water-outline',
      color: colors.water,
      route: '/health/water',
      available: false,
    },
  ]

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: fontSize.screenTitle, fontWeight: '700' }}>
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
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.md,
              gap: spacing.md,
              opacity: pressed && card.available ? 0.85 : card.available ? 1 : 0.5,
            })}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: radius.md,
                backgroundColor: `${card.color}22`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={card.icon} size={24} color={card.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' }}>
                {card.title}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.body, marginTop: 2 }}>
                {card.subtitle}
              </Text>
            </View>
            {card.available ? (
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            ) : (
              <View style={{ backgroundColor: colors.surface2, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600' }}>SOON</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

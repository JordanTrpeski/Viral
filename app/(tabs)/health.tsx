import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius, fonts } from '@core/theme'

// ─── Hub card definition ──────────────────────────────────────────────────────

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

interface HubCard {
  title: string
  subtitle: string
  icon: IoniconsName
  color: string
  route: string
}

const CARDS: HubCard[] = [
  {
    title: 'Workout',
    subtitle: 'Log sessions, track PRs, build programs',
    icon: 'barbell-outline',
    color: colors.workout,
    route: '/health/workout',
  },
  {
    title: 'Nutrition',
    subtitle: 'Log meals, track macros and calories',
    icon: 'nutrition-outline',
    color: colors.diet,
    route: '/health/nutrition',
  },
  {
    title: 'Steps',
    subtitle: 'Daily step count and distance',
    icon: 'footsteps-outline',
    color: colors.steps,
    route: '/health/steps',
  },
  {
    title: 'Water',
    subtitle: 'Daily hydration tracking',
    icon: 'water-outline',
    color: colors.water,
    route: '/health/water',
  },
]

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HealthScreen() {
  const router = useRouter()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
      }}>
        <Text style={{
          color: colors.text,
          fontSize: fontSize.screenTitle,
          fontWeight: '700',
          fontFamily: `${fonts.ui}_700Bold`,
        }}>
          Health
        </Text>
        <Text style={{
          color: colors.textMuted,
          fontSize: fontSize.body,
          marginTop: 4,
          fontFamily: `${fonts.ui}_400Regular`,
        }}>
          Track what matters
        </Text>
      </View>

      {/* Cards */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
      >
        {CARDS.map((card) => (
          <Pressable
            key={card.title}
            onPress={() => router.push(card.route as never)}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            {/* View wrapper — fixes new-arch Pressable style-fn bug */}
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.md,
            }}>
              {/* Icon */}
              <View style={{
                width: 48,
                height: 48,
                borderRadius: radius.md,
                backgroundColor: `${card.color}22`,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.md,
              }}>
                <Ionicons name={card.icon} size={24} color={card.color} />
              </View>

              {/* Text */}
              <View style={{ flex: 1 }}>
                <Text style={{
                  color: colors.text,
                  fontSize: fontSize.cardTitle,
                  fontWeight: '600',
                  fontFamily: `${fonts.ui}_600SemiBold`,
                }}>
                  {card.title}
                </Text>
                <Text style={{
                  color: colors.textMuted,
                  fontSize: fontSize.label,
                  marginTop: 2,
                  fontFamily: `${fonts.ui}_400Regular`,
                }} numberOfLines={1}>
                  {card.subtitle}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

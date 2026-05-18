import { useCallback, useState, useMemo } from 'react'
import { View, Text, FlatList, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius, fonts } from '@core/theme'
import { getAllPRsV2, type PRRowV2 } from '@core/db/workoutQueriesV2'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PRCard({ pr }: { pr: PRRowV2 }) {
  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, gap: spacing.sm, marginBottom: spacing.sm,
      borderLeftWidth: 3, borderLeftColor: colors.primary,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{
          width: 36, height: 36, borderRadius: radius.md,
          backgroundColor: `${colors.primary}18`,
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Ionicons name="trophy-outline" size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{
            color: colors.text, fontSize: fontSize.cardTitle,
            fontWeight: '700', fontFamily: `${fonts.ui}_700Bold`,
          }}>
            {pr.exerciseName}
          </Text>
          <Text style={{
            color: colors.textMuted, fontSize: fontSize.micro,
            fontFamily: `${fonts.ui}_400Regular`,
          }}>
            {fmtDate(pr.date)}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
        <Text style={{
          color: colors.primary, fontSize: 22,
          fontWeight: '700', fontFamily: `${fonts.mono}_700Bold`,
        }}>
          {pr.weightKg} kg
        </Text>
        <Text style={{
          color: colors.textMuted, fontSize: fontSize.body,
          fontFamily: `${fonts.mono}_500Medium`,
        }}>
          × {pr.reps}
        </Text>
      </View>

      <View style={{
        backgroundColor: `${colors.primary}12`,
        borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4,
        alignSelf: 'flex-start',
      }}>
        <Text style={{
          color: colors.primary, fontSize: fontSize.micro,
          fontFamily: `${fonts.ui}_600SemiBold`,
        }}>
          Est. 1RM: {pr.estimatedOneRM} kg
        </Text>
      </View>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PRScreen() {
  const router = useRouter()
  const [prs, setPRs] = useState<PRRowV2[]>([])

  useFocusEffect(
    useCallback(() => {
      setPRs(getAllPRsV2())
    }, []),
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm,
      }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.xs }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{
          flex: 1, color: colors.text, fontSize: fontSize.sectionHeader,
          fontWeight: '700', fontFamily: `${fonts.ui}_700Bold`,
        }}>
          Personal Records
        </Text>
        <Text style={{
          color: colors.textMuted, fontSize: fontSize.label,
          fontFamily: `${fonts.ui}_400Regular`,
        }}>
          {prs.length}
        </Text>
      </View>

      {prs.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
          <Ionicons name="trophy-outline" size={48} color={colors.textMuted} />
          <Text style={{
            color: colors.textMuted, fontSize: fontSize.body,
            fontFamily: `${fonts.ui}_400Regular`, textAlign: 'center',
          }}>
            No PRs yet.{'\n'}Finish a workout to start tracking.
          </Text>
        </View>
      ) : (
        <FlatList
          data={prs}
          keyExtractor={(p) => p.exerciseId}
          contentContainerStyle={{ padding: spacing.md }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <PRCard pr={item} />}
        />
      )}
    </SafeAreaView>
  )
}

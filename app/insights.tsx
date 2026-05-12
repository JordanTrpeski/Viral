import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, radius, spacing } from '@core/theme'
import { Button, Card } from '@core/components'
import { getWeeklyInsights, type WeeklyInsightsResult } from '@core/utils/insightsSummary'

export default function InsightsScreen() {
  const router = useRouter()
  const [result, setResult] = useState<WeeklyInsightsResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function load(force = false) {
    setLoading(true)
    setResult(await getWeeklyInsights(force))
    setLoading(false)
  }

  useFocusEffect(useCallback(() => { void load(false) }, []))

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.sm, marginRight: spacing.sm }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600' }}>Weekly Insights</Text>
          {result ? (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>{result.weekStart} to {result.weekEnd}</Text>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        {loading && (
          <>
            {[0, 1, 2].map((i) => (
              <Card key={i}>
                <View style={{ height: 16, width: `${70 - i * 10}%`, backgroundColor: colors.surface2, borderRadius: radius.sm }} />
                <View style={{ height: 12, width: '100%', backgroundColor: colors.surface2, borderRadius: radius.sm, marginTop: spacing.sm }} />
                <View style={{ height: 12, width: '82%', backgroundColor: colors.surface2, borderRadius: radius.sm, marginTop: spacing.xs }} />
              </Card>
            ))}
            <ActivityIndicator color={colors.primary} />
          </>
        )}

        {!loading && result?.ok && result.insights.map((insight, index) => (
          <Card key={`${index}-${insight}`}>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.bg, fontWeight: '700' }}>{index + 1}</Text>
              </View>
              <Text style={{ color: colors.text, fontSize: fontSize.body, lineHeight: 22, flex: 1 }}>{insight}</Text>
            </View>
          </Card>
        ))}

        {!loading && result && !result.ok && (
          <Card>
            <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' }}>Couldn't generate insights</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body, lineHeight: 22, marginTop: spacing.sm }}>
              {result.message}
            </Text>
          </Card>
        )}

        {!loading && result?.generatedAt ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>
            Last generated {new Date(result.generatedAt).toLocaleString()}
          </Text>
        ) : null}

        <Button label="Regenerate" onPress={() => load(true)} loading={loading} fullWidth />
      </ScrollView>
    </SafeAreaView>
  )
}

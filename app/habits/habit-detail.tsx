import { useCallback } from 'react'
import { View, Text, ScrollView, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, radius, spacing } from '@core/theme'
import { Button, Card } from '@core/components'
import { localDateStr } from '@core/utils/units'
import { useHabitStore } from '@modules/habits/habitStore'
import { calculateCurrentStreak, calculateLongestStreak, completionRate, isHabitScheduledOn } from '@modules/habits/habitUtils'

function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return localDateStr(d)
}

export default function HabitDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { loadHabits, getHabit, getLogsForHabit, getCompletionCount, archiveHabit } = useHabitStore()
  const habit = id ? getHabit(id) : null
  const logs = id ? getLogsForHabit(id, 100) : []
  const completed = new Set(logs.map((l) => l.date))
  const today = localDateStr()
  const monthStart = `${today.slice(0, 8)}01`

  useFocusEffect(useCallback(() => { loadHabits() }, []))

  if (!habit) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.lg }}>
        <Text style={{ color: colors.text }}>Habit not found.</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.sm, marginRight: spacing.sm }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', flex: 1 }}>{habit.icon} {habit.name}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {[
            ['Current', calculateCurrentStreak(habit, logs, today)],
            ['Longest', calculateLongestStreak(habit, logs)],
            ['This month', `${completionRate(habit, logs, monthStart, today)}%`],
            ['Total', getCompletionCount(habit.id)],
          ].map(([label, value]) => (
            <Card key={label} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>{value}</Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, textAlign: 'center' }}>{label}</Text>
            </Card>
          ))}
        </View>

        <Card>
          <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', marginBottom: spacing.md }}>Last 3 months</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {Array.from({ length: 91 }, (_, i) => daysAgo(90 - i)).map((date) => {
              const scheduled = isHabitScheduledOn(habit, date)
              const done = completed.has(date)
              return (
                <View
                  key={date}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    backgroundColor: !scheduled ? colors.surface2 : done ? colors.success : colors.bg,
                    borderWidth: 1,
                    borderColor: !scheduled ? colors.border : done ? colors.success : colors.borderAccent,
                  }}
                />
              )
            })}
          </View>
        </Card>

        <Button
          label="Archive Habit"
          variant="danger"
          onPress={() => {
            Alert.alert('Archive habit?', 'This removes it from active tracking but keeps its history.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Archive', style: 'destructive', onPress: async () => { await archiveHabit(habit.id); router.replace('/(tabs)/habits' as never) } },
            ])
          }}
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  )
}

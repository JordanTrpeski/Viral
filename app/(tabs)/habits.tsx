import { useCallback } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, fonts, radius, spacing } from '@core/theme'
import { Button, Card } from '@core/components'
import { localDateStr } from '@core/utils/units'
import { useHabitStore } from '@modules/habits/habitStore'
import { calculateCurrentStreak, isHabitScheduledOn } from '@modules/habits/habitUtils'

export default function HabitsTabScreen() {
  const router = useRouter()
  const { habits, logs, loadHabits, toggleLog } = useHabitStore()
  const today = localDateStr()
  const completedToday = new Set(logs.filter((l) => l.date === today).map((l) => l.habitId))
  const scheduled = habits.filter((h) => isHabitScheduledOn(h, today))

  useFocusEffect(useCallback(() => { loadHabits() }, []))

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: fontSize.screenTitle, fontWeight: '700', fontFamily: `${fonts.ui}_700Bold` }}>
            Habits
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginTop: 2 }}>
            {completedToday.size} of {scheduled.length} scheduled habits done today
          </Text>
        </View>
        <Button label="Add" onPress={() => router.push('/habits/habit-add' as never)} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}>
        {habits.length === 0 ? (
          <Card>
            <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' }}>No habits yet</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body, lineHeight: 22, marginTop: spacing.xs }}>
              Create your first habit and it will show up here and on the home dashboard.
            </Text>
          </Card>
        ) : habits.map((habit) => {
          const done = completedToday.has(habit.id)
          const scheduledToday = isHabitScheduledOn(habit, today)
          const streak = calculateCurrentStreak(habit, logs, today)
          return (
            <Card key={habit.id} padding={0}>
              <Pressable
                onPress={() => router.push({ pathname: '/habits/habit-detail', params: { id: habit.id } } as never)}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md }}>
                  <Pressable
                    onPress={() => scheduledToday && toggleLog(habit.id, today)}
                    disabled={!scheduledToday}
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : scheduledToday ? 1 : 0.45 })}
                  >
                    <View style={{
                      width: 44, height: 44, borderRadius: 22,
                      backgroundColor: done ? colors.success : colors.surface2,
                      borderWidth: 1, borderColor: done ? colors.success : colors.borderAccent,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 21 }}>{done ? '✓' : habit.icon}</Text>
                    </View>
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' }}>{habit.name}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginTop: 2 }}>
                      {scheduledToday ? (done ? 'Done today' : 'Not done yet') : 'Not scheduled today'} · {streak}d streak
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </Pressable>
            </Card>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

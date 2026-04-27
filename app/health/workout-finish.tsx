import { useEffect } from 'react'
import { View, Text, ScrollView, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay } from 'react-native-reanimated'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { Button } from '@core/components'
import { useWorkoutStore } from '@modules/health/workout/workoutStore'
import { formatDuration, formatVolume } from '@modules/health/workout/workoutUtils'

export default function WorkoutFinishScreen() {
  const router = useRouter()
  const { sessionSummary, saveAsTemplate } = useWorkoutStore()

  if (!sessionSummary) {
    router.replace('/health/workout')
    return null
  }

  const { sessionName, totalExercises, totalSets, totalVolumeKg, durationMinutes, personalBests } = sessionSummary

  function handleSaveTemplate() {
    Alert.prompt(
      'Save as Template',
      'Name this template:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (name) => {
            if (name?.trim()) saveAsTemplate(name.trim())
          },
        },
      ],
      'plain-text',
      sessionName,
    )
  }

  function handleDone() {
    router.replace('/health/workout')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600' }}>
          Workout Complete
        </Text>
        <Pressable onPress={handleSaveTemplate} style={{ padding: spacing.sm }}>
          <Ionicons name="bookmark-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>

        {/* Session name */}
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: '700' }}>{sessionName}</Text>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <StatCard label="Exercises" value={String(totalExercises)} icon="barbell-outline" />
          <StatCard label="Sets" value={String(totalSets)} icon="checkmark-circle-outline" />
          <StatCard label="Volume" value={formatVolume(totalVolumeKg)} icon="stats-chart-outline" />
          <StatCard label="Duration" value={formatDuration(durationMinutes)} icon="time-outline" />
        </View>

        {/* Personal bests */}
        {personalBests.length > 0 && (
          <View>
            <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', marginBottom: spacing.sm }}>
              Personal Bests 🏆
            </Text>
            <View style={{ gap: spacing.sm }}>
              {personalBests.map((pb, i) => (
                <PBRow key={pb.exercise.id} pb={pb} delay={i * 100} />
              ))}
            </View>
          </View>
        )}

        <View style={{ gap: spacing.sm }}>
          <Button label="Save & Exit" onPress={handleDone} fullWidth />
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, alignItems: 'center' }}>
      <Ionicons name={icon as never} size={18} color={colors.primary} style={{ marginBottom: 4 }} />
      <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>{label}</Text>
    </View>
  )
}

function PBRow({ pb, delay }: { pb: { exercise: { name: string }; weightKg: number; reps: number }; delay: number }) {
  const scale = useSharedValue(0.8)
  const opacity = useSharedValue(0)
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }))

  useEffect(() => {
    scale.value   = withDelay(delay, withSpring(1, { damping: 10 }))
    opacity.value = withDelay(delay, withSpring(1))
  }, [])

  return (
    <Animated.View style={[{ backgroundColor: `${colors.warning}18`, borderRadius: radius.lg, borderWidth: 1, borderColor: `${colors.warning}44`, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, style]}>
      <Ionicons name="star" size={18} color={colors.warning} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }}>{pb.exercise.name}</Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>{pb.weightKg} kg × {pb.reps} reps</Text>
      </View>
      <Text style={{ color: colors.warning, fontSize: fontSize.label, fontWeight: '700' }}>NEW PB</Text>
    </Animated.View>
  )
}

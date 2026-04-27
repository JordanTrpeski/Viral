import { useEffect } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { Button } from '@core/components'
import { useWorkoutStore } from '@modules/health/workout/workoutStore'
import MuscleGroupBadge from '@modules/health/workout/components/MuscleGroupBadge'
import type { MuscleGroup } from '@modules/health/shared/types'

export default function WorkoutStartScreen() {
  const router = useRouter()
  const { templates, loadTemplates, startSession, loadTemplate } = useWorkoutStore()

  useEffect(() => { loadTemplates() }, [])

  function handleBlank() {
    startSession()
    router.replace('/health/workout-active')
  }

  function handleLoadTemplate(templateId: string) {
    loadTemplate(templateId)
    router.replace('/health/workout-active')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.sm }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', marginLeft: spacing.xs }}>
          Start Workout
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>

        {/* Load template */}
        {templates.length > 0 && (
          <View>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm }}>
              From Template
            </Text>
            <View style={{ gap: spacing.sm }}>
              {templates.map(({ template, exerciseCount, muscleGroups }) => (
                <Pressable
                  key={template.id}
                  onPress={() => handleLoadTemplate(template.id)}
                  style={({ pressed }) => ({
                    backgroundColor: colors.surface,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: spacing.md,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', marginBottom: 6 }}>
                    {template.name}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.sm }}>
                    {exerciseCount} exercises
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                    {muscleGroups.map((mg) => (
                      <MuscleGroupBadge key={mg} muscleGroup={mg as MuscleGroup} small />
                    ))}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Start blank */}
        <View>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm }}>
            Quick Start
          </Text>
          <Button label="Start Blank Workout" onPress={handleBlank} fullWidth />
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

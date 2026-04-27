import { useEffect } from 'react'
import { View, Text, ScrollView, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useWorkoutStore } from '@modules/health/workout/workoutStore'
import MuscleGroupBadge from '@modules/health/workout/components/MuscleGroupBadge'
import type { MuscleGroup } from '@modules/health/shared/types'
import type { TemplateWithMeta } from '@core/db/templateQueries'

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({ item, onLoad, onRename, onDelete }: {
  item: TemplateWithMeta
  onLoad: () => void
  onRename: () => void
  onDelete: () => void
}) {
  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    }}>
      <Pressable
        onPress={onLoad}
        style={({ pressed }) => ({ padding: spacing.md, opacity: pressed ? 0.85 : 1 })}
      >
        <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', marginBottom: 4 }}>
          {item.template.name}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.sm }}>
          {item.exerciseCount} exercise{item.exerciseCount !== 1 ? 's' : ''}
        </Text>

        {item.muscleGroups.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {item.muscleGroups.map((mg) => (
              <MuscleGroupBadge key={mg} muscleGroup={mg as MuscleGroup} small />
            ))}
          </View>
        )}
      </Pressable>

      {/* Actions */}
      <View style={{
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}>
        <Pressable
          onPress={onLoad}
          style={({ pressed }) => ({
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            paddingVertical: spacing.sm, gap: 4, opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="play-outline" size={14} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: fontSize.label, fontWeight: '600' }}>Start</Text>
        </Pressable>

        <View style={{ width: 1, backgroundColor: colors.border }} />

        <Pressable
          onPress={onRename}
          style={({ pressed }) => ({
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            paddingVertical: spacing.sm, gap: 4, opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Rename</Text>
        </Pressable>

        <View style={{ width: 1, backgroundColor: colors.border }} />

        <Pressable
          onPress={onDelete}
          style={({ pressed }) => ({
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            paddingVertical: spacing.sm, gap: 4, opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="trash-outline" size={14} color={colors.danger} />
          <Text style={{ color: colors.danger, fontSize: fontSize.label }}>Delete</Text>
        </Pressable>
      </View>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function WorkoutTemplatesScreen() {
  const router = useRouter()
  const { templates, loadTemplates, loadTemplate, renameTemplate, deleteTemplate } = useWorkoutStore()

  useEffect(() => { loadTemplates() }, [])

  function handleLoad(templateId: string) {
    loadTemplate(templateId)
    router.replace('/health/workout-active')
  }

  function handleRename(id: string, currentName: string) {
    Alert.prompt(
      'Rename Template',
      '',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (name) => {
            if (name?.trim() && name.trim() !== currentName) {
              renameTemplate(id, name.trim())
            }
          },
        },
      ],
      'plain-text',
      currentName,
    )
  }

  function handleDelete(id: string, name: string) {
    Alert.alert(
      'Delete Template',
      `Delete "${name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTemplate(id) },
      ],
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.sm }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', marginLeft: spacing.xs }}>
          Templates
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}>
        {templates.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
            <Ionicons name="albums-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body, textAlign: 'center' }}>
              No templates yet.
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, textAlign: 'center', marginTop: spacing.xs }}>
              Finish a workout and tap the bookmark icon to save it as a template.
            </Text>
          </View>
        )}

        {templates.map((item) => (
          <TemplateCard
            key={item.template.id}
            item={item}
            onLoad={() => handleLoad(item.template.id)}
            onRename={() => handleRename(item.template.id, item.template.name)}
            onDelete={() => handleDelete(item.template.id, item.template.name)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

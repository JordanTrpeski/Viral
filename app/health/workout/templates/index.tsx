import { useCallback, useState } from 'react'
import { View, Text, FlatList, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius, fonts } from '@core/theme'
import {
  getTemplatesWithMetaV2,
  deleteTemplateV2,
  deleteTemplateExercisesV2,
  type TemplateWithMetaV2,
} from '@core/db/workoutQueriesV2'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function goalLabel(g?: string): string {
  switch (g) {
    case 'strength':    return 'Strength'
    case 'hypertrophy': return 'Hypertrophy'
    case 'endurance':   return 'Endurance'
    case 'weight_loss': return 'Weight Loss'
    default:            return 'General'
  }
}

function goalColor(g?: string): string {
  switch (g) {
    case 'strength':    return colors.workout
    case 'hypertrophy': return colors.primary
    case 'endurance':   return colors.success
    case 'weight_loss': return colors.warning
    default:            return colors.textMuted
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MuscleTag({ label }: { label: string }) {
  return (
    <View style={{
      backgroundColor: `${colors.workout}22`,
      borderRadius: radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    }}>
      <Text style={{
        color: colors.workout,
        fontSize: fontSize.micro,
        fontWeight: '600',
        textTransform: 'capitalize',
        fontFamily: `${fonts.ui}_600SemiBold`,
      }}>
        {label}
      </Text>
    </View>
  )
}

function TemplateCard({
  item,
  isProgram,
  onPress,
  onDelete,
}: {
  item: TemplateWithMetaV2
  isProgram: boolean
  onPress: () => void
  onDelete: () => void
}) {
  const { template, exerciseCount, primaryMuscles, lastUsedDate } = item
  const color = goalColor(template.goalType)

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginBottom: spacing.sm })}>
      <View style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.sm,
      }}>
        {/* Title row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: radius.md,
            backgroundColor: `${color}18`,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Ionicons
              name={isProgram ? 'calendar-outline' : 'document-text-outline'}
              size={18}
              color={color}
            />
          </View>

          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{
              color: colors.text,
              fontSize: fontSize.cardTitle,
              fontWeight: '700',
              fontFamily: `${fonts.ui}_700Bold`,
            }}>
              {template.name}
            </Text>
            <Text style={{
              color: `${color}cc`,
              fontSize: fontSize.micro,
              fontWeight: '600',
              fontFamily: `${fonts.ui}_600SemiBold`,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
            }}>
              {goalLabel(template.goalType)}
              {isProgram && template.durationWeeks
                ? ` · ${template.durationWeeks}wk · ${template.daysPerWeek}d/wk`
                : ''}
            </Text>
          </View>

          {!isProgram && (
            <Pressable
              onPress={onDelete}
              hitSlop={8}
              style={{ padding: 4 }}
            >
              <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Muscle tags */}
        {primaryMuscles.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {primaryMuscles.map((m) => <MuscleTag key={m} label={m} />)}
          </View>
        )}

        {/* Footer */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="barbell-outline" size={12} color={colors.textMuted} />
            <Text style={{
              color: colors.textMuted,
              fontSize: fontSize.micro,
              fontFamily: `${fonts.ui}_400Regular`,
            }}>
              {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
            </Text>
          </View>
          {lastUsedDate && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} />
              <Text style={{
                color: colors.textMuted,
                fontSize: fontSize.micro,
                fontFamily: `${fonts.ui}_400Regular`,
              }}>
                Last: {lastUsedDate}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TemplatesScreen() {
  const router = useRouter()
  const [templates, setTemplates] = useState<TemplateWithMetaV2[]>([])

  useFocusEffect(
    useCallback(() => {
      setTemplates(getTemplatesWithMetaV2())
    }, []),
  )

  const userTemplates = templates.filter((t) => t.template.durationWeeks == null)
  const programs = templates.filter((t) => t.template.durationWeeks != null)

  function handleDelete(templateId: string) {
    deleteTemplateExercisesV2(templateId)
    deleteTemplateV2(templateId)
    setTemplates((prev) => prev.filter((t) => t.template.id !== templateId))
  }

  function renderSection(title: string, items: TemplateWithMetaV2[], isProgram: boolean) {
    if (items.length === 0) return null
    return (
      <View style={{ gap: spacing.sm }}>
        <Text style={{
          color: colors.textMuted,
          fontSize: fontSize.label,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          fontFamily: `${fonts.ui}_600SemiBold`,
          paddingHorizontal: spacing.md,
        }}>
          {title}
        </Text>
        {items.map((item) => (
          <View key={item.template.id} style={{ paddingHorizontal: spacing.md }}>
            <TemplateCard
              item={item}
              isProgram={isProgram}
              onPress={() =>
                isProgram
                  ? router.push(`/health/workout/programs/${item.template.id}` as never)
                  : router.push({ pathname: '/health/workout/templates/builder', params: { templateId: item.template.id } })
              }
              onDelete={() => handleDelete(item.template.id)}
            />
          </View>
        ))}
      </View>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: spacing.sm,
      }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.xs }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{
          flex: 1,
          color: colors.text,
          fontSize: fontSize.sectionHeader,
          fontWeight: '700',
          fontFamily: `${fonts.ui}_700Bold`,
        }}>
          Templates & Programs
        </Text>
        <Pressable
          onPress={() => router.push('/health/workout/templates/builder' as never)}
          style={({ pressed }) => ({
            backgroundColor: colors.workout,
            borderRadius: radius.md,
            padding: spacing.xs,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: spacing.md, gap: spacing.lg }}
      >
        {/* My Templates */}
        {renderSection('My Templates', userTemplates, false)}

        {userTemplates.length === 0 && (
          <Pressable
            onPress={() => router.push('/health/workout/templates/builder' as never)}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, paddingHorizontal: spacing.md })}
          >
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              borderStyle: 'dashed',
              padding: spacing.xl,
              alignItems: 'center',
              gap: spacing.sm,
            }}>
              <Ionicons name="add-circle-outline" size={32} color={colors.textMuted} />
              <Text style={{
                color: colors.textMuted,
                fontSize: fontSize.body,
                fontFamily: `${fonts.ui}_400Regular`,
                textAlign: 'center',
              }}>
                No templates yet.{'\n'}Create your first workout template.
              </Text>
            </View>
          </Pressable>
        )}

        {/* Pre-Made Programs */}
        {renderSection('Pre-Made Programs', programs, true)}
      </ScrollView>
    </SafeAreaView>
  )
}

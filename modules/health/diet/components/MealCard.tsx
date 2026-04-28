import { View, Text, Pressable, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import MacroBar from './MacroBar'
import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS } from '../dietUtils'
import type { MealWithEntries } from '../dietStore'

interface Props {
  item: MealWithEntries
  onAddFood: () => void
  onDeleteEntry: (entryId: string) => void
  onDeleteMeal: () => void
  onSaveTemplate: () => void
}

export default function MealCard({ item, onAddFood, onDeleteEntry, onDeleteMeal, onSaveTemplate }: Props) {
  const { meal, entries, totalCalories, totalProteinG, totalCarbsG, totalFatG } = item
  const label = MEAL_TYPE_LABELS[meal.mealType] ?? meal.mealType
  const icon = MEAL_TYPE_ICONS[meal.mealType] ?? 'nutrition-outline'
  const time = meal.loggedAt.slice(11, 16)

  function confirmDeleteMeal() {
    Alert.alert('Delete Meal', `Delete this ${label.toLowerCase()}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDeleteMeal },
    ])
  }

  function confirmDeleteEntry(entryId: string, foodName: string) {
    Alert.alert('Remove Item', `Remove ${foodName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onDeleteEntry(entryId) },
    ])
  }

  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    }}>
      {/* Meal header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: entries.length > 0 ? 1 : 0,
        borderBottomColor: colors.border,
        gap: spacing.sm,
      }}>
        <View style={{
          width: 36, height: 36, borderRadius: radius.md,
          backgroundColor: `${colors.diet}22`,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name={icon as never} size={18} color={colors.diet} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' }}>
            {label}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>{time}</Text>
        </View>
        <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '700' }}>
          {totalCalories} kcal
        </Text>
        {entries.length > 0 && (
          <Pressable onPress={onSaveTemplate} hitSlop={8} style={{ padding: spacing.xs }}>
            <Ionicons name="bookmark-outline" size={16} color={colors.primary} />
          </Pressable>
        )}
        <Pressable onPress={confirmDeleteMeal} hitSlop={8} style={{ padding: spacing.xs }}>
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
        </Pressable>
      </View>

      {/* Entries */}
      {entries.map((entry) => (
        <View
          key={entry.entryId}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs + 2,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: fontSize.body }} numberOfLines={1}>
              {entry.foodName}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
              {entry.amountGrams}g · {entry.calories} kcal
            </Text>
          </View>
          <Pressable onPress={() => confirmDeleteEntry(entry.entryId, entry.foodName)} hitSlop={8}>
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      ))}

      {/* Macro bar + add food */}
      <View style={{ padding: spacing.md, gap: spacing.sm }}>
        {entries.length > 0 && (
          <MacroBar proteinG={totalProteinG} carbsG={totalCarbsG} fatG={totalFatG} mini />
        )}
        <Pressable
          onPress={onAddFood}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="add" size={16} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: fontSize.label, fontWeight: '600' }}>
            Add Food
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

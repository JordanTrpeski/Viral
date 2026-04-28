import { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import GorhomBottomSheet from '@gorhom/bottom-sheet'
import Svg, { Circle } from 'react-native-svg'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { BottomSheet } from '@core/components'
import { useDietStore } from '@modules/health/diet/dietStore'
import MealCard from '@modules/health/diet/components/MealCard'
import MacroBar from '@modules/health/diet/components/MacroBar'
import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS } from '@modules/health/diet/dietUtils'
import type { MealType } from '@modules/health/shared/types'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

// ─── Water ring ───────────────────────────────────────────────────────────────

function WaterRing({ ml, goalMl }: { ml: number; goalMl: number }) {
  const SIZE = 72
  const STROKE = 7
  const R = (SIZE - STROKE) / 2
  const CIRC = 2 * Math.PI * R
  const progress = Math.min(1, ml / goalMl)
  const offset = CIRC * (1 - progress)
  const liters = (ml / 1000).toFixed(1)
  const goalL  = (goalMl / 1000).toFixed(1)

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: SIZE, height: SIZE }}>
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.surface2} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          stroke={colors.water}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${CIRC}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>
      <Text style={{ color: colors.text, fontSize: fontSize.micro, fontWeight: '700' }}>{liters}L</Text>
      <Text style={{ color: colors.textMuted, fontSize: 9 }}>/{goalL}L</Text>
    </View>
  )
}

// ─── Calorie progress ─────────────────────────────────────────────────────────

function calorieBarColor(eaten: number, goal: number): string {
  const pct = eaten / goal
  if (pct >= 1) return colors.danger
  if (pct >= 0.8) return colors.warning
  return colors.success
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DietScreen() {
  const router = useRouter()
  const {
    meals, macroGoals, totalCalories, totalProteinG, totalCarbsG, totalFatG,
    waterMl, waterGoalMl, loadToday, createMeal, deleteMeal, deleteEntry, addWater,
    mealTemplates, loadMealTemplates, saveMealAsTemplate, loadMealTemplate, deleteMealTemplate,
  } = useDietStore()

  const mealSheetRef      = useRef<GorhomBottomSheet>(null)
  const waterSheetRef     = useRef<GorhomBottomSheet>(null)
  const templateSheetRef  = useRef<GorhomBottomSheet>(null)
  const [customWaterMl,   setCustomWaterMl]   = useState('')
  const [pendingMealId,   setPendingMealId]   = useState<string | null>(null)

  useEffect(() => { loadToday(); loadMealTemplates() }, [])

  function handleAddMeal(type: MealType) {
    mealSheetRef.current?.close()
    const mealId = createMeal(type)
    if (mealTemplates.length > 0) {
      setPendingMealId(mealId)
      templateSheetRef.current?.expand()
    } else {
      router.push({ pathname: '/health/food-search', params: { mealId } } as never)
    }
  }

  function handleAddFood(mealId: string) {
    router.push({ pathname: '/health/food-search', params: { mealId } } as never)
  }

  function handleCustomWater() {
    const ml = parseInt(customWaterMl)
    if (ml > 0) {
      addWater(ml)
      setCustomWaterMl('')
      waterSheetRef.current?.close()
    }
  }

  function handleSaveTemplate(mealId: string) {
    Alert.prompt(
      'Save as Template',
      'Give this meal a name:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: (name) => { if (name?.trim()) saveMealAsTemplate(mealId, name.trim()) } },
      ],
      'plain-text',
    )
  }

  const { calorieGoal, proteinGoalG, carbsGoalG, fatGoalG } = macroGoals
  const calColor = calorieBarColor(totalCalories, calorieGoal)
  const calorieProgress = Math.min(1, totalCalories / calorieGoal)

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
          Diet
        </Text>
        <Pressable onPress={() => router.push('/health/nutrition-history')} style={{ padding: spacing.sm }}>
          <Ionicons name="stats-chart-outline" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 100 }}>

        {/* Calorie card */}
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing.xs }}>
            <Text style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}>{totalCalories}</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginLeft: 4 }}>/ {calorieGoal} kcal</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginLeft: spacing.xs }}>
              · {calorieGoal - totalCalories > 0 ? `${calorieGoal - totalCalories} left` : 'over goal'}
            </Text>
          </View>

          {/* Progress bar */}
          <View style={{ height: 8, backgroundColor: colors.surface2, borderRadius: radius.full, overflow: 'hidden', marginBottom: spacing.md }}>
            <View style={{ width: `${calorieProgress * 100}%`, height: '100%', backgroundColor: calColor, borderRadius: radius.full }} />
          </View>

          {/* Macro pills */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {[
              { label: 'Protein', val: totalProteinG, goal: proteinGoalG, color: '#64D2FF' },
              { label: 'Carbs',   val: totalCarbsG,   goal: carbsGoalG,   color: '#FFD60A' },
              { label: 'Fat',     val: totalFatG,      goal: fatGoalG,     color: '#FF6B9D' },
            ].map(({ label, val, goal, color }) => (
              <View key={label} style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '700' }}>
                  {val.toFixed(0)}g
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
                  {label} / {goal}g
                </Text>
                <View style={{ width: 40, height: 3, backgroundColor: colors.surface2, borderRadius: radius.full, marginTop: 3, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.min(100, (val / goal) * 100)}%`, height: '100%', backgroundColor: color, borderRadius: radius.full }} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Water card */}
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <WaterRing ml={waterMl} goalMl={waterGoalMl} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', marginBottom: spacing.xs }}>
                Water
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
                {[250, 500, 750].map((ml) => (
                  <Pressable
                    key={ml}
                    onPress={() => addWater(ml)}
                    style={({ pressed }) => ({
                      backgroundColor: `${colors.water}22`,
                      borderRadius: radius.full,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 4,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ color: colors.water, fontSize: fontSize.label, fontWeight: '600' }}>+{ml}ml</Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => waterSheetRef.current?.expand()}
                  style={({ pressed }) => ({
                    backgroundColor: colors.surface2,
                    borderRadius: radius.full,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 4,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Custom</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Meals */}
        {meals.map((item) => (
          <MealCard
            key={item.meal.id}
            item={item}
            onAddFood={() => handleAddFood(item.meal.id)}
            onDeleteEntry={(entryId) => deleteEntry(entryId, item.meal.id)}
            onDeleteMeal={() => deleteMeal(item.meal.id)}
            onSaveTemplate={() => handleSaveTemplate(item.meal.id)}
          />
        ))}

        {meals.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <Ionicons name="restaurant-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body, textAlign: 'center' }}>
              No meals logged yet.{'\n'}Tap + to add your first meal.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add meal FAB */}
      <Pressable
        onPress={() => mealSheetRef.current?.expand()}
        style={({ pressed }) => ({
          position: 'absolute', bottom: 24, right: spacing.lg,
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: colors.diet,
          alignItems: 'center', justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
          shadowColor: colors.diet, shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
        })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {/* Add meal bottom sheet */}
      <BottomSheet ref={mealSheetRef} snapPoints={['40%']}>
        <View style={{ padding: spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', marginBottom: spacing.md }}>
            Add Meal
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {MEAL_TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => handleAddMeal(type)}
                style={({ pressed }) => ({
                  flex: 1, minWidth: '44%',
                  backgroundColor: colors.surface2,
                  borderRadius: radius.lg,
                  borderWidth: 1, borderColor: colors.border,
                  padding: spacing.md,
                  alignItems: 'center',
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Ionicons name={MEAL_TYPE_ICONS[type] as never} size={28} color={colors.diet} />
                <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600', marginTop: spacing.xs }}>
                  {MEAL_TYPE_LABELS[type]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </BottomSheet>

      {/* Template picker sheet — shown after creating a meal if templates exist */}
      <BottomSheet ref={templateSheetRef} snapPoints={['60%']}>
        <View style={{ padding: spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', marginBottom: spacing.xs }}>
            Load a template?
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.md }}>
            Or add food manually — templates just pre-fill the meal.
          </Text>
          <Pressable
            onPress={() => {
              templateSheetRef.current?.close()
              if (pendingMealId) router.push({ pathname: '/health/food-search', params: { mealId: pendingMealId } } as never)
              setPendingMealId(null)
            }}
            style={({ pressed }) => ({
              backgroundColor: colors.surface2, borderRadius: radius.md,
              borderWidth: 1, borderColor: colors.border,
              padding: spacing.md, marginBottom: spacing.sm,
              opacity: pressed ? 0.8 : 1, alignItems: 'center',
            })}
          >
            <Text style={{ color: colors.primary, fontSize: fontSize.body, fontWeight: '600' }}>Add food manually</Text>
          </Pressable>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
            {mealTemplates.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => {
                  if (pendingMealId) loadMealTemplate(t.id, pendingMealId)
                  templateSheetRef.current?.close()
                  setPendingMealId(null)
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: colors.surface, borderRadius: radius.md,
                  borderWidth: 1, borderColor: colors.border,
                  padding: spacing.md, marginBottom: spacing.xs, gap: spacing.sm,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Ionicons name="bookmark" size={18} color={colors.diet} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '500' }}>{t.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
                    {t.entryCount} item{t.entryCount !== 1 ? 's' : ''} · {t.totalCalories} kcal
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    Alert.alert('Delete Template', `Delete "${t.name}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteMealTemplate(t.id) },
                    ])
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </Pressable>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </BottomSheet>

      {/* Custom water bottom sheet */}
      <BottomSheet ref={waterSheetRef} snapPoints={['30%']}>
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600' }}>
            Add Water
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <TextInput
              value={customWaterMl}
              onChangeText={setCustomWaterMl}
              keyboardType="number-pad"
              placeholder="Amount in ml"
              placeholderTextColor={colors.textMuted}
              style={{
                flex: 1, backgroundColor: colors.surface2,
                borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
                color: colors.text, fontSize: fontSize.body,
                paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
              }}
              selectionColor={colors.primary}
            />
            <Pressable
              onPress={handleCustomWater}
              style={({ pressed }) => ({
                backgroundColor: colors.water,
                borderRadius: radius.sm,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm + 2,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: fontSize.body }}>Add</Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  )
}

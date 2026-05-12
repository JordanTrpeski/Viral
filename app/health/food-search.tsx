import { useEffect, useRef, useState, type ElementRef } from 'react'
import { View, Text, TextInput, FlatList, Pressable, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useDietStore } from '@modules/health/diet/dietStore'
import { calcEntryNutrition } from '@modules/health/diet/dietUtils'
import { recognizeFoodFromImage, type RecognizedFoodItem } from '@core/utils/foodRecognition'
import type { Food } from '@modules/health/shared/types'

// ─── Food result row ──────────────────────────────────────────────────────────

function FoodRow({ food, onSelect }: { food: Food; onSelect: () => void }) {
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        marginBottom: spacing.sm,
        gap: spacing.md,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
          <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }} numberOfLines={1}>
            {food.name}
          </Text>
          {food.isCustom && (
            <View style={{ backgroundColor: `${colors.primary}22`, borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 1 }}>
              <Text style={{ color: colors.primary, fontSize: fontSize.micro, fontWeight: '700' }}>CUSTOM</Text>
            </View>
          )}
        </View>
        {food.brand && (
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>{food.brand}</Text>
        )}
        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: 3, flexWrap: 'wrap' }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{food.caloriesPer100g}</Text> kcal
          </Text>
          <Text style={{ color: '#64D2FF', fontSize: fontSize.label }}>P {food.proteinPer100g}g</Text>
          <Text style={{ color: '#FFD60A', fontSize: fontSize.label }}>C {food.carbsPer100g}g</Text>
          <Text style={{ color: '#FF6B9D', fontSize: fontSize.label }}>F {food.fatPer100g}g</Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>per 100g</Text>
        </View>
      </View>
      <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
    </Pressable>
  )
}

// ─── Amount entry panel ───────────────────────────────────────────────────────

function AmountPanel({ food, initialGrams = 100, onAdd, onCancel, actionLabel = 'Add to Meal' }: {
  food: Food
  initialGrams?: number
  onAdd: (grams: number) => void
  onCancel: () => void
  actionLabel?: string
}) {
  const [gramsText, setGramsText] = useState(String(initialGrams))
  const grams = parseFloat(gramsText) || 0
  const { calories, proteinG, carbsG, fatG } = calcEntryNutrition(
    food.caloriesPer100g, food.proteinPer100g, food.carbsPer100g, food.fatPer100g, grams,
  )

  return (
    <View style={{
      backgroundColor: colors.surface,
      borderTopWidth: 1, borderTopColor: colors.border,
      padding: spacing.md, gap: spacing.md,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' }} numberOfLines={1}>
          {food.name}
        </Text>
        <Pressable onPress={onCancel}>
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <TextInput
          value={gramsText}
          onChangeText={setGramsText}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={{
            flex: 1, backgroundColor: colors.surface2,
            borderRadius: radius.sm, borderWidth: 1, borderColor: colors.primary,
            color: colors.text, fontSize: 20, fontWeight: '700',
            paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
            textAlign: 'center',
          }}
          selectionColor={colors.primary}
        />
        <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>grams</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <NutrientPill label="Calories" value={`${calories} kcal`} color={colors.primary} />
        <NutrientPill label="Protein" value={`${proteinG}g`} color="#64D2FF" />
        <NutrientPill label="Carbs" value={`${carbsG}g`} color="#FFD60A" />
        <NutrientPill label="Fat" value={`${fatG}g`} color="#FF6B9D" />
      </View>

      <Pressable
        onPress={() => grams > 0 && onAdd(grams)}
        disabled={grams <= 0}
        style={({ pressed }) => ({
          backgroundColor: grams > 0 ? colors.diet : colors.surface2,
          borderRadius: radius.md,
          paddingVertical: spacing.sm + 2,
          alignItems: 'center',
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text style={{ color: grams > 0 ? '#fff' : colors.textMuted, fontSize: fontSize.body, fontWeight: '600' }}>
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  )
}

function NutrientPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color, fontSize: fontSize.cardTitle, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>{label}</Text>
    </View>
  )
}

// ─── Custom food creation form ────────────────────────────────────────────────

function CustomFoodForm({ onSave, onCancel }: {
  onSave: (food: Omit<Food, 'id' | 'createdAt' | 'isCustom'>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [cal, setCal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [fiber, setFiber] = useState('')

  const canSave = name.trim().length > 0 && Number(cal) > 0

  function handleSave() {
    if (!canSave) { Alert.alert('Missing info', 'Name and calories are required.'); return }
    onSave({
      name: name.trim(),
      brand: brand.trim() || undefined,
      caloriesPer100g: Number(cal),
      proteinPer100g: Number(protein) || 0,
      carbsPer100g: Number(carbs) || 0,
      fatPer100g: Number(fat) || 0,
      fiberPer100g: Number(fiber) || undefined,
    })
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.md }}>
          <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600' }}>
            Create Custom Food
          </Text>
          <Pressable onPress={onCancel} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <FieldRow label="Name *" value={name} onChange={setName} placeholder="e.g. Homemade granola" />
          <FieldRow label="Brand" value={brand} onChange={setBrand} placeholder="Optional" />

          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: spacing.md, marginBottom: spacing.sm }}>
            Per 100g
          </Text>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <FieldRow label="Calories *" value={cal} onChange={setCal} placeholder="0" numeric />
            </View>
            <View style={{ flex: 1 }}>
              <FieldRow label="Fiber" value={fiber} onChange={setFiber} placeholder="0" numeric />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <FieldRow label="Protein" value={protein} onChange={setProtein} placeholder="0" numeric />
            </View>
            <View style={{ flex: 1 }}>
              <FieldRow label="Carbs" value={carbs} onChange={setCarbs} placeholder="0" numeric />
            </View>
            <View style={{ flex: 1 }}>
              <FieldRow label="Fat" value={fat} onChange={setFat} placeholder="0" numeric />
            </View>
          </View>

          <Pressable
            onPress={handleSave}
            style={({ pressed }) => ({
              backgroundColor: canSave ? colors.diet : colors.surface2,
              borderRadius: radius.md, paddingVertical: spacing.md,
              alignItems: 'center', marginTop: spacing.lg,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: canSave ? '#fff' : colors.textMuted, fontSize: fontSize.body, fontWeight: '700' }}>
              Save Custom Food
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  )
}

function FieldRow({ label, value, onChange, placeholder, numeric }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; numeric?: boolean
}) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontWeight: '600', marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        style={{
          backgroundColor: colors.surface2, borderRadius: radius.sm,
          borderWidth: 1, borderColor: colors.border,
          color: colors.text, fontSize: fontSize.body,
          paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        }}
        selectionColor={colors.primary}
      />
    </View>
  )
}

// ─── AI food camera ───────────────────────────────────────────────────────────

function FoodCameraView({
  recognizing,
  onCapture,
  onCancel,
}: {
  recognizing: boolean
  onCapture: (uri: string) => void
  onCancel: () => void
}) {
  const cameraRef = useRef<ElementRef<typeof CameraView>>(null)
  const [permission, requestPermission] = useCameraPermissions()

  async function handleCapture() {
    if (recognizing) return
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.75, base64: false })
    if (photo?.uri) onCapture(photo.uri)
  }

  if (!permission) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.diet} />
      </SafeAreaView>
    )
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.md, justifyContent: 'center', gap: spacing.md }}>
        <Ionicons name="camera-outline" size={48} color={colors.diet} style={{ alignSelf: 'center' }} />
        <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '700', textAlign: 'center' }}>
          Camera access needed
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.body, textAlign: 'center', lineHeight: fontSize.body * 1.5 }}>
          Viral uses the camera to identify foods from a meal photo. Add the API key later to turn captures into logged foods.
        </Text>
        <Pressable
          onPress={requestPermission}
          style={({ pressed }) => ({
            backgroundColor: colors.diet,
            borderRadius: radius.md,
            padding: spacing.md,
            alignItems: 'center',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ color: '#fff', fontSize: fontSize.body, fontWeight: '700' }}>Allow Camera</Text>
        </Pressable>
        <Pressable onPress={onCancel} style={{ alignItems: 'center', padding: spacing.sm }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>Search manually</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }}>
            <Pressable onPress={onCancel} style={{ padding: spacing.sm }}>
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </Pressable>
            <Text style={{ flex: 1, color: '#fff', fontSize: fontSize.sectionHeader, fontWeight: '700', textAlign: 'center' }}>
              Point at your meal
            </Text>
            <View style={{ width: 42 }} />
          </View>

          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg }}>
            <View style={{
              width: '100%',
              aspectRatio: 1.25,
              borderWidth: 2,
              borderColor: colors.diet,
              borderRadius: radius.lg,
              backgroundColor: 'rgba(0,0,0,0.08)',
            }} />
            <Text style={{
              color: '#fff',
              fontSize: fontSize.label,
              textAlign: 'center',
              marginTop: spacing.md,
              backgroundColor: 'rgba(0,0,0,0.45)',
              borderRadius: radius.full,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
            }}>
              Center the plate inside the frame
            </Text>
          </View>

          <View style={{ alignItems: 'center', paddingBottom: spacing.xl, gap: spacing.sm }}>
            <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: fontSize.micro, textAlign: 'center', paddingHorizontal: spacing.lg }}>
              API key placeholder: capture works now, recognition unlocks after adding the Gemini Vision key.
            </Text>
            <Pressable
              onPress={handleCapture}
              disabled={recognizing}
              style={({ pressed }) => ({
                width: 74,
                height: 74,
                borderRadius: 37,
                backgroundColor: '#fff',
                borderWidth: 5,
                borderColor: colors.diet,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed || recognizing ? 0.75 : 1,
              })}
            >
              {recognizing
                ? <ActivityIndicator color={colors.diet} />
                : <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.diet }} />
              }
            </Pressable>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  )
}

function RecognitionReview({
  items,
  onChange,
  onConfirm,
  onManual,
}: {
  items: RecognizedFoodItem[]
  onChange: (items: RecognizedFoodItem[]) => void
  onConfirm: () => void
  onManual: () => void
}) {
  function updateGrams(index: number, value: string) {
    const grams = Number(value)
    onChange(items.map((item, i) => i === index
      ? { ...item, estimatedGrams: Number.isFinite(grams) ? grams : 0 }
      : item))
  }

  return (
    <View style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md, gap: spacing.md }}>
      <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '700' }}>
        Confirm detected foods
      </Text>
      {items.map((item, index) => (
        <View key={`${item.name}-${index}`} style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface2,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.sm,
          gap: spacing.sm,
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
              {item.caloriesPer100g} kcal per 100g
            </Text>
          </View>
          <TextInput
            value={String(item.estimatedGrams || '')}
            onChangeText={(value) => updateGrams(index, value)}
            keyboardType="decimal-pad"
            selectTextOnFocus
            style={{
              width: 76,
              backgroundColor: colors.surface,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text,
              fontSize: fontSize.body,
              fontWeight: '700',
              textAlign: 'center',
              paddingVertical: spacing.xs,
            }}
          />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>g</Text>
        </View>
      ))}
      <Pressable
        onPress={onConfirm}
        style={({ pressed }) => ({
          backgroundColor: colors.diet,
          borderRadius: radius.md,
          padding: spacing.md,
          alignItems: 'center',
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ color: '#fff', fontSize: fontSize.body, fontWeight: '700' }}>Add All to Meal</Text>
      </Pressable>
      <Pressable onPress={onManual} style={{ alignItems: 'center', padding: spacing.xs }}>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontWeight: '600' }}>Looks wrong - search manually</Text>
      </Pressable>
    </View>
  )
}

function RecognitionFallback({
  message,
  onTryAgain,
  onManual,
}: {
  message: string
  onTryAgain: () => void
  onManual: () => void
}) {
  return (
    <View style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md, gap: spacing.md }}>
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Ionicons name="sparkles-outline" size={34} color={colors.diet} />
        <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '700', textAlign: 'center' }}>
          Couldn't identify food
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label, lineHeight: fontSize.label * 1.55, textAlign: 'center' }}>
          {message}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Pressable
          onPress={onTryAgain}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: colors.diet,
            borderRadius: radius.md,
            padding: spacing.md,
            alignItems: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: '#fff', fontSize: fontSize.body, fontWeight: '700' }}>Try again</Text>
        </Pressable>
        <Pressable
          onPress={onManual}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: colors.surface2,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.md,
            alignItems: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '700' }}>Search manually</Text>
        </Pressable>
      </View>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FoodSearchScreen() {
  const router = useRouter()
  const { mealId, editEntryId, editFoodId, editGrams } = useLocalSearchParams<{
    mealId?: string
    editEntryId?: string
    editFoodId?: string
    editGrams?: string
  }>()
  const { searchResults, searchFoods, addEntry, updateEntry, createCustomFood } = useDietStore()

  const [query, setQuery] = useState('')
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [recognizing, setRecognizing] = useState(false)
  const [recognizedItems, setRecognizedItems] = useState<RecognizedFoodItem[]>([])
  const [recognitionMessage, setRecognitionMessage] = useState('')

  // Edit mode: pre-select the food being edited
  const isEditMode = !!(editEntryId && editFoodId)
  const editFood = isEditMode ? searchResults.find((f) => f.id === editFoodId) ?? null : null

  useEffect(() => { searchFoods('') }, [])

  useEffect(() => {
    if (isEditMode && editFood && !selectedFood) {
      setSelectedFood(editFood)
    }
  }, [editFood])

  useEffect(() => {
    const timer = setTimeout(() => searchFoods(query), 200)
    return () => clearTimeout(timer)
  }, [query])

  function handleAdd(grams: number) {
    if (isEditMode && editEntryId && mealId) {
      const food = selectedFood ?? editFood
      if (!food) return
      updateEntry(editEntryId, mealId, grams, food)
      router.back()
      return
    }
    if (!mealId || !selectedFood) return
    addEntry(mealId, selectedFood, grams)
    setSelectedFood(null)
    setQuery('')
    searchFoods('')
  }

  function handleCustomFoodSave(partial: Omit<Food, 'id' | 'createdAt' | 'isCustom'>) {
    const newFood = createCustomFood(partial)
    setShowCustomForm(false)
    setSelectedFood(newFood)
  }

  function resetRecognition() {
    setRecognizedItems([])
    setRecognitionMessage('')
  }

  async function handleMealPhoto(uri: string) {
    setRecognizing(true)
    resetRecognition()
    const result = await recognizeFoodFromImage(uri)
    setRecognizing(false)
    setShowCamera(false)

    if (result.ok) {
      setRecognizedItems(result.items)
    } else {
      setRecognitionMessage(result.message)
    }
  }

  function handleConfirmRecognizedFoods() {
    if (!mealId) return
    for (const item of recognizedItems) {
      if (item.estimatedGrams <= 0) continue
      const food = createCustomFood({
        name: item.name,
        brand: 'AI estimate',
        caloriesPer100g: item.caloriesPer100g,
        proteinPer100g: item.proteinPer100g,
        carbsPer100g: item.carbsPer100g,
        fatPer100g: item.fatPer100g,
        fiberPer100g: item.fiberPer100g,
      })
      addEntry(mealId, food, item.estimatedGrams)
    }
    resetRecognition()
  }

  function handleSearchManually() {
    setShowCamera(false)
    resetRecognition()
  }

  if (showCamera) {
    return (
      <FoodCameraView
        recognizing={recognizing}
        onCapture={handleMealPhoto}
        onCancel={() => setShowCamera(false)}
      />
    )
  }

  if (showCustomForm) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <CustomFoodForm
          onSave={handleCustomFoodSave}
          onCancel={() => setShowCustomForm(false)}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
          borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm,
        }}>
          <Pressable onPress={() => router.back()} style={{ padding: spacing.xs }}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600' }}>
            {isEditMode ? 'Edit Amount' : 'Search Food'}
          </Text>
          {/* Barcode scanner button */}
          {!isEditMode && (
            <Pressable
              onPress={() => router.push({ pathname: '/health/barcode-scanner', params: { mealId: mealId ?? '' } } as never)}
              style={{ padding: spacing.xs }}
              hitSlop={8}
            >
              <Ionicons name="barcode-outline" size={24} color={colors.text} />
            </Pressable>
          )}
        </View>

        {/* Search bar — hide in edit mode */}
        {!isEditMode && (
          <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.surface2, borderRadius: radius.md,
              paddingHorizontal: spacing.sm, gap: spacing.xs,
            }}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search foods…"
                placeholderTextColor={colors.textMuted}
                autoFocus
                style={{ flex: 1, color: colors.text, fontSize: fontSize.body, paddingVertical: spacing.sm }}
                selectionColor={colors.primary}
              />
              <Pressable
                onPress={() => {
                  resetRecognition()
                  setShowCamera(true)
                }}
                hitSlop={8}
                style={{ padding: spacing.xs }}
              >
                <Ionicons name="camera-outline" size={18} color={colors.diet} />
              </Pressable>
              {query.length > 0 && (
                <Pressable onPress={() => { setQuery(''); searchFoods('') }}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Results list */}
        {!isEditMode && (
          <FlatList
            data={searchResults}
            keyExtractor={(f) => f.id}
            contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              <Pressable
                onPress={() => setShowCustomForm(true)}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: spacing.xs, paddingVertical: spacing.md,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: fontSize.body, fontWeight: '600' }}>
                  Create custom food
                </Text>
              </Pressable>
            }
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                <Ionicons name="search-outline" size={40} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
                <Text style={{ color: colors.textMuted, fontSize: fontSize.body, marginBottom: spacing.md }}>No foods found</Text>
                <Pressable
                  onPress={() => setShowCustomForm(true)}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
                    backgroundColor: `${colors.primary}18`, borderRadius: radius.md,
                    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: fontSize.body, fontWeight: '600' }}>
                    Create "{query || 'custom food'}"
                  </Text>
                </Pressable>
              </View>
            }
            renderItem={({ item }) => (
              <FoodRow food={item} onSelect={() => setSelectedFood(item)} />
            )}
          />
        )}

        {/* Amount entry panel */}
        {(selectedFood || (isEditMode && editFood)) && (
          <AmountPanel
            food={(selectedFood ?? editFood)!}
            initialGrams={isEditMode && editGrams ? Number(editGrams) : 100}
            onAdd={handleAdd}
            onCancel={() => {
              if (isEditMode) { router.back(); return }
              setSelectedFood(null)
            }}
            actionLabel={isEditMode ? 'Update Amount' : 'Add to Meal'}
          />
        )}

        {recognizedItems.length > 0 && (
          <RecognitionReview
            items={recognizedItems}
            onChange={setRecognizedItems}
            onConfirm={handleConfirmRecognizedFoods}
            onManual={handleSearchManually}
          />
        )}

        {recognitionMessage.length > 0 && (
          <RecognitionFallback
            message={recognitionMessage}
            onTryAgain={() => {
              resetRecognition()
              setShowCamera(true)
            }}
            onManual={handleSearchManually}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

import { useEffect, useState } from 'react'
import { View, Text, TextInput, ScrollView, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Notifications from 'expo-notifications'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useBudgetStore } from '@modules/budget/budgetStore'

const COLOR_PALETTE = [
  '#FF453A', '#FF9F0A', '#FFD60A', '#30D158', '#34C759',
  '#64D2FF', '#0A84FF', '#5E5CE6', '#6C63FF', '#BF5AF2',
  '#FF6B9D', '#FF6B00', '#FF2D55', '#5AC8FA', '#4CD964',
  '#8E8E93', '#636366', '#48484A', '#007AFF', '#FF9500',
]

export default function CategoryEditScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { allCategories, categorySpending, updateCat, setCategoryLimit, archiveCat } = useBudgetStore()

  const cat = allCategories.find((c) => c.id === id)

  const [name, setName]         = useState(cat?.name ?? '')
  const [emoji, setEmoji]       = useState(cat?.emoji ?? '📦')
  const [color, setColor]       = useState(cat?.color ?? COLOR_PALETTE[0])
  const [limitText, setLimitText] = useState(cat?.monthlyLimit != null ? String(cat.monthlyLimit) : '')
  const [notifEnabled, setNotifEnabled] = useState(false)

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => setNotifEnabled(status === 'granted'))
  }, [])

  if (!cat) return null

  const limit = parseFloat(limitText) || null
  const canSave = name.trim().length > 0

  const spending = categorySpending[cat.id] ?? 0
  const pct      = limit && limit > 0 ? spending / limit : null
  const barColor = pct == null ? cat.color : pct >= 1 ? colors.danger : pct >= 0.75 ? colors.warning : colors.success

  async function requestNotifPermission() {
    const { status } = await Notifications.requestPermissionsAsync()
    setNotifEnabled(status === 'granted')
  }

  function handleSave() {
    if (!canSave) return
    updateCat(cat.id, name.trim(), emoji, color)
    setCategoryLimit(cat.id, limit)
    router.back()
  }

  function handleArchive() {
    Alert.alert(
      cat.isArchived ? 'Unarchive category?' : 'Archive category?',
      cat.isArchived
        ? 'This category will appear again in pickers.'
        : 'This category will be hidden from pickers. Existing entries are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: cat.isArchived ? 'Unarchive' : 'Archive',
          onPress: () => {
            archiveCat(cat.id, !cat.isArchived)
            router.back()
          },
        },
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
          Edit Category
        </Text>
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs }}
        >
          <Text style={{ color: canSave ? colors.budget : colors.textMuted, fontSize: fontSize.body, fontWeight: '700' }}>Save</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>

        {/* Preview */}
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <View style={{
            width: 64, height: 64, borderRadius: radius.lg,
            backgroundColor: `${color}22`,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 30 }}>{emoji}</Text>
          </View>
          <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' }}>{name || 'Category Name'}</Text>
        </View>

        {/* Emoji + name */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TextInput
            value={emoji}
            onChangeText={setEmoji}
            style={{
              width: 52, height: 52, textAlign: 'center', fontSize: 24,
              backgroundColor: colors.surface, borderRadius: radius.md,
              borderWidth: 1, borderColor: colors.border,
              color: colors.text,
            }}
          />
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Category name"
            placeholderTextColor={colors.textMuted}
            style={{
              flex: 1,
              backgroundColor: colors.surface, borderRadius: radius.md,
              borderWidth: 1, borderColor: colors.border,
              color: colors.text, fontSize: fontSize.body,
              paddingHorizontal: spacing.md,
            }}
            selectionColor={colors.budget}
          />
        </View>

        {/* Color picker */}
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Color</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {COLOR_PALETTE.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: c,
                  borderWidth: color === c ? 3 : 1,
                  borderColor: color === c ? '#fff' : 'transparent',
                }}
              />
            ))}
          </View>
        </View>

        {/* Monthly limit */}
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Monthly Limit (optional)</Text>
            {limitText.length > 0 && (
              <Pressable onPress={() => setLimitText('')} hitSlop={8}>
                <Text style={{ color: colors.danger, fontSize: fontSize.label }}>Clear</Text>
              </Pressable>
            )}
          </View>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
            backgroundColor: colors.surface, borderRadius: radius.md,
            borderWidth: 1, borderColor: colors.border,
            paddingHorizontal: spacing.md,
          }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>€</Text>
            <TextInput
              value={limitText}
              onChangeText={setLimitText}
              keyboardType="decimal-pad"
              placeholder="No limit set"
              placeholderTextColor={colors.textMuted}
              selectTextOnFocus
              style={{
                flex: 1, color: colors.text, fontSize: fontSize.body, fontWeight: '600',
                paddingVertical: spacing.sm + 2,
              }}
              selectionColor={colors.budget}
            />
          </View>

          {/* Progress preview if limit + spending */}
          {limit != null && spending > 0 && (
            <View style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
                  This month: €{spending.toFixed(2)} / €{limit.toFixed(2)}
                </Text>
                <Text style={{ color: barColor, fontSize: fontSize.micro, fontWeight: '600' }}>
                  {Math.round((pct ?? 0) * 100)}%
                </Text>
              </View>
              <View style={{ height: 4, backgroundColor: colors.surface2, borderRadius: radius.full, overflow: 'hidden' }}>
                <View style={{ width: `${Math.min(100, (pct ?? 0) * 100)}%`, height: '100%', backgroundColor: barColor, borderRadius: radius.full }} />
              </View>
            </View>
          )}
        </View>

        {/* Notification toggle */}
        <View style={{
          backgroundColor: colors.surface, borderRadius: radius.lg,
          borderWidth: 1, borderColor: colors.border, padding: spacing.md,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="notifications-outline" size={20} color={notifEnabled ? colors.budget : colors.textMuted} />
              <View>
                <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '500' }}>
                  80% Limit Alert
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
                  Notify when spending hits 80% of limit
                </Text>
              </View>
            </View>
            {notifEnabled ? (
              <View style={{ backgroundColor: `${colors.success}22`, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 }}>
                <Text style={{ color: colors.success, fontSize: fontSize.micro, fontWeight: '600' }}>ON</Text>
              </View>
            ) : (
              <Pressable
                onPress={requestNotifPermission}
                style={{ backgroundColor: colors.surface2, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 }}
              >
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600' }}>Enable</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Archive / unarchive */}
        <Pressable
          onPress={handleArchive}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
            backgroundColor: colors.surface, borderRadius: radius.md,
            borderWidth: 1, borderColor: colors.border,
            paddingVertical: spacing.md,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Ionicons name={cat.isArchived ? 'archive-outline' : 'archive'} size={18} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.body, fontWeight: '500' }}>
            {cat.isArchived ? 'Unarchive Category' : 'Archive Category'}
          </Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  )
}

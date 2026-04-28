import { useState, useRef } from 'react'
import {
  View, Text, ScrollView, Pressable, TextInput, Alert, Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle } from 'react-native-svg'
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useDietStore } from '@modules/health/diet/dietStore'

const { width: SCREEN_W } = Dimensions.get('window')

const QUICK_AMOUNTS = [150, 250, 330, 500, 750, 1000]
const RING_SIZE = 200
const STROKE = 16
const R = (RING_SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * R

function toL(ml: number) { return (ml / 1000).toFixed(2).replace(/\.?0+$/, '') + 'L' }

export default function WaterScreen() {
  const router = useRouter()
  const { waterMl, waterGoalMl, addWater, setWaterGoal } = useDietStore()

  const [customAmount, setCustomAmount] = useState('')
  const [goalInput,    setGoalInput]    = useState(String(Math.round(waterGoalMl)))

  const addSheetRef  = useRef<BottomSheet>(null)
  const goalSheetRef = useRef<BottomSheet>(null)

  const progress = waterGoalMl > 0 ? Math.min(1, waterMl / waterGoalMl) : 0
  const offset   = CIRC * (1 - progress)
  const pct      = Math.round(progress * 100)
  const remaining = Math.max(0, waterGoalMl - waterMl)

  const ringColor = progress >= 1 ? colors.success : progress >= 0.5 ? colors.water : colors.primary

  function handleAdd(ml: number) {
    if (ml <= 0) return
    addWater(ml)
    setCustomAmount('')
    addSheetRef.current?.close()
  }

  function handleCustomAdd() {
    const ml = parseInt(customAmount)
    if (!ml || ml <= 0) { Alert.alert('Enter a valid amount'); return }
    handleAdd(ml)
  }

  function handleSaveGoal() {
    const ml = parseInt(goalInput)
    if (!ml || ml < 500 || ml > 10000) {
      Alert.alert('Enter a goal between 500ml and 10,000ml')
      return
    }
    setWaterGoal(ml)
    goalSheetRef.current?.close()
  }

  function handleReset() {
    Alert.alert('Reset today\'s water', 'Set intake back to 0ml?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => addWater(-waterMl) },
    ])
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginRight: spacing.sm }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '700', flex: 1 }}>
          Water
        </Text>
        <Pressable onPress={() => goalSheetRef.current?.expand()} hitSlop={8}>
          <Ionicons name="settings-outline" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 48 }}>

        {/* Ring */}
        <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
          <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: 'absolute' }}>
              <Circle
                cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={R}
                stroke={colors.surface2} strokeWidth={STROKE} fill="none"
              />
              <Circle
                cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={R}
                stroke={ringColor} strokeWidth={STROKE} fill="none"
                strokeDasharray={`${CIRC}`} strokeDashoffset={offset}
                strokeLinecap="round" rotation="-90"
                origin={`${RING_SIZE / 2},${RING_SIZE / 2}`}
              />
            </Svg>
            <Text style={{ color: colors.text, fontSize: 36, fontWeight: '700' }}>
              {toL(waterMl)}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>
              of {toL(waterGoalMl)}
            </Text>
            <Text style={{ color: ringColor, fontSize: fontSize.body, fontWeight: '600', marginTop: 4 }}>
              {pct}%
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.xl, marginTop: spacing.md }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '700' }}>
                {toL(waterMl)}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>logged</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.cardTitle, fontWeight: '700' }}>
                {toL(remaining)}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>remaining</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: colors.success, fontSize: fontSize.cardTitle, fontWeight: '700' }}>
                {toL(waterGoalMl)}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>goal</Text>
            </View>
          </View>
        </View>

        {/* Quick add buttons */}
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600', marginBottom: spacing.sm }}>
            Quick Add
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {QUICK_AMOUNTS.map(ml => (
              <Pressable
                key={ml}
                onPress={() => handleAdd(ml)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? colors.water : `${colors.water}22`,
                  borderRadius: radius.md,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  minWidth: (SCREEN_W - spacing.md * 4 - spacing.sm * 2) / 3 - 1,
                  alignItems: 'center',
                })}
              >
                {({ pressed }) => (
                  <Text style={{ color: pressed ? '#000' : colors.water, fontSize: fontSize.body, fontWeight: '600' }}>
                    +{ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>

          {/* Custom amount inline */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
            marginTop: spacing.sm,
          }}>
            <View style={{
              flex: 1, flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.surface2, borderRadius: radius.md,
              paddingHorizontal: spacing.sm,
            }}>
              <TextInput
                value={customAmount}
                onChangeText={setCustomAmount}
                placeholder="Custom ml"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                style={{ flex: 1, color: colors.text, fontSize: fontSize.body, paddingVertical: spacing.sm }}
              />
              <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>ml</Text>
            </View>
            <Pressable
              onPress={handleCustomAdd}
              style={({ pressed }) => ({
                backgroundColor: colors.water,
                borderRadius: radius.md,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: '#000', fontSize: fontSize.body, fontWeight: '700' }}>Add</Text>
            </Pressable>
          </View>
        </View>

        {/* Reset */}
        {waterMl > 0 && (
          <Pressable
            onPress={handleReset}
            style={{ alignItems: 'center', paddingVertical: spacing.sm }}
          >
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Reset today's intake</Text>
          </Pressable>
        )}

      </ScrollView>

      {/* Goal editor sheet */}
      <BottomSheet
        ref={goalSheetRef}
        index={-1}
        snapPoints={['40%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={{ padding: spacing.md, gap: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '700' }}>
            Daily Water Goal
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>
            Recommended: 2,000–3,000ml per day
          </Text>

          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: colors.surface2, borderRadius: radius.md,
            paddingHorizontal: spacing.md,
          }}>
            <TextInput
              value={goalInput}
              onChangeText={setGoalInput}
              keyboardType="number-pad"
              style={{ flex: 1, color: colors.text, fontSize: 22, fontWeight: '700', paddingVertical: spacing.md }}
            />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>ml</Text>
          </View>

          {/* Preset goals */}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {[1500, 2000, 2500, 3000].map(ml => (
              <Pressable
                key={ml}
                onPress={() => setGoalInput(String(ml))}
                style={{
                  flex: 1, paddingVertical: spacing.sm, alignItems: 'center',
                  borderRadius: radius.md,
                  backgroundColor: goalInput === String(ml) ? colors.water : colors.surface2,
                }}
              >
                <Text style={{
                  color: goalInput === String(ml) ? '#000' : colors.textMuted,
                  fontSize: fontSize.label, fontWeight: '600',
                }}>
                  {ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={handleSaveGoal}
            style={({ pressed }) => ({
              backgroundColor: colors.water, borderRadius: radius.md,
              paddingVertical: spacing.md, alignItems: 'center', opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: '#000', fontSize: fontSize.body, fontWeight: '700' }}>Save Goal</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  )
}

import { useEffect } from 'react'
import { View, Text, ScrollView, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useOrganizerStore } from '@modules/organizer/organizerStore'
import type { OrganizerTier } from '@core/types'
import SwipeableRow from '@core/components/SwipeableRow'

function TierRow({
  tier, ruleCount, onEdit, onMoveUp, onMoveDown, onDelete, isFirst, isLast,
}: {
  tier: OrganizerTier
  ruleCount: number
  onEdit: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <SwipeableRow
      rightActions={tier.isSystem ? [] : [{ label: 'Delete', icon: 'trash-outline', color: colors.danger, onPress: onDelete }]}
    >
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.border,
        padding: spacing.sm, gap: spacing.sm,
      }}>
        {/* Reorder */}
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Pressable onPress={onMoveUp} disabled={isFirst} hitSlop={4}>
            <Ionicons name="chevron-up" size={16} color={isFirst ? colors.surface2 : colors.textMuted} />
          </Pressable>
          <Pressable onPress={onMoveDown} disabled={isLast} hitSlop={4}>
            <Ionicons name="chevron-down" size={16} color={isLast ? colors.surface2 : colors.textMuted} />
          </Pressable>
        </View>

        {/* Color dot + emoji */}
        <View style={{
          width: 44, height: 44, borderRadius: radius.md,
          backgroundColor: `${tier.color}22`,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 2, borderColor: tier.color,
        }}>
          <Text style={{ fontSize: 20 }}>{tier.emoji}</Text>
        </View>

        {/* Name + meta */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }}>{tier.name}</Text>
            {tier.isSystem && (
              <View style={{ backgroundColor: colors.surface2, borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600' }}>SYSTEM</Text>
              </View>
            )}
          </View>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: 2 }}>
            {ruleCount} {ruleCount === 1 ? 'reminder rule' : 'reminder rules'}
            {tier.dailyCountdown ? ` · daily from ${tier.dailyCountdownStartDays}d` : ''}
          </Text>
        </View>

        {/* Edit */}
        <Pressable onPress={onEdit} hitSlop={8} style={{ padding: spacing.xs }}>
          <Ionicons name="pencil" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
    </SwipeableRow>
  )
}

export default function TiersScreen() {
  const router = useRouter()
  const { tiers, tierRules, loadTiers, loadTierRules, reorderTiers, removeTier, people } = useOrganizerStore()

  useEffect(() => {
    loadTiers()
  }, [])

  useEffect(() => {
    tiers.forEach((t) => loadTierRules(t.id))
  }, [tiers.length])

  function move(tier: OrganizerTier, dir: 'up' | 'down') {
    const list = [...tiers].sort((a, b) => a.orderIndex - b.orderIndex)
    const idx  = list.findIndex((t) => t.id === tier.id)
    const swap = dir === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= list.length) return
    ;[list[idx], list[swap]] = [list[swap], list[idx]]
    reorderTiers(list.map((t) => t.id))
  }

  function handleDelete(tier: OrganizerTier) {
    const assignedCount = people.filter((p) => p.tierId === tier.id).length
    if (assignedCount > 0) {
      Alert.alert(
        'Cannot Delete Tier',
        `${assignedCount} ${assignedCount === 1 ? 'person is' : 'people are'} assigned to "${tier.name}". Reassign them to another tier before deleting.`,
        [{ text: 'OK' }],
      )
      return
    }
    Alert.alert(
      'Delete Tier',
      `Delete "${tier.name}"? This will also remove all its notification rules.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeTier(tier.id) },
      ],
    )
  }

  const sorted = [...tiers].sort((a, b) => a.orderIndex - b.orderIndex)

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
          Importance Tiers
        </Text>
        <Pressable
          onPress={() => router.push('/organizer/tier-edit' as never)}
          style={{ padding: spacing.sm }}
        >
          <Ionicons name="add" size={24} color={colors.organizer} />
        </Pressable>
      </View>

      {/* Description */}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>
          Tiers control how many birthday reminders a person gets. Drag to reorder — higher tiers show first.
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.xs }}
      >
        {sorted.map((tier, i) => (
          <TierRow
            key={tier.id}
            tier={tier}
            ruleCount={tierRules[tier.id]?.length ?? 0}
            onEdit={() => router.push(`/organizer/tier-edit?id=${tier.id}` as never)}
            onMoveUp={() => move(tier, 'up')}
            onMoveDown={() => move(tier, 'down')}
            onDelete={() => handleDelete(tier)}
            isFirst={i === 0}
            isLast={i === sorted.length - 1}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

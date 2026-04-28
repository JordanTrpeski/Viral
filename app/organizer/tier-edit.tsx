import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, TextInput, Switch, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useOrganizerStore } from '@modules/organizer/organizerStore'
import RuleRow, { type DraftRule } from '@modules/organizer/shared/RuleRow'
import type { OrganizerTierRule } from '@core/types'

const COLOR_PALETTE = [
  '#A855F7', '#EF4444', '#EAB308', '#22C55E', '#6B7280',
  '#FF453A', '#FF9F0A', '#FFD60A', '#30D158', '#34C759',
  '#64D2FF', '#0A84FF', '#5E5CE6', '#6C63FF', '#BF5AF2',
  '#FF6B9D', '#FF6B00', '#FF2D55', '#5AC8FA', '#4CD964',
]

let _draftCounter = 0

export default function TierEditScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const isEditing = Boolean(id)

  const { tiers, tierRules, loadTiers, loadTierRules, addTier, editTier, addTierRule, clearTierRules, toggleTierRule } = useOrganizerStore()

  const existing = tiers.find((t) => t.id === id)
  const existingRules = id ? (tierRules[id] ?? []) : []

  const [name, setName]           = useState(existing?.name ?? '')
  const [color, setColor]         = useState(existing?.color ?? COLOR_PALETTE[0])
  const [emoji, setEmoji]         = useState(existing?.emoji ?? '⭐')
  const [dailyCountdown, setDaily] = useState(existing?.dailyCountdown ?? false)
  const [countdownDays, setCDays] = useState(String(existing?.dailyCountdownStartDays ?? 7))
  const [rules, setRules]         = useState<DraftRule[]>([])
  const [loaded, setLoaded]       = useState(false)

  useEffect(() => { if (!loaded) loadTiers() }, [])

  useEffect(() => { if (id && !loaded) loadTierRules(id) }, [id])

  useEffect(() => {
    if (existingRules.length > 0 && !loaded) {
      setRules(existingRules.map((r: OrganizerTierRule) => ({
        id: r.id, daysBefore: String(r.daysBefore),
        notificationTime: r.notificationTime, messageTemplate: r.messageTemplate,
        isEnabled: r.isEnabled, isNew: false,
      })))
      setLoaded(true)
    } else if (!id && !loaded) {
      setLoaded(true)
    }
  }, [existingRules.length])

  function addRule() {
    setRules((prev) => [...prev, {
      id: `new_${++_draftCounter}`, daysBefore: '', notificationTime: '09:00',
      messageTemplate: "[Name]'s birthday is in [Days] days!", isEnabled: true, isNew: true,
    }])
  }

  function validate(): string | null {
    if (!name.trim()) return 'Tier name is required.'
    for (const r of rules) {
      const d = parseInt(r.daysBefore, 10)
      if (isNaN(d) || d < 0) return 'All rules need a valid "days before" value (0 or more).'
      if (!/^\d{2}:\d{2}$/.test(r.notificationTime)) return 'Notification time must be HH:MM (e.g. 09:00).'
      if (!r.messageTemplate.trim()) return 'All rules need a message template.'
    }
    return null
  }

  function handleSave() {
    const err = validate()
    if (err) { Alert.alert('Fix this', err); return }
    const cdDays = Math.max(1, parseInt(countdownDays, 10) || 7)

    if (isEditing && id) {
      editTier(id, name.trim(), color, emoji, dailyCountdown, cdDays)
      clearTierRules(id)
      rules.forEach((r) => addTierRule(id, parseInt(r.daysBefore, 10), r.notificationTime, r.messageTemplate))
      setTimeout(() => {
        const fresh = tierRules[id] ?? []
        rules.forEach((draft, i) => {
          if (!draft.isEnabled && fresh[i]) toggleTierRule(fresh[i].id, id, false)
        })
      }, 100)
    } else {
      const newId = addTier(name.trim(), color, emoji, dailyCountdown, cdDays)
      rules.forEach((r) => addTierRule(newId, parseInt(r.daysBefore, 10), r.notificationTime, r.messageTemplate))
    }
    router.back()
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.sm }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', marginLeft: spacing.xs }}>
          {isEditing ? 'Edit Tier' : 'New Tier'}
        </Text>
        <Pressable onPress={handleSave} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 }}>
          <Text style={{ color: colors.organizer, fontSize: fontSize.body, fontWeight: '700' }}>Save</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 80 }}
      >
        {/* Emoji + Name */}
        <View>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginBottom: spacing.xs }}>TIER NAME</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TextInput
              value={emoji} onChangeText={setEmoji}
              style={{
                width: 52, height: 52, textAlign: 'center', fontSize: 24,
                backgroundColor: colors.surface, borderRadius: radius.md,
                color: colors.text, borderWidth: 1, borderColor: colors.border,
              }}
            />
            <TextInput
              value={name} onChangeText={setName}
              placeholder="e.g. Close Friends" placeholderTextColor={colors.textMuted}
              style={{
                flex: 1, backgroundColor: colors.surface, borderRadius: radius.md,
                color: colors.text, fontSize: fontSize.body,
                paddingHorizontal: spacing.md,
                borderWidth: 1, borderColor: colors.border,
              }}
            />
          </View>
        </View>

        {/* Color palette */}
        <View>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginBottom: spacing.xs }}>COLOR</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {COLOR_PALETTE.map((c) => (
              <Pressable key={c} onPress={() => setColor(c)} style={{
                width: 34, height: 34, borderRadius: 17, backgroundColor: c,
                borderWidth: color === c ? 3 : 0, borderColor: '#FFFFFF',
              }} />
            ))}
          </View>
        </View>

        {/* Daily countdown */}
        <View style={{
          backgroundColor: colors.surface, borderRadius: radius.md,
          borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }}>Daily countdown</Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginTop: 2 }}>
                Send a notification every day from X days before the birthday
              </Text>
            </View>
            <Switch
              value={dailyCountdown} onValueChange={setDaily}
              trackColor={{ false: colors.surface2, true: `${colors.organizer}80` }}
              thumbColor={dailyCountdown ? colors.organizer : colors.textMuted}
            />
          </View>
          {dailyCountdown && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>Start</Text>
              <TextInput
                value={countdownDays} onChangeText={(v) => setCDays(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                style={{
                  width: 52, textAlign: 'center',
                  backgroundColor: colors.surface2, borderRadius: radius.sm,
                  color: colors.text, fontSize: fontSize.body,
                  paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.border,
                }}
              />
              <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>days before</Text>
            </View>
          )}
        </View>

        {/* Notification rules */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600' }}>Notification Rules</Text>
            <Pressable onPress={addRule} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="add-circle" size={20} color={colors.organizer} />
              <Text style={{ color: colors.organizer, fontSize: fontSize.label, fontWeight: '600' }}>Add rule</Text>
            </Pressable>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.sm }}>
            Each rule sends one notification. Use [Name], [Days], [Age], [Relationship] in messages.
          </Text>
          <View style={{ gap: spacing.xs }}>
            {rules.length === 0 && (
              <View style={{
                backgroundColor: colors.surface, borderRadius: radius.md,
                borderWidth: 1, borderColor: colors.border,
                padding: spacing.lg, alignItems: 'center', gap: spacing.xs,
              }}>
                <Ionicons name="notifications-off-outline" size={28} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>No rules — this tier won't send notifications</Text>
              </View>
            )}
            {rules.map((rule, i) => (
              <RuleRow
                key={rule.id} rule={rule}
                onChange={(updated) => setRules((prev) => prev.map((r, j) => j === i ? updated : r))}
                onDelete={() => setRules((prev) => prev.filter((_, j) => j !== i))}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

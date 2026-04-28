import { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, Pressable, TextInput, Switch, Alert, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet'
import * as ImagePicker from 'expo-image-picker'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useOrganizerStore } from '@modules/organizer/organizerStore'
import RuleRow, { type DraftRule } from '@modules/organizer/shared/RuleRow'
import {
  dbGetPersonRules, dbInsertPersonRule, dbDeletePersonRules,
} from '@core/db/organizerQueries'
import type { OrganizerPersonRule } from '@core/types'

let _draftCounter = 0

// ── Field row helper ───────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>{label}</Text>
      {children}
    </View>
  )
}

const INPUT_STYLE = {
  backgroundColor: colors.surface, borderRadius: radius.md,
  color: colors.text, fontSize: fontSize.body,
  paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  borderWidth: 1, borderColor: colors.border,
} as const

// ── Main screen ────────────────────────────────────────────────────────────────

export default function PersonAddScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const isEditing = Boolean(id)

  const { tiers, people, loadTiers, loadPeople, addPerson, editPerson } = useOrganizerStore()
  const existing = people.find((p) => p.id === id)

  // Fields
  const [name, setName]             = useState(existing?.name ?? '')
  const [bdDay, setBdDay]           = useState(existing?.birthdayDay !== null ? String(existing?.birthdayDay ?? '') : '')
  const [bdMonth, setBdMonth]       = useState(existing?.birthdayMonth !== null ? String(existing?.birthdayMonth ?? '') : '')
  const [bdYear, setBdYear]         = useState(existing?.birthdayYear !== null ? String(existing?.birthdayYear ?? '') : '')
  const [photoUri, setPhotoUri]     = useState<string | null>(existing?.photoUri ?? null)
  const [tierId, setTierId]         = useState(existing?.tierId ?? '')
  const [relationship, setRelation] = useState(existing?.relationship ?? '')
  const [phone, setPhone]           = useState(existing?.phone ?? '')
  const [notes, setNotes]           = useState(existing?.notes ?? '')
  const [override, setOverride]     = useState(existing?.overrideNotifications ?? false)
  const [rules, setRules]           = useState<DraftRule[]>([])
  const [rulesLoaded, setRulesLoaded] = useState(false)

  const tierSheetRef = useRef<BottomSheet>(null)

  useEffect(() => {
    loadTiers()
    loadPeople()
  }, [])

  // Default to first tier if none selected
  useEffect(() => {
    if (!tierId && tiers.length > 0) setTierId(tiers[0].id)
  }, [tiers.length])

  // Load person rules if editing with override
  useEffect(() => {
    if (isEditing && id && existing?.overrideNotifications && !rulesLoaded) {
      const personRules = dbGetPersonRules(id)
      setRules(personRules.map((r: OrganizerPersonRule) => ({
        id: r.id, daysBefore: String(r.daysBefore),
        notificationTime: r.notificationTime, messageTemplate: r.messageTemplate,
        isEnabled: r.isEnabled, isNew: false,
      })))
      setRulesLoaded(true)
    }
  }, [existing?.overrideNotifications])

  async function pickPhoto(source: 'camera' | 'gallery') {
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true, aspect: [1, 1] })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true, aspect: [1, 1] })
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri)
    }
  }

  function addRule() {
    setRules((prev) => [...prev, {
      id: `new_${++_draftCounter}`, daysBefore: '', notificationTime: '09:00',
      messageTemplate: "[Name]'s birthday is in [Days] days!", isEnabled: true, isNew: true,
    }])
  }

  function validate(): string | null {
    if (!name.trim()) return 'Name is required.'
    if (!tierId) return 'Please select a tier.'
    const d = bdDay.trim(), m = bdMonth.trim()
    if ((d && !m) || (!d && m)) return 'Provide both day and month for a birthday, or leave both empty.'
    if (d) {
      const dv = parseInt(d, 10), mv = parseInt(m, 10)
      if (isNaN(dv) || dv < 1 || dv > 31) return 'Birthday day must be 1–31.'
      if (isNaN(mv) || mv < 1 || mv > 12) return 'Birthday month must be 1–12.'
    }
    if (bdYear.trim()) {
      const yv = parseInt(bdYear.trim(), 10)
      if (isNaN(yv) || yv < 1900 || yv > new Date().getFullYear()) return 'Birthday year must be between 1900 and now.'
    }
    if (override) {
      for (const r of rules) {
        const dv = parseInt(r.daysBefore, 10)
        if (isNaN(dv) || dv < 0) return 'All rules need a valid "days before" value.'
        if (!/^\d{2}:\d{2}$/.test(r.notificationTime)) return 'Notification time must be HH:MM.'
        if (!r.messageTemplate.trim()) return 'All rules need a message template.'
      }
    }
    return null
  }

  function handleSave() {
    const err = validate()
    if (err) { Alert.alert('Fix this', err); return }

    const day   = bdDay.trim()   ? parseInt(bdDay.trim(), 10)   : null
    const month = bdMonth.trim() ? parseInt(bdMonth.trim(), 10) : null
    const year  = bdYear.trim()  ? parseInt(bdYear.trim(), 10)  : null

    if (isEditing && id) {
      editPerson(
        id, name.trim(), day, month, year, photoUri, tierId,
        relationship.trim() || null, phone.trim() || null, notes.trim() || null, override,
      )
      if (override) {
        dbDeletePersonRules(id)
        rules.forEach((r) => dbInsertPersonRule(id + '_r_' + r.id, id, parseInt(r.daysBefore, 10), r.notificationTime, r.messageTemplate))
      } else {
        dbDeletePersonRules(id)
      }
    } else {
      const newId = addPerson(
        name.trim(), day, month, year, photoUri, tierId,
        relationship.trim() || null, phone.trim() || null, notes.trim() || null,
      )
      if (override) {
        rules.forEach((r) => dbInsertPersonRule(newId + '_r_' + r.id, newId, parseInt(r.daysBefore, 10), r.notificationTime, r.messageTemplate))
      }
    }
    router.back()
  }

  const selectedTier = tiers.find((t) => t.id === tierId)
  const sortedTiers  = [...tiers].sort((a, b) => a.orderIndex - b.orderIndex)

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
          {isEditing ? 'Edit Person' : 'Add Person'}
        </Text>
        <Pressable onPress={handleSave} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 }}>
          <Text style={{ color: colors.people, fontSize: fontSize.body, fontWeight: '700' }}>Save</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 100 }}
      >
        {/* Photo */}
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          {photoUri ? (
            <Pressable onPress={() => setPhotoUri(null)}>
              <Image source={{ uri: photoUri }} style={{ width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: colors.people }} />
              <View style={{
                position: 'absolute', bottom: 0, right: 0,
                backgroundColor: colors.danger, borderRadius: 10, width: 20, height: 20,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="close" size={12} color="#fff" />
              </View>
            </Pressable>
          ) : (
            <View style={{
              width: 88, height: 88, borderRadius: 44,
              backgroundColor: `${colors.people}22`,
              borderWidth: 2, borderColor: `${colors.people}44`,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="person" size={36} color={colors.people} />
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Pressable
              onPress={() => pickPhoto('camera')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.border }}
            >
              <Ionicons name="camera-outline" size={14} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Camera</Text>
            </Pressable>
            <Pressable
              onPress={() => pickPhoto('gallery')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.border }}
            >
              <Ionicons name="images-outline" size={14} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Gallery</Text>
            </Pressable>
          </View>
        </View>

        {/* Name */}
        <Field label="NAME *">
          <TextInput value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.textMuted} style={INPUT_STYLE} />
        </Field>

        {/* Birthday */}
        <Field label="BIRTHDAY">
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextInput
                value={bdDay} onChangeText={setBdDay}
                placeholder="Day" placeholderTextColor={colors.textMuted}
                keyboardType="number-pad" maxLength={2}
                style={INPUT_STYLE}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                value={bdMonth} onChangeText={setBdMonth}
                placeholder="Month" placeholderTextColor={colors.textMuted}
                keyboardType="number-pad" maxLength={2}
                style={INPUT_STYLE}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                value={bdYear} onChangeText={setBdYear}
                placeholder="Year (opt.)" placeholderTextColor={colors.textMuted}
                keyboardType="number-pad" maxLength={4}
                style={INPUT_STYLE}
              />
            </View>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Day + month required for reminders. Year shows age.</Text>
        </Field>

        {/* Tier picker */}
        <Field label="IMPORTANCE TIER *">
          <Pressable
            onPress={() => tierSheetRef.current?.expand()}
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.surface, borderRadius: radius.md,
              borderWidth: 1, borderColor: selectedTier ? `${selectedTier.color}66` : colors.border,
              padding: spacing.md, gap: spacing.sm,
            }}
          >
            {selectedTier ? (
              <>
                <View style={{
                  width: 28, height: 28, borderRadius: radius.sm,
                  backgroundColor: `${selectedTier.color}22`,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 16 }}>{selectedTier.emoji}</Text>
                </View>
                <Text style={{ flex: 1, color: selectedTier.color, fontSize: fontSize.body, fontWeight: '600' }}>{selectedTier.name}</Text>
              </>
            ) : (
              <Text style={{ flex: 1, color: colors.textMuted, fontSize: fontSize.body }}>Select tier…</Text>
            )}
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </Pressable>
        </Field>

        {/* Relationship */}
        <Field label="RELATIONSHIP">
          <TextInput value={relationship} onChangeText={setRelation} placeholder="e.g. Best Friend, Colleague…" placeholderTextColor={colors.textMuted} style={INPUT_STYLE} />
        </Field>

        {/* Phone */}
        <Field label="PHONE">
          <TextInput value={phone} onChangeText={setPhone} placeholder="+1 555 000 0000" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" style={INPUT_STYLE} />
        </Field>

        {/* Notes */}
        <Field label="NOTES">
          <TextInput
            value={notes} onChangeText={setNotes}
            placeholder="Anything worth remembering…"
            placeholderTextColor={colors.textMuted}
            multiline
            style={[INPUT_STYLE, { minHeight: 72 }]}
          />
        </Field>

        {/* Custom notification override */}
        <View style={{
          backgroundColor: colors.surface, borderRadius: radius.md,
          borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }}>Override tier notifications</Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginTop: 2 }}>
                Custom reminder schedule just for {name.trim() || 'this person'}
              </Text>
            </View>
            <Switch
              value={override} onValueChange={setOverride}
              trackColor={{ false: colors.surface2, true: `${colors.people}80` }}
              thumbColor={override ? colors.people : colors.textMuted}
            />
          </View>

          {override && (
            <View style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontSize: fontSize.label, fontWeight: '600' }}>Custom rules</Text>
                <Pressable onPress={addRule} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="add-circle" size={18} color={colors.people} />
                  <Text style={{ color: colors.people, fontSize: fontSize.micro, fontWeight: '600' }}>Add rule</Text>
                </Pressable>
              </View>
              {rules.length === 0 && (
                <View style={{
                  backgroundColor: colors.surface2, borderRadius: radius.md,
                  padding: spacing.md, alignItems: 'center',
                }}>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>No rules — add one above</Text>
                </View>
              )}
              {rules.map((rule, i) => (
                <RuleRow
                  key={rule.id} rule={rule} accentColor={colors.people}
                  onChange={(updated) => setRules((prev) => prev.map((r, j) => j === i ? updated : r))}
                  onDelete={() => setRules((prev) => prev.filter((_, j) => j !== i))}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Tier picker bottom sheet */}
      <BottomSheet
        ref={tierSheetRef}
        index={-1}
        snapPoints={['55%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={{ padding: spacing.lg, gap: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600' }}>Select Tier</Text>
          {sortedTiers.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => { setTierId(t.id); tierSheetRef.current?.close() }}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: tierId === t.id ? `${t.color}18` : colors.surface2,
                borderRadius: radius.md,
                borderWidth: 1, borderColor: tierId === t.id ? `${t.color}66` : colors.border,
                padding: spacing.sm, gap: spacing.sm,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{
                width: 40, height: 40, borderRadius: radius.sm,
                backgroundColor: `${t.color}22`, alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: t.color,
              }}>
                <Text style={{ fontSize: 18 }}>{t.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.color, fontSize: fontSize.body, fontWeight: '600' }}>{t.name}</Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: 1 }}>
                  {t.dailyCountdown ? `Daily countdown from ${t.dailyCountdownStartDays}d` : 'No daily countdown'}
                </Text>
              </View>
              {tierId === t.id && <Ionicons name="checkmark-circle" size={20} color={t.color} />}
            </Pressable>
          ))}
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  )
}

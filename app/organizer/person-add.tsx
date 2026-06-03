import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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

// ── Birthday wheel picker ─────────────────────────────────────────────────────

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const ITEM_H = 44   // height of one wheel row
const VISIBLE = 5   // odd number so selected item is centred

function daysInMonth(month: number, year: number | null): number {
  if (month === 2) {
    // Without a year, allow Feb 29 (we don't know if it's a leap year)
    if (year === null) return 29
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28
  }
  return [31,28,31,30,31,30,31,31,30,31,30,31][month - 1]
}

function formatBirthday(day: number | null, month: number | null, year: number | null): string {
  if (!day || !month) return 'Select birthday'
  const m = MONTHS_SHORT[month - 1]
  return year ? `${m} ${day}, ${year}` : `${m} ${day}`
}

/** A single scrollable wheel column. key-remount when items array changes. */
function WheelColumn({ items, selectedIndex, onChange }: {
  items: string[]
  selectedIndex: number
  onChange: (i: number) => void
}) {
  const scrollRef = useRef<ScrollView>(null)

  // Scroll to initial position after layout (ScrollView can't scroll before render)
  useLayoutEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false })
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  return (
    <View style={{ flex: 1, height: ITEM_H * VISIBLE, overflow: 'hidden' }}>
      {/* Highlight bar centred on the selected item */}
      <View
        style={{
          position: 'absolute',
          top: ITEM_H * Math.floor(VISIBLE / 2),
          left: 4, right: 4, height: ITEM_H,
          backgroundColor: colors.surface2, borderRadius: radius.sm,
        }}
        pointerEvents="none"
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        // Padding lets first/last items reach the centre row
        contentContainerStyle={{ paddingVertical: ITEM_H * Math.floor(VISIBLE / 2) }}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H)
          onChange(Math.max(0, Math.min(i, items.length - 1)))
        }}
        // Snap after a slow drag (no momentum)
        onScrollEndDrag={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H)
          onChange(Math.max(0, Math.min(i, items.length - 1)))
        }}
      >
        {items.map((label, i) => (
          <View
            key={i}
            style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text
              style={{
                color: i === selectedIndex ? colors.text : colors.textMuted,
                fontSize: i === selectedIndex ? fontSize.body + 1 : fontSize.label,
                fontWeight: i === selectedIndex ? '700' : '400',
              }}
            >
              {label}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

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
  const [name, setName]         = useState(existing?.name ?? '')
  const [bdDay,   setBdDay]     = useState<number | null>(existing?.birthdayDay   ?? null)
  const [bdMonth, setBdMonth]   = useState<number | null>(existing?.birthdayMonth ?? null)
  const [bdYear,  setBdYear]    = useState<number | null>(existing?.birthdayYear  ?? null)
  const [photoUri, setPhotoUri] = useState<string | null>(existing?.photoUri ?? null)

  // Birthday picker internal state (not committed until user taps Done)
  const NOW = new Date()
  const THIS_YEAR = NOW.getFullYear()
  const YEAR_ITEMS = Array.from({ length: THIS_YEAR - 1900 + 1 }, (_, i) => String(THIS_YEAR - i))
  const birthdayPickerRef = useRef<BottomSheet>(null)
  const [includeYear,   setIncludeYear]   = useState(existing?.birthdayYear !== null && existing?.birthdayYear !== undefined)
  const [pickerMonth,   setPickerMonth]   = useState(bdMonth ?? 1)
  const [pickerDay,     setPickerDay]     = useState(bdDay   ?? 1)
  const [pickerYear,    setPickerYear]    = useState(bdYear  ?? THIS_YEAR - 25)
  const maxPickerDay = daysInMonth(pickerMonth, includeYear ? pickerYear : null)
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

    const day   = bdDay
    const month = bdMonth
    const year  = bdYear

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
          <Pressable
            onPress={() => {
              // Sync picker state from committed state before opening
              setPickerMonth(bdMonth ?? 1)
              setPickerDay(bdDay ?? 1)
              setPickerYear(bdYear ?? THIS_YEAR - 25)
              setIncludeYear(bdYear !== null)
              birthdayPickerRef.current?.expand()
            }}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.surface, borderRadius: radius.md,
              borderWidth: 1,
              borderColor: (bdDay && bdMonth) ? `${colors.people}66` : colors.border,
              padding: spacing.md, gap: spacing.sm,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Ionicons
              name="calendar-outline" size={18}
              color={(bdDay && bdMonth) ? colors.people : colors.textMuted}
            />
            <Text style={{
              flex: 1,
              color: (bdDay && bdMonth) ? colors.text : colors.textMuted,
              fontSize: fontSize.body,
            }}>
              {formatBirthday(bdDay, bdMonth, bdYear)}
            </Text>
            {(bdDay && bdMonth) && (
              <Pressable
                onPress={(e) => { e.stopPropagation(); setBdDay(null); setBdMonth(null); setBdYear(null) }}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
            Day + month required for reminders. Year optional — shows age.
          </Text>
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

      {/* Birthday picker bottom sheet */}
      <BottomSheet
        ref={birthdayPickerRef}
        index={-1}
        snapPoints={['58%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={{ flex: 1, padding: spacing.md }}>
          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
            <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600' }}>
              Birthday
            </Text>
            {/* Year optional toggle */}
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginRight: spacing.sm }}>Include year</Text>
            <Switch
              value={includeYear}
              onValueChange={setIncludeYear}
              trackColor={{ false: colors.surface2, true: `${colors.people}80` }}
              thumbColor={includeYear ? colors.people : colors.textMuted}
            />
          </View>

          {/* Column labels */}
          <View style={{ flexDirection: 'row', marginBottom: spacing.xs }}>
            <Text style={{ flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600' }}>MONTH</Text>
            <Text style={{ flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600' }}>DAY</Text>
            {includeYear && <Text style={{ flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600' }}>YEAR</Text>}
          </View>

          {/* Wheel columns */}
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            {/* Month */}
            <WheelColumn
              key={`month-${bdMonth ?? 0}`}
              items={MONTHS_SHORT}
              selectedIndex={pickerMonth - 1}
              onChange={(i) => {
                const newMonth = i + 1
                setPickerMonth(newMonth)
                const maxDay = daysInMonth(newMonth, includeYear ? pickerYear : null)
                if (pickerDay > maxDay) setPickerDay(maxDay)
              }}
            />
            {/* Day — remount key when maxDay changes to reset scroll */}
            <WheelColumn
              key={`day-${maxPickerDay}-${pickerMonth}`}
              items={Array.from({ length: maxPickerDay }, (_, i) => String(i + 1))}
              selectedIndex={Math.min(pickerDay, maxPickerDay) - 1}
              onChange={(i) => setPickerDay(i + 1)}
            />
            {/* Year (optional) */}
            {includeYear && (
              <WheelColumn
                key={`year-${includeYear}`}
                items={YEAR_ITEMS}
                selectedIndex={Math.max(0, THIS_YEAR - pickerYear)}
                onChange={(i) => setPickerYear(THIS_YEAR - i)}
              />
            )}
          </View>

          {/* Done button */}
          <Pressable
            onPress={() => {
              const finalDay   = Math.min(pickerDay, maxPickerDay)
              const finalMonth = pickerMonth
              const finalYear  = includeYear ? pickerYear : null

              // Validate: no future dates when year is included
              if (finalYear !== null) {
                const selected = new Date(finalYear, finalMonth - 1, finalDay)
                if (selected > NOW) {
                  Alert.alert('Invalid date', "Birthday can't be in the future.")
                  return
                }
              }

              setBdDay(finalDay)
              setBdMonth(finalMonth)
              setBdYear(finalYear)
              birthdayPickerRef.current?.close()
            }}
            style={({ pressed }) => ({
              backgroundColor: colors.people, borderRadius: radius.md,
              padding: spacing.md, alignItems: 'center',
              marginTop: spacing.md, opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: '#fff', fontSize: fontSize.body, fontWeight: '700' }}>Done</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheet>

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

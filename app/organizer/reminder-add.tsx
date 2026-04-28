import { useState, useRef, useEffect } from 'react'
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import BottomSheet, { BottomSheetView, BottomSheetFlatList } from '@gorhom/bottom-sheet'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useOrganizerStore } from '@modules/organizer/organizerStore'
import type { ReminderRepeat, ReminderPriority, OrganizerPerson } from '@core/types'

// ── Constants ──────────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS: { value: ReminderPriority; label: string; color: string }[] = [
  { value: 'low',    label: 'Low',    color: '#636366' },
  { value: 'medium', label: 'Medium', color: '#64D2FF' },
  { value: 'high',   label: 'High',   color: '#FFD60A' },
  { value: 'urgent', label: 'Urgent', color: '#FF453A' },
]

const REPEAT_OPTIONS: { value: ReminderRepeat; label: string }[] = [
  { value: 'none',    label: 'None'    },
  { value: 'daily',   label: 'Daily'   },
  { value: 'weekly',  label: 'Weekly'  },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly'  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayStr()    { return new Date().toISOString().slice(0, 10) }
function tomorrowStr() {
  const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10)
}
function weekLaterStr() {
  const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10)
}

function isValidDate(str: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false
  const d = new Date(str + 'T12:00:00')
  return !isNaN(d.getTime())
}

function isValidTime(str: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(str)
}

// ── Section label ──────────────────────────────────────────────────────────────

function Label({ text }: { text: string }) {
  return (
    <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600', marginBottom: spacing.xs }}>
      {text}
    </Text>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function ReminderAddScreen() {
  const router = useRouter()
  const { id, noteId: noteIdParam } = useLocalSearchParams<{ id?: string; noteId?: string }>()
  const isEditing = !!id

  const { reminders, people, loadReminders, loadPeople, addReminder, editReminder } = useOrganizerStore()

  const existing = isEditing ? reminders.find((r) => r.id === id) : null

  // Form state
  const [title,    setTitle]    = useState(existing?.title    ?? '')
  const [dueDate,  setDueDate]  = useState(existing?.dueDate  ?? todayStr())
  const [dueTime,  setDueTime]  = useState(existing?.dueTime  ?? '')
  const [repeat,   setRepeat]   = useState<ReminderRepeat>(existing?.repeat as ReminderRepeat ?? 'none')
  const [priority, setPriority] = useState<ReminderPriority>(existing?.priority as ReminderPriority ?? 'medium')
  const [personId, setPersonId] = useState<string | null>(existing?.personId ?? null)
  const linkedNoteId = existing?.noteId ?? noteIdParam ?? null

  const personSheetRef = useRef<BottomSheet>(null)

  useEffect(() => {
    loadReminders()
    loadPeople()
  }, [])

  const selectedPerson = personId ? people.find((p) => p.id === personId) : null

  function handleSave() {
    const t = title.trim()
    if (!t) { Alert.alert('Title required', 'Please enter a reminder title.'); return }
    if (!isValidDate(dueDate)) { Alert.alert('Invalid date', 'Enter a date in YYYY-MM-DD format.'); return }
    if (dueTime && !isValidTime(dueTime)) { Alert.alert('Invalid time', 'Enter time as HH:MM (e.g. 09:00).'); return }

    const time = dueTime.trim() || null

    if (isEditing && id) {
      editReminder(id, t, dueDate, time, repeat === 'none' ? null : repeat, priority, personId, linkedNoteId)
    } else {
      addReminder(t, dueDate, time, repeat === 'none' ? null : repeat, priority, personId, linkedNoteId)
    }
    router.back()
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
          {isEditing ? 'Edit Reminder' : 'New Reminder'}
        </Text>
        <Pressable onPress={handleSave} style={{ padding: spacing.sm }}>
          <Text style={{ color: colors.reminders, fontSize: fontSize.body, fontWeight: '700' }}>Save</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.md, gap: spacing.lg }}
      >

        {/* Title */}
        <View>
          <Label text="TITLE" />
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What do you need to do?"
            placeholderTextColor={colors.textMuted}
            autoFocus={!isEditing}
            style={{
              backgroundColor: colors.surface, borderRadius: radius.md,
              borderWidth: 1, borderColor: colors.border,
              color: colors.text, fontSize: fontSize.body,
              padding: spacing.md,
            }}
          />
        </View>

        {/* Due date */}
        <View>
          <Label text="DATE" />
          {/* Quick pills */}
          <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm }}>
            {[
              { label: 'Today',     value: todayStr()    },
              { label: 'Tomorrow',  value: tomorrowStr() },
              { label: 'Next week', value: weekLaterStr() },
            ].map((opt) => (
              <Pressable
                key={opt.label}
                onPress={() => setDueDate(opt.value)}
                style={{
                  paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
                  borderRadius: radius.full,
                  backgroundColor: dueDate === opt.value ? `${colors.reminders}22` : colors.surface,
                  borderWidth: 1, borderColor: dueDate === opt.value ? `${colors.reminders}66` : colors.border,
                }}
              >
                <Text style={{ color: dueDate === opt.value ? colors.reminders : colors.textMuted, fontSize: fontSize.micro, fontWeight: '600' }}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            style={{
              backgroundColor: colors.surface, borderRadius: radius.md,
              borderWidth: 1, borderColor: isValidDate(dueDate) ? colors.border : colors.danger,
              color: colors.text, fontSize: fontSize.body,
              padding: spacing.md,
            }}
          />
        </View>

        {/* Due time */}
        <View>
          <Label text="TIME (OPTIONAL)" />
          <TextInput
            value={dueTime}
            onChangeText={setDueTime}
            placeholder="HH:MM — leave blank for all-day"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            style={{
              backgroundColor: colors.surface, borderRadius: radius.md,
              borderWidth: 1, borderColor: dueTime && !isValidTime(dueTime) ? colors.danger : colors.border,
              color: colors.text, fontSize: fontSize.body,
              padding: spacing.md,
            }}
          />
        </View>

        {/* Priority */}
        <View>
          <Label text="PRIORITY" />
          <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
            {PRIORITY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setPriority(opt.value)}
                style={{
                  paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
                  borderRadius: radius.full,
                  backgroundColor: priority === opt.value ? `${opt.color}22` : colors.surface,
                  borderWidth: 2, borderColor: priority === opt.value ? opt.color : colors.border,
                }}
              >
                <Text style={{ color: priority === opt.value ? opt.color : colors.textMuted, fontSize: fontSize.micro, fontWeight: '700' }}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Repeat */}
        <View>
          <Label text="REPEAT" />
          <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
            {REPEAT_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setRepeat(opt.value)}
                style={{
                  paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
                  borderRadius: radius.full,
                  backgroundColor: repeat === opt.value ? `${colors.reminders}22` : colors.surface,
                  borderWidth: 1, borderColor: repeat === opt.value ? `${colors.reminders}66` : colors.border,
                }}
              >
                <Text style={{ color: repeat === opt.value ? colors.reminders : colors.textMuted, fontSize: fontSize.micro, fontWeight: '600' }}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Link to person */}
        <View>
          <Label text="LINK TO PERSON (OPTIONAL)" />
          <Pressable
            onPress={() => personSheetRef.current?.expand()}
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.surface, borderRadius: radius.md,
              borderWidth: 1, borderColor: colors.border,
              padding: spacing.md, gap: spacing.sm,
            }}
          >
            <Ionicons name="person-outline" size={18} color={colors.textMuted} />
            <Text style={{ flex: 1, color: selectedPerson ? colors.text : colors.textMuted, fontSize: fontSize.body }}>
              {selectedPerson ? selectedPerson.name : 'No person linked'}
            </Text>
            {selectedPerson && (
              <Pressable
                onPress={(e) => { e.stopPropagation(); setPersonId(null) }}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </View>

      </ScrollView>

      {/* Person picker sheet */}
      <BottomSheet
        ref={personSheetRef}
        index={-1}
        snapPoints={['60%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetFlatList
          data={people}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.xs }}
          ListHeaderComponent={
            <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', marginBottom: spacing.sm }}>
              Link to person
            </Text>
          }
          ListEmptyComponent={
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body, textAlign: 'center', paddingVertical: spacing.xl }}>
              No people yet
            </Text>
          }
          renderItem={({ item: p }) => (
            <Pressable
              onPress={() => { setPersonId(p.id); personSheetRef.current?.close() }}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: personId === p.id ? `${colors.people}22` : colors.surface2,
                borderRadius: radius.md, padding: spacing.md, gap: spacing.sm,
                borderWidth: 1, borderColor: personId === p.id ? `${colors.people}66` : colors.border,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Ionicons name="person-circle-outline" size={28} color={personId === p.id ? colors.people : colors.textMuted} />
              <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.body, fontWeight: '500' }}>{p.name}</Text>
              {personId === p.id && <Ionicons name="checkmark" size={18} color={colors.people} />}
            </Pressable>
          )}
        />
      </BottomSheet>
    </SafeAreaView>
  )
}

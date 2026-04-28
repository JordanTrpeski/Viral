import { useState, useRef, useEffect } from 'react'
import { View, Text, ScrollView, Pressable, TextInput, Switch, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useOrganizerStore } from '@modules/organizer/organizerStore'

// ── Color options ──────────────────────────────────────────────────────────────

const EVENT_COLORS = [
  '#FF453A', '#FF9F0A', '#FFD60A', '#30D158',
  '#64D2FF', '#0A84FF', '#BF5AF2', '#FF375F',
  colors.organizer, colors.people, colors.reminders,
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function isValidDate(str: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false
  return !isNaN(new Date(str + 'T12:00:00').getTime())
}

function isValidTime(str: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(str)
}

function Label({ text }: { text: string }) {
  return (
    <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600', marginBottom: spacing.xs }}>
      {text}
    </Text>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function EventAddScreen() {
  const router = useRouter()
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>()

  const { people, loadPeople, addEvent } = useOrganizerStore()

  const [title,     setTitle]     = useState('')
  const [date,      setDate]      = useState(dateParam ?? new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState('')
  const [endTime,   setEndTime]   = useState('')
  const [isAllDay,  setIsAllDay]  = useState(false)
  const [location,  setLocation]  = useState('')
  const [noteText,  setNoteText]  = useState('')
  const [color,     setColor]     = useState<string>(colors.organizer)
  const [personId,  setPersonId]  = useState<string | null>(null)

  const personSheetRef = useRef<BottomSheet>(null)

  useEffect(() => { loadPeople() }, [])

  const selectedPerson = personId ? people.find((p) => p.id === personId) : null

  function handleSave() {
    const t = title.trim()
    if (!t) { Alert.alert('Title required', 'Please enter an event title.'); return }
    if (!isValidDate(date)) { Alert.alert('Invalid date', 'Enter a date in YYYY-MM-DD format.'); return }
    if (!isAllDay && startTime && !isValidTime(startTime)) {
      Alert.alert('Invalid time', 'Start time must be HH:MM.')
      return
    }
    if (!isAllDay && endTime && !isValidTime(endTime)) {
      Alert.alert('Invalid time', 'End time must be HH:MM.')
      return
    }

    addEvent(
      t, date,
      isAllDay ? null : (startTime.trim() || null),
      isAllDay ? null : (endTime.trim() || null),
      isAllDay,
      location.trim() || null,
      null,
      color,
      noteText.trim() || null,
      personId,
    )
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
          New Event
        </Text>
        <Pressable onPress={handleSave} style={{ padding: spacing.sm }}>
          <Text style={{ color: colors.organizer, fontSize: fontSize.body, fontWeight: '700' }}>Save</Text>
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
            placeholder="Event name"
            placeholderTextColor={colors.textMuted}
            autoFocus
            style={{
              backgroundColor: colors.surface, borderRadius: radius.md,
              borderWidth: 1, borderColor: colors.border,
              color: colors.text, fontSize: fontSize.body,
              padding: spacing.md,
            }}
          />
        </View>

        {/* Date */}
        <View>
          <Label text="DATE" />
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            style={{
              backgroundColor: colors.surface, borderRadius: radius.md,
              borderWidth: 1, borderColor: isValidDate(date) ? colors.border : colors.danger,
              color: colors.text, fontSize: fontSize.body,
              padding: spacing.md,
            }}
          />
        </View>

        {/* All day toggle */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: colors.surface, borderRadius: radius.md,
          borderWidth: 1, borderColor: colors.border,
          padding: spacing.md,
        }}>
          <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.body }}>All day</Text>
          <Switch
            value={isAllDay}
            onValueChange={setIsAllDay}
            trackColor={{ false: colors.surface2, true: `${colors.organizer}88` }}
            thumbColor={isAllDay ? colors.organizer : colors.textMuted}
          />
        </View>

        {/* Time */}
        {!isAllDay && (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Label text="START TIME" />
              <TextInput
                value={startTime}
                onChangeText={setStartTime}
                placeholder="09:00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                style={{
                  backgroundColor: colors.surface, borderRadius: radius.md,
                  borderWidth: 1, borderColor: startTime && !isValidTime(startTime) ? colors.danger : colors.border,
                  color: colors.text, fontSize: fontSize.body,
                  padding: spacing.md,
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Label text="END TIME" />
              <TextInput
                value={endTime}
                onChangeText={setEndTime}
                placeholder="10:00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                style={{
                  backgroundColor: colors.surface, borderRadius: radius.md,
                  borderWidth: 1, borderColor: endTime && !isValidTime(endTime) ? colors.danger : colors.border,
                  color: colors.text, fontSize: fontSize.body,
                  padding: spacing.md,
                }}
              />
            </View>
          </View>
        )}

        {/* Location */}
        <View>
          <Label text="LOCATION (OPTIONAL)" />
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Where?"
            placeholderTextColor={colors.textMuted}
            style={{
              backgroundColor: colors.surface, borderRadius: radius.md,
              borderWidth: 1, borderColor: colors.border,
              color: colors.text, fontSize: fontSize.body,
              padding: spacing.md,
            }}
          />
        </View>

        {/* Color */}
        <View>
          <Label text="COLOR" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {EVENT_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: c,
                  borderWidth: color === c ? 3 : 0,
                  borderColor: '#fff',
                  shadowColor: color === c ? c : 'transparent',
                  shadowOpacity: 0.6, shadowRadius: 4,
                }}
              />
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
              <Pressable onPress={(e) => { e.stopPropagation(); setPersonId(null) }} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Notes */}
        <View>
          <Label text="NOTES (OPTIONAL)" />
          <TextInput
            value={noteText}
            onChangeText={setNoteText}
            placeholder="Any extra details…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: colors.surface, borderRadius: radius.md,
              borderWidth: 1, borderColor: colors.border,
              color: colors.text, fontSize: fontSize.body,
              padding: spacing.md, textAlignVertical: 'top', minHeight: 80,
            }}
          />
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

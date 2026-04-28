import { useState, useRef, useEffect } from 'react'
import { View, Text, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import BottomSheet, { BottomSheetFlatList, BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useOrganizerStore } from '@modules/organizer/organizerStore'
import { localDateStr } from '@core/utils/units'

const TAG_PRESET_COLORS = [
  '#FF453A', '#FF9F0A', '#FFD60A', '#30D158',
  '#64D2FF', '#0A84FF', '#BF5AF2', '#FF375F',
]

// ── Main screen ────────────────────────────────────────────────────────────────

export default function NoteEditScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const isEditing = !!id

  const { notes, people, reminders, tags, noteTagMap, loadNotes, loadPeople, loadReminders, loadTags, addNote, editNote, pinNote, archiveNote, removeNote, addTag, deleteTag, tagNote, completeReminder } = useOrganizerStore()

  const existing = isEditing ? notes.find((n) => n.id === id) : null

  const [title,    setTitle]    = useState(existing?.title ?? '')
  const [body,     setBody]     = useState(existing?.body ?? '')
  const [personId, setPersonId] = useState<string | null>(existing?.personId ?? null)

  // Tag sheet state
  const [newTagName,  setNewTagName]  = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_PRESET_COLORS[0])

  const personSheetRef = useRef<BottomSheet>(null)
  const tagSheetRef    = useRef<BottomSheet>(null)
  const bodyRef        = useRef<TextInput>(null)

  useEffect(() => {
    loadNotes()
    loadPeople()
    loadTags()
    loadReminders()
  }, [])

  const noteTagIds     = isEditing && id ? (noteTagMap[id] ?? []) : []
  const noteTags       = tags.filter((t) => noteTagIds.includes(t.id))
  const linkedReminders = isEditing && id
    ? reminders.filter((r) => r.noteId === id && !r.isCompleted)
    : []

  const selectedPerson = personId ? people.find((p) => p.id === personId) : null
  const isPinned   = existing?.isPinned ?? false
  const isArchived = existing?.isArchived ?? false

  function handleSave() {
    if (!body.trim() && !title.trim()) {
      if (isEditing) {
        Alert.alert('Delete empty note?', 'This note is empty — delete it?', [
          { text: 'Keep', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => { removeNote(id!); router.back() } },
        ])
      } else {
        router.back()
      }
      return
    }

    if (isEditing && id) {
      editNote(id, title.trim() || null, body)
    } else {
      addNote(title.trim() || null, body, personId, null)
    }
    router.back()
  }

  function handleDelete() {
    if (!isEditing || !id) return
    Alert.alert('Delete Note', 'Permanently delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { removeNote(id); router.back() } },
    ])
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
          borderBottomWidth: 1, borderBottomColor: colors.border,
        }}>
          <Pressable onPress={handleSave} style={{ padding: spacing.sm }}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>

          <View style={{ flex: 1 }} />

          {/* Link person */}
          <Pressable
            onPress={() => personSheetRef.current?.expand()}
            style={{ padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Ionicons
              name="person-outline" size={18}
              color={selectedPerson ? colors.people : colors.textMuted}
            />
            {selectedPerson && (
              <Text style={{ color: colors.people, fontSize: fontSize.micro, fontWeight: '600' }}>
                {selectedPerson.name.split(' ')[0]}
              </Text>
            )}
          </Pressable>

          {/* Pin */}
          {isEditing && (
            <Pressable
              onPress={() => pinNote(id!, !isPinned)}
              style={{ padding: spacing.sm }}
            >
              <Ionicons
                name={isPinned ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={isPinned ? colors.organizer : colors.textMuted}
              />
            </Pressable>
          )}

          {/* Archive */}
          {isEditing && (
            <Pressable
              onPress={() => { archiveNote(id!, !isArchived); router.back() }}
              style={{ padding: spacing.sm }}
            >
              <Ionicons
                name={isArchived ? 'archive' : 'archive-outline'}
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          )}

          {/* Delete */}
          {isEditing && (
            <Pressable onPress={handleDelete} style={{ padding: spacing.sm }}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          )}

          <Pressable onPress={handleSave} style={{ padding: spacing.sm }}>
            <Text style={{ color: colors.notes, fontSize: fontSize.body, fontWeight: '700' }}>Done</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, flex: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor={colors.textMuted}
            returnKeyType="next"
            onSubmitEditing={() => bodyRef.current?.focus()}
            style={{
              color: colors.text,
              fontSize: 22,
              fontWeight: '700',
              marginBottom: spacing.sm,
              padding: 0,
            }}
          />

          {/* Person tag */}
          {selectedPerson && (
            <Pressable
              onPress={() => setPersonId(null)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: `${colors.people}22`, borderRadius: radius.full,
                alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 3,
                marginBottom: spacing.sm,
                borderWidth: 1, borderColor: `${colors.people}44`,
              }}
            >
              <Ionicons name="person-outline" size={12} color={colors.people} />
              <Text style={{ color: colors.people, fontSize: fontSize.micro, fontWeight: '600' }}>
                {selectedPerson.name}
              </Text>
              <Ionicons name="close" size={12} color={colors.people} />
            </Pressable>
          )}

          {/* Note tags (editing only) */}
          {isEditing && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm }}>
              {noteTags.map((tag) => (
                <Pressable
                  key={tag.id}
                  onPress={() => tagNote(id!, tag.id, false)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 3,
                    backgroundColor: `${tag.color}22`, borderRadius: radius.full,
                    paddingHorizontal: spacing.sm, paddingVertical: 3,
                    borderWidth: 1, borderColor: `${tag.color}55`,
                  }}
                >
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tag.color }} />
                  <Text style={{ color: tag.color, fontSize: fontSize.micro, fontWeight: '600' }}>{tag.name}</Text>
                  <Ionicons name="close" size={11} color={tag.color} />
                </Pressable>
              ))}
              <Pressable
                onPress={() => tagSheetRef.current?.expand()}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 3,
                  backgroundColor: colors.surface2, borderRadius: radius.full,
                  paddingHorizontal: spacing.sm, paddingVertical: 3,
                  borderWidth: 1, borderColor: colors.border,
                }}
              >
                <Ionicons name="pricetag-outline" size={11} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600' }}>Tag</Text>
              </Pressable>
            </View>
          )}

          {/* Body */}
          <TextInput
            ref={bodyRef}
            value={body}
            onChangeText={setBody}
            placeholder="Start writing…"
            placeholderTextColor={colors.textMuted}
            multiline
            autoFocus={!isEditing}
            style={{
              color: colors.text,
              fontSize: fontSize.body,
              lineHeight: fontSize.body * 1.6,
              padding: 0,
              minHeight: 300,
              textAlignVertical: 'top',
            }}
          />

          {/* Linked reminders (editing only) */}
          {isEditing && (
            <View style={{ marginTop: spacing.lg, gap: spacing.xs }}>
              {linkedReminders.map((r) => {
                const today = localDateStr()
                const overdue = r.dueDate < today
                return (
                  <View key={r.id} style={{
                    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                    backgroundColor: overdue ? `${colors.danger}11` : colors.surface2,
                    borderRadius: radius.md, padding: spacing.sm,
                    borderWidth: 1, borderColor: overdue ? `${colors.danger}33` : colors.border,
                  }}>
                    <Ionicons name="alarm-outline" size={14} color={overdue ? colors.danger : colors.textMuted} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: fontSize.label, fontWeight: '500' }} numberOfLines={1}>{r.title}</Text>
                      <Text style={{ color: overdue ? colors.danger : colors.textMuted, fontSize: fontSize.micro }}>
                        {r.dueDate}{r.dueTime ? ` ${r.dueTime}` : ''}
                      </Text>
                    </View>
                    <Pressable onPress={() => completeReminder(r.id)} hitSlop={8}>
                      <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
                    </Pressable>
                  </View>
                )
              })}
              {isEditing && id && (
                <Pressable
                  onPress={() => router.push(`/organizer/reminder-add?noteId=${id}` as never)}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    paddingVertical: spacing.xs, opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Ionicons name="add" size={16} color={colors.reminders} />
                  <Text style={{ color: colors.reminders, fontSize: fontSize.label, fontWeight: '600' }}>Add reminder</Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

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

      {/* Tag picker sheet */}
      <BottomSheet
        ref={tagSheetRef}
        index={-1}
        snapPoints={['70%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600' }}>Tags</Text>

          {/* Existing tags */}
          {tags.map((tag) => {
            const applied = noteTagIds.includes(tag.id)
            return (
              <View key={tag.id} style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: applied ? `${tag.color}18` : colors.surface2,
                borderRadius: radius.md, padding: spacing.sm, gap: spacing.sm,
                borderWidth: 1, borderColor: applied ? `${tag.color}55` : colors.border,
              }}>
                <Pressable
                  onPress={() => id && tagNote(id, tag.id, !applied)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                >
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: tag.color }} />
                  <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.body, fontWeight: '500' }}>{tag.name}</Text>
                  {applied && <Ionicons name="checkmark" size={18} color={tag.color} />}
                </Pressable>
                <Pressable
                  onPress={() => Alert.alert('Delete tag', `Delete "${tag.name}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteTag(tag.id) },
                  ])}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={15} color={colors.danger} />
                </Pressable>
              </View>
            )
          })}

          {/* Create new tag */}
          <View style={{
            backgroundColor: colors.surface2, borderRadius: radius.md,
            borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md,
          }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600' }}>NEW TAG</Text>
            <TextInput
              value={newTagName}
              onChangeText={setNewTagName}
              placeholder="Tag name"
              placeholderTextColor={colors.textMuted}
              style={{
                backgroundColor: colors.surface, borderRadius: radius.sm,
                borderWidth: 1, borderColor: colors.border,
                color: colors.text, fontSize: fontSize.body,
                paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2,
              }}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {TAG_PRESET_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setNewTagColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: 14, backgroundColor: c,
                    borderWidth: 2, borderColor: newTagColor === c ? colors.text : 'transparent',
                  }}
                />
              ))}
            </View>
            <Pressable
              onPress={() => {
                if (!newTagName.trim()) return
                const tagId = addTag(newTagName.trim(), newTagColor)
                if (id) tagNote(id, tagId, true)
                setNewTagName('')
                setNewTagColor(TAG_PRESET_COLORS[0])
              }}
              style={({ pressed }) => ({
                backgroundColor: newTagName.trim() ? newTagColor : colors.surface,
                borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ color: newTagName.trim() ? '#fff' : colors.textMuted, fontSize: fontSize.label, fontWeight: '700' }}>
                Create tag
              </Text>
            </Pressable>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </SafeAreaView>
  )
}

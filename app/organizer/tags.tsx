import { useRef, useState, useMemo, useCallback } from 'react'
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useOrganizerStore } from '@modules/organizer/organizerStore'
import SwipeableRow from '@core/components/SwipeableRow'
import type { OrganizerTag } from '@core/types'

const TAG_COLORS = [
  '#FF453A', '#FF9F0A', '#FFD60A', '#30D158',
  '#64D2FF', '#0A84FF', '#BF5AF2', '#FF375F',
]

// ── Tag row ────────────────────────────────────────────────────────────────────

function TagRow({
  tag, noteCount, onRename, onDelete,
}: {
  tag: OrganizerTag
  noteCount: number
  onRename: () => void
  onDelete: () => void
}) {
  return (
    <SwipeableRow rightActions={[
      { label: 'Rename', icon: 'pencil', color: colors.organizer, onPress: onRename },
      { label: 'Delete', icon: 'trash-outline', color: colors.danger, onPress: onDelete },
    ]}>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.border,
        padding: spacing.md, gap: spacing.md,
      }}>
        <View style={{
          width: 18, height: 18, borderRadius: 9,
          backgroundColor: tag.color,
        }} />
        <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.body, fontWeight: '500' }}>
          {tag.name}
        </Text>
        <View style={{
          backgroundColor: colors.surface2, borderRadius: radius.full,
          paddingHorizontal: spacing.sm, paddingVertical: 3,
          minWidth: 28, alignItems: 'center',
        }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600' }}>
            {noteCount}
          </Text>
        </View>
        <Ionicons name="reorder-two-outline" size={16} color={colors.surface2} />
      </View>
    </SwipeableRow>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function TagsScreen() {
  const router = useRouter()
  const { tags, noteTagMap, loadTags, addTag, renameTag, deleteTag } = useOrganizerStore()

  useFocusEffect(useCallback(() => { loadTags() }, []))

  // Compute note count per tag from the already-loaded noteTagMap
  const noteCountByTag = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const tagIds of Object.values(noteTagMap)) {
      for (const tagId of tagIds) {
        counts[tagId] = (counts[tagId] ?? 0) + 1
      }
    }
    return counts
  }, [noteTagMap])

  // ── Rename sheet ──────────────────────────────────────────────────────────────
  const renameSheetRef = useRef<BottomSheet>(null)
  const [renameTarget, setRenameTarget] = useState<OrganizerTag | null>(null)
  const [renameText, setRenameText] = useState('')

  function openRename(tag: OrganizerTag) {
    setRenameTarget(tag)
    setRenameText(tag.name)
    renameSheetRef.current?.expand()
  }

  function submitRename() {
    const trimmed = renameText.trim()
    if (!trimmed) { Alert.alert('Name required', 'Tag name cannot be empty.'); return }
    if (renameTarget) renameTag(renameTarget.id, trimmed)
    renameSheetRef.current?.close()
    setRenameTarget(null)
  }

  // ── Add sheet ─────────────────────────────────────────────────────────────────
  const addSheetRef = useRef<BottomSheet>(null)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])

  function submitAdd() {
    const trimmed = newTagName.trim()
    if (!trimmed) { Alert.alert('Name required', 'Tag name cannot be empty.'); return }
    addTag(trimmed, newTagColor)
    setNewTagName('')
    setNewTagColor(TAG_COLORS[0])
    addSheetRef.current?.close()
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  function handleDelete(tag: OrganizerTag) {
    const count = noteCountByTag[tag.id] ?? 0
    Alert.alert(
      'Delete tag',
      count > 0
        ? `"${tag.name}" is used by ${count} ${count === 1 ? 'note' : 'notes'}. Removing it won't delete those notes.`
        : `Delete "${tag.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTag(tag.id) },
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
          Tags
        </Text>
        <Pressable onPress={() => addSheetRef.current?.expand()} style={{ padding: spacing.sm }}>
          <Ionicons name="add" size={26} color={colors.notes} />
        </Pressable>
      </View>

      {tags.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
          <Ionicons name="pricetag-outline" size={48} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>No tags yet</Text>
          <Pressable
            onPress={() => addSheetRef.current?.expand()}
            style={{
              backgroundColor: colors.notes, borderRadius: radius.md,
              paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: fontSize.body }}>Create tag</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xl }}
        >
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600', marginBottom: spacing.xs }}>
            {tags.length} {tags.length === 1 ? 'TAG' : 'TAGS'} · Swipe to rename or delete
          </Text>
          {tags.map((tag) => (
            <TagRow
              key={tag.id}
              tag={tag}
              noteCount={noteCountByTag[tag.id] ?? 0}
              onRename={() => openRename(tag)}
              onDelete={() => handleDelete(tag)}
            />
          ))}
        </ScrollView>
      )}

      {/* Rename sheet */}
      <BottomSheet
        ref={renameSheetRef}
        index={-1}
        snapPoints={['35%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={{ padding: spacing.lg, gap: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600' }}>
            Rename tag
          </Text>
          {renameTarget && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: renameTarget.color }} />
              <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>{renameTarget.name}</Text>
            </View>
          )}
          <TextInput
            value={renameText}
            onChangeText={setRenameText}
            placeholder="New name"
            placeholderTextColor={colors.textMuted}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submitRename}
            style={{
              backgroundColor: colors.surface2, borderRadius: radius.md,
              borderWidth: 1, borderColor: colors.border,
              color: colors.text, fontSize: fontSize.body,
              padding: spacing.md,
            }}
          />
          <Pressable
            onPress={submitRename}
            style={({ pressed }) => ({
              backgroundColor: colors.organizer, borderRadius: radius.md,
              padding: spacing.md, alignItems: 'center', opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: '#fff', fontSize: fontSize.body, fontWeight: '700' }}>Rename</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheet>

      {/* Add tag sheet */}
      <BottomSheet
        ref={addSheetRef}
        index={-1}
        snapPoints={['55%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={{ padding: spacing.lg, gap: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600' }}>
            New tag
          </Text>
          <TextInput
            value={newTagName}
            onChangeText={setNewTagName}
            placeholder="Tag name"
            placeholderTextColor={colors.textMuted}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submitAdd}
            style={{
              backgroundColor: colors.surface2, borderRadius: radius.md,
              borderWidth: 1, borderColor: colors.border,
              color: colors.text, fontSize: fontSize.body,
              padding: spacing.md,
            }}
          />
          {/* Color picker */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {TAG_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setNewTagColor(c)}
                style={{
                  width: 34, height: 34, borderRadius: 17, backgroundColor: c,
                  borderWidth: newTagColor === c ? 3 : 0, borderColor: '#fff',
                }}
              />
            ))}
          </View>
          {/* Preview */}
          {newTagName.trim().length > 0 && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
              backgroundColor: `${newTagColor}22`, borderRadius: radius.full,
              alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 4,
              borderWidth: 1, borderColor: `${newTagColor}55`,
            }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: newTagColor }} />
              <Text style={{ color: newTagColor, fontSize: fontSize.label, fontWeight: '600' }}>
                {newTagName.trim()}
              </Text>
            </View>
          )}
          <Pressable
            onPress={submitAdd}
            style={({ pressed }) => ({
              backgroundColor: newTagName.trim() ? newTagColor : colors.surface2,
              borderRadius: radius.md, padding: spacing.md,
              alignItems: 'center', opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: newTagName.trim() ? '#fff' : colors.textMuted, fontSize: fontSize.body, fontWeight: '700' }}>
              Create tag
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  )
}

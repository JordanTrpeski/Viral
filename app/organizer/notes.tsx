import { useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useOrganizerStore } from '@modules/organizer/organizerStore'
import SwipeableRow from '@core/components/SwipeableRow'
import type { OrganizerNote } from '@core/types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const diff = today.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function previewBody(body: string): string {
  const first = body.split('\n').find((l) => l.trim()) ?? ''
  return first.length > 80 ? first.slice(0, 80) + '…' : first
}

// ── Note card ──────────────────────────────────────────────────────────────────

function NoteCard({
  note, onPress, onPin, onArchive, onDelete,
}: {
  note: OrganizerNote
  onPress: () => void
  onPin: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const preview = previewBody(note.body)

  const rightActions = [
    {
      label: note.isPinned ? 'Unpin' : 'Pin',
      icon: (note.isPinned ? 'bookmark' : 'bookmark-outline') as any,
      color: colors.organizer,
      onPress: onPin,
    },
    {
      label: 'Archive',
      icon: 'archive-outline' as any,
      color: colors.textMuted,
      onPress: onArchive,
    },
    {
      label: 'Delete',
      icon: 'trash-outline' as any,
      color: colors.danger,
      onPress: onDelete,
    },
  ]

  return (
    <SwipeableRow rightActions={rightActions}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          backgroundColor: colors.surface, borderRadius: radius.md,
          borderWidth: 1, borderColor: colors.border,
          borderLeftWidth: note.isPinned ? 4 : 1,
          borderLeftColor: note.isPinned ? colors.organizer : colors.border,
          padding: spacing.md, gap: spacing.xs,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {note.isPinned && (
            <Ionicons name="bookmark" size={12} color={colors.organizer} />
          )}
          <Text
            style={{ flex: 1, color: colors.text, fontSize: fontSize.body, fontWeight: '600' }}
            numberOfLines={1}
          >
            {note.title ?? (preview || 'Untitled')}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
            {formatDate(note.updatedAt)}
          </Text>
        </View>
        {note.title && preview ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }} numberOfLines={2}>
            {preview}
          </Text>
        ) : null}
      </Pressable>
    </SwipeableRow>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function NotesScreen() {
  const router = useRouter()
  const { notes, tags, noteTagMap, loadNotes, loadTags, pinNote, archiveNote, removeNote } = useOrganizerStore()

  const [search,       setSearch]       = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [filterTagId,  setFilterTagId]  = useState<string | null>(null)

  useFocusEffect(useCallback(() => { loadNotes(); loadTags() }, []))

  const filtered = useMemo(() => {
    let list = notes.filter((n) => (showArchived ? n.isArchived : !n.isArchived))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((n) =>
        (n.title ?? '').toLowerCase().includes(q) || n.body.toLowerCase().includes(q),
      )
    }
    if (filterTagId) {
      list = list.filter((n) => (noteTagMap[n.id] ?? []).includes(filterTagId))
    }
    return list
  }, [notes, search, showArchived, filterTagId, noteTagMap])

  const pinned   = filtered.filter((n) => n.isPinned)
  const unpinned = filtered.filter((n) => !n.isPinned)

  function handleDelete(note: OrganizerNote) {
    Alert.alert('Delete Note', 'This note will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeNote(note.id) },
    ])
  }

  const isEmpty = filtered.length === 0

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
          Notes
        </Text>
        <Pressable
          onPress={() => setShowArchived((v) => !v)}
          style={{ padding: spacing.sm }}
        >
          <Ionicons
            name={showArchived ? 'archive' : 'archive-outline'}
            size={22}
            color={showArchived ? colors.organizer : colors.textMuted}
          />
        </Pressable>
        <Pressable
          onPress={() => router.push('/organizer/note-edit' as never)}
          style={{ padding: spacing.sm }}
        >
          <Ionicons name="add" size={26} color={colors.notes} />
        </Pressable>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: colors.surface, borderRadius: radius.md,
          borderWidth: 1, borderColor: colors.border,
          paddingHorizontal: spacing.sm, gap: spacing.xs,
        }}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            value={search} onChangeText={setSearch}
            placeholder="Search notes…" placeholderTextColor={colors.textMuted}
            style={{ flex: 1, color: colors.text, fontSize: fontSize.body, paddingVertical: spacing.sm }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Tag filter pills */}
      {tags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.xs }}
          style={{ flexGrow: 0 }}
        >
          <Pressable
            onPress={() => setFilterTagId(null)}
            style={{
              paddingHorizontal: spacing.sm, paddingVertical: 4,
              borderRadius: radius.full,
              backgroundColor: filterTagId === null ? colors.notes : colors.surface,
              borderWidth: 1, borderColor: filterTagId === null ? colors.notes : colors.border,
            }}
          >
            <Text style={{ color: filterTagId === null ? '#fff' : colors.textMuted, fontSize: fontSize.micro, fontWeight: '600' }}>All</Text>
          </Pressable>
          {tags.map((tag) => (
            <Pressable
              key={tag.id}
              onPress={() => setFilterTagId(filterTagId === tag.id ? null : tag.id)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: spacing.sm, paddingVertical: 4,
                borderRadius: radius.full,
                backgroundColor: filterTagId === tag.id ? `${tag.color}22` : colors.surface,
                borderWidth: 1, borderColor: filterTagId === tag.id ? tag.color : colors.border,
              }}
            >
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tag.color }} />
              <Text style={{ color: filterTagId === tag.id ? tag.color : colors.textMuted, fontSize: fontSize.micro, fontWeight: '600' }}>
                {tag.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {isEmpty ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
          <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>
            {showArchived ? 'No archived notes' : 'No notes yet'}
          </Text>
          {!showArchived && (
            <Pressable
              onPress={() => router.push('/organizer/note-edit' as never)}
              style={{
                backgroundColor: colors.notes, borderRadius: radius.md,
                paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: fontSize.body }}>New note</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.xs }}
        >
          {pinned.length > 0 && (
            <>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600', marginBottom: spacing.xs }}>
                PINNED · {pinned.length}
              </Text>
              {pinned.map((n) => (
                <NoteCard
                  key={n.id} note={n}
                  onPress={() => router.push(`/organizer/note-edit?id=${n.id}` as never)}
                  onPin={() => pinNote(n.id, !n.isPinned)}
                  onArchive={() => archiveNote(n.id, !n.isArchived)}
                  onDelete={() => handleDelete(n)}
                />
              ))}
              {unpinned.length > 0 && (
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600', marginTop: spacing.sm, marginBottom: spacing.xs }}>
                  NOTES · {unpinned.length}
                </Text>
              )}
            </>
          )}
          {unpinned.map((n) => (
            <NoteCard
              key={n.id} note={n}
              onPress={() => router.push(`/organizer/note-edit?id=${n.id}` as never)}
              onPin={() => pinNote(n.id, !n.isPinned)}
              onArchive={() => archiveNote(n.id, !n.isArchived)}
              onDelete={() => handleDelete(n)}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

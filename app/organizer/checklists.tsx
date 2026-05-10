import { useEffect, useRef, useState } from 'react'
import { View, Text, TextInput, ScrollView, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import GorhomBottomSheet from '@gorhom/bottom-sheet'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { BottomSheet, ProgressBar, SwipeableRow } from '@core/components'
import { useChecklistStore } from '@modules/checklist/checklistStore'
import type { ChecklistWithProgress } from '@core/db/checklistQueries'

const BottomSheetTextInput = TextInput

function ChecklistCard({ item, onPress, onRename, onDelete, onUseTemplate }: {
  item: ChecklistWithProgress
  onPress: () => void
  onRename: () => void
  onDelete: () => void
  onUseTemplate: () => void
}) {
  const progress = item.totalItems > 0 ? item.checkedItems / item.totalItems : 0
  const isDone = item.totalItems > 0 && item.checkedItems === item.totalItems

  return (
    <SwipeableRow
      rightActions={[
        { label: 'Rename', icon: 'pencil-outline', color: colors.checklist, onPress: onRename },
        { label: 'Delete', icon: 'trash-outline', color: colors.danger, onPress: onDelete },
      ]}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: isDone ? `${colors.success}44` : colors.border,
          padding: spacing.md,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
          <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' }}>
            {item.name}
          </Text>
          {item.isTemplate && (
            <View style={{ backgroundColor: `${colors.checklist}22`, borderRadius: radius.full, paddingHorizontal: spacing.xs, paddingVertical: 2, marginLeft: spacing.xs }}>
              <Text style={{ color: colors.checklist, fontSize: fontSize.micro, fontWeight: '600' }}>TEMPLATE</Text>
            </View>
          )}
          {isDone && (
            <Ionicons name="checkmark-circle" size={18} color={colors.success} style={{ marginLeft: spacing.xs }} />
          )}
        </View>

        {item.totalItems > 0 ? (
          <>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.xs }}>
              {item.checkedItems} of {item.totalItems} done
            </Text>
            <ProgressBar progress={progress} color={isDone ? colors.success : colors.checklist} height={3} />
          </>
        ) : (
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>No items yet</Text>
        )}

        {item.isTemplate && (
          <Pressable
            onPress={onUseTemplate}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              marginTop: spacing.sm, paddingVertical: spacing.xs,
              borderTopWidth: 1, borderTopColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="copy-outline" size={14} color={colors.checklist} />
            <Text style={{ color: colors.checklist, fontSize: fontSize.label, fontWeight: '600', marginLeft: 4 }}>
              Use Template
            </Text>
          </Pressable>
        )}
      </Pressable>
    </SwipeableRow>
  )
}

export default function ChecklistsScreen() {
  const router = useRouter()
  const { checklists, loadChecklists, createChecklist, deleteChecklist, renameChecklist, setTemplate, startFromTemplate } = useChecklistStore()
  const sheetRef = useRef<GorhomBottomSheet>(null)
  const [newName, setNewName] = useState('')

  useEffect(() => { loadChecklists() }, [])

  function handleCreate() {
    if (!newName.trim()) return
    const id = createChecklist(newName.trim())
    setNewName('')
    sheetRef.current?.close()
    router.push({ pathname: '/checklist/[id]', params: { id } } as never)
  }

  function handleRename(id: string, currentName: string) {
    Alert.prompt(
      'Rename',
      '',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: (name) => { if (name?.trim()) renameChecklist(id, name.trim()) } },
      ],
      'plain-text',
      currentName,
    )
  }

  function handleDelete(id: string, name: string) {
    Alert.alert(
      'Delete Checklist',
      `Delete "${name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteChecklist(id) },
      ],
    )
  }

  function handleUseTemplate(id: string) {
    const newId = startFromTemplate(id)
    router.push({ pathname: '/checklist/[id]', params: { id: newId } } as never)
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
          Checklists
        </Text>
        <Pressable
          onPress={() => sheetRef.current?.expand()}
          style={({ pressed }) => ({
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: colors.checklist,
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl }}
      >
        {checklists.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body, textAlign: 'center' }}>
              No checklists yet.
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, textAlign: 'center', marginTop: spacing.xs }}>
              Tap + to create your first one.
            </Text>
          </View>
        )}

        {checklists.map((item) => (
          <ChecklistCard
            key={item.id}
            item={item}
            onPress={() => router.push({ pathname: '/checklist/[id]', params: { id: item.id } } as never)}
            onRename={() => handleRename(item.id, item.name)}
            onDelete={() => handleDelete(item.id, item.name)}
            onToggleTemplate={() => setTemplate(item.id, !item.isTemplate)}
            onUseTemplate={() => handleUseTemplate(item.id)}
          />
        ))}
      </ScrollView>

      <BottomSheet ref={sheetRef} snapPoints={['35%']}>
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600' }}>
            New Checklist
          </Text>
          <BottomSheetTextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Checklist name…"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            onSubmitEditing={handleCreate}
            style={{
              backgroundColor: colors.surface2,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text,
              fontSize: fontSize.body,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            }}
            selectionColor={colors.checklist}
            autoFocus
          />
          <Pressable
            onPress={handleCreate}
            disabled={!newName.trim()}
            style={({ pressed }) => ({
              backgroundColor: newName.trim() ? colors.checklist : colors.surface2,
              borderRadius: radius.md,
              paddingVertical: spacing.sm + 2,
              alignItems: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: newName.trim() ? '#fff' : colors.textMuted, fontSize: fontSize.body, fontWeight: '600' }}>
              Create
            </Text>
          </Pressable>
        </View>
      </BottomSheet>
    </SafeAreaView>
  )
}

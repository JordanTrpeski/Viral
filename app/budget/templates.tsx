import { useEffect } from 'react'
import { View, Text, ScrollView, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useBudgetStore } from '@modules/budget/budgetStore'
import type { BudgetTemplate } from '@core/db/budgetQueries'

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({ template, onUse, onEdit, onDelete }: {
  template: BudgetTemplate
  onUse: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const lastUsed = template.lastUsedAt
    ? (() => {
        const d = new Date(template.lastUsedAt)
        const today = new Date()
        const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 0) return 'Used today'
        if (diffDays === 1) return 'Used yesterday'
        if (diffDays < 30) return `Used ${diffDays}d ago`
        return `Used ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
      })()
    : 'Never used'

  function confirmDelete() {
    Alert.alert('Delete template?', `"${template.name}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ])
  }

  return (
    <View style={{
      backgroundColor: colors.surface, borderRadius: radius.lg,
      borderWidth: 1, borderColor: colors.border,
      overflow: 'hidden',
    }}>
      {/* Top row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm }}>
        <View style={{
          width: 40, height: 40, borderRadius: radius.md,
          backgroundColor: `${colors.budget}22`,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name="copy-outline" size={20} color={colors.budget} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }}>{template.name}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: 2 }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
              {template.itemCount} {template.itemCount === 1 ? 'item' : 'items'}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
              Est. €{template.estimatedTotal.toFixed(2)}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>{lastUsed}</Text>
          </View>
        </View>
      </View>

      {/* Action row */}
      <View style={{
        flexDirection: 'row',
        borderTopWidth: 1, borderTopColor: colors.border,
      }}>
        <Pressable
          onPress={onUse}
          style={({ pressed }) => ({
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: spacing.xs, paddingVertical: spacing.sm,
            backgroundColor: pressed ? `${colors.budget}22` : 'transparent',
          })}
        >
          <Ionicons name="flash-outline" size={16} color={colors.budget} />
          <Text style={{ color: colors.budget, fontSize: fontSize.label, fontWeight: '600' }}>Use</Text>
        </Pressable>
        <View style={{ width: 1, backgroundColor: colors.border }} />
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => ({
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: spacing.xs, paddingVertical: spacing.sm,
            backgroundColor: pressed ? colors.surface2 : 'transparent',
          })}
        >
          <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Edit</Text>
        </Pressable>
        <View style={{ width: 1, backgroundColor: colors.border }} />
        <Pressable
          onPress={confirmDelete}
          style={({ pressed }) => ({
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: spacing.xs, paddingVertical: spacing.sm,
            backgroundColor: pressed ? `${colors.danger}22` : 'transparent',
          })}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={{ color: colors.danger, fontSize: fontSize.label }}>Delete</Text>
        </Pressable>
      </View>
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function TemplatesScreen() {
  const router = useRouter()
  const { templates, loadTemplates, removeTemplate } = useBudgetStore()

  useEffect(() => { loadTemplates() }, [])

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
          Expense Templates
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        {templates.length > 0 ? (
          templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onUse={() => router.push(`/budget/add-expense?templateId=${t.id}` as never)}
              onEdit={() => router.push(`/budget/template-edit?id=${t.id}` as never)}
              onDelete={() => removeTemplate(t.id)}
            />
          ))
        ) : (
          <View style={{
            backgroundColor: colors.surface, borderRadius: radius.lg,
            borderWidth: 1, borderColor: colors.border,
            padding: spacing.xl, alignItems: 'center', gap: spacing.md,
          }}>
            <Ionicons name="copy-outline" size={40} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body, textAlign: 'center' }}>
              No templates yet.{'\n'}Save an expense as a template to reuse it.
            </Text>
            <Pressable
              onPress={() => router.push('/budget/add-expense' as never)}
              style={({ pressed }) => ({
                backgroundColor: colors.budget, borderRadius: radius.md,
                paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ color: '#000', fontSize: fontSize.body, fontWeight: '700' }}>Add Expense</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

import { useState } from 'react'
import { View, Text, Pressable, TextInput, Switch } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { TEMPLATE_VARS, resolvePreview, type DraftRule } from './organizerUtils'

export type { DraftRule }

interface RuleRowProps {
  rule: DraftRule
  accentColor?: string
  onChange: (updated: DraftRule) => void
  onDelete: () => void
}

export default function RuleRow({ rule, accentColor = colors.organizer, onChange, onDelete }: RuleRowProps) {
  const [expanded, setExpanded] = useState(rule.isNew)

  return (
    <View style={{
      backgroundColor: colors.surface2, borderRadius: radius.md,
      borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    }}>
      {/* Collapsed header */}
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.sm, gap: spacing.sm }}
      >
        <Switch
          value={rule.isEnabled}
          onValueChange={(v) => onChange({ ...rule, isEnabled: v })}
          trackColor={{ false: colors.surface2, true: `${accentColor}80` }}
          thumbColor={rule.isEnabled ? accentColor : colors.textMuted}
        />
        <Text style={{ flex: 1, color: rule.isEnabled ? colors.text : colors.textMuted, fontSize: fontSize.body, fontWeight: '500' }}>
          {rule.daysBefore === '0' ? 'Day of birthday' : `${rule.daysBefore || '?'} days before`}
          <Text style={{ color: colors.textMuted, fontWeight: '400' }}>{' · '}{rule.notificationTime}</Text>
        </Text>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
        </Pressable>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </Pressable>

      {expanded && (
        <View style={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, gap: spacing.sm }}>
          {/* Days before + time */}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginBottom: 4 }}>DAYS BEFORE</Text>
              <TextInput
                value={rule.daysBefore}
                onChangeText={(v) => onChange({ ...rule, daysBefore: v.replace(/[^0-9]/g, '') })}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                style={{
                  backgroundColor: colors.surface, borderRadius: radius.sm,
                  color: colors.text, fontSize: fontSize.body,
                  paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2,
                  borderWidth: 1, borderColor: colors.border,
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginBottom: 4 }}>TIME (HH:MM)</Text>
              <TextInput
                value={rule.notificationTime}
                onChangeText={(v) => onChange({ ...rule, notificationTime: v })}
                placeholder="09:00"
                placeholderTextColor={colors.textMuted}
                style={{
                  backgroundColor: colors.surface, borderRadius: radius.sm,
                  color: colors.text, fontSize: fontSize.body,
                  paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2,
                  borderWidth: 1, borderColor: colors.border,
                }}
              />
            </View>
          </View>

          {/* Message template */}
          <View>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginBottom: 4 }}>MESSAGE TEMPLATE</Text>
            <TextInput
              value={rule.messageTemplate}
              onChangeText={(v) => onChange({ ...rule, messageTemplate: v })}
              multiline
              placeholder="e.g. [Name]'s birthday is in [Days] days!"
              placeholderTextColor={colors.textMuted}
              style={{
                backgroundColor: colors.surface, borderRadius: radius.sm,
                color: colors.text, fontSize: fontSize.body,
                paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2,
                borderWidth: 1, borderColor: colors.border,
                minHeight: 56,
              }}
            />
            {/* Variable chips */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs }}>
              {TEMPLATE_VARS.map((v) => (
                <Pressable
                  key={v}
                  onPress={() => onChange({ ...rule, messageTemplate: rule.messageTemplate + v })}
                  style={{
                    backgroundColor: `${accentColor}22`, borderRadius: radius.full,
                    paddingHorizontal: spacing.sm, paddingVertical: 2,
                    borderWidth: 1, borderColor: `${accentColor}44`,
                  }}
                >
                  <Text style={{ color: accentColor, fontSize: fontSize.micro, fontWeight: '600' }}>{v}</Text>
                </Pressable>
              ))}
            </View>
            {/* Preview */}
            {rule.messageTemplate.trim().length > 0 && (
              <View style={{
                marginTop: spacing.xs, backgroundColor: colors.surface,
                borderRadius: radius.sm, padding: spacing.xs + 2,
                borderWidth: 1, borderColor: colors.border,
              }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>PREVIEW</Text>
                <Text style={{ color: colors.text, fontSize: fontSize.label, marginTop: 2 }}>
                  {resolvePreview(rule.messageTemplate)}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  )
}

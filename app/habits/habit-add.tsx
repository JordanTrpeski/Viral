import { useState } from 'react'
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, fonts, radius, spacing } from '@core/theme'
import { Button, Card } from '@core/components'
import { useHabitStore } from '@modules/habits/habitStore'
import type { HabitFrequency } from '@core/types'

const ICONS = ['✓', '💧', '🏋️', '📚', '🧘', '🥗', '🚶', '💊']
const COLOR_OPTIONS = [colors.habits, colors.primary, colors.water, colors.warning, colors.organizer, colors.danger]
const FREQUENCIES: { id: HabitFrequency; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'weekends', label: 'Weekends' },
  { id: 'custom', label: 'Custom' },
]
const DAYS = [
  { id: 1, label: 'M' }, { id: 2, label: 'T' }, { id: 3, label: 'W' }, { id: 4, label: 'T' },
  { id: 5, label: 'F' }, { id: 6, label: 'S' }, { id: 7, label: 'S' },
]

export default function HabitAddScreen() {
  const router = useRouter()
  const addHabit = useHabitStore((s) => s.addHabit)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(ICONS[0])
  const [color, setColor] = useState(COLOR_OPTIONS[0])
  const [frequency, setFrequency] = useState<HabitFrequency>('daily')
  const [customDays, setCustomDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [reminderTime, setReminderTime] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give this habit a name first.')
      return
    }
    setSaving(true)
    await addHabit({
      name,
      icon,
      color,
      frequency,
      customDays: frequency === 'custom' ? customDays : [],
      reminderTime: reminderTime.trim() || null,
    })
    setSaving(false)
    router.replace('/(tabs)/habits' as never)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.sm, marginRight: spacing.sm }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', flex: 1 }}>New Habit</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Card>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.xs }}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Morning walk"
            placeholderTextColor={colors.textMuted}
            style={{ color: colors.text, backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, fontSize: fontSize.body }}
          />
        </Card>

        <Card>
          <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', marginBottom: spacing.sm }}>Icon</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {ICONS.map((i) => (
              <Pressable key={i} onPress={() => setIcon(i)}>
                <View style={{ width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: icon === i ? colors.surface2 : colors.bg, borderWidth: 1, borderColor: icon === i ? colors.primary : colors.border }}>
                  <Text style={{ fontSize: 20 }}>{i}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', marginBottom: spacing.sm }}>Color</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {COLOR_OPTIONS.map((c) => (
              <Pressable key={c} onPress={() => setColor(c)}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c, borderWidth: color === c ? 3 : 1, borderColor: color === c ? colors.text : colors.border }} />
              </Pressable>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', marginBottom: spacing.sm }}>Frequency</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {FREQUENCIES.map((f) => (
              <Pressable key={f.id} onPress={() => setFrequency(f.id)}>
                <View style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: frequency === f.id ? colors.primary : colors.surface2, borderWidth: 1, borderColor: frequency === f.id ? colors.primary : colors.border }}>
                  <Text style={{ color: frequency === f.id ? colors.bg : colors.textMuted, fontSize: fontSize.label, fontWeight: '600' }}>{f.label}</Text>
                </View>
              </Pressable>
            ))}
          </View>
          {frequency === 'custom' && (
            <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md }}>
              {DAYS.map((d) => {
                const selected = customDays.includes(d.id)
                return (
                  <Pressable key={d.id} onPress={() => setCustomDays((prev) => selected ? prev.filter((x) => x !== d.id) : [...prev, d.id].sort())}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.habits : colors.surface2, borderWidth: 1, borderColor: selected ? colors.habits : colors.border }}>
                      <Text style={{ color: selected ? colors.bg : colors.textMuted, fontSize: fontSize.label, fontWeight: '700' }}>{d.label}</Text>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          )}
        </Card>

        <Card>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.xs }}>Reminder time (optional)</Text>
          <TextInput
            value={reminderTime}
            onChangeText={setReminderTime}
            placeholder="HH:MM"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            style={{ color: colors.text, backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, fontSize: fontSize.body, fontFamily: `${fonts.mono}_400Regular` }}
          />
        </Card>

        <Button label="Save Habit" onPress={handleSave} loading={saving} fullWidth />
      </ScrollView>
    </SafeAreaView>
  )
}

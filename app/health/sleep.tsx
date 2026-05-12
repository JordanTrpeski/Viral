import { useCallback, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, fonts, radius, spacing } from '@core/theme'
import { Button, Card } from '@core/components'
import { localDateStr } from '@core/utils/units'
import { useSleepStore } from '@modules/health/sleep/sleepStore'

function isoFor(date: string, time: string, plusDay = false): string {
  const d = new Date(`${date}T${time || '00:00'}:00`)
  if (plusDay) d.setDate(d.getDate() + 1)
  return d.toISOString()
}

function durationMinutes(bed: string, wake: string): number {
  const today = localDateStr()
  const bedDate = isoFor(today, bed)
  const wakeDate = isoFor(today, wake, wake <= bed)
  return Math.max(0, Math.round((new Date(wakeDate).getTime() - new Date(bedDate).getTime()) / 60000))
}

function hoursLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

export default function SleepScreen() {
  const router = useRouter()
  const { todayLog, history, bedtimeReminder, wakeReminder, loadSleep, saveSleep, setReminder } = useSleepStore()
  const [bedtime, setBedtime] = useState('23:00')
  const [wakeTime, setWakeTime] = useState('07:00')
  const [quality, setQuality] = useState(3)
  const [notes, setNotes] = useState('')
  const [bedReminder, setBedReminder] = useState(bedtimeReminder ?? '')
  const [wakeReminderText, setWakeReminderText] = useState(wakeReminder ?? '')

  useFocusEffect(useCallback(() => {
    loadSleep()
  }, []))

  useFocusEffect(useCallback(() => {
    if (todayLog) {
      setBedtime(todayLog.bedtime.slice(11, 16))
      setWakeTime(todayLog.wakeTime.slice(11, 16))
      setQuality(todayLog.quality ?? 3)
      setNotes(todayLog.notes ?? '')
    }
    setBedReminder(bedtimeReminder ?? '')
    setWakeReminderText(wakeReminder ?? '')
  }, [todayLog?.id, bedtimeReminder, wakeReminder]))

  const duration = useMemo(() => durationMinutes(bedtime, wakeTime), [bedtime, wakeTime])
  const average = history.length > 0 ? Math.round(history.reduce((s, h) => s + h.durationMinutes, 0) / history.length) : 0

  function handleSave() {
    const date = localDateStr()
    if (!/^\d{2}:\d{2}$/.test(bedtime) || !/^\d{2}:\d{2}$/.test(wakeTime)) {
      Alert.alert('Use HH:MM time', 'Enter bedtime and wake time like 23:00 and 07:00.')
      return
    }
    saveSleep({
      date,
      bedtime: isoFor(date, bedtime),
      wakeTime: isoFor(date, wakeTime, wakeTime <= bedtime),
      durationMinutes: duration,
      quality,
      notes: notes.trim() || null,
    })
    Alert.alert('Saved', 'Sleep log updated.')
  }

  async function saveReminders() {
    await setReminder('bedtime', bedReminder.trim() || null)
    await setReminder('wake', wakeReminderText.trim() || null)
    Alert.alert('Saved', 'Sleep reminders updated.')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.sm, marginRight: spacing.sm }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', flex: 1 }}>Sleep</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Card>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Duration</Text>
          <Text style={{ color: colors.text, fontSize: 36, fontWeight: '700', fontFamily: `${fonts.mono}_700Bold`, marginVertical: spacing.sm }}>{hoursLabel(duration)}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TimeField label="Went to bed" value={bedtime} onChange={setBedtime} />
            <TimeField label="Woke up" value={wakeTime} onChange={setWakeTime} />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginTop: spacing.md, marginBottom: spacing.xs }}>Quality</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {[1, 2, 3, 4, 5].map((q) => (
              <Pressable key={q} onPress={() => setQuality(q)}>
                <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: quality >= q ? colors.sleep : colors.surface2 }}>
                  <Text style={{ color: quality >= q ? colors.bg : colors.textMuted, fontWeight: '700' }}>{q}</Text>
                </View>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes"
            placeholderTextColor={colors.textMuted}
            multiline
            style={{ color: colors.text, backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, minHeight: 80, marginTop: spacing.md }}
          />
          <Button label="Save Sleep" onPress={handleSave} fullWidth style={{ marginTop: spacing.md }} />
        </Card>

        <Card>
          <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', marginBottom: spacing.md }}>Last 7 nights</Text>
          <View style={{ height: 150, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
            {history.map((log) => {
              const pct = Math.min(1, log.durationMinutes / 600)
              const barColor = log.durationMinutes >= 420 ? colors.success : log.durationMinutes >= 300 ? colors.warning : colors.danger
              return (
                <View key={log.id} style={{ flex: 1, alignItems: 'center', gap: spacing.xs }}>
                  <View style={{ width: '100%', height: Math.max(8, 120 * pct), borderRadius: radius.sm, backgroundColor: barColor }} />
                  <Text style={{ color: colors.textMuted, fontSize: 9 }}>{log.date.slice(5)}</Text>
                </View>
              )
            })}
          </View>
          <View style={{ height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.borderAccent, marginTop: -96, marginBottom: 96 }} />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Weekly average {hoursLabel(average)}</Text>
        </Card>

        <Card>
          <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', marginBottom: spacing.sm }}>Reminders</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TimeField label="Bedtime" value={bedReminder} onChange={setBedReminder} placeholder="Off" />
            <TimeField label="Wake-up" value={wakeReminderText} onChange={setWakeReminderText} placeholder="Off" />
          </View>
          <Button label="Save Reminders" onPress={saveReminders} variant="secondary" fullWidth style={{ marginTop: spacing.md }} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

function TimeField({ label, value, onChange, placeholder = 'HH:MM' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.xs }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType="numbers-and-punctuation"
        maxLength={5}
        style={{ color: colors.text, backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, fontSize: fontSize.body, fontFamily: `${fonts.mono}_400Regular` }}
      />
    </View>
  )
}

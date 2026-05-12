import { useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, fonts, radius, spacing } from '@core/theme'
import { Button, Card } from '@core/components'

function relative(date: Date): string {
  const diff = Date.now() - date.getTime()
  const abs = Math.abs(diff)
  const units: [number, string][] = [[86400000, 'day'], [3600000, 'hour'], [60000, 'minute'], [1000, 'second']]
  const [size, label] = units.find(([ms]) => abs >= ms) ?? [1000, 'second']
  const value = Math.round(abs / size)
  return diff >= 0 ? `${value} ${label}${value === 1 ? '' : 's'} ago` : `in ${value} ${label}${value === 1 ? '' : 's'}`
}

export default function TimestampScreen() {
  const router = useRouter()
  const [timestamp, setTimestamp] = useState(String(Date.now()))
  const parsed = useMemo(() => {
    const n = Number(timestamp)
    if (!Number.isFinite(n)) return null
    return new Date(n > 1e12 ? n : n * 1000)
  }, [timestamp])
  const iso = parsed?.toISOString() ?? ''
  const local = parsed?.toLocaleString() ?? ''
  const rel = parsed ? relative(parsed) : ''

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.sm, marginRight: spacing.sm }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', flex: 1 }}>Timestamp</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Card>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.xs }}>Unix timestamp</Text>
          <TextInput value={timestamp} onChangeText={setTimestamp} keyboardType="numeric" style={{ color: colors.text, backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, fontSize: fontSize.body, fontFamily: `${fonts.mono}_400Regular` }} />
        </Card>
        <Button label="Now" onPress={() => setTimestamp(String(Date.now()))} />
        {[
          ['UTC', iso],
          ['Local', local],
          ['Relative', rel],
          ['Seconds', parsed ? String(Math.floor(parsed.getTime() / 1000)) : ''],
          ['Milliseconds', parsed ? String(parsed.getTime()) : ''],
        ].map(([label, value]) => (
          <Card key={label}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>{label}</Text>
            <Pressable onPress={async () => { await Clipboard.setStringAsync(value); Alert.alert('Copied') }}>
              <Text style={{ color: colors.text, fontSize: fontSize.body, marginTop: spacing.xs, fontFamily: `${fonts.mono}_400Regular` }}>{value || 'Invalid date'}</Text>
            </Pressable>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

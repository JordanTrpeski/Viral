import { useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, fonts, radius, spacing } from '@core/theme'
import { Button, Card } from '@core/components'

export default function UrlEncoderScreen() {
  const router = useRouter()
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        setError('')
        setOutput(input ? (mode === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input)) : '')
      } catch (err) {
        setOutput('')
        setError(err instanceof Error ? err.message : 'Conversion failed')
      }
    }, 300)
    return () => clearTimeout(id)
  }, [input, mode])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="URL Encoder" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {(['encode', 'decode'] as const).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={{ flex: 1 }}>
              <View style={{ alignItems: 'center', padding: spacing.sm, borderRadius: radius.md, backgroundColor: mode === m ? colors.primary : colors.surface2 }}>
                <Text style={{ color: mode === m ? colors.bg : colors.textMuted, fontWeight: '700', textTransform: 'capitalize' }}>{m}</Text>
              </View>
            </Pressable>
          ))}
        </View>
        <Area label="Input" value={input} onChange={setInput} />
        {error ? <Text style={{ color: colors.danger, fontSize: fontSize.label }}>{error}</Text> : null}
        <Area label="Output" value={output} onChange={setOutput} editable={false} />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button label="Copy" onPress={async () => { await Clipboard.setStringAsync(output); Alert.alert('Copied') }} disabled={!output} style={{ flex: 1 }} />
          <Button label="Clear" onPress={() => { setInput(''); setOutput(''); setError('') }} variant="secondary" style={{ flex: 1 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Pressable onPress={onBack} style={{ padding: spacing.sm, marginRight: spacing.sm }}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
      <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', flex: 1 }}>{title}</Text>
    </View>
  )
}

function Area({ label, value, onChange, editable = true }: { label: string; value: string; onChange: (value: string) => void; editable?: boolean }) {
  return (
    <Card>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.xs }}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} editable={editable} multiline placeholder={label} placeholderTextColor={colors.textMuted} style={{ color: colors.text, minHeight: 120, textAlignVertical: 'top', fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.label }} />
    </Card>
  )
}

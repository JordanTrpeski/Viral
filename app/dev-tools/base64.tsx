import { useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, fonts, radius, spacing } from '@core/theme'
import { Button, Card } from '@core/components'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function encodeBase64(text: string): string {
  const bytes = Array.from(unescape(encodeURIComponent(text))).map((c) => c.charCodeAt(0))
  let output = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1] ?? 0
    const c = bytes[i + 2] ?? 0
    const triplet = (a << 16) | (b << 8) | c
    output += CHARS[(triplet >> 18) & 63]
    output += CHARS[(triplet >> 12) & 63]
    output += i + 1 < bytes.length ? CHARS[(triplet >> 6) & 63] : '='
    output += i + 2 < bytes.length ? CHARS[triplet & 63] : '='
  }
  return output
}

function decodeBase64(text: string): string {
  const clean = text.replace(/\s/g, '')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) throw new Error('Invalid base64 input')
  let binary = ''
  for (let i = 0; i < clean.length; i += 4) {
    const chunk = clean.slice(i, i + 4)
    const nums = chunk.split('').map((ch) => ch === '=' ? 0 : CHARS.indexOf(ch))
    const triple = ((nums[0] ?? 0) << 18) | ((nums[1] ?? 0) << 12) | ((nums[2] ?? 0) << 6) | (nums[3] ?? 0)
    binary += String.fromCharCode((triple >> 16) & 255)
    if (chunk[2] !== '=') binary += String.fromCharCode((triple >> 8) & 255)
    if (chunk[3] !== '=') binary += String.fromCharCode(triple & 255)
  }
  return decodeURIComponent(escape(binary))
}

export default function Base64Screen() {
  const router = useRouter()
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        setError('')
        setOutput(input ? (mode === 'encode' ? encodeBase64(input) : decodeBase64(input)) : '')
      } catch (err) {
        setOutput('')
        setError(err instanceof Error ? err.message : 'Conversion failed')
      }
    }, 300)
    return () => clearTimeout(id)
  }, [input, mode])

  return (
    <ConverterShell title="Base64" onBack={() => router.back()}>
      <ModeToggle mode={mode} setMode={setMode} />
      <TextArea label="Input" value={input} onChange={setInput} />
      {error ? <Text style={{ color: colors.danger, fontSize: fontSize.label }}>{error}</Text> : null}
      <TextArea label="Output" value={output} onChange={setOutput} editable={false} />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button label="Copy" onPress={async () => { await Clipboard.setStringAsync(output); Alert.alert('Copied') }} disabled={!output} style={{ flex: 1 }} />
        <Button label="Clear" onPress={() => { setInput(''); setOutput(''); setError('') }} variant="secondary" style={{ flex: 1 }} />
      </View>
    </ConverterShell>
  )
}

function ConverterShell({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={onBack} style={{ padding: spacing.sm, marginRight: spacing.sm }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', flex: 1 }}>{title}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>{children}</ScrollView>
    </SafeAreaView>
  )
}

function ModeToggle({ mode, setMode }: { mode: 'encode' | 'decode'; setMode: (mode: 'encode' | 'decode') => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {(['encode', 'decode'] as const).map((m) => (
        <Pressable key={m} onPress={() => setMode(m)} style={{ flex: 1 }}>
          <View style={{ alignItems: 'center', padding: spacing.sm, borderRadius: radius.md, backgroundColor: mode === m ? colors.primary : colors.surface2 }}>
            <Text style={{ color: mode === m ? colors.bg : colors.textMuted, fontWeight: '700', textTransform: 'capitalize' }}>{m}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  )
}

function TextArea({ label, value, onChange, editable = true }: { label: string; value: string; onChange: (value: string) => void; editable?: boolean }) {
  return (
    <Card>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.xs }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        editable={editable}
        multiline
        placeholder={label}
        placeholderTextColor={colors.textMuted}
        style={{ color: colors.text, minHeight: 120, textAlignVertical: 'top', fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.label }}
      />
    </Card>
  )
}

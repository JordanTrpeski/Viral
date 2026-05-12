import { useState } from 'react'
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, fonts, radius, spacing } from '@core/theme'
import { Button, Card } from '@core/components'

export default function JsonFormatterScreen() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  function parseJson(): unknown {
    try {
      setError('')
      return JSON.parse(input)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid JSON'
      setError(message)
      throw err
    }
  }

  function format() {
    try { setOutput(JSON.stringify(parseJson(), null, 2)) } catch { /* message is stored */ }
  }

  function minify() {
    try { setOutput(JSON.stringify(parseJson())) } catch { /* message is stored */ }
  }

  async function copy() {
    await Clipboard.setStringAsync(output)
    Alert.alert('Copied', 'Formatted JSON copied.')
  }

  return (
    <ToolShell title="JSON Formatter" onBack={() => router.back()}>
      <Card>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Paste raw JSON"
          placeholderTextColor={colors.textMuted}
          multiline
          style={{ color: colors.text, minHeight: 160, textAlignVertical: 'top', fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.label }}
        />
      </Card>
      {error ? <Text style={{ color: colors.danger, fontSize: fontSize.label }}>{error}</Text> : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button label="Format" onPress={format} style={{ flex: 1 }} />
        <Button label="Minify" onPress={minify} variant="secondary" style={{ flex: 1 }} />
      </View>
      <Card>
        <ScrollView horizontal>
          <Text style={{ fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.label, lineHeight: 18 }}>
            {output.split('\n').map((line, index) => (
              <Text key={`${index}-${line}`} style={{ color: line.includes(':') ? colors.text : colors.textMuted }}>
                {line.replace(/("[^"]+"):/g, '$1:')}{'\n'}
              </Text>
            ))}
          </Text>
        </ScrollView>
      </Card>
      <Button label="Copy Output" onPress={copy} disabled={!output} fullWidth />
    </ToolShell>
  )
}

function ToolShell({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
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

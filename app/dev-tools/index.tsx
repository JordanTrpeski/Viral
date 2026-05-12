import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, radius, spacing } from '@core/theme'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const TOOLS: { title: string; subtitle: string; icon: IoniconsName; route: string }[] = [
  { title: 'JSON Formatter', subtitle: 'Format, minify, validate', icon: 'code-slash-outline', route: '/dev-tools/json-formatter' },
  { title: 'Base64', subtitle: 'Encode and decode text', icon: 'swap-horizontal-outline', route: '/dev-tools/base64' },
  { title: 'URL Encoder', subtitle: 'Escape query strings', icon: 'link-outline', route: '/dev-tools/url-encoder' },
  { title: 'Timestamp', subtitle: 'Unix and human dates', icon: 'time-outline', route: '/dev-tools/timestamp' },
]

export default function DevToolsScreen() {
  const router = useRouter()
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.sm, marginRight: spacing.sm }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', flex: 1 }}>Dev Tools</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}>
        {TOOLS.map((tool) => (
          <Pressable key={tool.title} onPress={() => router.push(tool.route as never)} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: `${colors.tools}22`, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={tool.icon} size={22} color={colors.tools} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' }}>{tool.title}</Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginTop: 2 }}>{tool.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

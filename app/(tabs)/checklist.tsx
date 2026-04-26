import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '@core/theme'

export default function ChecklistScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Checklist</Text>
        <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 8 }}>Checklists coming soon</Text>
      </View>
    </SafeAreaView>
  )
}

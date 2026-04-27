import { View, Text } from 'react-native'
import { colors, fontSize, spacing, radius } from '@core/theme'

interface MacroBarProps {
  proteinG: number
  carbsG: number
  fatG: number
  mini?: boolean
}

const MACRO_COLORS = {
  protein: '#64D2FF',
  carbs:   '#FFD60A',
  fat:     '#FF6B9D',
}

export default function MacroBar({ proteinG, carbsG, fatG, mini = false }: MacroBarProps) {
  const total = proteinG + carbsG + fatG || 1
  const pPct = (proteinG / total) * 100
  const cPct = (carbsG / total) * 100
  const fPct = (fatG / total) * 100

  if (mini) {
    return (
      <View style={{ flexDirection: 'row', height: 4, borderRadius: radius.full, overflow: 'hidden', gap: 1 }}>
        <View style={{ flex: pPct, backgroundColor: MACRO_COLORS.protein }} />
        <View style={{ flex: cPct, backgroundColor: MACRO_COLORS.carbs }} />
        <View style={{ flex: fPct, backgroundColor: MACRO_COLORS.fat }} />
      </View>
    )
  }

  return (
    <View>
      <View style={{ flexDirection: 'row', height: 6, borderRadius: radius.full, overflow: 'hidden', marginBottom: spacing.xs }}>
        <View style={{ flex: pPct, backgroundColor: MACRO_COLORS.protein }} />
        <View style={{ flex: cPct, backgroundColor: MACRO_COLORS.carbs }} />
        <View style={{ flex: fPct, backgroundColor: MACRO_COLORS.fat }} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <MacroPill label="P" value={proteinG} color={MACRO_COLORS.protein} />
        <MacroPill label="C" value={carbsG} color={MACRO_COLORS.carbs} />
        <MacroPill label="F" value={fatG} color={MACRO_COLORS.fat} />
      </View>
    </View>
  )
}

function MacroPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
        {label} <Text style={{ color: colors.text, fontWeight: '600' }}>{value.toFixed(1)}g</Text>
      </Text>
    </View>
  )
}

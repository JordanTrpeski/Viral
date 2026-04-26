import { View, ViewStyle } from 'react-native'
import Svg, { Polyline, Circle } from 'react-native-svg'
import { colors } from '@core/theme'

interface SparklineGraphProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  showDot?: boolean
  style?: ViewStyle
}

export default function SparklineGraph({
  data,
  width = 80,
  height = 32,
  color = colors.primary,
  showDot = true,
  style,
}: SparklineGraphProps) {
  if (data.length < 2) return <View style={[{ width, height }, style]} />

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const padY = 4

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width
    const y = padY + ((max - val) / range) * (height - padY * 2)
    return `${x},${y}`
  })

  const lastX = parseFloat(points[points.length - 1].split(',')[0])
  const lastY = parseFloat(points[points.length - 1].split(',')[1])

  return (
    <View style={[{ width, height }, style]}>
      <Svg width={width} height={height}>
        <Polyline
          points={points.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {showDot && (
          <Circle cx={lastX} cy={lastY} r={3} fill={color} />
        )}
      </Svg>
    </View>
  )
}

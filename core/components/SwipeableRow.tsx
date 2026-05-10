import { useRef } from 'react'
import { Pressable, Text, View, ViewStyle } from 'react-native'
import ReanimatedSwipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable'
import Reanimated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, spacing } from '@core/theme'

interface Action {
  label: string
  icon?: React.ComponentProps<typeof Ionicons>['name']
  color: string
  onPress: () => void
}

interface SwipeableRowProps {
  children: React.ReactNode
  rightActions?: Action[]
  style?: ViewStyle
}

export default function SwipeableRow({ children, rightActions = [], style }: SwipeableRowProps) {
  const swipeableRef = useRef<SwipeableMethods>(null)

  const RightActions = ({ drag }: { drag: SharedValue<number> }) => {
    const totalWidth = rightActions.length * 72

    const animStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: Math.max(drag.value + totalWidth, 0) }],
    }))

    return (
      <Reanimated.View style={[{ flexDirection: 'row' }, animStyle]}>
        {rightActions.map((action, i) => (
          <Pressable
            key={i}
            onPress={() => {
              swipeableRef.current?.close()
              action.onPress()
            }}
            style={{
              width: 72,
              backgroundColor: action.color,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: i === rightActions.length - 1 ? radius.md : 0,
            }}
          >
            {action.icon && <Ionicons name={action.icon} size={20} color="#FFFFFF" />}
            <Text style={{ color: '#FFFFFF', fontSize: 11, marginTop: spacing.xs, fontWeight: '500' }}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </Reanimated.View>
    )
  }

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderRightActions={
        rightActions.length > 0
          ? (_prog: SharedValue<number>, drag: SharedValue<number>) => <RightActions drag={drag} />
          : undefined
      }
      overshootRight={false}
    >
      <View style={style}>{children}</View>
    </ReanimatedSwipeable>
  )
}

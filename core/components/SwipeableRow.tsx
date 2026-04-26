import { useRef } from 'react'
import { Animated, Pressable, Text, View, ViewStyle } from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
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
  const swipeableRef = useRef<Swipeable>(null)

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const totalWidth = rightActions.length * 72

    const translateX = dragX.interpolate({
      inputRange: [-totalWidth, 0],
      outputRange: [0, totalWidth],
      extrapolate: 'clamp',
    })

    return (
      <Animated.View
        style={{
          flexDirection: 'row',
          transform: [{ translateX }],
        }}
      >
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
      </Animated.View>
    )
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={rightActions.length > 0 ? renderRightActions : undefined}
      overshootRight={false}
    >
      <View style={style}>{children}</View>
    </Swipeable>
  )
}

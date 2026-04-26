import { forwardRef, useCallback } from 'react'
import GorhomBottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet'
import { colors, radius } from '@core/theme'

interface BottomSheetProps {
  children: React.ReactNode
  snapPoints?: (string | number)[]
}

const BottomSheet = forwardRef<GorhomBottomSheet, BottomSheetProps>(
  ({ children, snapPoints = ['50%', '90%'] }, ref) => {
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} />
      ),
      []
    )

    return (
      <GorhomBottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
        }}
        handleIndicatorStyle={{
          backgroundColor: colors.textMuted,
          width: 36,
          height: 4,
        }}
      >
        <BottomSheetView style={{ flex: 1 }}>{children}</BottomSheetView>
      </GorhomBottomSheet>
    )
  }
)

BottomSheet.displayName = 'BottomSheet'

export default BottomSheet

import type { PropsWithChildren, ReactNode } from "react";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  header?: ReactNode;
}

export function BottomSheet({ open, onClose, header, children }: PropsWithChildren<BottomSheetProps>) {
  const translateY = useSharedValue(500);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(open ? 0 : 500, { duration: 260 });
    opacity.value = withTiming(open ? 1 : 0, { duration: 180 });
  }, [open, opacity, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

  if (!open) return null;

  return (
    <View className="absolute inset-0 z-50 justify-end">
      <Animated.View style={[overlayStyle]} className="absolute inset-0 bg-black/20">
        <Pressable className="h-full w-full" onPress={onClose} />
      </Animated.View>
      <Animated.View style={[sheetStyle]} className="rounded-t-[28px] bg-surface px-5 pb-8 pt-4">
        {header}
        {children}
      </Animated.View>
    </View>
  );
}

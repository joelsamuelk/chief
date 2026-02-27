import { useEffect, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from "react-native-reanimated";

interface SegmentedControlProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export function SegmentedControl({ value, options, onChange }: SegmentedControlProps) {
  const index = options.findIndex((item) => item === value);
  const position = useSharedValue(index < 0 ? 0 : index);

  useEffect(() => {
    position.value = withSpring(index < 0 ? 0 : index, { damping: 22, stiffness: 300 });
  }, [index, position]);

  const width = useMemo(() => 100 / options.length, [options.length]);

  const style = useAnimatedStyle(() => ({
    left: `${position.value * width}%`
  }));

  return (
    <View className="relative flex-row rounded-full bg-chipBg p-1">
      <Animated.View
        className="absolute bottom-1 top-1 rounded-full bg-chipActiveBg"
        style={[{ width: `${width}%` }, style]}
      />
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            className="min-h-11 flex-1 items-center justify-center rounded-full"
          >
            <Text className={`text-[13px] font-medium ${selected ? "text-chipActiveText" : "text-textSecondary"}`}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

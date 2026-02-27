import { Pressable, Text } from "react-native";

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function Chip({ label, active = false, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`min-h-11 items-center justify-center rounded-full px-4 ${
        active ? "bg-chipActiveBg" : "bg-chipBg"
      }`}
    >
      <Text className={`text-[13px] font-medium ${active ? "text-chipActiveText" : "text-textSecondary"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

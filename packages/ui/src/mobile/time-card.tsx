import { Pressable, Text } from "react-native";

interface TimeCardProps {
  label: string;
  value: string;
  onPress?: () => void;
}

export function TimeCard({ label, value, onPress }: TimeCardProps) {
  return (
    <Pressable onPress={onPress} className="flex-1 rounded-[16px] border border-divider bg-bg px-4 py-3 active:opacity-80">
      <Text className="text-[12px] font-medium text-textTertiary">{label}</Text>
      <Text className="mt-1 text-[16px] font-semibold text-textPrimary">{value}</Text>
    </Pressable>
  );
}

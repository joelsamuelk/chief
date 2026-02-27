import { Switch, Text, View } from "react-native";

interface ToggleRowProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function ToggleRow({ label, value, onChange }: ToggleRowProps) {
  return (
    <View className="min-h-14 flex-row items-center justify-between">
      <Text className="text-[16px] text-textPrimary">{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: "#ECEEF2", true: "#111111" }} />
    </View>
  );
}

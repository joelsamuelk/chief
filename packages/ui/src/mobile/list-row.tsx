import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

interface ListRowProps {
  left: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
}

export function ListRow({ left, title, subtitle, right, onPress }: ListRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="min-h-[58px] flex-row items-center gap-3 rounded-[18px] px-3 active:scale-[0.99]"
    >
      {left}
      <View className="flex-1">
        <Text className="text-[16px] font-semibold text-textPrimary" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-[12px] font-medium text-textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

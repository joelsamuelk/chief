import type { PropsWithChildren } from "react";
import { View } from "react-native";

export function Card({ children }: PropsWithChildren) {
  return (
    <View
      className="rounded-[24px] bg-surface p-4"
      style={{
        shadowColor: "#111111",
        shadowOpacity: 0.06,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 3
      }}
    >
      {children}
    </View>
  );
}

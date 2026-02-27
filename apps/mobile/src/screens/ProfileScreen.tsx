import { Card, ToggleRow } from "@chief/ui/mobile";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

export function ProfileScreen() {
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [appleEnabled, setAppleEnabled] = useState(false);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 20, gap: 14 }}>
      <Text className="text-[30px] font-semibold text-textPrimary">Profile</Text>

      <Card>
        <Text className="text-[22px] font-semibold text-textPrimary">Connect calendars</Text>
        <Text className="mt-1 text-[13px] font-medium text-textSecondary">Keep all calendars aligned</Text>
        <View className="mt-4 gap-1">
          <ToggleRow label="Google Calendar" value={googleEnabled} onChange={setGoogleEnabled} />
          <View className="h-px bg-divider" />
          <ToggleRow label="Apple Calendar" value={appleEnabled} onChange={setAppleEnabled} />
        </View>
      </Card>

      <Card>
        <Text className="text-[16px] text-textSecondary">Timezone: America/New_York</Text>
      </Card>
    </ScrollView>
  );
}

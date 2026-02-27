import { useEvents } from "@chief/data";
import { CategoryDot, SegmentedControl } from "@chief/ui/mobile";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Mode = "Day" | "Week" | "Month";

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatTimeRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`;
}

export function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const { data: events = [] } = useEvents();
  const [mode, setMode] = useState<Mode>("Week");
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 20, gap: 14 }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-[30px] font-semibold text-textPrimary">Calendar</Text>
        <TouchableOpacity
          className="h-11 rounded-full bg-chipActiveBg px-4 items-center justify-center"
          onPress={() => navigation.navigate("EventEditor")}
        >
          <Text className="text-[13px] font-medium text-chipActiveText">+ Event</Text>
        </TouchableOpacity>
      </View>

      <SegmentedControl value={mode} options={["Day", "Week", "Month"]} onChange={(value) => setMode(value as Mode)} />

      {mode !== "Month" ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {weekDays.map((day, idx) => {
                const dayNum = idx + 13;
                const active = dayNum === selectedDay;
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => setSelectedDay(dayNum)}
                    className={`rounded-full px-4 py-3 ${active ? "bg-chipActiveBg" : "bg-chipBg"}`}
                  >
                    <Text className={`text-[12px] font-medium ${active ? "text-chipActiveText" : "text-textSecondary"}`}>
                      {day}
                    </Text>
                    <Text className={`text-[15px] font-semibold ${active ? "text-chipActiveText" : "text-textPrimary"}`}>
                      {dayNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View className="mt-1 flex-row">
            <View className="w-16 gap-6 pt-2">
              {[9, 10, 11, 12, 1, 2, 3, 4].map((h) => (
                <Text key={h} className="text-[12px] font-medium text-textTertiary">{h}:00</Text>
              ))}
            </View>
            <View className="flex-1 gap-3">
              {events.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  onPress={() => navigation.navigate("EventEditor", { eventId: event.id })}
                  className="rounded-[18px] bg-surface p-3"
                  style={{
                    shadowColor: "#111111",
                    shadowOpacity: 0.06,
                    shadowRadius: 24,
                    shadowOffset: { width: 0, height: 12 },
                    elevation: 3
                  }}
                >
                  <View className="flex-row items-center gap-2">
                    <CategoryDot category={event.category} />
                    <Text className="text-[16px] font-semibold text-textPrimary">{event.title}</Text>
                  </View>
                  <Text className="mt-1 text-[12px] font-medium text-textSecondary">
                    {formatTimeRange(event.start_at, event.end_at)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      ) : (
        <View className="rounded-[24px] bg-surface p-4">
          <View className="mb-3 flex-row justify-between">
            {weekDays.map((day) => (
              <Text key={day} className="w-8 text-center text-[12px] font-medium text-textTertiary">
                {day}
              </Text>
            ))}
          </View>
          <View className="flex-row flex-wrap gap-2">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => {
              const active = d === new Date().getDate();
              return (
                <TouchableOpacity key={d} className="h-10 w-10 items-center justify-center rounded-full bg-bg">
                  <View className={`h-8 w-8 items-center justify-center rounded-full ${active ? "bg-chipActiveBg" : ""}`}>
                    <Text className={`text-[13px] ${active ? "text-chipActiveText" : "text-textPrimary"}`}>{d}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

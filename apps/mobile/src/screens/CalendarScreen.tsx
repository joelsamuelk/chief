import { useEvents } from "@chief/data";
import { colors } from "@chief/theme";
import { CategoryDot } from "@chief/ui/mobile";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Mode = "Tasks" | "List" | "Day" | "Week" | "Month";

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const modes: Mode[] = ["Tasks", "List", "Day", "Week", "Month"];
const timelineHours = [9, 10, 11, 12, 13, 14, 15, 16] as const;
const timelineLabels = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

function formatTimeRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`;
}

function toHour(value?: string | null) {
  if (!value) return -1;
  return new Date(value).getHours();
}

export function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const { data: events = [] } = useEvents();
  const [mode, setMode] = useState<Mode>("Week");
  const [selectedDay, setSelectedDay] = useState(2);

  const calendarDays = weekDays.map((day, idx) => ({
    day,
    date: idx + 14
  }));

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 20, gap: 12 }}>
      <View className="flex-row items-center justify-between gap-2">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full bg-surface"
          activeOpacity={0.8}
        >
          <Ionicons name="menu" size={18} color={colors.textPrimary} />
        </TouchableOpacity>

        <View className="flex-1 flex-row rounded-full bg-chipBg p-1">
          {modes.map((item) => {
            const active = item === mode;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => setMode(item)}
                className={`flex-1 min-h-8 items-center justify-center rounded-full ${active ? "bg-chipActiveBg" : "bg-transparent"}`}
                activeOpacity={0.85}
              >
                <Text className={`text-[11px] font-medium ${active ? "text-chipActiveText" : "text-textSecondary"}`}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full bg-surface"
          onPress={() => navigation.navigate("EventEditor")}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center justify-between px-1">
        <TouchableOpacity className="h-7 w-7 items-center justify-center" activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <View className="flex-row items-center gap-3">
          {calendarDays.map((item, idx) => {
            const active = idx === selectedDay;
            return (
              <TouchableOpacity
                key={`${item.day}-${item.date}`}
                onPress={() => setSelectedDay(idx)}
                className="items-center gap-1"
                activeOpacity={0.85}
              >
                <Text className="text-[11px] font-medium text-textTertiary">{item.day}</Text>
                <View className={`h-8 w-8 items-center justify-center rounded-full ${active ? "bg-chipActiveBg" : "bg-transparent"}`}>
                  <Text className={`text-[13px] font-semibold ${active ? "text-chipActiveText" : "text-textPrimary"}`}>
                    {item.date}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity className="h-7 w-7 items-center justify-center" activeOpacity={0.8}>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View className="mt-0.5 gap-0">
        {timelineHours.map((hour, index) => {
          const itemsAtHour = events.filter((event) => toHour(event.start_at) === hour);
          return (
            <View key={hour} className="min-h-[68px] flex-row">
              <View className="w-16 pt-1">
                <Text className="text-[12px] font-medium text-textTertiary">{timelineLabels[index]}</Text>
              </View>
              <View className="flex-1 border-t border-divider pt-2">
                {hour === 12 ? (
                  <TouchableOpacity
                    className="mb-2 min-h-11 flex-row items-center justify-between rounded-[14px] border border-divider bg-surface px-3"
                    onPress={() => navigation.navigate("TaskEditor")}
                    activeOpacity={0.85}
                  >
                    <Text className="text-[13px] text-textTertiary">Create new task</Text>
                    <Ionicons name="add" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}

                {itemsAtHour.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    onPress={() => navigation.navigate("EventEditor", { eventId: event.id })}
                    className="mb-2 rounded-[14px] border border-divider bg-surface px-3 py-2"
                    activeOpacity={0.85}
                  >
                    <View className="flex-row items-center gap-2">
                      <CategoryDot category={event.category} />
                      <Text className="text-[14px] font-semibold text-textPrimary" numberOfLines={1}>
                        {event.title}
                      </Text>
                    </View>
                    <Text className="mt-1 text-[11px] font-medium text-textSecondary">
                      {formatTimeRange(event.start_at, event.end_at)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

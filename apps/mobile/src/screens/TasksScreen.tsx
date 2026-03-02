import { useTasks, useToggleTaskDone } from "@chief/data";
import { colors } from "@chief/theme";
import { CategoryDot, Chip } from "@chief/ui/mobile";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Filter = "all" | "today" | "upcoming" | "completed";
type ViewMode = "Tasks" | "List" | "Day" | "Week" | "Month";

function formatTimeRange(start?: string | null, end?: string | null) {
  if (!start) return "All day";
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  const s = formatter.format(new Date(start));
  const e = end ? formatter.format(new Date(end)) : "";
  return e ? `${s} - ${e}` : s;
}

export function TasksScreen() {
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState<Filter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("Tasks");
  const { data: tasks = [] } = useTasks(filter);
  const toggleDone = useToggleTaskDone();

  const allDayItems = tasks.filter((task) => task.all_day).slice(0, 3);
  const timedItems = tasks.filter((task) => !task.all_day);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 20, gap: 12 }}>
      <View className="flex-row items-center justify-between gap-2">
        <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-surface" activeOpacity={0.8}>
          <Ionicons name="menu" size={18} color={colors.textPrimary} />
        </TouchableOpacity>

        <View className="flex-1 flex-row rounded-full bg-chipBg p-1">
          {(["Tasks", "List", "Day", "Week", "Month"] as ViewMode[]).map((item) => {
            const active = item === viewMode;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => setViewMode(item)}
                className={`flex-1 min-h-7.5 items-center justify-center rounded-full ${active ? "bg-chipActiveBg" : "bg-transparent"}`}
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
          onPress={() => navigation.navigate("TaskEditor")}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <Chip label="All" active={filter === "all"} onPress={() => setFilter("all")} />
        <Chip label="Today" active={filter === "today"} onPress={() => setFilter("today")} />
        <Chip label="Upcoming" active={filter === "upcoming"} onPress={() => setFilter("upcoming")} />
        <Chip label="Completed" active={filter === "completed"} onPress={() => setFilter("completed")} />
      </View>

      {allDayItems.length > 0 ? (
        <View className="gap-2">
          <Text className="text-[12px] font-medium text-textSecondary">All day</Text>
          {allDayItems.map((task) => (
            <TouchableOpacity
              key={task.id}
              onPress={() => navigation.navigate("TaskEditor", { taskId: task.id })}
              className="rounded-[14px] border border-divider bg-surface px-3 py-2.5"
              activeOpacity={0.85}
            >
              <View className="flex-row items-center gap-2">
                <CategoryDot category={task.category ?? "work"} />
                <Text className="flex-1 text-[14px] font-semibold text-textPrimary" numberOfLines={1}>
                  {task.title}
                </Text>
                <TouchableOpacity
                  className={`rounded-full px-3 py-1 ${
                    task.status === "done" || task.status === "completed" ? "bg-chipActiveBg" : "bg-chipBg"
                  }`}
                  onPress={() => void toggleDone.mutateAsync(task)}
                >
                  <Text
                    className={`text-[11px] ${
                      task.status === "done" || task.status === "completed"
                        ? "text-chipActiveText"
                        : "text-textSecondary"
                    }`}
                  >
                    {task.status === "done" || task.status === "completed" ? "Done" : "Open"}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View className="gap-1.5">
        {timedItems.map((task) => (
          <TouchableOpacity
            key={task.id}
            onPress={() => navigation.navigate("TaskEditor", { taskId: task.id })}
            className="rounded-[14px] border border-divider bg-surface px-3 py-2.5"
            activeOpacity={0.85}
          >
            <View className="flex-row items-center gap-2">
              <CategoryDot category={task.category ?? "work"} />
              <View className="flex-1">
                <Text className="text-[14px] font-semibold text-textPrimary" numberOfLines={1}>
                  {task.title}
                </Text>
                <Text className="mt-1 text-[11px] font-medium text-textSecondary">
                  {formatTimeRange(task.start_at, task.end_at)}
                </Text>
              </View>
              <TouchableOpacity
                className={`rounded-full px-3 py-1 ${
                  task.status === "done" || task.status === "completed" ? "bg-chipActiveBg" : "bg-chipBg"
                }`}
                onPress={() => void toggleDone.mutateAsync(task)}
              >
                <Text
                  className={`text-[11px] ${
                    task.status === "done" || task.status === "completed"
                      ? "text-chipActiveText"
                      : "text-textSecondary"
                  }`}
                >
                  {task.status === "done" || task.status === "completed" ? "Done" : "Open"}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {tasks.length === 0 ? (
        <View className="rounded-[14px] border border-divider bg-surface px-3 py-4">
          <Text className="text-[13px] text-textSecondary">No tasks yet. Tap + to add one.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

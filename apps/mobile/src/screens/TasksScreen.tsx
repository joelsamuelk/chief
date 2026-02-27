import { useTasks, useToggleTaskDone } from "@chief/data";
import { Card, CategoryDot, Chip, ListRow } from "@chief/ui/mobile";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Filter = "all" | "today" | "upcoming" | "completed";

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
  const { data: tasks = [] } = useTasks(filter);
  const toggleDone = useToggleTaskDone();

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 20, gap: 14 }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-[30px] font-semibold text-textPrimary">Tasks</Text>
        <TouchableOpacity
          className="h-11 rounded-full bg-chipActiveBg px-4 items-center justify-center"
          onPress={() => navigation.navigate("TaskEditor")}
        >
          <Text className="text-[13px] font-medium text-chipActiveText">+ Task</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <Chip label="All" active={filter === "all"} onPress={() => setFilter("all")} />
        <Chip label="Today" active={filter === "today"} onPress={() => setFilter("today")} />
        <Chip label="Upcoming" active={filter === "upcoming"} onPress={() => setFilter("upcoming")} />
        <Chip label="Completed" active={filter === "completed"} onPress={() => setFilter("completed")} />
      </View>

      <Card>
        <View className="gap-2">
          {tasks.map((task) => (
            <View key={task.id} className="rounded-[18px] border border-divider">
              <ListRow
                left={<CategoryDot category={task.category} />}
                title={task.title}
                subtitle={formatTimeRange(task.start_at, task.end_at)}
                onPress={() => navigation.navigate("TaskEditor", { taskId: task.id })}
                right={
                  <TouchableOpacity
                    className={`rounded-full px-3 py-1 ${task.status === "done" ? "bg-chipActiveBg" : "bg-chipBg"}`}
                    onPress={() => void toggleDone.mutateAsync(task)}
                  >
                    <Text className={`text-[12px] ${task.status === "done" ? "text-chipActiveText" : "text-textSecondary"}`}>
                      {task.status === "done" ? "Done" : "Open"}
                    </Text>
                  </TouchableOpacity>
                }
              />
            </View>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

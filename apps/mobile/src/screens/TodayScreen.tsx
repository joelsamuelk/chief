import { useEvents, useTasks } from "@chief/data";
import { Card, CategoryDot } from "@chief/ui/mobile";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

type TaskSegment = "recently" | "today" | "upcoming" | "later";

const segmentLabels: Record<TaskSegment, string> = {
  recently: "Recently",
  today: "Today",
  upcoming: "Upcoming",
  later: "Later"
};

const cardPalette = ["#F3EEF9", "#ECE9FF", "#DDF4FF", "#EAF7EF"];

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

export function TodayScreen() {
  const { data: events = [] } = useEvents();
  const { data: allTasks = [] } = useTasks("all");
  const [segment, setSegment] = useState<TaskSegment>("today");

  const filteredTasks = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);

    if (segment === "recently") {
      return allTasks.slice(0, 6);
    }

    if (segment === "today") {
      return allTasks.filter((task) => {
        const candidate = task.start_at ?? task.end_at ?? task.due_at;
        return candidate?.slice(0, 10) === todayKey;
      });
    }

    if (segment === "upcoming") {
      return allTasks.filter((task) => {
        const candidate = task.start_at ?? task.end_at ?? task.due_at;
        return Boolean(candidate && candidate.slice(0, 10) > todayKey);
      });
    }

    return allTasks.filter((task) => !task.start_at && !task.end_at && !task.due_at);
  }, [allTasks, segment]);

  const highlightCards = filteredTasks.slice(0, 3);
  const listItems = [...events, ...filteredTasks.slice(3)].slice(0, 6);

  const completedCount = allTasks.filter((task) => task.status === "done" || task.status === "completed").length;
  const completionProgress =
    allTasks.length > 0 ? Math.max(12, Math.round((completedCount / allTasks.length) * 100)) : 0;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 96 }}>
      <View className="flex-row items-center justify-between">
        <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-surface">
          <Ionicons name="menu-outline" size={18} color="#111111" />
        </Pressable>

        <View className="h-10 w-10 items-center justify-center rounded-full bg-[#DAECFF]">
          <Text className="text-[13px] font-semibold text-textPrimary">J</Text>
        </View>
      </View>

      <Card>
        <View className="gap-1">
          <Text className="text-[28px] font-semibold text-textPrimary">Hi, Joel</Text>
          <Text className="text-[13px] font-medium text-textSecondary">Welcome back</Text>
        </View>

        <Text className="mt-5 text-[22px] font-semibold text-textPrimary">My Tasks</Text>

        <View className="mt-2 flex-row items-center gap-3">
          {(Object.keys(segmentLabels) as TaskSegment[]).map((item) => {
            const active = item === segment;
            return (
              <Pressable key={item} onPress={() => setSegment(item)}>
                <Text className={`text-[12px] font-medium ${active ? "text-textPrimary" : "text-textTertiary"}`}>
                  {segmentLabels[item]}
                </Text>
                <View
                  className={`mt-1 h-[2px] w-full rounded-full ${active ? "bg-textPrimary" : "bg-transparent"}`}
                />
              </Pressable>
            );
          })}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          <View className="flex-row gap-3">
            {highlightCards.map((task, idx) => {
              const progress = task.status === "done" || task.status === "completed" ? 100 : completionProgress;
              const dueLabel = task.due_at?.slice(0, 10) ?? "No due date";

              return (
                <View
                  key={task.id}
                  className="w-40 rounded-[18px] p-3"
                  style={{ backgroundColor: cardPalette[idx % cardPalette.length] }}
                >
                  <Text className="text-[10px] font-medium text-textSecondary">{dueLabel}</Text>
                  <Text className="mt-2 text-[14px] font-semibold text-textPrimary" numberOfLines={2}>
                    {task.title}
                  </Text>
                  <View className="mt-5 gap-1.5">
                    <View className="h-1.5 rounded-full bg-white/70">
                      <View
                        className="h-1.5 rounded-full bg-black"
                        style={{ width: `${Math.max(8, Math.min(progress, 100))}%` }}
                      />
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[10px] font-medium text-textSecondary">Progress</Text>
                      <Text className="text-[10px] font-medium text-textSecondary">{progress}%</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </Card>

      <View className="gap-2">
        {listItems.map((item) => (
          <View
            key={item.id}
            className="flex-row items-center gap-3 rounded-[18px] border border-divider bg-surface px-3 py-3"
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-chipBg">
              <CategoryDot category={item.category} />
            </View>
            <View className="flex-1">
              <Text className="text-[14px] font-semibold text-textPrimary" numberOfLines={1}>
                {item.title}
              </Text>
              <Text className="mt-1 text-[11px] font-medium text-textSecondary">
                {formatTimeRange(item.start_at, item.end_at)}
              </Text>
            </View>
            <Ionicons name="ellipsis-vertical" size={16} color="#9CA3AF" />
          </View>
        ))}

        {listItems.length === 0 ? (
          <View className="rounded-[16px] border border-divider bg-surface px-3 py-4">
            <Text className="text-[13px] text-textSecondary">No items yet for this segment.</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

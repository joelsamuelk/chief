import { useEvents, useTasks } from "@chief/data";
import { Card, CategoryDot, ListRow, ProgressRing } from "@chief/ui/mobile";
import { ScrollView, Text, View } from "react-native";

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
  const { data: tasks = [] } = useTasks("today");
  const focusScore = Math.min(100, 40 + tasks.length * 10 + events.length * 8);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 20, gap: 14 }}>
      <Text className="text-[30px] font-semibold text-textPrimary">Hey Joel</Text>

      <Card>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[22px] font-semibold text-textPrimary">Focus Score</Text>
            <Text className="mt-1 text-[13px] font-medium text-textSecondary">Your executive rhythm today</Text>
          </View>
          <ProgressRing progress={focusScore} />
        </View>
        <View className="mt-4 flex-row flex-wrap gap-2">
          <View className="rounded-full bg-chipBg px-4 py-2">
            <Text className="text-[13px] font-medium text-textSecondary">{events.length} meetings</Text>
          </View>
          <View className="rounded-full bg-chipBg px-4 py-2">
            <Text className="text-[13px] font-medium text-textSecondary">{tasks.length} tasks</Text>
          </View>
          <View className="rounded-full bg-chipBg px-4 py-2">
            <Text className="text-[13px] font-medium text-textSecondary">1 priority</Text>
          </View>
        </View>
      </Card>

      <Card>
        <Text className="mb-3 text-[22px] font-semibold text-textPrimary">Your Day</Text>
        <View className="gap-2">
          {events.map((event) => (
            <ListRow
              key={event.id}
              left={<CategoryDot category={event.category} />}
              title={event.title}
              subtitle={formatTimeRange(event.start_at, event.end_at)}
            />
          ))}
          {tasks.map((task) => (
            <ListRow
              key={task.id}
              left={<CategoryDot category={task.category} />}
              title={task.title}
              subtitle={formatTimeRange(task.start_at, task.end_at)}
            />
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

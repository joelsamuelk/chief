import {
  useCreateTask,
  useDeleteTask,
  useTasks,
  useUpdateTask
} from "@chief/data";
import type { Category } from "@chief/types";
import { colors } from "@chief/theme";
import {
  BottomSheet,
  ToggleRow
} from "@chief/ui/mobile";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { RootStackParamList } from "../navigation/types";

const categories: Category[] = ["work", "personal", "health", "finance"];

const categoryClassNames: Record<Category, string> = {
  work: "bg-work",
  personal: "bg-personal",
  health: "bg-health",
  finance: "bg-finance"
};

type Props = NativeStackScreenProps<RootStackParamList, "TaskEditor">;

function toInputValue(value: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

function toIso(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function formatDateLabel(value: string) {
  if (!value) return "Set date";
  return new Date(value).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function formatTimeLabel(value: string) {
  if (!value) return "Set time";
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function TaskEditorModalScreen({ navigation, route }: Props) {
  const { data: tasks = [] } = useTasks("all");
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const editingTask = useMemo(
    () => tasks.find((task) => task.id === route.params?.taskId) ?? null,
    [route.params?.taskId, tasks]
  );

  const [title, setTitle] = useState(editingTask?.title ?? "");
  const [startAt, setStartAt] = useState(toInputValue(editingTask?.start_at ?? null));
  const [endAt, setEndAt] = useState(toInputValue(editingTask?.end_at ?? null));
  const [allDay, setAllDay] = useState(editingTask?.all_day ?? false);
  const [category, setCategory] = useState<Category>(editingTask?.category ?? "work");

  useEffect(() => {
    setTitle(editingTask?.title ?? "");
    setStartAt(toInputValue(editingTask?.start_at ?? null));
    setEndAt(toInputValue(editingTask?.end_at ?? null));
    setAllDay(editingTask?.all_day ?? false);
    setCategory(editingTask?.category ?? "work");
  }, [editingTask]);

  async function save() {
    if (editingTask) {
      await updateTask.mutateAsync({
        taskId: editingTask.id,
        patch: {
          title,
          start_at: toIso(startAt),
          end_at: toIso(endAt),
          all_day: allDay,
          category
        }
      });
    } else {
      await createTask.mutateAsync({
        title,
        start_at: toIso(startAt),
        end_at: toIso(endAt),
        all_day: allDay,
        category,
        priority: "med",
        status: "open"
      });
    }
    navigation.goBack();
  }

  async function remove() {
    if (editingTask) {
      await deleteTask.mutateAsync(editingTask.id);
    }
    navigation.goBack();
  }

  function rotateCategory() {
    const index = categories.findIndex((item) => item === category);
    const next = categories[(index + 1) % categories.length];
    setCategory(next);
  }

  return (
    <View className="flex-1 bg-transparent">
      <BottomSheet
        open
        onClose={() => navigation.goBack()}
        header={
          <View className="mb-2 flex-row items-center justify-between">
            <Pressable onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
            <Text className="text-[17px] font-semibold text-textPrimary">{editingTask ? "Edit Task" : "New Task"}</Text>
            <Pressable onPress={() => void save()}>
              <Ionicons name="checkmark" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>
        }
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
          <View>
            <Text className="mb-2 text-[12px] font-medium text-textSecondary">Task Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Create Report for SwiftDoc."
              placeholderTextColor="#9CA3AF"
              className="h-12 rounded-[16px] border border-divider bg-bg px-4 text-[16px] text-textPrimary"
            />
          </View>

          <View>
            <Text className="mb-2 text-[12px] font-medium text-textSecondary">Time</Text>
            <View className="flex-row gap-2">
              <View className="flex-1 rounded-[16px] border border-divider bg-bg px-3 py-3">
                <Text className="text-[11px] font-medium text-textTertiary">{formatDateLabel(startAt)}</Text>
                <Text className="mt-1 text-[16px] font-semibold text-textPrimary">{formatTimeLabel(startAt)}</Text>
                <Text className="mt-2 text-[11px] text-textTertiary">Start (YYYY-MM-DDTHH:mm)</Text>
                <TextInput
                  value={startAt}
                  onChangeText={setStartAt}
                  placeholder="2026-05-16T09:30"
                  className="mt-1 h-8 rounded-[10px] bg-surface px-2 text-[11px] text-textSecondary"
                />
              </View>
              <View className="flex-1 rounded-[16px] border border-divider bg-bg px-3 py-3">
                <Text className="text-[11px] font-medium text-textTertiary">{formatDateLabel(endAt)}</Text>
                <Text className="mt-1 text-[16px] font-semibold text-textPrimary">{formatTimeLabel(endAt)}</Text>
                <Text className="mt-2 text-[11px] text-textTertiary">End (YYYY-MM-DDTHH:mm)</Text>
                <TextInput
                  value={endAt}
                  onChangeText={setEndAt}
                  placeholder="2026-05-16T10:30"
                  className="mt-1 h-8 rounded-[10px] bg-surface px-2 text-[11px] text-textSecondary"
                />
              </View>
            </View>
          </View>

          <ToggleRow label="All-day event" value={allDay} onChange={setAllDay} />

          <View className="rounded-[18px] border border-divider bg-surface px-3 py-2">
            <Text className="mb-1 text-[12px] font-medium text-textSecondary">Custom Task Color</Text>
            <View className="flex-row items-center justify-between py-1">
              <Pressable onPress={rotateCategory} className="flex-row items-center gap-2">
                <View className={`h-2.5 w-2.5 rounded-full ${categoryClassNames[category]}`} />
                <Text className="text-[15px] text-textPrimary">{category[0].toUpperCase() + category.slice(1)}</Text>
              </Pressable>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </View>
          </View>

          <View className="rounded-[18px] border border-divider px-3 py-2 bg-surface">
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-[14px] text-textSecondary">Alert</Text>
              <Text className="text-[14px] text-textSecondary">15 minutes before</Text>
            </View>
            <View className="h-px bg-divider" />
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-[14px] text-textSecondary">Repeat</Text>
              <Text className="text-[14px] text-textSecondary">Never</Text>
            </View>
          </View>

          <View className="flex-row justify-between gap-2">
            {["Location", "Attendees", "Video Call", "Note"].map((item) => (
              <View key={item} className="min-h-14 flex-1 items-center justify-center rounded-[14px] border border-divider bg-surface">
                <Text className="text-[12px] font-medium text-textSecondary">{item}</Text>
              </View>
            ))}
          </View>

          {editingTask ? (
            <Pressable onPress={() => void remove()} className="h-12 items-center justify-center rounded-full bg-dangerBg">
              <Text className="text-[14px] font-medium text-dangerText">Delete</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

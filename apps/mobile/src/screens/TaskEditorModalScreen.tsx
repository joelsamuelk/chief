import {
  useCreateTask,
  useDeleteTask,
  useTasks,
  useUpdateTask
} from "@chief/data";
import type { Category } from "@chief/types";
import {
  BottomSheet,
  Chip,
  TimeCard,
  ToggleRow
} from "@chief/ui/mobile";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { RootStackParamList } from "../navigation/types";

const categories: Category[] = ["work", "personal", "health", "finance"];

type Props = NativeStackScreenProps<RootStackParamList, "TaskEditor">;

function toInputValue(value: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

function toIso(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
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

  const [title, setTitle] = useState(editingTask?.title ?? "New task");
  const [startAt, setStartAt] = useState(toInputValue(editingTask?.start_at ?? null));
  const [endAt, setEndAt] = useState(toInputValue(editingTask?.end_at ?? null));
  const [allDay, setAllDay] = useState(editingTask?.all_day ?? false);
  const [category, setCategory] = useState<Category>(editingTask?.category ?? "work");

  useEffect(() => {
    setTitle(editingTask?.title ?? "New task");
    setStartAt(toInputValue(editingTask?.start_at ?? null));
    setEndAt(toInputValue(editingTask?.end_at ?? null));
    setAllDay(editingTask?.all_day ?? false);
    setCategory(editingTask?.category ?? "work");
  }, [editingTask]);

  const startLabel = startAt ? new Date(startAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Start";
  const endLabel = endAt ? new Date(endAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "End";

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

  return (
    <View className="flex-1 bg-transparent">
      <BottomSheet
        open
        onClose={() => navigation.goBack()}
        header={
          <View className="mb-3 flex-row items-center justify-between">
            <Pressable onPress={() => navigation.goBack()}>
              <Text className="text-[18px] text-textSecondary">X</Text>
            </Pressable>
            <Text className="text-[17px] font-semibold text-textPrimary">Edit Task</Text>
            <Pressable onPress={() => void save()}>
              <Text className="text-[17px] font-semibold text-textPrimary">✓</Text>
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
              className="h-12 rounded-[16px] border border-divider bg-bg px-4 text-[16px] text-textPrimary"
            />
          </View>

          <View>
            <Text className="mb-2 text-[12px] font-medium text-textSecondary">Time</Text>
            <View className="flex-row gap-2">
              <TimeCard label="Start" value={startLabel} />
              <TimeCard label="End" value={endLabel} />
            </View>
            <View className="mt-2 flex-row gap-2">
              <TextInput
                value={startAt}
                onChangeText={setStartAt}
                placeholder="YYYY-MM-DDTHH:mm"
                className="flex-1 h-11 rounded-[16px] border border-divider bg-bg px-3 text-[12px] text-textSecondary"
              />
              <TextInput
                value={endAt}
                onChangeText={setEndAt}
                placeholder="YYYY-MM-DDTHH:mm"
                className="flex-1 h-11 rounded-[16px] border border-divider bg-bg px-3 text-[12px] text-textSecondary"
              />
            </View>
          </View>

          <ToggleRow label="All-day event" value={allDay} onChange={setAllDay} />

          <View className="rounded-[18px] border border-divider px-3 py-2">
            <Text className="mb-2 text-[13px] font-medium text-textSecondary">Category</Text>
            <View className="flex-row flex-wrap gap-2">
              {categories.map((item) => (
                <Chip key={item} label={item} active={item === category} onPress={() => setCategory(item)} />
              ))}
            </View>
          </View>

          <View className="rounded-[18px] border border-divider px-3 py-2">
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

          <View className="flex-row flex-wrap gap-2">
            {["Location", "Attendees", "Video Call", "Note"].map((item) => (
              <View key={item} className="rounded-full bg-chipBg px-4 py-3">
                <Text className="text-[12px] font-medium text-textSecondary">{item}</Text>
              </View>
            ))}
          </View>

          <Pressable onPress={() => void remove()} className="h-12 items-center justify-center rounded-full bg-dangerBg">
            <Text className="text-[14px] font-medium text-dangerText">Delete</Text>
          </Pressable>
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

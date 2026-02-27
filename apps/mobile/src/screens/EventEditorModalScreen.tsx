import {
  useCreateEvent,
  useEvents,
  useUpdateEvent
} from "@chief/data";
import type { Category } from "@chief/types";
import { BottomSheet, Chip } from "@chief/ui/mobile";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { RootStackParamList } from "../navigation/types";

const categories: Category[] = ["work", "personal", "health", "finance"];
type Props = NativeStackScreenProps<RootStackParamList, "EventEditor">;

export function EventEditorModalScreen({ navigation, route }: Props) {
  const { data: events = [] } = useEvents();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();

  const editingEvent = useMemo(
    () => events.find((event) => event.id === route.params?.eventId) ?? null,
    [events, route.params?.eventId]
  );

  const [title, setTitle] = useState(editingEvent?.title ?? "New Event");
  const [startAt, setStartAt] = useState(editingEvent?.start_at ?? new Date().toISOString());
  const [endAt, setEndAt] = useState(editingEvent?.end_at ?? new Date(Date.now() + 30 * 60_000).toISOString());
  const [category, setCategory] = useState<Category>(editingEvent?.category ?? "work");

  useEffect(() => {
    setTitle(editingEvent?.title ?? "New Event");
    setStartAt(editingEvent?.start_at ?? new Date().toISOString());
    setEndAt(editingEvent?.end_at ?? new Date(Date.now() + 30 * 60_000).toISOString());
    setCategory(editingEvent?.category ?? "work");
  }, [editingEvent]);

  async function save() {
    if (editingEvent) {
      await updateEvent.mutateAsync({
        eventId: editingEvent.id,
        patch: {
          title,
          start_at: startAt,
          end_at: endAt,
          category
        }
      });
    } else {
      await createEvent.mutateAsync({
        title,
        start_at: startAt,
        end_at: endAt,
        category
      });
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
            <Text className="text-[17px] font-semibold text-textPrimary">Edit Event</Text>
            <Pressable onPress={() => void save()}>
              <Text className="text-[17px] font-semibold text-textPrimary">✓</Text>
            </Pressable>
          </View>
        }
      >
        <View className="gap-3 pb-8">
          <TextInput
            value={title}
            onChangeText={setTitle}
            className="h-12 rounded-[16px] border border-divider bg-bg px-4 text-[16px] text-textPrimary"
          />
          <TextInput
            value={startAt}
            onChangeText={setStartAt}
            className="h-11 rounded-[16px] border border-divider bg-bg px-3 text-[12px] text-textSecondary"
          />
          <TextInput
            value={endAt}
            onChangeText={setEndAt}
            className="h-11 rounded-[16px] border border-divider bg-bg px-3 text-[12px] text-textSecondary"
          />
          <View className="flex-row flex-wrap gap-2">
            {categories.map((item) => (
              <Chip key={item} label={item} active={item === category} onPress={() => setCategory(item)} />
            ))}
          </View>
          <Pressable onPress={() => void save()} className="h-12 items-center justify-center rounded-full bg-chipActiveBg">
            <Text className="text-[14px] font-semibold text-chipActiveText">Save Event</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}

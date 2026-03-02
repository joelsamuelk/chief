import { useEvents, useTasks } from "@chief/data";
import type { Event, Task } from "@chief/types";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionResultEvent
} from "expo-speech-recognition";
import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

interface AssistReference {
  type: string;
  id: string;
  title: string;
}

interface AssistResult {
  intent: string;
  answer: string;
  references: AssistReference[];
}

interface AssistMessage {
  role: "user" | "assistant";
  text: string;
  references?: AssistReference[];
}

interface ChiefAssistProps {
  section: string;
  onOpenReference?: (reference: AssistReference) => void;
}

const prompts = [
  "What am I waiting on?",
  "What is at risk?",
  "Summarize today.",
  "Prepare me for my next meeting."
];

function normalizeDate(value?: string | null) {
  return value ? value.slice(0, 10) : null;
}

function resolveTaskDate(task: Task) {
  return task.start_at ?? task.end_at ?? task.due_at ?? null;
}

function nearestUpcomingEvent(events: Event[]) {
  const now = Date.now();
  return events
    .filter((event) => new Date(event.start_at).getTime() >= now)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0];
}

function buildLocalAssistResult(query: string, tasks: Task[], events: Event[], section: string): AssistResult {
  const q = query.toLowerCase();
  const todayKey = new Date().toISOString().slice(0, 10);
  const references: AssistReference[] = [];

  if (q.includes("waiting") || q.includes("wait")) {
    const waiting = tasks.filter((task) => task.status === "waiting" || Boolean(task.delegated_to));
    waiting.slice(0, 5).forEach((task) => {
      references.push({ type: "task", id: task.id, title: task.title });
    });
    return {
      intent: "waiting_on",
      answer:
        waiting.length > 0
          ? `You are waiting on ${waiting.length} task(s). Start with ${waiting[0]?.title ?? "the oldest delegated item"}.`
          : "No waiting tasks right now.",
      references
    };
  }

  if (q.includes("risk")) {
    const risky = tasks.filter((task) => {
      const candidate = normalizeDate(resolveTaskDate(task));
      if (!candidate) return false;
      const closed = task.status === "done" || task.status === "completed" || task.status === "archived";
      return candidate < todayKey && !closed;
    });

    risky.slice(0, 5).forEach((task) => {
      references.push({ type: "task", id: task.id, title: task.title });
    });

    return {
      intent: "at_risk",
      answer:
        risky.length > 0
          ? `There are ${risky.length} at-risk task(s), mostly overdue open items.`
          : "No major risk signals from overdue tasks.",
      references
    };
  }

  if (q.includes("summarize") || q.includes("summary") || q.includes("today")) {
    const overdue = tasks.filter((task) => {
      const candidate = normalizeDate(resolveTaskDate(task));
      if (!candidate) return false;
      const closed = task.status === "done" || task.status === "completed" || task.status === "archived";
      return candidate < todayKey && !closed;
    });

    const todayTasks = tasks.filter((task) => normalizeDate(resolveTaskDate(task)) === todayKey);
    const todayMeetings = events.filter((event) => normalizeDate(event.start_at) === todayKey);
    todayTasks.slice(0, 4).forEach((task) => references.push({ type: "task", id: task.id, title: task.title }));

    return {
      intent: "summarize_today",
      answer: `Today has ${todayTasks.length} task(s), ${overdue.length} overdue item(s), and ${todayMeetings.length} meeting(s).`,
      references
    };
  }

  if (q.includes("prepare") || q.includes("meeting")) {
    const meeting = nearestUpcomingEvent(events);
    if (!meeting) {
      return { intent: "prepare_meeting", answer: "No upcoming meetings found.", references: [] };
    }

    references.push({ type: "meeting", id: meeting.id, title: meeting.title });
    return {
      intent: "prepare_meeting",
      answer: `Next meeting is ${meeting.title}. Review your notes, owner decisions, and open action items before it starts.`,
      references
    };
  }

  return {
    intent: "unknown",
    answer: `Not enough information. You are in ${section}. Try: “Chief, summarize today.”`,
    references: []
  };
}

function extractChiefPrompt(transcript: string) {
  const cleaned = transcript.trim();
  const match = cleaned.match(/\bchief\b[,:]?\s*(.*)$/i);
  if (!match) return null;
  return (match[1] ?? "").trim();
}

function normalizeVoicePrompt(transcript: string) {
  const cleaned = transcript.trim();
  if (!cleaned) return "";

  const wakeWordPrompt = extractChiefPrompt(cleaned);
  if (wakeWordPrompt !== null) {
    return wakeWordPrompt;
  }

  return cleaned.replace(/^hey\s+/i, "").trim();
}

function getAssistBaseUrl() {
  const raw = process.env.EXPO_PUBLIC_ASSIST_URL ?? process.env.EXPO_PUBLIC_WEB_URL;
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

export function ChiefAssist({ section, onOpenReference }: ChiefAssistProps) {
  const { data: tasks = [] } = useTasks("all");
  const { data: events = [] } = useEvents();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<AssistMessage[]>([]);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const lastHandledTranscript = useRef("");

  const context = useMemo(() => ({ section }), [section]);

  useSpeechRecognitionEvent("start", () => {
    setListening(true);
    setError(null);
    setVoiceHint("Listening… say ‘Chief’ then your command, or just speak your command.");
  });

  useSpeechRecognitionEvent("end", () => {
    setListening(false);
    setVoiceHint(null);
  });

  useSpeechRecognitionEvent("error", (event) => {
    setListening(false);
    setVoiceHint(null);
    setError(event.message || "Voice recognition failed.");
  });

  useSpeechRecognitionEvent("result", (event: ExpoSpeechRecognitionResultEvent) => {
    const heard = event.results[0]?.transcript?.trim() ?? "";
    if (!heard) return;

    setTranscript(heard);
    if (!event.isFinal) return;
    if (heard === lastHandledTranscript.current) return;
    lastHandledTranscript.current = heard;

    const prompt = normalizeVoicePrompt(heard);

    if (!prompt) {
      setVoiceHint("I heard ‘Chief’. Say the command after it, like ‘Chief summarize today’. ");
      void Speech.speak("I heard Chief. What do you need?");
      return;
    }

    setQuery(prompt);
    setVoiceHint(null);
    void runAssist(prompt);
  });

  async function startListening() {
    setError(null);
    setVoiceHint(null);
    await Speech.stop();

    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setError("Speech recognition is not available on this device.");
      return;
    }

    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setError("Microphone permission is required for voice commands.");
      return;
    }

    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: false,
      addsPunctuation: true
    });
  }

  async function fetchAssistFromApi(prompt: string): Promise<AssistResult | null> {
    const baseUrl = getAssistBaseUrl();
    if (!baseUrl) return null;

    const response = await fetch(`${baseUrl}/api/assist`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: prompt,
        app_context: context
      })
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as AssistResult;
    return payload;
  }

  async function runAssist(nextQuery?: string) {
    const prompt = (nextQuery ?? query).trim();
    if (!prompt) return;

    setLoading(true);
    setError(null);
    setMessages((prev) => [...prev, { role: "user", text: prompt }]);

    try {
      const result = (await fetchAssistFromApi(prompt)) ?? buildLocalAssistResult(prompt, tasks, events, section);
      setMessages((prev) => [...prev, { role: "assistant", text: result.answer, references: result.references }]);
      setQuery("");
      void Speech.speak(result.answer);
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : "Unable to run Chief Assist.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        className="absolute bottom-24 right-5 z-50 h-12 flex-row items-center gap-2 rounded-full bg-black px-4"
      >
        <Ionicons name="sparkles-outline" size={16} color="#FFFFFF" />
        <Text className="text-[12px] font-semibold text-white">Chief Assist</Text>
      </Pressable>

      {open ? (
        <View className="absolute bottom-40 right-4 z-50 w-[350px] max-w-[92%] rounded-[18px] border border-divider bg-white p-3">
          <View className="mb-2 flex-row items-center justify-between">
            <View>
              <Text className="text-[14px] font-semibold text-textPrimary">Chief Assist</Text>
              <Text className="text-[11px] text-textSecondary">Context: {section}</Text>
            </View>
            <Pressable
              onPress={() => setOpen(false)}
              className="h-7 w-7 items-center justify-center rounded-full bg-chipBg"
            >
              <Ionicons name="close" size={16} color="#6B7280" />
            </Pressable>
          </View>

          <View className="mb-2 flex-row flex-wrap gap-1.5">
            {prompts.map((prompt) => (
              <Pressable
                key={prompt}
                onPress={() => void runAssist(prompt)}
                disabled={loading}
                className="h-7 rounded-full bg-chipBg px-2.5 justify-center"
              >
                <Text className="text-[10px] font-medium text-textSecondary">{prompt}</Text>
              </Pressable>
            ))}
          </View>

          <ScrollView className="max-h-56 rounded-[12px] border border-divider bg-chipBg px-2 py-2">
            {messages.length === 0 ? (
              <Text className="text-[12px] text-textSecondary">
                Say “Chief, summarize today” or tap the mic to start voice command.
              </Text>
            ) : (
              <View className="gap-2">
                {messages.map((message, index) => (
                  <View
                    key={`${message.role}-${index}`}
                    className={`rounded-[10px] px-2.5 py-2 ${message.role === "user" ? "bg-white" : "bg-surface"}`}
                  >
                    <Text className="text-[12px] text-textPrimary">{message.text}</Text>
                    {message.role === "assistant" && message.references && message.references.length > 0 ? (
                      <View className="mt-2 flex-row flex-wrap gap-1.5">
                        {message.references.slice(0, 4).map((reference) => (
                          <Pressable
                            key={`${reference.type}-${reference.id}`}
                            onPress={() => onOpenReference?.(reference)}
                            className="rounded-full bg-chipBg px-2.5 py-1"
                          >
                            <Text className="text-[10px] font-medium text-textSecondary" numberOfLines={1}>
                              Open {reference.type}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {transcript ? <Text className="mt-2 text-[11px] text-textSecondary">Heard: {transcript}</Text> : null}
          {voiceHint ? <Text className="mt-1 text-[11px] text-textSecondary">{voiceHint}</Text> : null}
          {error ? <Text className="mt-1 text-[11px] font-medium text-[#b42318]">{error}</Text> : null}

          <View className="mt-2 flex-row items-center gap-2">
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => void runAssist()}
              placeholder="Ask Chief Assist"
              placeholderTextColor="#9CA3AF"
              className="h-10 flex-1 rounded-[10px] border border-divider bg-white px-3 text-[12px]"
            />

            <Pressable
              onPress={() => {
                if (listening) {
                  ExpoSpeechRecognitionModule.stop();
                } else {
                  void startListening();
                }
              }}
              className={`h-10 w-10 items-center justify-center rounded-[10px] ${listening ? "bg-black" : "bg-chipBg"}`}
            >
              <Ionicons name={listening ? "mic" : "mic-outline"} size={16} color={listening ? "#FFFFFF" : "#111111"} />
            </Pressable>

            <Pressable
              disabled={loading}
              onPress={() => void runAssist()}
              className="h-10 rounded-[10px] bg-black px-3 items-center justify-center"
            >
              <Text className="text-[12px] font-semibold text-white">{loading ? "..." : "Send"}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </>
  );
}
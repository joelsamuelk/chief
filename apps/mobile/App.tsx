import "react-native-gesture-handler";
import "./global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts
} from "@expo-google-fonts/outfit";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ChiefAssist } from "./src/components/ChiefAssist";
import { CalendarScreen } from "./src/screens/CalendarScreen";
import { EventEditorModalScreen } from "./src/screens/EventEditorModalScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { TaskEditorModalScreen } from "./src/screens/TaskEditorModalScreen";
import { TasksScreen } from "./src/screens/TasksScreen";
import { TodayScreen } from "./src/screens/TodayScreen";
import type { RootStackParamList, TabParamList } from "./src/navigation/types";

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function sectionFromRoute(routeName?: string) {
  if (routeName === "Today") return "today";
  if (routeName === "Calendar") return "calendar";
  if (routeName === "Tasks") return "tasks";
  if (routeName === "Profile") return "profile";
  if (routeName === "TaskEditor") return "task_editor";
  if (routeName === "EventEditor") return "event_editor";
  return "workspace";
}

function QuickAddPlaceholder() {
  return null;
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          left: 18,
          right: 18,
          bottom: 12,
          height: 68,
          borderTopWidth: 0,
          backgroundColor: "#FFFFFF",
          borderRadius: 24,
          shadowColor: "#111111",
          shadowOpacity: 0.08,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 10 },
          elevation: 6
        },
        tabBarActiveTintColor: "#111111",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === "QuickAdd") return null;

          const iconName =
            route.name === "Today"
              ? focused
                ? "home"
                : "home-outline"
              : route.name === "Calendar"
                ? focused
                  ? "calendar"
                  : "calendar-outline"
                : route.name === "Tasks"
                  ? focused
                    ? "document-text"
                    : "document-text-outline"
                  : focused
                    ? "person"
                    : "person-outline";

          return <Ionicons name={iconName} size={size ?? 22} color={color} />;
        }
      })}
    >
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen
        name="QuickAdd"
        component={QuickAddPlaceholder}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault();
            navigation.getParent()?.navigate("TaskEditor" as never);
          }
        })}
        options={{
          tabBarIcon: () => null,
          tabBarButton: ({ onPress, accessibilityLabel, accessibilityState, testID }) => (
            <TouchableOpacity
              onPress={onPress}
              accessibilityLabel={accessibilityLabel}
              accessibilityState={accessibilityState}
              testID={testID}
              activeOpacity={0.85}
              className="mt-[-24px] h-14 w-14 items-center justify-center rounded-full bg-black"
            >
              <Ionicons name="add" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          )
        }}
      />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold
  });
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [activeSection, setActiveSection] = useState("today");

  useEffect(() => {
    if (!fontsLoaded) return;

    const TextAny = Text as unknown as { defaultProps?: Record<string, unknown> };
    const TextInputAny = TextInput as unknown as { defaultProps?: Record<string, unknown> };

    TextAny.defaultProps = TextAny.defaultProps ?? {};
    TextAny.defaultProps.style = [{ fontFamily: "Outfit_400Regular" }, TextAny.defaultProps.style ?? {}];

    TextInputAny.defaultProps = TextInputAny.defaultProps ?? {};
    TextInputAny.defaultProps.style = [
      { fontFamily: "Outfit_400Regular" },
      TextInputAny.defaultProps.style ?? {}
    ];
  }, [fontsLoaded]);

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 20_000,
            refetchOnWindowFocus: false
          }
        }
      }),
    []
  );

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer
          ref={navigationRef}
          onReady={() => {
            const routeName = navigationRef.getCurrentRoute()?.name;
            setActiveSection(sectionFromRoute(routeName));
          }}
          onStateChange={() => {
            const routeName = navigationRef.getCurrentRoute()?.name;
            setActiveSection(sectionFromRoute(routeName));
          }}
        >
          <StatusBar style="dark" />
          <Stack.Navigator>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="TaskEditor"
              component={TaskEditorModalScreen}
              options={{ presentation: "transparentModal", animation: "fade", headerShown: false }}
            />
            <Stack.Screen
              name="EventEditor"
              component={EventEditorModalScreen}
              options={{ presentation: "transparentModal", animation: "fade", headerShown: false }}
            />
          </Stack.Navigator>
          <ChiefAssist
            section={activeSection}
            onOpenReference={(reference) => {
              if (reference.type === "task") {
                navigationRef.navigate("TaskEditor", { taskId: reference.id });
                return;
              }

              if (reference.type === "meeting") {
                navigationRef.navigate("EventEditor", { eventId: reference.id });
                return;
              }

              navigationRef.navigate("Tabs");
            }}
          />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

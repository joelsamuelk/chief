import "react-native-gesture-handler";
import "./global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CalendarScreen } from "./src/screens/CalendarScreen";
import { EventEditorModalScreen } from "./src/screens/EventEditorModalScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { TaskEditorModalScreen } from "./src/screens/TaskEditorModalScreen";
import { TasksScreen } from "./src/screens/TasksScreen";
import { TodayScreen } from "./src/screens/TodayScreen";
import type { RootStackParamList, TabParamList } from "./src/navigation/types";

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 72,
          borderTopWidth: 0,
          backgroundColor: "#FFFFFF"
        },
        tabBarActiveTintColor: "#111111",
        tabBarInactiveTintColor: "#9CA3AF"
      }}
    >
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
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

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
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
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

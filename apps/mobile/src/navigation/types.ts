export type RootStackParamList = {
  Tabs: undefined;
  TaskEditor: { taskId?: string } | undefined;
  EventEditor: { eventId?: string } | undefined;
};

export type TabParamList = {
  Today: undefined;
  Calendar: undefined;
  Tasks: undefined;
  Profile: undefined;
};

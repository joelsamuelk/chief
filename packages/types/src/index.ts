export type Category = "work" | "personal" | "health" | "finance";
export type Priority = "low" | "med" | "high";
export type TaskStatus = "open" | "done";

export interface Profile {
  id: string;
  name: string;
  timezone: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  start_at: string | null;
  end_at: string | null;
  all_day: boolean;
  category: Category;
  priority: Priority;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  user_id: string;
  title: string;
  start_at: string;
  end_at: string;
  location: string | null;
  notes: string | null;
  category: Category;
  created_at: string;
}

export interface Decision {
  id: string;
  user_id: string;
  title: string;
  context: string | null;
  outcome: string | null;
  created_at: string;
}

export interface WeeklyFocus {
  id: string;
  user_id: string;
  week_start: string;
  focus: string;
  created_at: string;
}

export interface TaskInput {
  title: string;
  start_at: string | null;
  end_at: string | null;
  all_day: boolean;
  category: Category;
  priority: Priority;
  status: TaskStatus;
}

export interface EventInput {
  title: string;
  start_at: string;
  end_at: string;
  location?: string | null;
  notes?: string | null;
  category: Category;
}

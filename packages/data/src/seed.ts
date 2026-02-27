import type { Event, Task } from "@chief/types";

export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

const baseDate = new Date();
const y = baseDate.getFullYear();
const m = String(baseDate.getMonth() + 1).padStart(2, "0");
const d = String(baseDate.getDate()).padStart(2, "0");
const today = `${y}-${m}-${d}`;

export const seededEvents: Event[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    user_id: DEMO_USER_ID,
    title: "Create Report for SwiftDoc.",
    start_at: `${today}T09:30:00.000Z`,
    end_at: `${today}T10:30:00.000Z`,
    location: null,
    notes: null,
    category: "work",
    created_at: new Date().toISOString()
  },
  {
    id: "11111111-1111-1111-1111-111111111112",
    user_id: DEMO_USER_ID,
    title: "Lunch with Diana Rose",
    start_at: `${today}T13:00:00.000Z`,
    end_at: `${today}T14:00:00.000Z`,
    location: null,
    notes: null,
    category: "personal",
    created_at: new Date().toISOString()
  },
  {
    id: "11111111-1111-1111-1111-111111111113",
    user_id: DEMO_USER_ID,
    title: "Meeting with manager",
    start_at: `${today}T14:30:00.000Z`,
    end_at: `${today}T15:30:00.000Z`,
    location: null,
    notes: null,
    category: "work",
    created_at: new Date().toISOString()
  }
];

export const seededTasks: Task[] = [
  {
    id: "22222222-2222-2222-2222-222222222221",
    user_id: DEMO_USER_ID,
    title: "Clean your desk",
    start_at: null,
    end_at: null,
    all_day: true,
    category: "personal",
    priority: "med",
    status: "open",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    user_id: DEMO_USER_ID,
    title: "Doing workouts",
    start_at: null,
    end_at: null,
    all_day: true,
    category: "health",
    priority: "med",
    status: "open",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "22222222-2222-2222-2222-222222222223",
    user_id: DEMO_USER_ID,
    title: "Write weekly brief",
    start_at: `${today}T16:00:00.000Z`,
    end_at: `${today}T16:30:00.000Z`,
    all_day: false,
    category: "work",
    priority: "high",
    status: "open",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "22222222-2222-2222-2222-222222222224",
    user_id: DEMO_USER_ID,
    title: "Prepare board update",
    start_at: `${today}T17:00:00.000Z`,
    end_at: `${today}T18:00:00.000Z`,
    all_day: false,
    category: "work",
    priority: "high",
    status: "open",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

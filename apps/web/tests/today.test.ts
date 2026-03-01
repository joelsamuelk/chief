import test from "node:test";
import assert from "node:assert/strict";
import { getRepos } from "../lib/storage";
import { createTask } from "../lib/services/tasks";
import { getTodaySnapshot } from "../lib/services/today";

function reset() {
  getRepos().system.resetAll();
}

function isoOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(16, 0, 0, 0);
  return date.toISOString();
}

test("today engine prioritises overdue high-priority tasks", () => {
  reset();

  createTask({
    title: "Overdue priority",
    due_at: isoOffset(-2),
    priority: "high",
    status: "open"
  });

  createTask({
    title: "Due today medium",
    due_at: isoOffset(0),
    priority: "medium",
    status: "open"
  });

  const snapshot = getTodaySnapshot();
  assert.ok(snapshot.top_priorities.length >= 2);
  assert.equal(snapshot.top_priorities[0]?.title, "Overdue priority");
  assert.equal(snapshot.top_priorities[0]?.score >= snapshot.top_priorities[1]?.score, true);
});

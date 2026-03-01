import test from "node:test";
import assert from "node:assert/strict";
import { getRepos } from "../lib/storage";
import { createSource, processSource } from "../lib/services/sources";
import { acceptExtractedItem, listQueue } from "../lib/services/queue";

function reset() {
  getRepos().system.resetAll();
}

test("accepting extracted task creates a task record", () => {
  reset();

  const { source } = createSource({
    kind: "email",
    provider: "test",
    external_id: "queue-001",
    raw_content: "Please send the updated KPI memo by Friday."
  });

  processSource(source.id);
  const queue = listQueue();
  const candidate = queue.items.find((item) => item.kind === "task");

  assert.ok(candidate);
  if (!candidate) return;

  const accepted = acceptExtractedItem(candidate.id);
  assert.equal(accepted?.status, "accepted");
  assert.equal(accepted?.accepted_entity_type, "task");

  const tasks = getRepos().task.list({ userId: "local-user", orgId: null });
  assert.equal(tasks.some((task) => task.id === accepted?.accepted_entity_id), true);
});

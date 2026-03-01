import test from "node:test";
import assert from "node:assert/strict";
import { extractFromRawContent } from "../lib/services/extraction";

test("extraction parser returns tasks and decisions with evidence", () => {
  const output = extractFromRawContent(
    "Please review the board draft by Friday. We decided to ship onboarding updates next week."
  );

  assert.ok(output.summary.length > 0);
  assert.ok(output.tasks.length >= 1);
  assert.ok(output.decisions.length >= 1);
  assert.equal(output.tasks[0]?.evidence.length > 0, true);
  assert.equal(typeof output.tasks[0]?.confidence, "number");
});

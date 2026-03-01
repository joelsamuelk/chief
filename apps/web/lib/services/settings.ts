import { getRepos } from "../storage";
import { setProactivityLevel } from "./notifications";
import { createSource, importSampleEmails, importSampleMeetings } from "./sources";
import type { ProactivityLevel } from "../storage";

export function resetLocalData() {
  const repos = getRepos();
  repos.system.resetAll();
  return { reset: true };
}

export function seedLocalData() {
  const repos = getRepos();
  repos.system.seedAll();
  return { seeded: true };
}

export function exportLocalData() {
  const repos = getRepos();
  return repos.system.exportAll();
}

export function importSampleData(mode: "emails" | "meetings") {
  return mode === "meetings" ? importSampleMeetings() : importSampleEmails();
}

export function createSharedTextSource(rawContent: string) {
  return createSource({
    kind: "shared_text",
    provider: "manual",
    raw_content: rawContent
  });
}

export function updateProactivity(level: ProactivityLevel) {
  return setProactivityLevel(level);
}

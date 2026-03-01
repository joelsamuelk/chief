import { getDefaultContext, getRepos } from "../storage";
import type { CreateSourceInput, Source } from "../storage";
import { extractAndPersistForSource } from "./extraction";

function stripHtml(input: string) {
  return input.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function listSources() {
  const repos = getRepos();
  const context = getDefaultContext();
  return repos.source.list(context);
}

export function createSource(input: CreateSourceInput): { source: Source; duplicate: boolean } {
  const repos = getRepos();
  const context = getDefaultContext();
  const rawContent = input.kind === "email" ? stripHtml(input.raw_content) : input.raw_content;
  const normalizedInput: CreateSourceInput = {
    ...input,
    raw_content: rawContent
  };

  if (input.external_id) {
    const existing = repos.source.findByProviderExternal(context, input.provider, input.external_id);
    if (existing) {
      return { source: existing, duplicate: true };
    }
  }

  const source = repos.source.create(context, normalizedInput);
  return { source, duplicate: false };
}

export function processSource(sourceId: string) {
  return extractAndPersistForSource(sourceId);
}

export function importSampleEmails() {
  const emails = [
    "Please review renewal plan by Friday and follow up with account team.",
    "Can you send board prep draft tomorrow and approve final metrics.",
    "Need to review legal redlines next week. We decided to hold launch.",
    "Please circle back with product and send updated roadmap by Tuesday."
  ];

  const created: Source[] = [];
  emails.forEach((rawContent, index) => {
    const { source } = createSource({
      kind: "email",
      provider: "sample_email",
      external_id: `sample-email-${index + 1}`,
      raw_content: rawContent
    });
    created.push(source);
  });

  return created;
}

export function importSampleMeetings() {
  const notes = [
    "We decided to prioritize onboarding. Please review metrics by Friday.",
    "Agreed to pause one initiative and follow up with operations tomorrow.",
    "Can you send risk memo by Thursday and check in with customer success."
  ];

  const created: Source[] = [];
  notes.forEach((rawContent, index) => {
    const { source } = createSource({
      kind: "meeting",
      provider: "sample_meeting",
      external_id: `sample-meeting-${index + 1}`,
      raw_content: rawContent
    });
    created.push(source);
  });
  return created;
}

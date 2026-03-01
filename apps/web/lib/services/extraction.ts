import { getDefaultContext, getRepos } from "../storage";
import type {
  CreateExtractedItemInput,
  EvidenceRef,
  ExtractedItem,
  Priority,
  Source,
  StorageContext
} from "../storage";

export interface ExtractionTaskOutput {
  title: string;
  description: string;
  due_at?: string;
  priority?: Priority;
  confidence: number;
  evidence: string;
}

export interface ExtractionDecisionOutput {
  title: string;
  context: string;
  confidence: number;
  evidence: string;
}

export interface ExtractionOutput {
  summary: string;
  tasks: ExtractionTaskOutput[];
  decisions: ExtractionDecisionOutput[];
  follow_ups: ExtractionTaskOutput[];
  risks: ExtractionTaskOutput[];
  model: { provider: "local"; name: "chief-rule-extractor-v1" };
}

const taskSignals = ["please", "can you", "need to", "follow up", "send", "review", "approve"];
const followUpSignals = ["follow up", "check in", "circle back"];
const decisionSignals = ["we decided", "we will", "agreed", "decision"];

const EXTRACTION_WINDOW_MS = 60_000;
const EXTRACTION_LIMIT_PER_WINDOW = 30;

declare global {
  // eslint-disable-next-line no-var
  var __chiefExtractionRateLimit: Map<string, number[]> | undefined;
}

function enforceExtractionRateLimit(userId: string) {
  if (!globalThis.__chiefExtractionRateLimit) {
    globalThis.__chiefExtractionRateLimit = new Map<string, number[]>();
  }

  const now = Date.now();
  const existing = globalThis.__chiefExtractionRateLimit.get(userId) ?? [];
  const windowStart = now - EXTRACTION_WINDOW_MS;
  const next = existing.filter((timestamp) => timestamp >= windowStart);
  if (next.length >= EXTRACTION_LIMIT_PER_WINDOW) {
    throw new Error("Extraction rate limit reached. Try again shortly.");
  }
  next.push(now);
  globalThis.__chiefExtractionRateLimit.set(userId, next);
}

function toSentenceList(text: string) {
  return text
    .split(/[\n\r]+|(?<=[.!?])\s+/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function normaliseEvidence(sentence: string): EvidenceRef[] {
  return [{ quote: sentence.slice(0, 180) }];
}

function localIso(dayOffset: number, hour = 17, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function parseWeekdayTarget(sentence: string) {
  const weekdays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
  ];
  const lower = sentence.toLowerCase();
  const index = weekdays.findIndex((day) => lower.includes(day));
  if (index < 0) return null;

  const now = new Date();
  const current = now.getDay();
  let delta = (index - current + 7) % 7;
  if (delta === 0) delta = 7;
  return localIso(delta, 17, 0);
}

function parseExplicitDate(sentence: string) {
  const match = sentence.match(
    /\b(?:by|on)\s+((?:\d{1,2}[-/]\d{1,2}(?:[-/]\d{2,4})?)|(?:[A-Za-z]{3,9}\s+\d{1,2}(?:,\s*\d{4})?))/i
  );
  if (!match) return null;
  const parsed = new Date(match[1]);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(17, 0, 0, 0);
  return parsed.toISOString();
}

export function parseDueAt(sentence: string) {
  const lower = sentence.toLowerCase();
  if (lower.includes("today")) return localIso(0, 17, 0);
  if (lower.includes("tomorrow")) return localIso(1, 17, 0);
  if (lower.includes("next week")) return localIso(7, 17, 0);

  const weekday = parseWeekdayTarget(sentence);
  if (weekday) return weekday;

  return parseExplicitDate(sentence);
}

function priorityFromSentence(sentence: string): Priority {
  const lower = sentence.toLowerCase();
  if (lower.includes("urgent") || lower.includes("asap") || lower.includes("risk")) return "high";
  if (lower.includes("later") || lower.includes("optional")) return "low";
  return "medium";
}

function buildSummary(sentences: string[]) {
  if (sentences.length === 0) return "No summary available.";
  return sentences.slice(0, 2).join(" ");
}

export function extractFromRawContent(rawContent: string): ExtractionOutput {
  const sentences = toSentenceList(rawContent);

  const tasks: ExtractionTaskOutput[] = [];
  const followUps: ExtractionTaskOutput[] = [];
  const decisions: ExtractionDecisionOutput[] = [];

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    const dueAt = parseDueAt(sentence);
    const priority = priorityFromSentence(sentence);

    if (decisionSignals.some((signal) => lower.includes(signal))) {
      decisions.push({
        title: sentence.slice(0, 120),
        context: sentence,
        confidence: 0.78,
        evidence: sentence.slice(0, 180)
      });
    }

    if (followUpSignals.some((signal) => lower.includes(signal))) {
      followUps.push({
        title: sentence.slice(0, 120),
        description: sentence,
        due_at: dueAt ?? undefined,
        priority,
        confidence: 0.73,
        evidence: sentence.slice(0, 180)
      });
    }

    if (taskSignals.some((signal) => lower.includes(signal))) {
      tasks.push({
        title: sentence.slice(0, 120),
        description: sentence,
        due_at: dueAt ?? undefined,
        priority,
        confidence: 0.71,
        evidence: sentence.slice(0, 180)
      });
    }
  }

  return {
    summary: buildSummary(sentences),
    tasks,
    decisions,
    follow_ups: followUps,
    risks: [],
    model: { provider: "local", name: "chief-rule-extractor-v1" }
  };
}

function buildRiskItems(context: StorageContext) {
  const repos = getRepos();
  const tasks = repos.task.list(context);
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const overdue = tasks.filter((task) => {
    if (task.status !== "open") return false;
    if (!task.due_at) return false;
    const dueDate = new Date(task.due_at);
    return dueDate.getTime() < threeDaysAgo.getTime();
  });

  return overdue.slice(0, 2).map((task) => ({
    title: `Overdue task: ${task.title}`,
    description: `Task is overdue by more than three days.`,
    due_at: task.due_at ?? undefined,
    priority: "high" as Priority,
    confidence: 0.68,
    evidence: task.title
  }));
}

function mapToItem(
  source: Source,
  kind: CreateExtractedItemInput["kind"],
  title: string,
  body: string,
  confidence: number,
  evidence: string,
  dueAt?: string,
  priority: Priority = "medium",
  modelName = "chief-rule-extractor-v1"
): CreateExtractedItemInput {
  return {
    source_id: source.id,
    org_id: source.org_id,
    kind,
    status: "pending",
    title,
    body,
    due_at: dueAt ?? null,
    priority,
    confidence: Math.max(0, Math.min(1, confidence)),
    evidence: normaliseEvidence(evidence),
    model: { provider: "local", name: modelName }
  };
}

export function extractAndPersistForSource(sourceId: string): {
  output: ExtractionOutput;
  created: ExtractedItem[];
} {
  const repos = getRepos();
  const context = getDefaultContext();
  enforceExtractionRateLimit(context.userId);
  const source = repos.source.getById(context, sourceId);
  if (!source) {
    throw new Error("Source not found.");
  }

  const existing = repos.extractedItem.listBySource(context, source.id);
  if (existing.length > 0) {
    return {
      output: extractFromRawContent(source.raw_content),
      created: existing
    };
  }

  const output = extractFromRawContent(source.raw_content);
  const riskItems = buildRiskItems(context);
  const rows: CreateExtractedItemInput[] = [
    mapToItem(
      source,
      "summary",
      output.summary.slice(0, 120),
      output.summary,
      0.72,
      output.summary,
      undefined,
      "medium",
      output.model.name
    ),
    ...output.tasks.map((task) =>
      mapToItem(
        source,
        "task",
        task.title,
        task.description,
        task.confidence,
        task.evidence,
        task.due_at ?? undefined,
        task.priority ?? "medium",
        output.model.name
      )
    ),
    ...output.decisions.map((decision) =>
      mapToItem(
        source,
        "decision",
        decision.title,
        decision.context,
        decision.confidence,
        decision.evidence,
        undefined,
        "medium",
        output.model.name
      )
    ),
    ...output.follow_ups.map((followUp) =>
      mapToItem(
        source,
        "follow_up",
        followUp.title,
        followUp.description,
        followUp.confidence,
        followUp.evidence,
        followUp.due_at ?? undefined,
        followUp.priority ?? "medium",
        output.model.name
      )
    ),
    ...riskItems.map((risk) =>
      mapToItem(
        source,
        "risk",
        risk.title,
        risk.description,
        risk.confidence,
        risk.evidence,
        risk.due_at,
        risk.priority,
        output.model.name
      )
    )
  ];

  const created = repos.extractedItem.createMany(context, rows);
  repos.source.markProcessed(context, source.id);
  return { output, created };
}

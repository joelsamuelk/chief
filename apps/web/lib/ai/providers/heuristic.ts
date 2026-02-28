import type { ExtractionResult } from "@/lib/utils/validation";

export type HeuristicExtraction = ExtractionResult;

interface HeuristicInput {
  rawContent: string;
}

const ACTION_PATTERN =
  /\b(todo|task|ship|send|prepare|review|complete|finish|deliver|draft|follow up|check in)\b/i;
const DECISION_PATTERN = /\b(decide|decision|approved|agree|resolved|commit)\b/i;
const RISK_PATTERN = /\b(risk|blocked|delay|overdue|slip|unclear|stuck)\b/i;
const FOLLOW_UP_PATTERN = /\b(waiting on|follow up|check in|circle back|confirm)\b/i;
const NAME_PATTERN = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g;

function splitSentences(raw: string) {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeTitle(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 140);
}

function inferPriority(text: string): "low" | "medium" | "high" {
  const lower = text.toLowerCase();
  if (/(urgent|asap|critical|blocker|today)/.test(lower)) return "high";
  if (/(later|someday|optional|low priority)/.test(lower)) return "low";
  return "medium";
}

function inferDueAt(text: string) {
  const isoMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoMatch) {
    const parsed = new Date(`${isoMatch[1]}T17:00:00.000Z`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  const slashMatch = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slashMatch) {
    const nowYear = new Date().getUTCFullYear();
    const yearRaw = slashMatch[3] ? Number(slashMatch[3]) : nowYear;
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    const parsed = new Date(Date.UTC(year, Number(slashMatch[1]) - 1, Number(slashMatch[2]), 17, 0, 0));
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  return undefined;
}

function withNamesHint(text: string) {
  const matches = text.match(NAME_PATTERN) ?? [];
  const names = matches.filter((value) => value.length > 2).slice(0, 3);
  if (names.length === 0) return text;
  return `${text} | people: ${names.join(", ")}`;
}

export async function extractWithHeuristic({ rawContent }: HeuristicInput): Promise<HeuristicExtraction> {
  const sentences = splitSentences(rawContent);
  const tasks: HeuristicExtraction["tasks"] = [];
  const decisions: HeuristicExtraction["decisions"] = [];
  const followUps: HeuristicExtraction["follow_ups"] = [];
  const risks: HeuristicExtraction["risks"] = [];

  for (const sentence of sentences) {
    const base = {
      title: normalizeTitle(sentence),
      description: withNamesHint(sentence),
      due_at: inferDueAt(sentence),
      priority: inferPriority(sentence),
      confidence: 0.62,
      evidence: sentence.slice(0, 280)
    } as const;

    if (DECISION_PATTERN.test(sentence)) {
      decisions.push({ ...base, confidence: 0.69, priority: "medium" });
      continue;
    }

    if (FOLLOW_UP_PATTERN.test(sentence)) {
      followUps.push({ ...base, confidence: 0.65 });
      continue;
    }

    if (RISK_PATTERN.test(sentence)) {
      risks.push({ ...base, confidence: 0.7, priority: "high" });
      continue;
    }

    if (ACTION_PATTERN.test(sentence)) {
      tasks.push(base);
    }
  }

  return {
    summary: sentences.slice(0, 3).join(" ").slice(0, 500) || "Not enough information.",
    tasks,
    decisions,
    follow_ups: followUps,
    risks
  };
}

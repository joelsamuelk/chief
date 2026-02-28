import type {
  EvidenceRef,
  ExtractionDecisionPayload,
  ExtractionItemPayload,
  ExtractionOutput,
  SourceKind
} from "@chief/types";
import {
  extractionResultSchema,
  parseWithSchema,
  type ExtractionResult
} from "@/lib/utils/validation";
import { extractWithAnthropic } from "./providers/anthropic";
import { extractWithHeuristic } from "./providers/heuristic";
import { extractWithOpenAI } from "./providers/openai";

type StructuredExtraction = ExtractionResult;
type ExtractionProvider = "openai" | "anthropic" | "heuristic";

export interface ExtractFromSourceInput {
  rawContent: string;
  userContext?: Record<string, unknown>;
}

export interface ExtractFromSourceResult extends StructuredExtraction {
  meta: {
    provider: ExtractionProvider;
    model: string;
    latency_ms: number;
    deterministic_only: boolean;
  };
}

interface LegacyExtractInput {
  sourceId: string;
  provider: string;
  kind: SourceKind;
  rawContent: string;
  userContext?: Record<string, unknown>;
}

function stripHtml(raw: string) {
  return raw
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeEntries<T extends { title: string; description: string }>(items: T[]) {
  const seen = new Set<string>();
  const unique: T[] = [];

  for (const item of items) {
    const key = `${item.title.toLowerCase()}::${item.description.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return unique;
}

function mergeExtractions(deterministic: StructuredExtraction, model: StructuredExtraction): StructuredExtraction {
  return {
    summary: model.summary || deterministic.summary,
    tasks: dedupeEntries([...deterministic.tasks, ...model.tasks]),
    decisions: dedupeEntries([...deterministic.decisions, ...model.decisions]),
    follow_ups: dedupeEntries([...deterministic.follow_ups, ...model.follow_ups]),
    risks: dedupeEntries([...deterministic.risks, ...model.risks])
  };
}

function selectedProvider(): ExtractionProvider {
  const value = (process.env.EXTRACTION_PROVIDER ?? "heuristic").toLowerCase();
  if (value === "openai" || value === "anthropic" || value === "heuristic") {
    return value;
  }
  return "heuristic";
}

export async function extractFromSource(input: ExtractFromSourceInput): Promise<ExtractFromSourceResult> {
  const sanitized = stripHtml(input.rawContent);
  const deterministicOutput = parseWithSchema<ExtractionResult>(
    extractionResultSchema as { safeParse: (value: unknown) => { success: boolean; data: ExtractionResult; error?: { flatten: () => unknown } } },
    await extractWithHeuristic({ rawContent: sanitized }),
    "invalid_heuristic_output"
  );

  const provider = selectedProvider();
  if (provider === "heuristic") {
    return {
      ...deterministicOutput,
      meta: {
        provider: "heuristic",
        model: "rule-parser-v2",
        latency_ms: 0,
        deterministic_only: true
      }
    };
  }

  try {
    const providerResult =
      provider === "openai"
        ? await extractWithOpenAI({ rawContent: sanitized, userContext: input.userContext })
        : await extractWithAnthropic({ rawContent: sanitized, userContext: input.userContext });

    const merged = mergeExtractions(deterministicOutput, providerResult.output);
    const validated = parseWithSchema<ExtractionResult>(
      extractionResultSchema as { safeParse: (value: unknown) => { success: boolean; data: ExtractionResult; error?: { flatten: () => unknown } } },
      merged,
      "invalid_extraction_output"
    );
    return {
      ...validated,
      meta: {
        provider: providerResult.provider,
        model: providerResult.model,
        latency_ms: providerResult.latencyMs,
        deterministic_only: false
      }
    };
  } catch {
    return {
      ...deterministicOutput,
      meta: {
        provider: "heuristic",
        model: "rule-parser-v2",
        latency_ms: 0,
        deterministic_only: true
      }
    };
  }
}

function asEvidence(sourceId: string, quote?: string): EvidenceRef[] {
  return [
    {
      label: "source_excerpt",
      quote: quote?.slice(0, 280),
      source_id: sourceId
    }
  ];
}

function asItemPayload(
  sourceId: string,
  item: {
    title: string;
    description: string;
    due_at?: string;
    priority?: "low" | "medium" | "high";
    confidence: number;
    evidence?: string;
  }
): ExtractionItemPayload {
  return {
    title: item.title,
    body: item.description,
    due_at: item.due_at ?? null,
    priority: item.priority ?? "medium",
    confidence: item.confidence,
    evidence: asEvidence(sourceId, item.evidence)
  };
}

function asDecisionPayload(
  sourceId: string,
  item: {
    title: string;
    description: string;
    confidence: number;
    evidence?: string;
  }
): ExtractionDecisionPayload {
  return {
    title: item.title,
    context: item.description,
    owner: undefined,
    confidence: item.confidence,
    evidence: asEvidence(sourceId, item.evidence)
  };
}

export async function extractFromSourceLegacy(input: LegacyExtractInput): Promise<ExtractionOutput> {
  const extracted = await extractFromSource({
    rawContent: input.rawContent,
    userContext: input.userContext
  });

  return {
    summary: {
      text: extracted.summary,
      confidence: 0.72,
      evidence: asEvidence(input.sourceId, extracted.summary)
    },
    tasks: extracted.tasks.map((item) => asItemPayload(input.sourceId, item)),
    decisions: extracted.decisions.map((item) => asDecisionPayload(input.sourceId, item)),
    follow_ups: extracted.follow_ups.map((item) => asItemPayload(input.sourceId, item)),
    risks: extracted.risks.map((item) => asItemPayload(input.sourceId, item)),
    model: {
      provider: extracted.meta.provider,
      name: extracted.meta.model,
      latency_ms: extracted.meta.latency_ms,
      deterministic_only: extracted.meta.deterministic_only
    }
  };
}

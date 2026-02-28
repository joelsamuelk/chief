import {
  extractionResultSchema,
  parseWithSchema,
  type ExtractionResult
} from "@/lib/utils/validation";

interface AnthropicInput {
  rawContent: string;
  userContext?: Record<string, unknown>;
}

export interface AnthropicProviderResult {
  output: ExtractionResult;
  provider: "anthropic";
  model: string;
  latencyMs: number;
}

function extractJsonBlock(value: string) {
  const fenced = value.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1];
  return value;
}

export async function extractWithAnthropic({
  rawContent,
  userContext
}: AnthropicInput): Promise<AnthropicProviderResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Anthropic provider is not configured.");
  }

  const model = process.env.ANTHROPIC_EXTRACTION_MODEL ?? "claude-3-5-sonnet-latest";
  const startedAt = Date.now();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      temperature: 0,
      system: [
        "Extract structured executive intelligence from the input.",
        "Return JSON only with keys: summary, tasks, decisions, follow_ups, risks.",
        "Each array item shape:",
        '{"title":"string","description":"string","due_at":"optional ISO datetime","priority":"low|medium|high","confidence":0.0,"evidence":"string"}'
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            raw_content: rawContent,
            user_context: userContext ?? {}
          })
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic extraction failed: ${response.status}`);
  }

  const json = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = json.content?.find((item) => item.type === "text")?.text;
  if (!text) {
    throw new Error("Anthropic extraction returned empty content.");
  }

  const parsed = parseWithSchema<ExtractionResult>(
    extractionResultSchema as {
      safeParse: (value: unknown) => {
        success: boolean;
        data: ExtractionResult;
        error?: { flatten: () => unknown };
      };
    },
    JSON.parse(extractJsonBlock(text)),
    "invalid_provider_output"
  );

  return {
    output: parsed,
    provider: "anthropic",
    model,
    latencyMs: Date.now() - startedAt
  };
}

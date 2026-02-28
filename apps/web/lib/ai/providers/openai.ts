import {
  extractionResultSchema,
  parseWithSchema,
  type ExtractionResult
} from "@/lib/utils/validation";

interface OpenAIInput {
  rawContent: string;
  userContext?: Record<string, unknown>;
}

export interface OpenAIProviderResult {
  output: ExtractionResult;
  provider: "openai";
  model: string;
  latencyMs: number;
}

export async function extractWithOpenAI({ rawContent, userContext }: OpenAIInput): Promise<OpenAIProviderResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI provider is not configured.");
  }

  const model = process.env.OPENAI_EXTRACTION_MODEL ?? "gpt-4.1-mini";
  const startedAt = Date.now();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "Extract structured executive intelligence from the input.",
            "Return JSON only, matching this exact schema:",
            "{",
            '  "summary": "string",',
            '  "tasks": [{"title":"string","description":"string","due_at":"optional ISO datetime","priority":"low|medium|high","confidence":0.0,"evidence":"string"}],',
            '  "decisions": [{"title":"string","description":"string","due_at":"optional ISO datetime","priority":"low|medium|high","confidence":0.0,"evidence":"string"}],',
            '  "follow_ups": [{"title":"string","description":"string","due_at":"optional ISO datetime","priority":"low|medium|high","confidence":0.0,"evidence":"string"}],',
            '  "risks": [{"title":"string","description":"string","due_at":"optional ISO datetime","priority":"low|medium|high","confidence":0.0,"evidence":"string"}]',
            "}",
            "Do not add markdown or extra keys."
          ].join("\n")
        },
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
    throw new Error(`OpenAI extraction failed: ${response.status}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI extraction returned empty content.");
  }

  const parsed = parseWithSchema<ExtractionResult>(
    extractionResultSchema as {
      safeParse: (value: unknown) => {
        success: boolean;
        data: ExtractionResult;
        error?: { flatten: () => unknown };
      };
    },
    JSON.parse(content),
    "invalid_provider_output"
  );
  return {
    output: parsed,
    provider: "openai",
    model,
    latencyMs: Date.now() - startedAt
  };
}

import { generateEodRecap, generateMorningBrief, listDigests } from "@/lib/services/notifications";
import {
  createSharedTextSource,
  exportLocalData,
  importSampleData,
  resetLocalData,
  seedLocalData,
  updateProactivity
} from "@/lib/services/settings";
import { jsonError, jsonOk, parseOptionalJson } from "@/lib/server/http";
import type { ProactivityLevel } from "@/lib/storage";

type SettingsAction =
  | "reset"
  | "seed"
  | "export"
  | "import_emails"
  | "import_meetings"
  | "create_shared_text"
  | "set_proactivity"
  | "morning_digest"
  | "eod_digest";

export async function GET() {
  try {
    return jsonOk({
      data: exportLocalData(),
      digests: listDigests()
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await parseOptionalJson<{
      action?: SettingsAction;
      raw_content?: string;
      proactivity_level?: ProactivityLevel;
    }>(request, {});

    if (!payload.action) {
      throw new Error("action is required.");
    }

    if (payload.action === "reset") {
      return jsonOk(resetLocalData());
    }
    if (payload.action === "seed") {
      return jsonOk(seedLocalData());
    }
    if (payload.action === "export") {
      return jsonOk({ data: exportLocalData() });
    }
    if (payload.action === "import_emails") {
      return jsonOk({ sources: importSampleData("emails") });
    }
    if (payload.action === "import_meetings") {
      return jsonOk({ sources: importSampleData("meetings") });
    }
    if (payload.action === "create_shared_text") {
      if (!payload.raw_content || payload.raw_content.trim().length === 0) {
        throw new Error("raw_content is required.");
      }
      const source = createSharedTextSource(payload.raw_content.trim());
      return jsonOk({ source });
    }
    if (payload.action === "set_proactivity") {
      if (!payload.proactivity_level) {
        throw new Error("proactivity_level is required.");
      }
      const profile = updateProactivity(payload.proactivity_level);
      return jsonOk({ profile });
    }
    if (payload.action === "morning_digest") {
      return jsonOk(generateMorningBrief());
    }
    if (payload.action === "eod_digest") {
      return jsonOk(generateEodRecap());
    }

    throw new Error("Unsupported action.");
  } catch (error) {
    return jsonError(error);
  }
}

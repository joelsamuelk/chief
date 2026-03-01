"use client";

import { useEvents, useTasks } from "@chief/data";
import { Card } from "@chief/ui/web";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatTimeRange } from "../lib/format";

interface ConnectionStatus {
  provider: string;
  connected: boolean;
  accounts: number;
}

type ManualIntegrationProvider = "slack" | "notion" | "linear" | "zoom";

function providerLabel(provider: string) {
  if (provider === "google") return "Google";
  if (provider === "microsoft") return "Microsoft";
  if (provider === "apple") return "Apple";
  if (provider === "slack") return "Slack";
  if (provider === "notion") return "Notion";
  if (provider === "linear") return "Linear";
  if (provider === "zoom") return "Zoom";
  return provider;
}

function manualTemplate(provider: ManualIntegrationProvider) {
  if (provider === "slack") {
    return "Slack thread summary:\n- Team requested Q2 hiring plan\n- Finance needs final budget by Friday\n- Follow-up with ops on onboarding timelines";
  }
  if (provider === "notion") {
    return "Notion update:\nProject: Board Packet\nOwner: Joel\nDue: Friday 17:00\nNotes: finalise metrics and attach draft narrative.";
  }
  if (provider === "linear") {
    return "Linear update:\nIssue CHIEF-102 is blocked by API auth edge case.\nOwner: Priya\nTarget date: tomorrow\nRisk: release delay if unresolved.";
  }
  return "Zoom meeting notes:\nTitle: Leadership Sync\nDecisions: Move launch to next Tuesday.\nActions: update rollout plan and notify customer success.";
}

function manualKind(provider: ManualIntegrationProvider) {
  return provider === "zoom" ? "meeting" : "shared_text";
}

export function RightRail() {
  const router = useRouter();
  const [connections, setConnections] = useState<ConnectionStatus[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [manualProvider, setManualProvider] = useState<ManualIntegrationProvider | null>(null);
  const [manualContent, setManualContent] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualMessage, setManualMessage] = useState<string | null>(null);
  const { data: events = [] } = useEvents();
  const { data: tasks = [] } = useTasks("today");
  const connectedAccounts = connections.reduce((total, item) => total + (item.accounts ?? 0), 0);

  useEffect(() => {
    let active = true;

    async function loadConnections() {
      setLoadingConnections(true);
      try {
        const response = await fetch("/api/inbox", { method: "GET", cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { connections?: ConnectionStatus[] };
        if (active) {
          setConnections(payload.connections ?? []);
        }
      } catch {
        if (active) setConnections([]);
      } finally {
        if (active) setLoadingConnections(false);
      }
    }

    void loadConnections();
    return () => {
      active = false;
    };
  }, []);

  function startManualImport(provider: ManualIntegrationProvider) {
    setManualProvider(provider);
    setManualContent(manualTemplate(provider));
    setManualMessage(null);
  }

  async function saveManualImport() {
    if (!manualProvider) return;
    if (manualContent.trim().length === 0) {
      setManualMessage("Content is required.");
      return;
    }

    setManualLoading(true);
    setManualMessage(null);
    try {
      const createResponse = await fetch("/api/sources", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          kind: manualKind(manualProvider),
          provider: manualProvider,
          raw_content: manualContent
        })
      });

      const createPayload = (await createResponse.json()) as
        | { source?: { id?: string }; error?: { message?: string } }
        | undefined;
      if (!createResponse.ok) {
        throw new Error(createPayload?.error?.message ?? "Unable to save integration content.");
      }

      const sourceId = createPayload?.source?.id;
      if (!sourceId) {
        throw new Error("Source was created without an id.");
      }

      const extractResponse = await fetch(`/api/sources/${sourceId}/extract`, {
        method: "POST"
      });
      const extractPayload = (await extractResponse.json()) as { error?: { message?: string } };
      if (!extractResponse.ok) {
        throw new Error(extractPayload.error?.message ?? "Source saved, but extraction failed.");
      }

      setManualMessage(`${providerLabel(manualProvider)} update imported and extracted.`);
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : "Unable to import integration content.";
      setManualMessage(message);
    } finally {
      setManualLoading(false);
    }
  }

  return (
    <aside className="w-full space-y-3 rounded-[22px] border border-black/10 bg-white p-3 2xl:w-[320px]">
      <Card className="border border-black/10 p-4 shadow-none">
        <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-textSecondary">Quick actions</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => router.push("/app/tasks?action=create")}
            className="min-h-11 rounded-[12px] border border-black/10 bg-[#F6F7FA] text-[13px] font-medium"
          >
            + Task
          </button>
          <button
            type="button"
            onClick={() => router.push("/app/meetings?action=create")}
            className="min-h-11 rounded-[12px] border border-black/10 bg-[#F6F7FA] text-[13px] font-medium"
          >
            + Meeting
          </button>
        </div>
      </Card>

      <Card className="border border-black/10 p-4 shadow-none">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-textSecondary">Connected Accounts</p>
          <button
            type="button"
            onClick={() => router.push("/app/settings")}
            className="h-8 rounded-pill bg-chipBg px-3 text-[11px] font-medium text-textSecondary"
          >
            Manage
          </button>
        </div>
        <p className="mt-2 text-[22px] font-semibold text-textPrimary">{connectedAccounts}</p>
        <p className="text-[12px] text-textSecondary">accounts connected</p>
        <div className="mt-3 space-y-2">
          {connections.filter((item) => item.connected).map((item) => (
            <div
              key={item.provider}
              className="flex items-center justify-between rounded-[10px] border border-black/10 bg-[#F8F8FA] px-3 py-2 text-[12px]"
            >
              <span className="text-textPrimary">{providerLabel(item.provider)}</span>
              <span className="text-textSecondary">{item.accounts} account(s)</span>
            </div>
          ))}
          {!loadingConnections && connectedAccounts === 0 ? (
            <div className="rounded-[10px] border border-black/10 bg-[#F8F8FA] px-3 py-2 text-[12px] text-textSecondary">
              No connected accounts yet.
            </div>
          ) : null}
          {loadingConnections ? (
            <div className="rounded-[10px] border border-black/10 bg-[#F8F8FA] px-3 py-2 text-[12px] text-textSecondary">
              Loading account status...
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="border border-black/10 p-4 shadow-none">
        <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-textSecondary">More Integrations</p>
        <p className="mt-1 text-[12px] text-textSecondary">Import Slack, Notion, Linear, or Zoom updates.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["slack", "notion", "linear", "zoom"] as const).map((provider) => (
            <button
              key={provider}
              type="button"
              onClick={() => startManualImport(provider)}
              className={`h-8 rounded-pill px-3 text-[11px] font-medium ${
                manualProvider === provider ? "bg-chipActiveBg text-chipActiveText" : "bg-chipBg text-textSecondary"
              }`}
            >
              {providerLabel(provider)}
            </button>
          ))}
        </div>
        {manualProvider ? (
          <div className="mt-3 space-y-2">
            <textarea
              value={manualContent}
              onChange={(event) => setManualContent(event.target.value)}
              className="min-h-24 w-full rounded-[10px] border border-black/10 bg-[#F8F8FA] px-3 py-2 text-[12px] text-textPrimary"
              placeholder={`Paste ${providerLabel(manualProvider)} updates...`}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={manualLoading}
                onClick={() => void saveManualImport()}
                className="h-8 rounded-pill bg-chipActiveBg px-3 text-[11px] font-medium text-chipActiveText disabled:opacity-70"
              >
                {manualLoading ? "Importing..." : "Import"}
              </button>
              <button
                type="button"
                disabled={manualLoading}
                onClick={() => {
                  setManualProvider(null);
                  setManualContent("");
                  setManualMessage(null);
                }}
                className="h-8 rounded-pill bg-chipBg px-3 text-[11px] font-medium text-textSecondary disabled:opacity-70"
              >
                Cancel
              </button>
            </div>
            {manualMessage ? <p className="text-[11px] text-textSecondary">{manualMessage}</p> : null}
          </div>
        ) : null}
      </Card>

      <Card className="border border-black/10 bg-[#13141A] p-4 text-white shadow-none">
        <p className="text-[13px] font-medium text-white/70">Today snapshot</p>
        <p className="mt-2 text-[34px] font-semibold tabular-nums">{events.length + tasks.length}</p>
        <p className="text-[12px] text-white/60">items planned</p>
      </Card>

      <Card className="border border-black/10 p-4 shadow-none">
        <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-textSecondary">Upcoming meetings</p>
        <div className="mt-3 space-y-3">
          {events.slice(0, 3).map((event) => (
            <div key={event.id} className="rounded-[14px] border border-black/10 bg-[#F8F8FA] p-3">
              <p className="text-[14px] font-semibold text-textPrimary">{event.title}</p>
              <p className="text-[12px] font-medium text-textSecondary">{formatTimeRange(event.start_at, event.end_at)}</p>
            </div>
          ))}
          {events.length === 0 ? (
            <div className="rounded-[14px] border border-black/10 bg-[#F8F8FA] p-3 text-[12px] text-textSecondary">
              No upcoming meetings.
            </div>
          ) : null}
        </div>
      </Card>
    </aside>
  );
}

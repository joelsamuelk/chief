"use client";

import { Card } from "@chief/ui/web";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../../lib/language";

interface InboxConnection {
  provider: "google" | "microsoft" | "apple";
  connected: boolean;
  connected_at: string | null;
  accounts: number;
}

interface InboxConnectionAccount {
  id: string;
  provider: "google" | "microsoft" | "apple";
  provider_user_id: string;
  created_at: string;
}

interface InboxItem {
  id: string;
  provider: string;
  kind: string;
  preview: string;
  created_at: string;
  processed_at: string | null;
}

interface InboxOverview {
  connections: InboxConnection[];
  connection_accounts: InboxConnectionAccount[];
  queue_count: number;
  items: InboxItem[];
}

type MessagingStatusFilter = "all" | "processed" | "unprocessed";
type MessagingPageSize = 10 | 20 | 50;

function providerLabel(provider: string) {
  if (provider === "google") return "Google";
  if (provider === "microsoft") return "Microsoft";
  if (provider === "apple") return "Apple";
  return provider;
}

function formatDate(iso: string | null) {
  if (!iso) return "N/A";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

function toErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message.trim().length > 0) return err.message;
  if (typeof err === "object" && err && "message" in err) {
    const candidate = (err as { message?: unknown }).message;
    if (typeof candidate === "string" && candidate.trim().length > 0) return candidate;
  }
  return fallback;
}

export default function InboxPage() {
  const { spelling } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageProviderFilter, setMessageProviderFilter] = useState<string>("all");
  const [messageKindFilter, setMessageKindFilter] = useState<string>("all");
  const [messageStatusFilter, setMessageStatusFilter] = useState<MessagingStatusFilter>("all");
  const [messagePage, setMessagePage] = useState(1);
  const [messagePageSize, setMessagePageSize] = useState<MessagingPageSize>(10);
  const [overview, setOverview] = useState<InboxOverview>({
    connections: [],
    connection_accounts: [],
    queue_count: 0,
    items: []
  });

  async function loadOverview() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/inbox", { method: "GET", cache: "no-store" });
      const payload = (await response.json()) as InboxOverview | { error?: { message?: string } };
      if (!response.ok) {
        throw new Error((payload as { error?: { message?: string } })?.error?.message ?? "Unable to load inbox.");
      }
      setOverview(payload as InboxOverview);
    } catch (err) {
      setError(toErrorMessage(err, "Unable to load inbox."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  const connectedAccountCount = overview.connection_accounts.length;
  const messageProviderOptions = useMemo(
    () => Array.from(new Set(overview.items.map((item) => item.provider))).sort((a, b) => a.localeCompare(b)),
    [overview.items]
  );
  const messageKindOptions = useMemo(
    () => Array.from(new Set(overview.items.map((item) => item.kind))).sort((a, b) => a.localeCompare(b)),
    [overview.items]
  );

  const filteredItems = useMemo(() => {
    return overview.items.filter((item) => {
      if (messageProviderFilter !== "all" && item.provider !== messageProviderFilter) return false;
      if (messageKindFilter !== "all" && item.kind !== messageKindFilter) return false;
      if (messageStatusFilter === "processed" && !item.processed_at) return false;
      if (messageStatusFilter === "unprocessed" && item.processed_at) return false;
      return true;
    });
  }, [messageKindFilter, messageProviderFilter, messageStatusFilter, overview.items]);

  const totalMessagePages = Math.max(1, Math.ceil(filteredItems.length / messagePageSize));
  const pagedItems = useMemo(() => {
    const start = (messagePage - 1) * messagePageSize;
    return filteredItems.slice(start, start + messagePageSize);
  }, [filteredItems, messagePage, messagePageSize]);
  const messageRangeStart = filteredItems.length === 0 ? 0 : (messagePage - 1) * messagePageSize + 1;
  const messageRangeEnd = Math.min(messagePage * messagePageSize, filteredItems.length);

  useEffect(() => {
    setMessagePage(1);
  }, [messageProviderFilter, messageKindFilter, messageStatusFilter, messagePageSize]);

  useEffect(() => {
    setMessagePage((current) => Math.min(current, totalMessagePages));
  }, [totalMessagePages]);

  const centralise = spelling("centralize", "centralise");
  const centralised = spelling("Centralized", "Centralised");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold sm:text-[30px]">Inbox</h1>
          <p className="text-[13px] text-textSecondary">Connect tools and {centralise} communication flow.</p>
        </div>
        <div className="rounded-pill bg-chipBg px-4 py-2 text-[13px] font-medium text-textSecondary">
          {connectedAccountCount} account(s) connected • {overview.queue_count} pending in queue
        </div>
      </div>

      {error ? <p className="text-[13px] font-medium text-[#b42318]">{error}</p> : null}

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[18px] font-semibold">{centralised} Messaging</p>
          <button
            type="button"
            onClick={() => void loadOverview()}
            disabled={loading}
            className="h-9 rounded-pill bg-chipBg px-3 text-[12px] font-medium text-textSecondary disabled:opacity-70"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="mb-3 rounded-[12px] border border-divider bg-[#FAFAFB] p-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1 text-[12px] text-textSecondary">
              <span>Provider</span>
              <select
                value={messageProviderFilter}
                onChange={(event) => setMessageProviderFilter(event.target.value)}
                className="h-9 w-full rounded-[10px] border border-divider bg-white px-2 text-[12px] text-textPrimary"
              >
                <option value="all">All providers</option>
                {messageProviderOptions.map((provider) => (
                  <option key={provider} value={provider}>
                    {providerLabel(provider)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-[12px] text-textSecondary">
              <span>Kind</span>
              <select
                value={messageKindFilter}
                onChange={(event) => setMessageKindFilter(event.target.value)}
                className="h-9 w-full rounded-[10px] border border-divider bg-white px-2 text-[12px] text-textPrimary"
              >
                <option value="all">All kinds</option>
                {messageKindOptions.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-[12px] text-textSecondary">
              <span>Status</span>
              <select
                value={messageStatusFilter}
                onChange={(event) => setMessageStatusFilter(event.target.value as MessagingStatusFilter)}
                className="h-9 w-full rounded-[10px] border border-divider bg-white px-2 text-[12px] text-textPrimary"
              >
                <option value="all">All statuses</option>
                <option value="processed">Processed</option>
                <option value="unprocessed">Unprocessed</option>
              </select>
            </label>
            <label className="space-y-1 text-[12px] text-textSecondary">
              <span>Per page</span>
              <select
                value={messagePageSize}
                onChange={(event) => setMessagePageSize(Number(event.target.value) as MessagingPageSize)}
                className="h-9 w-full rounded-[10px] border border-divider bg-white px-2 text-[12px] text-textPrimary"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          {pagedItems.map((item) => (
            <div key={item.id} className="rounded-[12px] border border-divider p-3">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-[12px]">
                <span className="rounded-pill bg-chipBg px-2 py-1 text-textSecondary">{providerLabel(item.provider)}</span>
                <span className="rounded-pill bg-chipBg px-2 py-1 text-textSecondary">{item.kind}</span>
                <span className="text-textTertiary">{formatDate(item.created_at)}</span>
                <span className={item.processed_at ? "text-[#106C2A]" : "text-[#A16207]"}>
                  {item.processed_at ? "Processed" : "Unprocessed"}
                </span>
              </div>
              <p className="text-[13px] text-textPrimary">{item.preview || "No message preview."}</p>
            </div>
          ))}

          {!loading && filteredItems.length === 0 ? (
            <div className="rounded-[12px] border border-divider p-4 text-[13px] text-textSecondary">
              No messages match the current filters.
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-divider pt-3">
          <p className="text-[12px] text-textSecondary">
            Showing {messageRangeStart}-{messageRangeEnd} of {filteredItems.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMessagePage((current) => Math.max(1, current - 1))}
              disabled={messagePage <= 1}
              className="h-8 rounded-pill border border-divider px-3 text-[12px] text-textSecondary disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-[12px] text-textSecondary">
              Page {Math.min(messagePage, totalMessagePages)} of {totalMessagePages}
            </span>
            <button
              type="button"
              onClick={() => setMessagePage((current) => Math.min(totalMessagePages, current + 1))}
              disabled={messagePage >= totalMessagePages}
              className="h-8 rounded-pill border border-divider px-3 text-[12px] text-textSecondary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

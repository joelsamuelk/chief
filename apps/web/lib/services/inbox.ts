import { randomUUID } from "node:crypto";
import { getDefaultContext, getRepos } from "../storage";

interface IntegrationAccount {
  id: string;
  provider: "google" | "microsoft" | "apple";
  provider_user_id: string;
  created_at: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __chiefLocalConnections: IntegrationAccount[] | undefined;
}

function getConnectionStore() {
  if (!globalThis.__chiefLocalConnections) {
    globalThis.__chiefLocalConnections = [];
  }
  return globalThis.__chiefLocalConnections;
}

export function getInboxOverview() {
  const repos = getRepos();
  const context = getDefaultContext();
  const items = repos.source.list(context).map((source) => ({
    id: source.id,
    provider: source.provider,
    kind: source.kind,
    preview: source.raw_content.slice(0, 220),
    created_at: source.created_at,
    processed_at: source.processed_at
  }));

  const accounts = getConnectionStore();
  const providerAccounts = (provider: "google" | "microsoft" | "apple") =>
    accounts.filter((item) => item.provider === provider);

  return {
    connections: [
      {
        provider: "google",
        connected: providerAccounts("google").length > 0,
        connected_at: providerAccounts("google")[0]?.created_at ?? null,
        accounts: providerAccounts("google").length
      },
      {
        provider: "microsoft",
        connected: providerAccounts("microsoft").length > 0,
        connected_at: providerAccounts("microsoft")[0]?.created_at ?? null,
        accounts: providerAccounts("microsoft").length
      },
      {
        provider: "apple",
        connected: providerAccounts("apple").length > 0,
        connected_at: providerAccounts("apple")[0]?.created_at ?? null,
        accounts: providerAccounts("apple").length
      }
    ],
    connection_accounts: accounts,
    queue_count: repos.extractedItem.listQueue(context, new Date().toISOString()).length,
    items
  };
}

export function connectProvider(
  provider: "google" | "microsoft" | "apple",
  providerUserId?: string
) {
  const store = getConnectionStore();
  const entry: IntegrationAccount = {
    id: randomUUID(),
    provider,
    provider_user_id: providerUserId?.trim() || `${provider}-account-${store.length + 1}`,
    created_at: new Date().toISOString()
  };
  store.unshift(entry);
  return entry;
}

export function disconnectProvider(
  provider: "google" | "microsoft" | "apple",
  connectionId?: string
) {
  const store = getConnectionStore();
  if (!connectionId) {
    globalThis.__chiefLocalConnections = store.filter((item) => item.provider !== provider);
    return;
  }
  globalThis.__chiefLocalConnections = store.filter(
    (item) => !(item.provider === provider && item.id === connectionId)
  );
}

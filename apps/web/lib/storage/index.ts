import "server-only";

import { getStorageRepositories } from "./sqlite";
import type { StorageContext } from "./types";

export * from "./types";

export const LOCAL_USER_ID = "local-user";

export function getDefaultContext(): StorageContext {
  const repos = getStorageRepositories();
  const bootstrapContext = { userId: LOCAL_USER_ID, workspaceId: "", orgId: null };
  const profile = repos.profile.get(bootstrapContext);
  const workspaces = repos.workspace.listByUser(LOCAL_USER_ID);
  const fallbackWorkspaceId = workspaces[0]?.id ?? "personal-workspace";
  const workspaceId = profile?.active_workspace_id ?? fallbackWorkspaceId;
  const orgs = repos.org.listByOwner({ userId: LOCAL_USER_ID, workspaceId, orgId: null });
  const orgId = orgs[0]?.id ?? null;
  return {
    userId: LOCAL_USER_ID,
    workspaceId,
    orgId
  };
}

export function setActiveWorkspace(workspaceId: string) {
  const repos = getStorageRepositories();
  const bootstrapContext = { userId: LOCAL_USER_ID, workspaceId, orgId: null };
  repos.profile.upsert(bootstrapContext, { active_workspace_id: workspaceId });
}

export function getRepos() {
  return getStorageRepositories();
}

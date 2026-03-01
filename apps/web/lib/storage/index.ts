import "server-only";

import { getStorageRepositories } from "./sqlite";
import type { StorageContext } from "./types";

export * from "./types";

export const LOCAL_USER_ID = "local-user";

export function getDefaultContext(): StorageContext {
  const repos = getStorageRepositories();
  const profile = repos.profile.get({ userId: LOCAL_USER_ID, orgId: null });
  const orgs = repos.org.listByOwner({ userId: LOCAL_USER_ID, orgId: null });
  const orgId = profile?.onboarding_completed ? orgs[0]?.id ?? null : orgs[0]?.id ?? null;
  return {
    userId: LOCAL_USER_ID,
    orgId
  };
}

export function getRepos() {
  return getStorageRepositories();
}

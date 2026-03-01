import { getRepos } from "../storage";

export function exportAccountData() {
  const repos = getRepos();
  return {
    exported_at: new Date().toISOString(),
    mode: "local",
    ...repos.system.exportAll()
  };
}

export function deleteAccountData() {
  const repos = getRepos();
  repos.system.resetAll();
  return {
    deleted: true,
    mode: "local"
  };
}

export function seedAccountData() {
  const repos = getRepos();
  repos.system.seedAll();
  return {
    seeded: true,
    mode: "local"
  };
}

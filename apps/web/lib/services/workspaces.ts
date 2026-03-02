import { getDefaultContext, getRepos, LOCAL_USER_ID, setActiveWorkspace } from "../storage";
import type { WorkspaceRole, WorkspaceType } from "../storage";

function ensureWorkspaceContext() {
  const repos = getRepos();
  const context = getDefaultContext();
  const workspace = repos.workspace.getById(context.workspaceId);
  if (!workspace) {
    throw new Error("Workspace not found.");
  }
  return { repos, context, workspace };
}

export function listWorkspaces() {
  const repos = getRepos();
  const context = getDefaultContext();
  const workspaces = repos.workspace.listByUser(context.userId);
  const activeWorkspace = workspaces.find((item) => item.id === context.workspaceId) ?? workspaces[0] ?? null;

  return {
    active_workspace_id: context.workspaceId,
    active_workspace: activeWorkspace,
    workspaces
  };
}

export function createWorkspace(input: { name: string; type?: WorkspaceType }) {
  const repos = getRepos();
  const name = input.name.trim();
  if (name.length < 2) {
    throw new Error("Workspace name is too short.");
  }

  const workspace = repos.workspace.create(LOCAL_USER_ID, name, input.type ?? "organization");
  setActiveWorkspace(workspace.id);

  return workspace;
}

export function switchWorkspace(workspaceId: string) {
  const repos = getRepos();
  const workspaces = repos.workspace.listByUser(LOCAL_USER_ID);
  const target = workspaces.find((item) => item.id === workspaceId);
  if (!target) {
    throw new Error("Workspace not found.");
  }
  setActiveWorkspace(target.id);
  return target;
}

export function listWorkspaceMembers() {
  const { repos, workspace } = ensureWorkspaceContext();
  return repos.workspaceMember.listByWorkspace(workspace.id);
}

export function addWorkspaceMember(input: { user_id: string; role: WorkspaceRole }) {
  const { repos, context, workspace } = ensureWorkspaceContext();
  const caller = repos.workspaceMember.findByWorkspaceUser(workspace.id, context.userId);
  if (!caller || (caller.role !== "owner" && caller.role !== "admin")) {
    throw new Error("Only owner/admin can manage workspace members.");
  }

  const userId = input.user_id.trim();
  if (!userId) {
    throw new Error("Member user_id is required.");
  }

  return repos.workspaceMember.add(workspace.id, userId, input.role);
}

export function renameWorkspace(input: { workspace_id: string; name: string }) {
  const { repos, context } = ensureWorkspaceContext();
  const target = repos.workspace.getById(input.workspace_id);
  if (!target) {
    throw new Error("Workspace not found.");
  }

  const caller = repos.workspaceMember.findByWorkspaceUser(target.id, context.userId);
  if (!caller || (caller.role !== "owner" && caller.role !== "admin")) {
    throw new Error("Only owner/admin can rename workspace.");
  }

  const name = input.name.trim();
  if (name.length < 2) {
    throw new Error("Workspace name is too short.");
  }

  const updated = repos.workspace.updateName(target.id, name);
  if (!updated) {
    throw new Error("Unable to rename workspace.");
  }
  return updated;
}

export function deleteWorkspace(input: { workspace_id: string }) {
  const { repos, context } = ensureWorkspaceContext();
  const target = repos.workspace.getById(input.workspace_id);
  if (!target) {
    throw new Error("Workspace not found.");
  }
  if (target.type === "personal") {
    throw new Error("Personal workspace cannot be deleted.");
  }

  const caller = repos.workspaceMember.findByWorkspaceUser(target.id, context.userId);
  if (!caller || (caller.role !== "owner" && caller.role !== "admin")) {
    throw new Error("Only owner/admin can delete workspace.");
  }

  const available = repos.workspace.listByUser(context.userId);
  if (available.length <= 1) {
    throw new Error("At least one workspace is required.");
  }

  const deleted = repos.workspace.delete(target.id);
  if (!deleted) {
    throw new Error("Unable to delete workspace.");
  }

  const remaining = repos.workspace.listByUser(context.userId);
  if (remaining.length === 0) {
    throw new Error("No workspace available after deletion.");
  }

  if (context.workspaceId === target.id) {
    setActiveWorkspace(remaining[0].id);
  }

  return {
    deleted: true,
    active_workspace_id: context.workspaceId === target.id ? remaining[0].id : context.workspaceId
  };
}

export function getActiveWorkspaceSummary() {
  const { workspace } = ensureWorkspaceContext();
  return workspace;
}

import { getDefaultContext, getRepos } from "../storage";
import type { MemberRole } from "../storage";
import { getActiveWorkspaceSummary } from "./workspaces";

export function getOrCreateOrganization(name = "Chief Team") {
  const workspace = getActiveWorkspaceSummary();
  return {
    id: workspace.id,
    name: workspace.name || name,
    owner_id: workspace.owner_id,
    created_at: workspace.created_at,
    updated_at: workspace.created_at
  };
}

export function addMember(input: { name: string; role: MemberRole }) {
  const repos = getRepos();
  const context = getDefaultContext();
  const userId = input.name.trim().toLowerCase().replace(/\s+/g, ".");
  const member = repos.workspaceMember.add(context.workspaceId, userId, input.role);
  return {
    id: member.id,
    org_id: context.workspaceId,
    name: input.name.trim(),
    role: member.role,
    created_at: member.created_at
  };
}

export function listMembers() {
  const repos = getRepos();
  const context = getDefaultContext();
  const workspace = getActiveWorkspaceSummary();
  return repos.workspaceMember.listByWorkspace(context.workspaceId).map((member) => {
    const name = member.user_id === context.userId ? "You" : member.user_id.replace(/[._-]/g, " ");
    return {
      id: member.id,
      org_id: workspace.id,
      name,
      role: member.role,
      created_at: member.created_at
    };
  });
}

export function getTeamOverview() {
  const repos = getRepos();
  const context = getDefaultContext();
  const currentMember = repos.workspaceMember.findByWorkspaceUser(context.workspaceId, context.userId);
  const delegated = repos
    .task
    .list(context)
    .filter((task) => task.delegated_by === context.userId && task.delegated_to);

  const waitingOnOthers = delegated.filter(
    (task) => !task.delegated_acknowledged_at || task.status === "waiting"
  );

  const blockers = waitingOnOthers.filter((task) => {
    if (!task.due_at) return false;
    return new Date(task.due_at).getTime() < Date.now();
  });

  const members = listMembers();
  const teamPriorities = delegated
    .filter((task) => task.status !== "completed" && task.status !== "archived")
    .sort((a, b) => {
      if (a.priority === b.priority) return (a.due_at ?? "").localeCompare(b.due_at ?? "");
      return a.priority === "high" ? -1 : b.priority === "high" ? 1 : 0;
    })
    .slice(0, 6);

  return {
    organization: getOrCreateOrganization(),
    workspace_role: currentMember?.role ?? "owner",
    can_manage_workspace: currentMember ? currentMember.role === "owner" || currentMember.role === "admin" : true,
    members,
    delegated_by_me: delegated,
    waiting_on_others: waitingOnOthers,
    blockers,
    team_priorities: teamPriorities
  };
}

import { getDefaultContext, getRepos } from "../storage";
import type { MemberRole } from "../storage";

export function getOrCreateOrganization(name = "Chief Team") {
  const repos = getRepos();
  const context = getDefaultContext();
  const existing = repos.org.listByOwner(context)[0];
  if (existing) return existing;
  return repos.org.create(context, name);
}

export function addMember(input: { name: string; role: MemberRole }) {
  const repos = getRepos();
  const org = getOrCreateOrganization();
  return repos.member.add(org.id, input.name.trim(), input.role);
}

export function listMembers() {
  const repos = getRepos();
  const org = getOrCreateOrganization();
  return repos.member.list(org.id);
}

export function getTeamOverview() {
  const repos = getRepos();
  const context = getDefaultContext();
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
    members,
    delegated_by_me: delegated,
    waiting_on_others: waitingOnOthers,
    blockers,
    team_priorities: teamPriorities
  };
}

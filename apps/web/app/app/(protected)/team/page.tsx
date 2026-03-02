"use client";

import { Card } from "@chief/ui/web";
import { useEffect, useState } from "react";

interface Member {
  id: string;
  name: string;
  role: "owner" | "admin" | "executive" | "member";
  department: string | null;
}

interface TeamTask {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  delegated_to: string | null;
}

interface TeamOverview {
  organization: { id: string; name: string };
  workspace_role: "owner" | "admin" | "executive" | "member";
  can_manage_workspace: boolean;
  members: Member[];
  delegated_by_me: TeamTask[];
  waiting_on_others: TeamTask[];
  blockers: TeamTask[];
  team_priorities: TeamTask[];
}

interface TaskOption {
  id: string;
  title: string;
}

const DEPARTMENT_OPTIONS = [
  "",
  "Leadership",
  "CEO Office",
  "Engineering",
  "Product",
  "Design",
  "Operations",
  "Sales",
  "Marketing",
  "Finance",
  "People",
  "Legal",
  "Support"
] as const;

function formatDate(value: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString();
}

export default function TeamPage() {
  const [overview, setOverview] = useState<TeamOverview | null>(null);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<Member["role"]>("member");
  const [newMemberDepartment, setNewMemberDepartment] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  async function loadTeam() {
    setLoading(true);
    setError(null);
    try {
      const [teamRes, taskRes] = await Promise.all([
        fetch("/api/team/overview", { method: "GET", cache: "no-store" }),
        fetch("/api/tasks?filter=all", { method: "GET", cache: "no-store" })
      ]);

      const teamPayload = (await teamRes.json()) as TeamOverview | { error?: { message?: string } };
      const taskPayload = (await taskRes.json()) as { tasks?: TaskOption[] };

      if (!teamRes.ok) {
        throw new Error((teamPayload as { error?: { message?: string } }).error?.message ?? "Unable to load team.");
      }

      const resolvedOverview = teamPayload as TeamOverview;
      setOverview(resolvedOverview);
      const openTasks = (taskPayload.tasks ?? []).filter((task) => !["completed", "archived"].includes((task as { status?: string }).status ?? "open"));
      setTasks(openTasks as TaskOption[]);

      if (resolvedOverview.members.length > 0 && !selectedMemberId) {
        setSelectedMemberId(resolvedOverview.members[0].id);
      }
      if (openTasks.length > 0 && !selectedTaskId) {
        setSelectedTaskId(openTasks[0].id);
      }
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Unable to load team.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTeam();
  }, []);

  async function addMember() {
    if (!newMemberName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/team/members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: newMemberName.trim(),
          role: newMemberRole,
          department: newMemberDepartment.trim() || null
        })
      });
      if (!response.ok) throw new Error("Unable to add member.");
      setNewMemberName("");
      setNewMemberDepartment("");
      await loadTeam();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Unable to add member.");
    } finally {
      setSaving(false);
    }
  }

  async function delegateTask() {
    if (!selectedTaskId || !selectedMemberId) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/tasks/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "delegate",
          task_id: selectedTaskId,
          delegated_to: selectedMemberId
        })
      });
      if (!response.ok) throw new Error("Unable to delegate task.");
      await loadTeam();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Unable to delegate task.");
    } finally {
      setSaving(false);
    }
  }

  async function updateMemberDepartment(memberId: string, department: string) {
    setUpdatingMemberId(memberId);
    setError(null);
    try {
      const response = await fetch("/api/team/members", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: memberId,
          department: department || null
        })
      });
      if (!response.ok) throw new Error("Unable to update department.");
      await loadTeam();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Unable to update department.");
    } finally {
      setUpdatingMemberId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[30px] font-semibold">Team</h1>
        <p className="text-[13px] text-textSecondary">Structured delegation and blockers.</p>
      </div>

      {error ? <p className="text-[13px] font-medium text-[#b42318]">{error}</p> : null}

      {loading ? (
        <div className="rounded-[16px] border border-black/10 bg-white p-4 text-[13px] text-textSecondary">Loading team...</div>
      ) : null}

      {overview ? (
        <>
          <Card className="border border-black/10 p-4 shadow-none">
            <p className="text-[16px] font-semibold">{overview.organization.name}</p>
            <p className="text-[12px] text-textSecondary">{overview.members.length} member(s)</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {overview.members.map((member) => (
                <div key={member.id} className="rounded-[10px] border border-black/10 bg-[#FAFAFB] px-3 py-2">
                  <p className="text-[13px] font-semibold text-textPrimary">{member.name}</p>
                  <p className="text-[11px] uppercase tracking-[0.06em] text-textSecondary">{member.role}</p>
                  <select
                    value={member.department ?? ""}
                    onChange={(event) => void updateMemberDepartment(member.id, event.target.value)}
                    disabled={!overview.can_manage_workspace || updatingMemberId === member.id}
                    className="mt-2 h-8 w-full rounded-[8px] border border-black/10 bg-white px-2 text-[12px]"
                  >
                    {DEPARTMENT_OPTIONS.map((department) => (
                      <option key={department || "none"} value={department}>
                        {department || "No department"}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border border-black/10 p-4 shadow-none">
            <p className="mb-3 text-[16px] font-semibold">Add member</p>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_160px_auto]">
              <input
                value={newMemberName}
                onChange={(event) => setNewMemberName(event.target.value)}
                placeholder="Name"
                disabled={!overview.can_manage_workspace}
                className="h-10 rounded-[10px] border border-black/10 bg-white px-3 text-[13px]"
              />
              <select
                value={newMemberDepartment}
                onChange={(event) => setNewMemberDepartment(event.target.value)}
                disabled={!overview.can_manage_workspace}
                className="h-10 rounded-[10px] border border-black/10 bg-white px-3 text-[13px]"
              >
                {DEPARTMENT_OPTIONS.map((department) => (
                  <option key={department || "none"} value={department}>
                    {department || "No department"}
                  </option>
                ))}
              </select>
              <select
                value={newMemberRole}
                onChange={(event) => setNewMemberRole(event.target.value as Member["role"])}
                disabled={!overview.can_manage_workspace}
                className="h-10 rounded-[10px] border border-black/10 bg-white px-3 text-[13px]"
              >
                <option value="member">Member</option>
                <option value="executive">Executive</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="button"
                onClick={() => void addMember()}
                disabled={saving || !overview.can_manage_workspace}
                className="h-10 rounded-[10px] bg-[#111418] px-4 text-[13px] font-semibold text-white disabled:opacity-70"
              >
                Add
              </button>
            </div>
            {!overview.can_manage_workspace ? (
              <p className="mt-2 text-[11px] text-textSecondary">Only workspace owner/admin can add members.</p>
            ) : null}
          </Card>

          <Card className="border border-black/10 p-4 shadow-none">
            <p className="mb-3 text-[16px] font-semibold">Delegate task</p>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
              <select
                value={selectedTaskId}
                onChange={(event) => setSelectedTaskId(event.target.value)}
                className="h-10 rounded-[10px] border border-black/10 bg-white px-3 text-[13px]"
              >
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
              <select
                value={selectedMemberId}
                onChange={(event) => setSelectedMemberId(event.target.value)}
                className="h-10 rounded-[10px] border border-black/10 bg-white px-3 text-[13px]"
              >
                {overview.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void delegateTask()}
                disabled={saving || !selectedTaskId || !selectedMemberId || overview.workspace_role === "member"}
                className="h-10 rounded-[10px] bg-[#111418] px-4 text-[13px] font-semibold text-white disabled:opacity-70"
              >
                Delegate
              </button>
            </div>
            {overview.workspace_role === "member" ? (
              <p className="mt-2 text-[11px] text-textSecondary">Members can only work on assigned tasks.</p>
            ) : null}
          </Card>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="border border-black/10 p-4 shadow-none">
              <p className="mb-3 text-[14px] font-semibold">Delegated by me</p>
              <div className="space-y-2">
                {overview.delegated_by_me.map((task) => (
                  <div key={task.id} className="rounded-[10px] border border-black/10 bg-[#FAFAFB] p-2">
                    <p className="text-[12px] font-semibold">{task.title}</p>
                    <p className="text-[11px] text-textSecondary">Due {formatDate(task.due_at)}</p>
                  </div>
                ))}
                {overview.delegated_by_me.length === 0 ? <p className="text-[12px] text-textSecondary">No delegated tasks.</p> : null}
              </div>
            </Card>

            <Card className="border border-black/10 p-4 shadow-none">
              <p className="mb-3 text-[14px] font-semibold">Waiting on others</p>
              <div className="space-y-2">
                {overview.waiting_on_others.map((task) => (
                  <div key={task.id} className="rounded-[10px] border border-black/10 bg-[#FFF9F2] p-2">
                    <p className="text-[12px] font-semibold">{task.title}</p>
                    <p className="text-[11px] text-textSecondary">Status {task.status}</p>
                  </div>
                ))}
                {overview.waiting_on_others.length === 0 ? <p className="text-[12px] text-textSecondary">Nothing waiting.</p> : null}
              </div>
            </Card>

            <Card className="border border-black/10 p-4 shadow-none">
              <p className="mb-3 text-[14px] font-semibold">Blockers</p>
              <div className="space-y-2">
                {overview.blockers.map((task) => (
                  <div key={task.id} className="rounded-[10px] border border-black/10 bg-[#FFF6F7] p-2">
                    <p className="text-[12px] font-semibold">{task.title}</p>
                    <p className="text-[11px] text-textSecondary">Due {formatDate(task.due_at)}</p>
                  </div>
                ))}
                {overview.blockers.length === 0 ? <p className="text-[12px] text-textSecondary">No blockers.</p> : null}
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

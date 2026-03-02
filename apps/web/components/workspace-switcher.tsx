"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

interface WorkspaceRow {
  id: string;
  name: string;
  type: "personal" | "organization";
}

interface WorkspacePayload {
  active_workspace_id: string;
  workspaces: WorkspaceRow[];
}

interface WorkspaceActionFeedback {
  workspaceId: string;
  type: "success" | "error";
  message: string;
}

export function WorkspaceSwitcher() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [mutatingWorkspaceId, setMutatingWorkspaceId] = useState<string | null>(null);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [editingWorkspaceName, setEditingWorkspaceName] = useState("");
  const [confirmingDeleteWorkspaceId, setConfirmingDeleteWorkspaceId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<WorkspaceActionFeedback | null>(null);
  const [data, setData] = useState<WorkspacePayload | null>(null);
  const [name, setName] = useState("");

  async function getErrorMessage(response: Response, fallback: string) {
    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      return payload.error?.message ?? fallback;
    } catch {
      return fallback;
    }
  }

  async function load() {
    const response = await fetch("/api/workspaces", { method: "GET", cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as WorkspacePayload;
    setData(payload);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!containerRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  const active = useMemo(
    () => data?.workspaces.find((workspace) => workspace.id === data.active_workspace_id) ?? null,
    [data]
  );

  async function switchTo(workspaceId: string) {
    if (!data || workspaceId === data.active_workspace_id) {
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      await fetch("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "switch_workspace", workspace_id: workspaceId })
      });
      await load();
      router.refresh();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  async function createOrgWorkspace() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      await fetch("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create_workspace", name: trimmed, type: "organization" })
      });
      setName("");
      await load();
      router.refresh();
      setOpen(false);
    } finally {
      setCreating(false);
    }
  }

  function startRename(workspace: WorkspaceRow) {
    setConfirmingDeleteWorkspaceId(null);
    setActionFeedback(null);
    setEditingWorkspaceId(workspace.id);
    setEditingWorkspaceName(workspace.name);
  }

  function cancelRename() {
    setEditingWorkspaceId(null);
    setEditingWorkspaceName("");
  }

  async function renameWorkspace(workspaceId: string) {
    const trimmed = editingWorkspaceName.trim();
    if (!trimmed) return;
    setMutatingWorkspaceId(workspaceId);
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "rename_workspace", workspace_id: workspaceId, name: trimmed })
      });
      if (!response.ok) {
        const message = await getErrorMessage(response, "Unable to rename workspace.");
        setActionFeedback({ workspaceId, type: "error", message });
        return;
      }
      await load();
      router.refresh();
      cancelRename();
      setActionFeedback({ workspaceId, type: "success", message: "Workspace renamed." });
    } catch {
      setActionFeedback({ workspaceId, type: "error", message: "Unable to rename workspace." });
    } finally {
      setMutatingWorkspaceId(null);
    }
  }

  function requestDelete(workspaceId: string) {
    setEditingWorkspaceId(null);
    setEditingWorkspaceName("");
    setActionFeedback(null);
    setConfirmingDeleteWorkspaceId((current) => (current === workspaceId ? null : workspaceId));
  }

  async function deleteWorkspace(workspaceId: string) {
    setMutatingWorkspaceId(workspaceId);
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "delete_workspace", workspace_id: workspaceId })
      });
      if (!response.ok) {
        const message = await getErrorMessage(response, "Unable to delete workspace.");
        setActionFeedback({ workspaceId, type: "error", message });
        return;
      }
      await load();
      router.refresh();
      setConfirmingDeleteWorkspaceId(null);
      setActionFeedback({ workspaceId, type: "success", message: "Workspace deleted." });
    } catch {
      setActionFeedback({ workspaceId, type: "error", message: "Unable to delete workspace." });
    } finally {
      setMutatingWorkspaceId(null);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-11 min-w-[170px] max-w-[240px] items-center justify-between gap-2 rounded-[12px] border border-black/10 bg-white px-4 text-[13px] font-medium text-[#17181C]"
      >
        <span className="truncate">{active?.name ?? "Workspace"}</span>
        <span>▼</span>
      </button>

      {open ? (
        <div className="absolute left-0 top-12 z-20 w-[260px] rounded-[14px] border border-black/10 bg-white p-2 shadow-sm">
          <div className="space-y-1">
            {(data?.workspaces ?? []).map((workspace) => {
              const isEditing = editingWorkspaceId === workspace.id;
              const isConfirmingDelete = confirmingDeleteWorkspaceId === workspace.id;
              const isMutating = mutatingWorkspaceId === workspace.id;
              const feedback = actionFeedback?.workspaceId === workspace.id ? actionFeedback : null;

              return (
                <div key={workspace.id} className="rounded-[10px] hover:bg-[#F4F5F7]">
                  <button
                    type="button"
                    disabled={loading || isMutating || isEditing}
                    onClick={() => void switchTo(workspace.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] text-[#17181C]"
                  >
                    <span>{workspace.name}</span>
                    {workspace.id === data?.active_workspace_id ? <span className="text-[11px] text-[#6E6F75]">Active</span> : null}
                  </button>

                  {isEditing ? (
                    <div className="-mt-1 mb-2 space-y-2 px-3">
                      <input
                        value={editingWorkspaceName}
                        onChange={(event) => setEditingWorkspaceName(event.target.value)}
                        className="h-8 w-full rounded-[8px] border border-black/10 bg-white px-2 text-[12px] outline-none"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={isMutating || editingWorkspaceName.trim().length < 2}
                          onClick={() => void renameWorkspace(workspace.id)}
                          className="text-[11px] text-[#6E6F75] hover:text-[#17181C] disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          disabled={isMutating}
                          onClick={cancelRename}
                          className="text-[11px] text-[#6E6F75] hover:text-[#17181C] disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="-mt-1 mb-2 flex items-center justify-end gap-2 px-3">
                      <button
                        type="button"
                        disabled={loading || isMutating}
                        onClick={() => startRename(workspace)}
                        className="text-[11px] text-[#6E6F75] hover:text-[#17181C] disabled:opacity-50"
                      >
                        Rename
                      </button>
                      {workspace.type !== "personal" ? (
                        isConfirmingDelete ? (
                          <>
                            <button
                              type="button"
                              disabled={loading || isMutating}
                              onClick={() => void deleteWorkspace(workspace.id)}
                              className="text-[11px] text-[#6E6F75] hover:text-[#17181C] disabled:opacity-50"
                            >
                              Confirm delete
                            </button>
                            <button
                              type="button"
                              disabled={loading || isMutating}
                              onClick={() => setConfirmingDeleteWorkspaceId(null)}
                              className="text-[11px] text-[#6E6F75] hover:text-[#17181C] disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={loading || isMutating}
                            onClick={() => requestDelete(workspace.id)}
                            className="text-[11px] text-[#6E6F75] hover:text-[#17181C] disabled:opacity-50"
                          >
                            Delete
                          </button>
                        )
                      ) : null}
                    </div>
                  )}

                  {feedback ? (
                    <p
                      className={`-mt-1 mb-2 px-3 text-[11px] ${
                        feedback.type === "success" ? "text-[#087443]" : "text-[#b42318]"
                      }`}
                    >
                      {feedback.message}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-2 rounded-[10px] border border-black/10 p-2">
            <p className="text-[11px] text-[#6E6F75]">+ Create Workspace</p>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Organization name"
              className="mt-2 h-9 w-full rounded-[8px] border border-black/10 px-2 text-[12px] outline-none"
            />
            <button
              type="button"
              disabled={creating || name.trim().length === 0}
              onClick={() => void createOrgWorkspace()}
              className="mt-2 h-8 w-full rounded-[8px] border border-black/10 bg-[#F8F8F9] text-[12px] text-[#17181C] disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create organization workspace"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

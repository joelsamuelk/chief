"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface WorkspaceRow {
  id: string;
  name: string;
  type: "personal" | "organization";
}

interface WorkspacePayload {
  active_workspace_id: string;
  workspaces: WorkspaceRow[];
}

export function WorkspaceSwitcher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [data, setData] = useState<WorkspacePayload | null>(null);
  const [name, setName] = useState("");

  async function load() {
    const response = await fetch("/api/workspaces", { method: "GET", cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as WorkspacePayload;
    setData(payload);
  }

  useEffect(() => {
    void load();
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

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-10 items-center rounded-[12px] border border-black/10 bg-white px-3 text-[13px] font-medium text-[#17181C]"
      >
        {active?.name ?? "Workspace"} ▼
      </button>

      {open ? (
        <div className="absolute left-0 top-12 z-20 w-[260px] rounded-[14px] border border-black/10 bg-white p-2 shadow-sm">
          <div className="space-y-1">
            {(data?.workspaces ?? []).map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                disabled={loading}
                onClick={() => void switchTo(workspace.id)}
                className="flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left text-[13px] text-[#17181C] hover:bg-[#F4F5F7]"
              >
                <span>{workspace.name}</span>
                {workspace.id === data?.active_workspace_id ? <span className="text-[11px] text-[#6E6F75]">Active</span> : null}
              </button>
            ))}
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

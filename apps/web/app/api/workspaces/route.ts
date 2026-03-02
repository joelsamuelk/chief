import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import {
  addWorkspaceMember,
  createWorkspace,
  listWorkspaceMembers,
  listWorkspaces,
  switchWorkspace
} from "@/lib/services/workspaces";

export async function GET() {
  try {
    const summary = listWorkspaces();
    const members = listWorkspaceMembers();
    return jsonOk({ ...summary, members });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await parseJson<{
      action?: "create_workspace" | "switch_workspace" | "add_member";
      name?: string;
      type?: "personal" | "organization";
      workspace_id?: string;
      user_id?: string;
      role?: "owner" | "admin" | "executive" | "member";
    }>(request);

    if (payload.action === "switch_workspace") {
      if (!payload.workspace_id) throw new Error("workspace_id is required.");
      const workspace = switchWorkspace(payload.workspace_id);
      return jsonOk({ workspace });
    }

    if (payload.action === "add_member") {
      if (!payload.user_id || !payload.role) throw new Error("user_id and role are required.");
      const member = addWorkspaceMember({ user_id: payload.user_id, role: payload.role });
      return jsonOk({ member }, { status: 201 });
    }

    const workspace = createWorkspace({
      name: payload.name ?? "New Workspace",
      type: payload.type ?? "organization"
    });
    return jsonOk({ workspace }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

import { addMember, listMembers, updateMemberDepartment } from "@/lib/services/team";
import { jsonError, jsonOk, parseOptionalJson } from "@/lib/server/http";
import type { MemberRole } from "@/lib/storage";

export async function GET() {
  try {
    return jsonOk({ members: listMembers() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await parseOptionalJson<{ name?: string; role?: MemberRole; department?: string | null }>(request, {});
    if (!payload.name || !payload.role) {
      throw new Error("name and role are required.");
    }
    const member = addMember({ name: payload.name, role: payload.role, department: payload.department ?? null });
    return jsonOk({ member }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await parseOptionalJson<{ id?: string; department?: string | null }>(request, {});
    if (!payload.id) {
      throw new Error("member id is required.");
    }
    const member = updateMemberDepartment(payload.id, payload.department ?? null);
    if (!member) {
      throw new Error("Member not found.");
    }
    return jsonOk({ member });
  } catch (error) {
    return jsonError(error);
  }
}

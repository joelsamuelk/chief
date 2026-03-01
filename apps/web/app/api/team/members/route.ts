import { addMember, listMembers } from "@/lib/services/team";
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
    const payload = await parseOptionalJson<{ name?: string; role?: MemberRole }>(request, {});
    if (!payload.name || !payload.role) {
      throw new Error("name and role are required.");
    }
    const member = addMember({ name: payload.name, role: payload.role });
    return jsonOk({ member }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

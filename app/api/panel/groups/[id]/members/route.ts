import { NextResponse } from "next/server";
import { requireApiAccountRole, requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { groupMembersActionSchema } from "@/lib/panel/group-route-contract";
import { executeGroupMembers, previewGroupMembers } from "@/lib/panel/group-management-service";
import { parseGroupMutationEnvelope } from "@/lib/panel/group-mutation-input";
import { groupMutationHttpError } from "@/lib/panel/group-mutation-http";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const accountAuth = await requireApiAccountRole("ADMIN");
  if (!accountAuth.ok) return accountAuth.response;
  const body = await request.json().catch(() => null);
  const payload = groupMembersActionSchema.safeParse(body);
  if (!payload.success) {
    return NextResponse.json({ error: "Üye işlemi isteğini kontrol edin." }, { status: 400 });
  }

  const auth =
    payload.data.mode === "PREVIEW"
      ? accountAuth
      : await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;

  const guard = await guardMutation({
    action:
      payload.data.mode === "PREVIEW"
        ? "panel.groups.members.preview"
        : "panel.groups.members.execute",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:groups:members:${payload.data.mode.toLowerCase()}:${auth.session.userId}`,
    rateLimit: { max: payload.data.mode === "PREVIEW" ? 80 : 30, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json(
      {
        error:
          guard.code === "RATE_LIMIT"
            ? "Çok fazla işlem. Biraz sonra tekrar deneyin."
            : guard.message,
      },
      { status: guard.code === "RATE_LIMIT" ? 429 : 403 },
    );
  }

  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  try {
    const result = payload.data.mode === "PREVIEW"
      ? await previewGroupMembers(params.data.id, payload.data)
      : await executeGroupMembers(auth.session.userId, params.data.id, payload.data, parseGroupMutationEnvelope(request.headers, body, { transfer: payload.data.action === "TRANSFER" }));
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return groupMutationHttpError(error); }
}

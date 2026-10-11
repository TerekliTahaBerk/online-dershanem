import { NextResponse } from "next/server";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { groupActionSchema, legacyGroupSchema } from "@/lib/panel/group-route-contract";
import { updateManagedGroup } from "@/lib/panel/group-management-service";
import { parseGroupMutationEnvelope } from "@/lib/panel/group-mutation-input";
import { groupMutationHttpError } from "@/lib/panel/group-mutation-http";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({
    action: "panel.groups.update",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:groups:update:${auth.session.userId}`,
    rateLimit: { max: 120, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });

  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const { id } = params.data;
  const payload = await request.json().catch(() => null);
  const parsedAction = groupActionSchema.safeParse(payload);
  const parsedLegacy = parsedAction.success ? null : legacyGroupSchema.safeParse(payload);
  if (!parsedAction.success && !parsedLegacy?.success) {
    return NextResponse.json({ error: "Grup bilgilerini kontrol edin." }, { status: 400 });
  }
  const legacyData = parsedLegacy && parsedLegacy.success ? parsedLegacy.data : null;
  const action = parsedAction.success
    ? parsedAction.data
    : ({
        action: "UPDATE_META",
        name: legacyData!.name,
        subject: legacyData!.subject,
        level: legacyData!.level,
      } as const);

  try {
    const envelope = action.action === "PREVIEW_TRANSFER" ? {} : parseGroupMutationEnvelope(request.headers, payload, { transfer: action.action === "TRANSFER_STUDENT" });
    return NextResponse.json(await updateManagedGroup(auth.session.userId, id, action, envelope), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return groupMutationHttpError(error); }
}

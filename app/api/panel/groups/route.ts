import { NextResponse } from "next/server";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { createManagedGroup, groupCreateSchema } from "@/lib/panel/group-management-service";
import { parseGroupMutationEnvelope } from "@/lib/panel/group-mutation-input";
import { groupMutationHttpError } from "@/lib/panel/group-mutation-http";

export async function POST(request: Request) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({
    action: "panel.groups.create",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:groups:${auth.session.userId}`,
    rateLimit: { max: 40, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });

  const body = await request.json().catch(() => null);
  const parsed = groupCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Grup bilgilerini kontrol edin." }, { status: 400 });
  try {
    const envelope = parseGroupMutationEnvelope(request.headers, body, { create: true });
    return NextResponse.json(await createManagedGroup(auth.session.userId, parsed.data, envelope), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return groupMutationHttpError(error); }
}

import { NextResponse } from "next/server";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { buildUserArchiveImpact } from "@/lib/panel/archive-impact-server";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const routeParams = idParamsSchema.safeParse(await context.params);
  if (!routeParams.success) return invalidApiInput();
  const { id } = routeParams.data;
  const impact = await buildUserArchiveImpact(id);
  if (!impact) return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
  return NextResponse.json(impact);
}

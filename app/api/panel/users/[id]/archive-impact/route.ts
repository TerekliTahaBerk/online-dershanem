import { NextResponse } from "next/server";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { buildUserArchiveImpact } from "@/lib/panel/archive-impact-server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const impact = await buildUserArchiveImpact(id);
  if (!impact) return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
  return NextResponse.json(impact);
}

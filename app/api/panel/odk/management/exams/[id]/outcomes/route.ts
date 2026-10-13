import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiStaffPermission } from "@/lib/auth/api-guards";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { searchOdkExamOutcomes } from "@/lib/odk/exam-workspace-server";
import { PRIVATE_NO_STORE, staffJson } from "@/lib/panel/staff-api";

/**
 * K03 · Soru düzenleme için kazanım arama — web soru editörünün kazanım
 * seçenekleriyle aynı aktif katalog (`getActiveOutcomeOptions`); en çok 30
 * sonuç. Yalnız `odk:exam:edit`.
 */
const querySchema = z.object({ q: z.string().trim().max(80).default("") }).strict();

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiStaffPermission("odk:exam:edit"); if (!auth.ok) return auth.response;
  const params = idParamsSchema.safeParse(await context.params); if (!params.success) return invalidApiInput();
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return NextResponse.json({ error: "Arama geçersiz." }, { status: 400, headers: PRIVATE_NO_STORE });
  const options = await searchOdkExamOutcomes(params.data.id, query.data.q);
  if (!options) return NextResponse.json({ error: "Deneme bulunamadı.", code: "NOT_FOUND" }, { status: 404, headers: PRIVATE_NO_STORE });
  return staffJson({ options });
}

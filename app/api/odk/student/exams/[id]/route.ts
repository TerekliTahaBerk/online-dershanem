import { NextResponse } from "next/server";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { getStudentExam } from "@/lib/odk/student-exam-server";
import { toMobileOdkExamDetail } from "@/lib/mobile/odk-views";

const NOT_FOUND = { error: "Deneme bulunamadı.", code: "NOT_FOUND" };

/**
 * Deneme ayrıntısı (başlamadan önceki bilgi). Yetki: ODK öğrencisi + bu
 * deneme için AKTİF sözleşme hakkı (`getActiveOdkExamGrant`) + yayınlanmış
 * deneme; yoksa 404. SALT OKUNUR: deneme başlatılmaz, süresi dolan deneme
 * burada teslim edilmez (`finalizeExpired: false`). Cevaplar, sürüm ayarları,
 * dosyalar ve Meet bağlantısı yanıta girmez.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "STUDENT");
  if (!auth.ok) return auth.response;
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const data = await getStudentExam(params.data.id, auth.session.userId, { finalizeExpired: false });
  const detail = data ? toMobileOdkExamDetail(data) : null;
  if (!detail) return NextResponse.json(NOT_FOUND, { status: 404 });
  return NextResponse.json(detail, { headers: { "Cache-Control": "private, no-store" } });
}

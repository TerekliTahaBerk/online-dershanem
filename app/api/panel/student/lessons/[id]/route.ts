import { NextResponse } from "next/server";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { toMobileLessonDetail } from "@/lib/mobile/student-views";
import { loadStudentLessonDetail } from "@/lib/panel/student-lesson-detail-server";

/**
 * Öğrenci ders detayı — `app/panel/ogrenci/takvim/[id]` ile AYNI okuma
 * modeli (`loadStudentLessonDetail`). OD erişimi zorunlu; öğrencinin kayıtlı
 * olmadığı grubun dersi, olmayan ders ve profili olmayan öğrenci aynı 404'ü
 * alır (varlık sızdırılmaz). Katılım bağlantısı yalnız pencere açıkken.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOdRole("STUDENT");
  if (!auth.ok) return auth.response;
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const detail = await loadStudentLessonDetail({ studentUserId: auth.session.userId, lessonId: params.data.id });
  if (!detail) return NextResponse.json({ error: "Ders bulunamadı." }, { status: 404 });
  return NextResponse.json(toMobileLessonDetail(detail), { headers: { "Cache-Control": "private, no-store" } });
}

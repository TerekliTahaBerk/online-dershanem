import { NextResponse } from "next/server";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { loadOdkStudentResult } from "@/lib/odk/student-result-server";
import { toMobileOdkResult } from "@/lib/mobile/odk-views";

/**
 * Açıklanmış deneme sonucu — web `denemeler/[id]/sonuc` ile AYNI yükleyici.
 * Sonuç yalnız TÜM koşullar sağlanınca döner (aktif hak, `studentReports`,
 * sınav RELEASED, sözleşmeye göre yayın zamanı geçmiş, öğrencinin kendi
 * YAYINLANMIŞ skoru); aksi halde nedeni sızdırmayan 404. Soru başına doğru
 * cevap yalnız cevap anahtarı yayınındaysa taşınır; bu yanıt cevap anahtarı
 * dosyasına ayrıca yetki vermez (dosya ucu kendi kontrolünü yapar).
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "STUDENT");
  if (!auth.ok) return auth.response;
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const loaded = await loadOdkStudentResult({ userId: auth.session.userId, role: auth.session.role, examId: params.data.id });
  if (!loaded) return NextResponse.json({ error: "Açıklanmış sonuç bulunamadı.", code: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(toMobileOdkResult(loaded), { headers: { "Cache-Control": "private, no-store" } });
}

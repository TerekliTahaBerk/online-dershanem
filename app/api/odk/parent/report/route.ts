import { requireApiProductRole } from "@/lib/auth/api-guards";
import { getOdkAudienceStudentReport } from "@/lib/odk/reporting-server";
import { toMobileParentOdkReport } from "@/lib/mobile/parent-views";
import { NextResponse } from "next/server";
import { childNotFound, parentJson, PRIVATE_NO_STORE } from "@/lib/panel/parent-api";
import { listParentVisibleChildren } from "@/lib/panel/parent-product-policy";
import { z } from "zod";

/**
 * Veli · Deneme Ligi raporu — web `app/panel/odk/veli/raporlar` ile aynı
 * `getOdkAudienceStudentReport` (gerçek PARENT izleyici).
 *
 * KİMLİK DÖNÜŞÜMÜ: istemci `studentId = StudentProfile.id` gönderir. Çocuk
 * önce velinin akademik kapsamında çözülür (bağlı değil → 404
 * CHILD_NOT_FOUND), öğrenci `User.id` SUNUCUDA bu kayıttan alınır. İstemciden
 * öğrenci kullanıcı kimliği KABUL EDİLMEZ.
 *
 * Kapılar: velinin ODK erişimi (web sayfası ile aynı) + çocuğun ODK ürünü +
 * yükleyicinin kendi kapıları (aktif hak, sözleşmede `parentReports`,
 * yayınlanmış sonuç + PUBLISHED skor + yayın zamanı). Rapor yoksa
 * `available: false` — hangi koşulun eksik olduğu söylenmez.
 */
const query = z.object({ studentId: z.string().trim().min(1).max(191) });

export async function GET(request: Request) {
  const auth = await requireApiProductRole("ODK", "PARENT");
  if (!auth.ok) return auth.response;
  const parsed = query.safeParse({ studentId: new URL(request.url).searchParams.get("studentId") ?? undefined });
  if (!parsed.success) return NextResponse.json({ error: "Öğrenci seçimi geçersiz.", code: "VALIDATION" }, { status: 400, headers: PRIVATE_NO_STORE });
  const child = (await listParentVisibleChildren(auth.session.userId, "academic")).find((item) => item.id === parsed.data.studentId);
  if (!child) return childNotFound();
  const report = child.products.includes("ODK") ? await getOdkAudienceStudentReport({ userId: auth.session.userId, role: "PARENT" }, child.userId) : null;
  return parentJson(toMobileParentOdkReport(child.id, report));
}

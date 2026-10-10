import { prisma } from "@/lib/prisma";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { toMobileParentExternalExams } from "@/lib/mobile/parent-views";
import { featureDisabled, parentJson, requireParentChild } from "@/lib/panel/parent-api";

/**
 * Veli · Dış deneme kayıtları (okul / kurum / yayınevi denemeleri —
 * `MockExam`). Deneme Ligi (ODK) DEĞİLDİR; o rapor `GET /api/odk/parent/report`.
 * Web `app/panel/veli/denemeler` ile aynı erişim kuralı (çocuğun OD veya ODK
 * ürünü) ve bayrak (`mockExamAnalysis`). Salt okunur; hata nedeni etiketleri,
 * yayınevi ve personel bilgisi dönmez.
 */
export async function GET(request: Request) {
  const scope = await requireParentChild(request);
  if (!scope.ok) return scope.response;
  if (!getPanelFeatureFlags().mockExamAnalysis) return featureDisabled("Deneme analizi henüz açık değil.");
  const available = scope.child.products.includes("OD") || scope.child.products.includes("ODK");
  const exams = available
    ? await prisma.mockExam.findMany({
        where: { studentId: scope.child.id },
        orderBy: { takenAt: "desc" },
        take: 30,
        select: { id: true, title: true, exam: true, takenAt: true, sections: { orderBy: { position: "asc" }, select: { subjectName: true, correctCount: true, incorrectCount: true } } },
      })
    : [];
  return parentJson(toMobileParentExternalExams({ studentId: scope.child.id, available, exams: exams.map((exam) => ({ ...exam, examType: exam.exam })) }));
}

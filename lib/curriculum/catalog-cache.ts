import "server-only";

import type { CurriculumExam, CurriculumStatus, OdkExamFamily } from "@prisma/client";
import { revalidateTag, unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";

/**
 * Müfredat referans verisi için paylaşılan önbellek.
 *
 * YALNIZ kişisel olmayan, bütün yöneticiler için aynı olan veri buraya girer:
 * sürüm/ders/ünite/kazanım sözlüğü. Kullanıcıya göre değişen alanlar (favori,
 * son kullanılan, öğretmenin kendi dersleri) bu önbelleğe KONMAZ; önbellek
 * anahtarı kullanıcı içermediği için herkese aynı yanıt döner.
 *
 * Bu projede `cacheComponents` kapalı; `use cache` açmak bütün uygulamanın
 * render modelini değiştirir. Bu yüzden eski modelin `unstable_cache` + tag
 * API'si kullanılır. Müfredatı değiştiren her route işlem başarıyla bittikten
 * sonra `revalidateCurriculumCatalog()` çağırmalıdır. Değerler JSON olarak
 * saklanır: dönüş tiplerine `Date` koyma, önbellekten string olarak döner.
 */
export const CURRICULUM_CATALOG_TAG = "curriculum-catalog";

const CURRICULUM_CATALOG_REVALIDATE_SECONDS = 60 * 60;

export type CurriculumVersionSummary = {
  id: string;
  code: string;
  title: string;
  exam: CurriculumExam;
  academicYear: number;
  status: CurriculumStatus;
  subjectCount: number;
  outcomeCount: number;
};

export const getCurriculumVersionSummaries = unstable_cache(
  async (): Promise<CurriculumVersionSummary[]> => {
    const versions = await prisma.curriculumVersion.findMany({
      orderBy: [{ academicYear: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        code: true,
        title: true,
        exam: true,
        academicYear: true,
        status: true,
        subjects: {
          select: { units: { select: { _count: { select: { outcomes: true } } } } },
        },
      },
    });
    return versions.map((version) => ({
      id: version.id,
      code: version.code,
      title: version.title,
      exam: version.exam,
      academicYear: version.academicYear,
      status: version.status,
      subjectCount: version.subjects.length,
      outcomeCount: version.subjects.reduce(
        (sum, subject) => sum + subject.units.reduce((unitSum, unit) => unitSum + unit._count.outcomes, 0),
        0,
      ),
    }));
  },
  ["curriculum-version-summaries"],
  { tags: [CURRICULUM_CATALOG_TAG], revalidate: CURRICULUM_CATALOG_REVALIDATE_SECONDS },
);

export type CurriculumOutcomeOption = { id: string; label: string };

/** ODK sınav editörünün kazanım seçicisi: aktif sürümdeki kazanımlar. */
export const getActiveOutcomeOptions = unstable_cache(
  async (family: OdkExamFamily, mathOnly: boolean): Promise<CurriculumOutcomeOption[]> => {
    const outcomes = await prisma.learningOutcome.findMany({
      where: {
        isActive: true,
        unit: {
          subject: {
            version: { exam: family, status: "ACTIVE" },
            ...(mathOnly
              ? {
                  OR: [
                    { code: { contains: "MAT", mode: "insensitive" } },
                    { name: { contains: "Matematik", mode: "insensitive" } },
                  ],
                }
              : {}),
          },
        },
      },
      orderBy: [{ unit: { name: "asc" } }, { code: "asc" }],
      select: { id: true, code: true, title: true, unit: { select: { name: true } } },
      take: 2000,
    });
    return outcomes.map((outcome) => ({
      id: outcome.id,
      label: `${outcome.code} · ${outcome.unit.name} · ${outcome.title}`,
    }));
  },
  ["curriculum-active-outcome-options"],
  { tags: [CURRICULUM_CATALOG_TAG], revalidate: CURRICULUM_CATALOG_REVALIDATE_SECONDS },
);

/**
 * `expire: 0`: bir sonraki istek bayat veriyi görmez. Yönetici kazanım ekleyip
 * sayfayı yenilediğinde eklediğini hemen görmeli; stale-while-revalidate burada
 * yanlış olurdu.
 */
export function revalidateCurriculumCatalog() {
  revalidateTag(CURRICULUM_CATALOG_TAG, { expire: 0 });
}

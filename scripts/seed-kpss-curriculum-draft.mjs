import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const VERSION_CODE = "KPSS-EGITIM-BILIMLERI-2026-TASLAK";
const EXPERT_REVIEW_NOTICE =
  "Bu taslak, yayına alınmadan önce bir eğitim bilimleri alan uzmanı tarafından ÖSYM'nin güncel konu ağırlıklarına göre doğrulanmalı ve düzenlenmelidir.";

// DİKKAT: Aşağıdaki başlıklar doğrulanmış/resmî bir KPSS müfredatı değildir.
// Yayından önce alan uzmanı bunları ÖSYM'nin güncel konu ağırlıklarına göre
// doğrulamalı ve düzenlemelidir; kazanımlar özellikle boş bırakılmıştır.
const subjects = [
  ["GELISIM-PSIKOLOJISI", "Gelişim Psikolojisi"],
  ["OGRENME-PSIKOLOJISI", "Öğrenme Psikolojisi"],
  ["OGRETIM-ILKE-YONTEMLERI", "Öğretim İlke ve Yöntemleri"],
  ["OLCME-DEGERLENDIRME", "Ölçme ve Değerlendirme"],
  ["REHBERLIK-OZEL-EGITIM", "Rehberlik ve Özel Eğitim"],
  ["SINIF-YONETIMI", "Sınıf Yönetimi"],
  ["PROGRAM-GELISTIRME", "Program Geliştirme"],
  ["OGRETIM-TEKNOLOJILERI-MATERYAL", "Öğretim Teknolojileri ve Materyal Tasarımı"],
  ["EGITIMDE-ARASTIRMA-YONTEMLERI", "Eğitimde Araştırma Yöntemleri"],
  ["TURK-EGITIM-SISTEMI-YONETIMI", "Türk Eğitim Sistemi ve Eğitim Yönetimi"],
];

function stableId(prefix, code) {
  return `${prefix}_${code.toLowerCase().replaceAll("-", "_")}`;
}

async function main() {
  const examFamily = await prisma.examFamily.findUniqueOrThrow({
    where: { code: "KPSS_EGITIM_BILIMLERI" },
    select: { id: true },
  });
  const requestedCreatorId = process.env.KPSS_CURRICULUM_CREATED_BY_ID;
  const creator = requestedCreatorId
    ? await prisma.user.findFirst({
        where: { id: requestedCreatorId, role: "ADMIN", status: "ACTIVE" },
        select: { id: true },
      })
    : await prisma.user.findFirst({
        where: { role: "ADMIN", status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
  if (!creator) {
    throw new Error(
      "Aktif bir ADMIN bulunamadı. KPSS_CURRICULUM_CREATED_BY_ID ile aktif bir yönetici kimliği verin.",
    );
  }

  const version = await prisma.curriculumVersion.upsert({
    where: { code: VERSION_CODE },
    update: {
      title: "KPSS Eğitim Bilimleri (Taslak — Uzman Onayı Bekliyor)",
      exam: null,
      examFamilyRefId: examFamily.id,
      academicYear: 2026,
      status: "DRAFT",
    },
    create: {
      id: "curriculum_kpss_egitim_bilimleri_2026_taslak",
      code: VERSION_CODE,
      title: "KPSS Eğitim Bilimleri (Taslak — Uzman Onayı Bekliyor)",
      exam: null,
      examFamilyRefId: examFamily.id,
      academicYear: 2026,
      status: "DRAFT",
      createdById: creator.id,
    },
  });

  const units = [];
  for (const [position, [code, name]] of subjects.entries()) {
    const subject = await prisma.curriculumSubject.upsert({
      where: { versionId_code: { versionId: version.id, code } },
      update: { name, position },
      create: {
        id: stableId("curriculum_subject_kpss_2026", code),
        versionId: version.id,
        code,
        name,
        position,
      },
    });
    const unit = await prisma.curriculumUnit.upsert({
      where: { subjectId_code: { subjectId: subject.id, code: "GENEL" } },
      update: { name: "Genel — detaylandırılacak", position: 0 },
      create: {
        id: stableId("curriculum_unit_kpss_2026", code),
        subjectId: subject.id,
        code: "GENEL",
        name: "Genel — detaylandırılacak",
        position: 0,
      },
    });
    units.push({ id: unit.id, subjectCode: code, unitCode: unit.code });
  }

  const [subjectCount, unitCount, outcomeCount] = await Promise.all([
    prisma.curriculumSubject.count({ where: { versionId: version.id } }),
    prisma.curriculumUnit.count({ where: { subject: { versionId: version.id } } }),
    prisma.learningOutcome.count({ where: { unit: { subject: { versionId: version.id } } } }),
  ]);

  console.log(
    JSON.stringify({
      notice: EXPERT_REVIEW_NOTICE,
      version: { id: version.id, code: version.code, status: version.status, exam: version.exam },
      subjectCount,
      unitCount,
      outcomeCount,
      units,
    }),
  );
}

main().finally(() => prisma.$disconnect());

import assert from "node:assert/strict";

import { getCurriculumExamLabel } from "../../lib/panel/curriculum/curriculum-exam";
import { createIntegrationPrismaClient, integration } from "./integration-utils";

const db = createIntegrationPrismaClient();
const PASSWORD_HASH = "scrypt$1$8$1$YmFzZTY0$c2hhMDA=";

integration("legacy enum ve KPSS sınav ailesi müfredat sorguları birlikte çalışır", async () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const creator = await db.user.create({
    data: {
      email: `curriculum-family-${runId}@example.com`,
      passwordHash: PASSWORD_HASH,
      mustChangePassword: false,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });
  const product = await db.product.upsert({
    where: { code: "KPSS" },
    update: { isActive: true },
    create: { code: "KPSS", name: "KPSS", targetAudience: "adult" },
  });
  const family = await db.examFamily.upsert({
    where: { code: "KPSS_EGITIM_BILIMLERI" },
    update: { productId: product.id, isActive: true },
    create: { code: "KPSS_EGITIM_BILIMLERI", name: "KPSS Eğitim Bilimleri", productId: product.id },
  });
  const codes = ["LGS", "TYT", "AYT", "YDT"] as const;
  const versionCodes = codes.map((exam) => `INTEGRATION-${exam}-${runId}`);
  const kpssCode = `INTEGRATION-KPSS-${runId}`;

  try {
    for (const exam of codes) {
      await db.curriculumVersion.create({
        data: { code: `INTEGRATION-${exam}-${runId}`, title: `${exam} test`, exam, academicYear: 2026, status: "DRAFT", createdById: creator.id },
      });
    }
    await db.curriculumVersion.create({
      data: { code: kpssCode, title: "KPSS test", exam: null, examFamilyRefId: family.id, academicYear: 2026, status: "DRAFT", createdById: creator.id },
    });

    for (const exam of codes) {
      const rows = await db.curriculumVersion.findMany({
        where: { exam, code: { in: versionCodes } },
      });
      assert.equal(rows.length, 1);
      assert.equal(rows[0]?.code, `INTEGRATION-${exam}-${runId}`);
    }

    const kpssRows = await db.curriculumVersion.findMany({
      where: { examFamilyRefId: family.id, code: kpssCode },
      include: { examFamilyRef: { select: { code: true } } },
    });
    assert.equal(kpssRows.length, 1);
    assert.equal(kpssRows[0]?.exam, null);
    assert.equal(getCurriculumExamLabel(kpssRows[0]!), "KPSS_EGITIM_BILIMLERI");
  } finally {
    await db.curriculumVersion.deleteMany({ where: { code: { in: [...versionCodes, kpssCode] } } });
    await db.user.delete({ where: { id: creator.id } });
  }
});

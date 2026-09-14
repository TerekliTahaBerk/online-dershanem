import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../lib/prisma";
import { generateInterventionEpisodes } from "../../lib/intervention-server";
import { getInterventionInbox } from "../../lib/intervention-inbox-server";
import { createIntegrationPrismaClient, integration } from "./integration-utils";
import { assertIntegrationSchemaReady } from "./integration-utils";

const db = createIntegrationPrismaClient();
const runId = crypto.randomUUID();

/*
 * Müdahale kaydının etiketi (`reasonCode`) açıklamayı üreten sinyalle aynı
 * olmalı. Önceden oluşturma sabit `ATTENDANCE_PATTERN` yazıyor, güncelleme de
 * etiketi hiç değiştirmiyordu: tekrar güçlüğü sinyali "Katılım örüntüsü"
 * başlığıyla görünüyordu.
 */
integration("müdahale epizodu sinyalin kendi reasonCode değerini yazar ve yeniler", async () => {
  await assertIntegrationSchemaReady(db);
  const now = new Date();
  const teacher = await db.user.create({
    data: {
      email: `intervention-teacher-${runId}@example.com`,
      passwordHash: "scrypt$1$8$1$YmFzZTY0$c2hhMDA=",
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "TEACHER",
      status: "ACTIVE",
      fullName: "Intervention Teacher",
    },
  });
  const studentUser = await db.user.create({
    data: {
      email: `intervention-student-${runId}@example.com`,
      passwordHash: "scrypt$1$8$1$YmFzZTY0$c2hhMDA=",
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "STUDENT",
      status: "ACTIVE",
      fullName: "Intervention Student",
    },
  });
  const student = await db.studentProfile.create({ data: { userId: studentUser.id, classLevel: "8" } });
  const group = await db.group.create({
    data: { name: `intervention-${runId.slice(0, 8)}`, subject: "Matematik", teacherId: teacher.id, isActive: true },
  });

  try {
    await db.enrollment.create({ data: { groupId: group.id, studentId: student.id } });
    const reviewItem = await db.reviewItem.create({
      data: {
        studentId: student.id,
        sourceType: "TEACHER_REFERENCE",
        title: "Köklü ifadeler",
        sourceReference: `intervention-${runId}`,
        dueAt: now,
      },
    });
    await db.reviewAttempt.createMany({
      data: [0, 1, 2].map((index) => ({
        reviewItemId: reviewItem.id,
        response: index === 1 ? "UNSURE" : "WRONG",
        stageBefore: 0,
        stageAfter: 0,
        idempotencyKey: `${runId}-${index}`,
        reviewedAt: new Date(now.getTime() - (index + 1) * 60_000),
      })),
    });

    await generateInterventionEpisodes({ teacherId: teacher.id });
    const created = await db.interventionCase.findFirstOrThrow({ where: { studentId: student.id } });
    assert.equal(created.reasonCode, "REPEATED_REVIEW_DIFFICULTY");

    // Eski hatayla yanlış etiketlenmiş kayıt bir sonraki üretimde düzelir.
    await db.interventionCase.update({ where: { id: created.id }, data: { reasonCode: "ATTENDANCE_PATTERN" } });
    await generateInterventionEpisodes({ teacherId: teacher.id });
    const refreshed = await db.interventionCase.findUniqueOrThrow({ where: { id: created.id } });
    assert.equal(refreshed.reasonCode, "REPEATED_REVIEW_DIFFICULTY");
    assert.match(refreshed.explanation, /en az üç “yanlış” veya “emin değilim”/);

    // Kutudaki satır eylem ucuna gerçek kayıt kimliği ve sürümüyle gitmeli;
    // "öğrenci:neden" bileşik anahtarı her Üstlen/Kapat isteğini 404'e düşürüyordu.
    const inbox = await getInterventionInbox({ role: "TEACHER", userId: teacher.id });
    const row = inbox.find((item) => item.studentName === "Intervention Student");
    assert.ok(row, "öğretmen kendi öğrencisinin kaydını görür");
    assert.equal(row.id, refreshed.id);
    assert.equal(row.version, refreshed.version);
  } finally {
    await db.group.deleteMany({ where: { id: group.id } });
    await db.user.deleteMany({ where: { id: { in: [teacher.id, studentUser.id] } } });
  }
});

test.after(async () => {
  await Promise.all([db.$disconnect(), prisma.$disconnect()]);
});

import assert from "node:assert/strict";

import { emitCrossProductEvent } from "../../lib/student-success/server/outbox";
import { processCrossProductEventOutbox } from "../../lib/student-success/server/event-processor";
import { getStudentCalendar } from "../../lib/student-success/server/calendar-server";
import { assertCoachOrTeacherAccess } from "../../lib/kocum/access-server";
import { istanbulWeekStart } from "../../lib/istanbul-time";
import { createIntegrationPrismaClient, integration } from "./integration-utils";

/**
 * ONLINE KOÇUM — üretim hazırlığı entegrasyon testleri.
 *
 * Sahte consumer yok: gerçek `ASSIGNMENT_CREATED` zinciri (outbox →
 * assignment-projection → WeeklyPlanTask → birleşik takvim) gerçek Postgres
 * üzerinde koşar. Aranan davranışlar:
 *   §7/§8  projeksiyon idempotent, referans doğru
 *   §21    aynı iş birleşik takvimde İKİ KEZ görünmez
 *   §25    yetkisiz öğretmen başka öğrencinin planına erişemez
 */

const db = createIntegrationPrismaClient();

const PASSWORD_HASH = "scrypt$1$8$1$YmFzZTY0$c2hhMDA=";

type Fixture = Awaited<ReturnType<typeof createFixture>>;

async function createFixture(options: { withOk: boolean } = { withOk: true }) {
  const now = new Date();
  const runId = crypto.randomUUID().slice(0, 8);

  const teacher = await db.user.create({
    data: {
      email: `kocum-teacher-${runId}@example.com`,
      passwordHash: PASSWORD_HASH,
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "TEACHER",
      status: "ACTIVE",
      fullName: "Koçum Teacher",
    },
  });
  // İlişkisi olmayan ikinci öğretmen — yatay erişim testi için.
  const outsider = await db.user.create({
    data: {
      email: `kocum-outsider-${runId}@example.com`,
      passwordHash: PASSWORD_HASH,
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "TEACHER",
      status: "ACTIVE",
      fullName: "Yabancı Öğretmen",
    },
  });
  const studentUser = await db.user.create({
    data: {
      email: `kocum-student-${runId}@example.com`,
      passwordHash: PASSWORD_HASH,
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "STUDENT",
      status: "ACTIVE",
      fullName: "Koçum Student",
    },
  });
  const student = await db.studentProfile.create({ data: { userId: studentUser.id } });

  await db.productMembership.create({
    data: { userId: studentUser.id, product: "OD", startsAt: now },
  });
  if (options.withOk) {
    await db.productMembership.create({
      data: { userId: studentUser.id, product: "OK", startsAt: now },
    });
  }

  const group = await db.group.create({
    data: { name: `Kocum-${runId}`, subject: "Matematik", teacherId: teacher.id, capacity: 4 },
  });
  await db.enrollment.create({ data: { groupId: group.id, studentId: student.id } });

  // Ödevin son tarihi bu haftanın içinde: projeksiyon aynı haftanın planına yazar.
  const weekStart = istanbulWeekStart(now);
  const dueAt = new Date(weekStart.getTime() + 3 * 86400000 + 12 * 3600000);

  const assignment = await db.assignment.create({
    data: {
      groupId: group.id,
      createdById: teacher.id,
      title: "Türev soruları",
      description: "20 soru",
      dueAt,
      isActive: true,
    },
  });
  await db.assignmentProgress.create({
    data: { assignmentId: assignment.id, studentId: student.id, status: "TODO" },
  });

  const okProduct = await db.product.findUniqueOrThrow({
    where: { code: "OK" },
    select: { id: true },
  });
  const plan = await db.weeklyPlan.create({
    data: {
      studentId: student.id,
      productRefId: okProduct.id,
      weekStart,
      status: "APPROVED",
      capacityMinutes: 300,
      createdById: teacher.id,
      approvedById: teacher.id,
      approvedAt: now,
    },
  });

  return { teacher, outsider, studentUser, student, group, assignment, plan, weekStart, dueAt };
}

async function cleanupFixture(fixture: Fixture) {
  await db.crossProductEventConsumer.deleteMany({
    where: { event: { studentId: fixture.student.id } },
  });
  await db.crossProductEventOutbox.deleteMany({ where: { studentId: fixture.student.id } });
  await db.studentTimelineEvent.deleteMany({ where: { studentId: fixture.student.id } });
  await db.weeklyPlanRevision.deleteMany({ where: { planId: fixture.plan.id } });
  await db.weeklyPlanTask.deleteMany({ where: { planId: fixture.plan.id } });
  await db.weeklyPlan.deleteMany({ where: { studentId: fixture.student.id } });
  await db.weeklyPlanSuggestion.deleteMany({ where: { studentId: fixture.student.id } });
  await db.assignmentProgress.deleteMany({ where: { assignmentId: fixture.assignment.id } });
  await db.assignment.delete({ where: { id: fixture.assignment.id } });
  await db.enrollment.deleteMany({ where: { groupId: fixture.group.id } });
  await db.group.delete({ where: { id: fixture.group.id } });
  await db.productMembership.deleteMany({ where: { userId: fixture.studentUser.id } });
  await db.studentProfile.delete({ where: { id: fixture.student.id } });
  await db.user.delete({ where: { id: fixture.studentUser.id } });
  await db.user.delete({ where: { id: fixture.outsider.id } });
  await db.user.delete({ where: { id: fixture.teacher.id } });
}

function assignmentCreatedInput(fixture: Fixture) {
  return {
    eventType: "ASSIGNMENT_CREATED" as const,
    actorUserId: fixture.teacher.id,
    studentId: fixture.student.id,
    entityType: "Assignment",
    entityId: fixture.assignment.id,
    payload: {
      eventVersion: 1 as const,
      assignmentId: fixture.assignment.id,
      groupId: fixture.group.id,
      dueAt: fixture.dueAt.toISOString(),
      outcomeIds: [] as string[],
    },
  };
}

/* ---------------------------------------------------------------- *
 * §8 — İdempotency VERİTABANI seviyesinde garanti edilmeli
 * ---------------------------------------------------------------- */

integration("§8 projeksiyon idempotency'si koşullu benzersiz indeksle korunur", async () => {
  /*
   * Uygulama içi "önce oku sonra yaz" kontrolü iki eşzamanlı işleyicide
   * yetmez. Migration 0100 bu kuralı indekse taşır. Bu test indeksin canlı
   * şemada BULUNDUĞUNU doğrular — yoksa yayın kapısı kapalı kalmalı.
   */
  const rows = await db.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'weekly_plan_tasks'
      AND indexname IN (
        'weekly_plan_tasks_one_per_assignment_ref',
        'weekly_plan_tasks_one_per_suggestion_ref'
      )
  `;
  assert.equal(
    rows.length,
    2,
    "migration 0100 uygulanmamış: projeksiyon çifti yalnız uygulama kontrolüne bağlı kalır",
  );
});

integration("§8 aynı ödev olayı defalarca işlense de tek plan görevi kalır", async () => {
  const fixture = await createFixture();
  try {
    const { eventId } = await emitCrossProductEvent(assignmentCreatedInput(fixture));
    assert.ok(eventId);

    // Olay beş kez işlenir: tüketici işaretleri her turda silinerek gerçek bir
    // "aynı olay yeniden işlendi" senaryosu kurulur.
    for (let i = 0; i < 5; i += 1) {
      await processCrossProductEventOutbox(50);
      await db.crossProductEventConsumer.deleteMany({ where: { eventId: eventId! } });
      await db.crossProductEventOutbox.update({
        where: { id: eventId! },
        data: { status: "PENDING", processedAt: null, attempts: 0 },
      });
    }
    await processCrossProductEventOutbox(50);

    const tasks = await db.weeklyPlanTask.findMany({
      where: { planId: fixture.plan.id, sourceType: "ASSIGNMENT" },
    });
    assert.equal(tasks.length, 1, "ödev başına TEK plan görevi");
    assert.equal(tasks[0].sourceReferenceId, fixture.assignment.id, "§7 referans doğru");
    assert.equal(
      tasks[0].dueAt?.getTime(),
      fixture.dueAt.getTime(),
      "§7 son tarih kaynakla tutarlı",
    );
  } finally {
    await cleanupFixture(fixture);
  }
});

integration("§8 indeks, uygulama kontrolü atlansa bile ikinci görevi reddeder", async () => {
  const fixture = await createFixture();
  try {
    const base = {
      planId: fixture.plan.id,
      scheduledFor: fixture.dueAt,
      title: "Türev soruları",
      durationMinutes: 30,
      sourceType: "ASSIGNMENT" as const,
      sourceReferenceId: fixture.assignment.id,
      reasonCode: "DUE_SOON" as const,
      taskKind: "CLASSIC_ASSIGNMENT" as const,
    };
    await db.weeklyPlanTask.create({ data: { ...base, position: 1 } });

    await assert.rejects(
      () => db.weeklyPlanTask.create({ data: { ...base, position: 2 } }),
      /Unique constraint|P2002/,
      "veritabanı ikinci bağlantıyı reddetmeli",
    );
  } finally {
    await cleanupFixture(fixture);
  }
});

/* ---------------------------------------------------------------- *
 * §21 — Aynı iş birleşik görünümde iki kez çıkmaz
 * ---------------------------------------------------------------- */

integration("§21 projeksiyonlu ödev birleşik takvimde tek kalem olarak görünür", async () => {
  const fixture = await createFixture();
  try {
    await emitCrossProductEvent(assignmentCreatedInput(fixture));
    await processCrossProductEventOutbox(50);

    const projected = await db.weeklyPlanTask.findFirst({
      where: { planId: fixture.plan.id, sourceType: "ASSIGNMENT" },
    });
    assert.ok(projected, "projeksiyon görevi oluşmalı — aksi hâlde test bir şey kanıtlamaz");

    const events = await getStudentCalendar({
      studentId: fixture.student.id,
      studentUserId: fixture.studentUser.id,
      from: fixture.weekStart,
      to: new Date(fixture.weekStart.getTime() + 7 * 86400000),
    });

    const forAssignment = events.filter(
      (event) =>
        event.sourceId === fixture.assignment.id ||
        event.linkedAssignmentId === fixture.assignment.id,
    );
    assert.equal(forAssignment.length, 1, "öğrenci aynı ödevi İKİ satır olarak görmemeli");
    assert.equal(forAssignment[0].type, "ASSIGNMENT_DUE", "hayatta kalan kayıt ödevin kendisi");
    assert.equal(forAssignment[0].description, "Son tarih · haftalık planında");
  } finally {
    await cleanupFixture(fixture);
  }
});

/* ---------------------------------------------------------------- *
 * §7 — OK yetkisi olmayan öğrencide projeksiyon oluşmaz
 * ---------------------------------------------------------------- */

integration("§7 OK yetkisi yoksa ödev Koçum planına yansıtılmaz", async () => {
  const fixture = await createFixture({ withOk: false });
  try {
    await emitCrossProductEvent(assignmentCreatedInput(fixture));
    await processCrossProductEventOutbox(50);

    const tasks = await db.weeklyPlanTask.findMany({
      where: { planId: fixture.plan.id, sourceType: "ASSIGNMENT" },
    });
    assert.equal(tasks.length, 0, "OK yetkisi olmayan öğrenciye koçluk görevi yazılmamalı");
  } finally {
    await cleanupFixture(fixture);
  }
});

/* ---------------------------------------------------------------- *
 * §25 — Yatay erişim
 * ---------------------------------------------------------------- */

integration("§25 ilişkisi olmayan öğretmen öğrencinin planına erişemez", async () => {
  const fixture = await createFixture();
  try {
    assert.equal(
      await assertCoachOrTeacherAccess({
        role: "TEACHER",
        userId: fixture.teacher.id,
        studentProfileId: fixture.student.id,
      }),
      true,
      "dersini veren öğretmen erişebilmeli",
    );

    assert.equal(
      await assertCoachOrTeacherAccess({
        role: "TEACHER",
        userId: fixture.outsider.id,
        studentProfileId: fixture.student.id,
      }),
      false,
      "YABANCI öğretmen erişememeli",
    );

    assert.equal(
      await assertCoachOrTeacherAccess({
        role: "ADMIN",
        userId: fixture.outsider.id,
        studentProfileId: fixture.student.id,
      }),
      true,
      "admin tümüne erişir",
    );
  } finally {
    await cleanupFixture(fixture);
  }
});

integration("§25 kayıt sonlandırılınca öğretmenin erişimi düşer", async () => {
  const fixture = await createFixture();
  try {
    await db.enrollment.updateMany({
      where: { groupId: fixture.group.id, studentId: fixture.student.id },
      data: { endedAt: new Date() },
    });

    assert.equal(
      await assertCoachOrTeacherAccess({
        role: "TEACHER",
        userId: fixture.teacher.id,
        studentProfileId: fixture.student.id,
      }),
      false,
      "gruptan çıkan öğrencinin planı eski öğretmene KAPALI olmalı",
    );
  } finally {
    await cleanupFixture(fixture);
  }
});

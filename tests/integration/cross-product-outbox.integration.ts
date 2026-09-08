import assert from "node:assert/strict";

import {
  MAX_OUTBOX_ATTEMPTS,
  buildDeduplicationKey,
} from "../../lib/student-success/events";
import { emitCrossProductEvent, getOutboxHealthMetrics } from "../../lib/student-success/server/outbox";
import {
  processCrossProductEventOutbox,
  recoverStaleOutboxLocks,
} from "../../lib/student-success/server/event-processor";
import { createIntegrationPrismaClient, integration } from "./integration-utils";

/**
 * §9 §10 §20 — cross-product outbox dayanıklılığı.
 *
 * Buradaki testler SAHTE consumer kullanmaz: gerçek `LESSON_COMPLETED` zinciri
 * (outbox → evidence-recorder → StudentProgressEvidence → mastery-rescore)
 * gerçek Postgres üzerinde koşar. Aranan davranış tek cümle: aynı olay kaç kez
 * işlenirse işlensin downstream kayıt SAYISI değişmemeli, ve hiçbir olay
 * sessizce kaybolmamalı.
 */

const db = createIntegrationPrismaClient();

const PASSWORD_HASH = "scrypt$1$8$1$YmFzZTY0$c2hhMDA=";

type Fixture = Awaited<ReturnType<typeof createFixture>>;

async function createFixture() {
  const now = new Date();
  // Her fixture kendi kimliğini üretir: aynı dosyadaki testler aynı veritabanında
  // art arda koşuyor, sabit bir runId e-posta çakışması yaratıyordu.
  const runId = crypto.randomUUID().slice(0, 8);
  const teacher = await db.user.create({
    data: {
      email: `outbox-teacher-${runId}@example.com`,
      passwordHash: PASSWORD_HASH,
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "TEACHER",
      status: "ACTIVE",
      fullName: "Outbox Teacher",
    },
  });
  const studentUser = await db.user.create({
    data: {
      email: `outbox-student-${runId}@example.com`,
      passwordHash: PASSWORD_HASH,
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "STUDENT",
      status: "ACTIVE",
      fullName: "Outbox Student",
    },
  });
  const student = await db.studentProfile.create({ data: { userId: studentUser.id } });

  const version = await db.curriculumVersion.create({
    data: {
      code: `OUTBOX-${runId}`,
      title: "Outbox Test Müfredatı",
      exam: "TYT",
      academicYear: 2026,
      status: "ACTIVE",
      createdById: teacher.id,
    },
  });
  const subject = await db.curriculumSubject.create({
    data: { versionId: version.id, code: "MAT", name: "Matematik" },
  });
  const unit = await db.curriculumUnit.create({
    data: { subjectId: subject.id, code: "U1", name: "Türev" },
  });
  const outcome = await db.learningOutcome.create({
    data: { unitId: unit.id, code: "MAT.U1.1", title: "Türev alma kurallarını uygular" },
  });

  const group = await db.group.create({
    data: { name: `Outbox-${runId}`, subject: "Matematik", teacherId: teacher.id, capacity: 4 },
  });
  await db.enrollment.create({ data: { groupId: group.id, studentId: student.id } });

  const startsAt = new Date(now.getTime() - 60 * 60 * 1000);
  const lesson = await db.lesson.create({
    data: {
      groupId: group.id,
      teacherId: teacher.id,
      title: "Türev tekrarı",
      startsAt,
      endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
      status: "COMPLETED",
      completedAt: now,
    },
  });
  await db.lessonOutcome.create({
    data: { lessonId: lesson.id, outcomeId: outcome.id, evidenceType: "TAUGHT", linkedById: teacher.id },
  });

  return { teacher, studentUser, student, version, group, lesson, outcome };
}

async function cleanupFixture(fixture: Fixture) {
  await db.crossProductEventOutbox.deleteMany({ where: { studentId: fixture.student.id } });
  await db.studentProgressEvidence.deleteMany({ where: { studentId: fixture.student.id } });
  await db.studentOutcomeMastery.deleteMany({ where: { studentId: fixture.student.id } });
  await db.studentTimelineEvent.deleteMany({ where: { studentId: fixture.student.id } });
  await db.lessonOutcome.deleteMany({ where: { lessonId: fixture.lesson.id } });
  await db.lesson.deleteMany({ where: { groupId: fixture.group.id } });
  await db.enrollment.deleteMany({ where: { groupId: fixture.group.id } });
  await db.group.delete({ where: { id: fixture.group.id } });
  await db.studentProfile.delete({ where: { id: fixture.student.id } });
  await db.user.delete({ where: { id: fixture.studentUser.id } });
  await db.curriculumVersion.delete({ where: { id: fixture.version.id } });
  await db.user.delete({ where: { id: fixture.teacher.id } });
}

function lessonCompletedInput(fixture: Fixture) {
  return {
    eventType: "LESSON_COMPLETED" as const,
    actorUserId: fixture.teacher.id,
    studentId: fixture.student.id,
    entityType: "Lesson",
    entityId: fixture.lesson.id,
    payload: {
      eventVersion: 1 as const,
      lessonId: fixture.lesson.id,
      groupId: fixture.group.id,
      outcomeIds: [fixture.outcome.id],
      topic: "Türev",
    },
  };
}

integration("aynı olay iki kez yayınlanamaz — dedup anahtarı tek satır bırakır", async () => {
  const fixture = await createFixture();
  try {
    const first = await emitCrossProductEvent(lessonCompletedInput(fixture));
    const second = await emitCrossProductEvent(lessonCompletedInput(fixture));

    assert.equal(first.emitted, true);
    assert.equal(second.emitted, false, "tekrar yayın sessizce düşmeli");

    const key = buildDeduplicationKey({
      eventType: "LESSON_COMPLETED",
      studentId: fixture.student.id,
      entityType: "Lesson",
      entityId: fixture.lesson.id,
    });
    const rows = await db.crossProductEventOutbox.findMany({ where: { deduplicationKey: key } });
    assert.equal(rows.length, 1);
  } finally {
    await cleanupFixture(fixture);
  }
});

integration("LESSON_COMPLETED zinciri iki kez işlense de evidence çoğalmaz", async () => {
  const fixture = await createFixture();
  try {
    const { eventId } = await emitCrossProductEvent(lessonCompletedInput(fixture));
    assert.ok(eventId);

    await processCrossProductEventOutbox(50);

    const afterFirst = await db.studentProgressEvidence.findMany({
      where: { studentId: fixture.student.id, sourceType: "LESSON" },
    });
    assert.equal(afterFirst.length, 1, "kapanan ders tek kanıt üretmeli");

    const processedEvent = await db.crossProductEventOutbox.findUniqueOrThrow({ where: { id: eventId! } });
    assert.equal(processedEvent.status, "PROCESSED");
    assert.equal(processedEvent.lockedAt, null, "PROCESSED olay kilitli kalmamalı");

    // Operatör olayı elle yeniden kuyruğa aldı: consumer işaretleri de silinir.
    await db.crossProductEventConsumer.deleteMany({ where: { eventId: eventId! } });
    await db.crossProductEventOutbox.update({
      where: { id: eventId! },
      data: { status: "PENDING", processedAt: null, attempts: 0 },
    });
    await processCrossProductEventOutbox(50);

    const afterSecond = await db.studentProgressEvidence.findMany({
      where: { studentId: fixture.student.id, sourceType: "LESSON" },
    });
    assert.equal(afterSecond.length, 1, "yeniden işleme kanıtı ÇOĞALTMAMALI");
    assert.equal(afterSecond[0].id, afterFirst[0].id);
  } finally {
    await cleanupFixture(fixture);
  }
});

integration("PROCESSING'te asılı kalan olay bayat kilitten kurtarılır ve işlenir", async () => {
  const fixture = await createFixture();
  try {
    const { eventId } = await emitCrossProductEvent(lessonCompletedInput(fixture));

    // İşleyici olayı kaptı ve öldü (fonksiyon zaman aşımı / deploy).
    await db.crossProductEventOutbox.update({
      where: { id: eventId! },
      data: {
        status: "PROCESSING",
        attempts: 1,
        lockedAt: new Date(Date.now() - 20 * 60 * 1000),
      },
    });

    const health = await getOutboxHealthMetrics();
    assert.ok(health.processingCount >= 1, "kilitli olay ayrı sayaçta görünmeli");

    const result = await processCrossProductEventOutbox(50);
    assert.ok(result.staleLocksRecovered >= 1, "bayat kilit kurtarılmalı");

    const after = await db.crossProductEventOutbox.findUniqueOrThrow({ where: { id: eventId! } });
    assert.equal(after.status, "PROCESSED", "kurtarılan olay işlenmeli");

    const evidence = await db.studentProgressEvidence.count({
      where: { studentId: fixture.student.id, sourceType: "LESSON" },
    });
    assert.equal(evidence, 1, "kurtarma kanıt üretmeli — olay kaybolmamalı");
  } finally {
    await cleanupFixture(fixture);
  }
});

integration("taze kilit kurtarılmaz — çalışan işleyicinin işi elinden alınmaz", async () => {
  const fixture = await createFixture();
  try {
    const { eventId } = await emitCrossProductEvent(lessonCompletedInput(fixture));
    await db.crossProductEventOutbox.update({
      where: { id: eventId! },
      data: { status: "PROCESSING", attempts: 1, lockedAt: new Date() },
    });

    const recovered = await recoverStaleOutboxLocks();
    assert.equal(recovered, 0);

    const after = await db.crossProductEventOutbox.findUniqueOrThrow({ where: { id: eventId! } });
    assert.equal(after.status, "PROCESSING");
  } finally {
    await cleanupFixture(fixture);
  }
});

integration("paralel iki işleyici aynı olayı iki kez tüketmez", async () => {
  const fixture = await createFixture();
  try {
    const { eventId } = await emitCrossProductEvent(lessonCompletedInput(fixture));

    const [a, b] = await Promise.all([
      processCrossProductEventOutbox(50),
      processCrossProductEventOutbox(50),
    ]);

    // Olay TEK kez tam olarak işlenmeli; ikinci işleyici ya kapamaz ya da
    // consumer işaretlerini zaten yapılmış bulur.
    assert.equal(a.processed + b.processed, 1, "olay yalnız bir işleyicide tamamlanmalı");

    const evidence = await db.studentProgressEvidence.count({
      where: { studentId: fixture.student.id, sourceType: "LESSON" },
    });
    assert.equal(evidence, 1);

    const marks = await db.crossProductEventConsumer.findMany({ where: { eventId: eventId! } });
    const keys = marks.map((mark) => mark.consumerKey);
    assert.equal(new Set(keys).size, keys.length, "consumer işaretleri tekil olmalı");
  } finally {
    await cleanupFixture(fixture);
  }
});

integration("deneme hakkı biten olay ölü mektup sayılır ve tekrar seçilmez", async () => {
  const fixture = await createFixture();
  try {
    const { eventId } = await emitCrossProductEvent(lessonCompletedInput(fixture));
    await db.crossProductEventOutbox.update({
      where: { id: eventId! },
      data: { status: "FAILED", attempts: MAX_OUTBOX_ATTEMPTS, lastError: "boom" },
    });

    const health = await getOutboxHealthMetrics();
    assert.ok(health.deadLetterCount >= 1, "ölü mektup FAILED'den ayrı sayılmalı");

    const result = await processCrossProductEventOutbox(50);
    assert.equal(result.processed, 0);

    const after = await db.crossProductEventOutbox.findUniqueOrThrow({ where: { id: eventId! } });
    assert.equal(after.attempts, MAX_OUTBOX_ATTEMPTS, "deneme sayacı artmamalı");
    assert.equal(after.status, "FAILED");
  } finally {
    await cleanupFixture(fixture);
  }
});

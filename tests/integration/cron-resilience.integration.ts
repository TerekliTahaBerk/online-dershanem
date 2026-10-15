import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma as db } from "@/lib/prisma";
import { withPrismaResilience } from "@/lib/prisma-resilience";
import { runJob } from "@/lib/jobs/runner";
import { GET as odkLifecycle } from "@/app/api/cron/odk-exam-lifecycle/route";
import { integration } from "./integration-utils";

/**
 * Cron sağlığı: `cron.heartbeat.persistence_failed` olayı tek bir kopuk DB
 * bağlantısında (P1017 "Server has closed the connection") kritik alarm
 * üretiyordu. Geçici hatalar yeniden denenir; iş başarılıysa heartbeat yazımı
 * işi başarısız göstermez; puanlanamayan sınav kuyruğu tıkamaz.
 */
const secret = "cron-resilience-test-secret-0123456789";
process.env.CRON_SECRET = secret;
const authorized = () => new Request("http://localhost/api/cron/test", { headers: { authorization: `Bearer ${secret}` } });

integration("geçici bağlantı kopması (P1017) yeniden denenir; kalıcı hata yeniden denenmez", async () => {
  let calls = 0;
  const value = await withPrismaResilience(async () => {
    calls += 1;
    if (calls === 1) throw new Prisma.PrismaClientKnownRequestError("Server has closed the connection.", { code: "P1017", clientVersion: "test" });
    return "ok";
  }, { retries: 2, baseDelayMs: 1 });
  assert.deepEqual([value, calls], ["ok", 2]);

  let permanent = 0;
  await assert.rejects(withPrismaResilience(async () => {
    permanent += 1;
    throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "test" });
  }, { retries: 2, baseDelayMs: 1 }));
  assert.equal(permanent, 1);
});

integration("runJob: başarı ve hata heartbeat'e yazılır; yetkisiz istek reddedilir", async () => {
  const name = "rate-limit-prune" as const;
  assert.equal((await runJob(name, new Request("http://localhost"), async () => 1)).status, 401);
  const ok = await runJob(name, authorized(), async () => ({ processed: 3 }), { metrics: (result) => ({ processedCount: result.processed }) });
  assert.equal(ok.status, 200);
  const afterOk = await db.cronHeartbeat.findUniqueOrThrow({ where: { name } });
  assert.equal(afterOk.processedCount, 3);
  assert.equal(afterOk.lastErrorCode, null);
  const failed = await runJob(name, authorized(), async () => {
    throw new Prisma.PrismaClientKnownRequestError("boom", { code: "P2010", clientVersion: "test" });
  });
  assert.equal(failed.status, 500);
  assert.equal((await db.cronHeartbeat.findUniqueOrThrow({ where: { name } })).lastErrorCode, "PRISMACLIENTKNOWNREQUESTERROR_P2010");
});

integration("ODK yaşam döngüsü: puanlanamayan sınav audit'e yazılır ve 1 saat yeniden denenmez", async () => {
  const run = randomUUID().slice(0, 8);
  const now = Date.now();
  const admin = await db.user.create({ data: { email: `cron-${run}@example.com`, role: "ADMIN", status: "ACTIVE", passwordHash: "unused" } });
  const policy = await db.odkScoringPolicy.create({ data: { code: `cron-${run}`, title: "Cron", wrongPenalty: 4, minimumNetIsZero: true } });
  const exam = await db.odkExam.create({ data: { title: `Cron ${run}`, slug: `cron-${run}`, family: "TYT", createdById: admin.id, status: "ENDED", startsAt: new Date(now - 7_200_000), endsAt: new Date(now - 3_600_000) } });
  try {
    const version = await db.odkExamVersion.create({ data: { examId: exam.id, versionNumber: 1, durationMinutes: 60, scoringPolicyId: policy.id, createdById: admin.id, status: "LOCKED" } });
    await db.odkExam.update({ where: { id: exam.id }, data: { currentVersionId: version.id } });
    const section = await db.odkExamSection.create({ data: { versionId: version.id, code: "MAT", title: "MAT", position: 0, questionCount: 1 } });
    // Cevap anahtarı eksik → puanlama reddedilir.
    await db.odkExamQuestion.create({ data: { sectionId: section.id, questionNumber: 1, position: 0 } });

    const first = await odkLifecycle(authorized());
    assert.equal(first.status, 200, JSON.stringify(await first.clone().json()));
    const body = await first.json();
    assert.ok(body.result.autoScoreFailed >= 1);
    assert.equal(await db.auditLog.count({ where: { entityId: exam.id, action: "odk.auto_score_failed" } }), 1);
    assert.equal((await db.odkExam.findUniqueOrThrow({ where: { id: exam.id } })).status, "ENDED");

    // Geri çekilme: ikinci çalışma aynı sınavı denemez.
    assert.equal((await odkLifecycle(authorized())).status, 200);
    assert.equal(await db.auditLog.count({ where: { entityId: exam.id, action: "odk.auto_score_failed" } }), 1);
    const heartbeat = await db.cronHeartbeat.findUniqueOrThrow({ where: { name: "odk-exam-lifecycle" } });
    assert.ok(heartbeat.lastSucceededAt && heartbeat.lastSucceededAt.getTime() >= now);
  } finally {
    await db.auditLog.deleteMany({ where: { entityId: exam.id } });
    await db.odkExam.updateMany({ where: { id: exam.id }, data: { currentVersionId: null } });
    await db.odkExamVersion.deleteMany({ where: { examId: exam.id } });
    await db.odkExam.deleteMany({ where: { id: exam.id } });
    await db.odkScoringPolicy.deleteMany({ where: { id: policy.id } });
    await db.user.deleteMany({ where: { id: admin.id } });
  }
});

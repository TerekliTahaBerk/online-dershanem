import { prisma } from "@/lib/prisma";
import { logAuditMany } from "@/lib/audit";
import { runJob } from "@/lib/jobs/runner";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Otomatik puanlama zaman bütçesi: fonksiyon 60 sn'de öldürülürse heartbeat
 * başarı kaydı yazılamıyor, iş "gecikmiş" görünüyor ve kalan sınavlar hiç
 * puanlanmıyordu. Bütçe dolunca kalan sınavlar sonraki çalışmaya (5 dk) kalır.
 * Puanlaması başarısız olan sınav 1 saat beklenir: her 5 dakikada aynı hatayı
 * tekrarlayıp kuyruğun önünü tıkamaz; hata audit'e ve loga yazılır.
 */
const AUTO_SCORE_BUDGET_MS = 35_000;
const AUTO_SCORE_FAILURE_BACKOFF_MS = 60 * 60_000;

export async function GET(request: Request) {
  return runJob("odk-exam-lifecycle", request, async () => {
    const startedAt = Date.now();
    const now = new Date();
    const [liveExams, endedExams, expiredAttempts] = await Promise.all([
      prisma.odkExam.findMany({ where: { status: "SCHEDULED", startsAt: { lte: now }, endsAt: { gt: now } }, select: { id: true }, take: 500 }),
      prisma.odkExam.findMany({ where: { status: { in: ["SCHEDULED", "LIVE"] }, endsAt: { lte: now } }, select: { id: true }, take: 500 }),
      prisma.odkExamAttempt.findMany({ where: { status: "IN_PROGRESS", deadlineAt: { lte: now } }, select: { id: true }, take: 1000 }),
    ]);
    await prisma.$transaction([
      prisma.odkExam.updateMany({ where: { id: { in: liveExams.map((item) => item.id) }, status: "SCHEDULED" }, data: { status: "LIVE" } }),
      prisma.odkExam.updateMany({ where: { id: { in: endedExams.map((item) => item.id) }, status: { in: ["SCHEDULED", "LIVE"] } }, data: { status: "ENDED" } }),
      prisma.odkExamAttempt.updateMany({ where: { id: { in: expiredAttempts.map((item) => item.id) }, status: "IN_PROGRESS" }, data: { status: "AUTO_SUBMITTED", submittedAt: now, lastActivityAt: now } }),
    ]);

    // Kapandıktan sonra otomatik puanlama (sonuç yayınlamaz — publication ayrı adım).
    let autoScored = 0;
    let autoScoreFailed = 0;
    let autoScoreDeferred = 0;
    const recentFailures = await prisma.auditLog.findMany({
      where: { action: "odk.auto_score_failed", createdAt: { gt: new Date(now.getTime() - AUTO_SCORE_FAILURE_BACKOFF_MS) } },
      select: { entityId: true },
      take: 500,
    });
    const scoreable = await prisma.odkExam.findMany({
      where: { status: "ENDED", endsAt: { lte: now }, id: { notIn: [...new Set(recentFailures.map((row) => row.entityId))] } },
      orderBy: { endsAt: "asc" },
      select: { id: true, createdById: true },
      take: 20,
    });
    const { scoreOdkExam } = await import("@/lib/odk/scoring-service");
    for (const exam of scoreable) {
      if (Date.now() - startedAt > AUTO_SCORE_BUDGET_MS) {
        autoScoreDeferred += 1;
        continue;
      }
      const scored = await scoreOdkExam(exam.id, exam.createdById).catch((error: unknown) => ({ ok: false as const, error: error instanceof Error ? error.name : "UNKNOWN" }));
      if (scored.ok) {
        autoScored += 1;
        continue;
      }
      autoScoreFailed += 1;
      const reason = "error" in scored ? String(scored.error).slice(0, 300) : "UNKNOWN";
      log.warn("odk.auto_score_failed", { examId: exam.id, reason });
      await logAuditMany([{ actorType: "SYSTEM", entityType: "OdkExam", entityId: exam.id, action: "odk.auto_score_failed", summary: `Otomatik puanlama başarısız; 1 saat sonra yeniden denenecek: ${reason}` }]);
    }

    await logAuditMany([
      ...liveExams.map((item) => ({ actorType: "SYSTEM" as const, entityType: "OdkExam", entityId: item.id, action: "odk.exam_live", summary: "Deneme başlangıç saatinde canlı duruma alındı" })),
      ...endedExams.map((item) => ({ actorType: "SYSTEM" as const, entityType: "OdkExam", entityId: item.id, action: "odk.exam_ended", summary: "Deneme bitiş saatinde kapatıldı (CLOSED)" })),
      ...expiredAttempts.map((item) => ({ actorType: "SYSTEM" as const, entityType: "OdkExamAttempt", entityId: item.id, action: "odk.attempt_auto_submitted", summary: "Süresi dolan öğrenci oturumu otomatik teslim edildi" })),
    ]);

    // Ayrıntılı integrity event retention (answers/scores kalıcı).
    const { integrityEventRetentionCutoff, purgeableIntegrityEventTypes } = await import("@/lib/odk/event-retention");
    const cutoff = integrityEventRetentionCutoff(now);
    const purgedEvents = await prisma.odkAttemptEvent.deleteMany({
      where: {
        serverOccurredAt: { lt: cutoff },
        type: { in: purgeableIntegrityEventTypes() as Array<"TAB_HIDDEN" | "TAB_VISIBLE" | "WINDOW_BLUR" | "WINDOW_FOCUS" | "FULLSCREEN_ENTER" | "FULLSCREEN_EXIT" | "COPY_ATTEMPT" | "PASTE_ATTEMPT" | "CONTEXT_MENU" | "NETWORK_OFFLINE" | "NETWORK_ONLINE"> },
      },
    });

    // M5: öğrenci olay bildirimleri (kanonik satır; varsayılan kapalı, ODK_STUDENT_NOTIFICATIONS).
    // Hata yaşam döngüsünü durdurmaz: bildirim üretimi yan iştir.
    const { syncOdkStudentNotifications } = await import("@/lib/odk/student-notifications");
    const studentNotifications = await syncOdkStudentNotifications(now).catch((error) => {
      log.error("odk.student_notifications.failed", error);
      return { enabled: true, candidates: 0, created: 0 };
    });

    const result = { live: liveExams.length, ended: endedExams.length, autoSubmitted: expiredAttempts.length, autoScored, autoScoreFailed, autoScoreDeferred, purgedIntegrityEvents: purgedEvents.count, studentNotifications: studentNotifications.created };
    log.info("odk.lifecycle.completed", result);
    return result;
  }, { metrics: (result) => ({ processedCount: result.live + result.ended + result.autoSubmitted + result.autoScored + result.purgedIntegrityEvents, failedCount: result.autoScoreFailed, details: { odkStudentNotifications: result.studentNotifications, odkAutoScoreDeferred: result.autoScoreDeferred } }) });
}

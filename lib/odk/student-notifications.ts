import "server-only";

import { prisma } from "@/lib/prisma";
import { decideAttemptStart } from "@/lib/odk/attempt-domain";
import { listActiveOdkContracts, getActiveOdkExamGrant } from "@/lib/odk/product-contract-server";
import { contractAnswerKeyAvailable, contractExamSchedule, contractResultAvailable, type OdkContractExam } from "@/lib/odk/product-contract";
import { notificationKey } from "@/lib/notification-delivery";

/**
 * Deneme Ligi ÖĞRENCİ olay bildirimleri (M5) — kanonik `Notification` satırı
 * olarak, olay başına BİR KEZ (kararlı kimlik + `skipDuplicates`). Push bu
 * satırları ayrıca dağıtıcıyla teslim eder; burada push çağrısı YOKTUR.
 *
 * ÜRÜN POLİTİKASI (belgelendi: docs/mobile/m5-delivery-architecture.md):
 *  - REMINDER: denemenin sözleşme başlangıcından en fazla 60 dk önce; öğrencinin
 *    henüz denemesi yoksa. Sürüm = sözleşme başlangıç saati (saat değişirse yeni olay).
 *  - OPEN: pencere açık (`decideAttemptStart` ok), açılıştan ≤ 15 dk geçmiş ve aynı
 *    sürüm için REMINDER yoksa (hatırlatma alan öğrenciye ikinci bildirim yok).
 *  - RESULT: `studentReports` hakkı + `contractResultAvailable` + öğrencinin KENDİ
 *    teslim edilmiş denemesinin skoru `PUBLISHED`. Sürüm = gerçek yayın zamanı
 *    (sözleşmede SCHEDULED ise sözleşme zamanı, değilse yönetici yayın zamanı).
 *  - ANSWER_KEY: yalnız anahtar sonuçtan BAĞIMSIZ zamanlandığında
 *    (`answerKeyReleaseMode` ≠ WITH_RESULTS) ve `contractAnswerKeyAvailable`.
 * Deneme başlatılmaz; puanlama / yayın değişmez. Varsayılan KAPALI:
 * `ODK_STUDENT_NOTIFICATIONS=ENABLED` olmadan hiçbir satır üretilmez.
 */

const REMINDER_LEAD_MS = 60 * 60_000;
const OPEN_GRACE_MS = 15 * 60_000;
const RELEASE_LOOKBACK_MS = 7 * 24 * 60 * 60_000;
const BASE = "/panel/odk/ogrenci/denemeler";

export function odkStudentNotificationsEnabled(): boolean {
  return (process.env.ODK_STUDENT_NOTIFICATIONS ?? "").trim().toUpperCase() === "ENABLED";
}

type EventKind = "REMINDER" | "OPEN" | "RESULT" | "ANSWER_KEY";
type Candidate = { userId: string; examId: string; kind: EventKind; version: string; title: string; body: string; href: string };

function resultReleasedAt(contractExam: OdkContractExam, exam: { resultsReleasedAt: Date | null }): Date | null {
  return contractExam.resultsReleaseMode === "SCHEDULED" ? (contractExam.resultsReleasedAt ? new Date(contractExam.resultsReleasedAt) : null) : exam.resultsReleasedAt;
}
function answerKeyReleasedAt(contractExam: OdkContractExam, exam: { answerKeyReleasedAt: Date | null }): Date | null {
  return contractExam.answerKeyReleaseMode === "SCHEDULED" ? (contractExam.answerKeyReleasedAt ? new Date(contractExam.answerKeyReleasedAt) : null) : exam.answerKeyReleasedAt;
}

export async function syncOdkStudentNotifications(now = new Date()) {
  if (!odkStudentNotificationsEnabled()) return { enabled: false, candidates: 0, created: 0 };
  const entitlements = await prisma.odkEntitlement.findMany({
    where: { startsAt: { lte: now }, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }], user: { status: "ACTIVE", role: "STUDENT" } },
    select: { userId: true },
    distinct: ["userId"],
    take: 5000,
  });
  const candidates: Candidate[] = [];
  for (const { userId } of entitlements) {
    const contracts = await listActiveOdkContracts(userId, now);
    const grants = new Map<string, { exam: OdkContractExam; studentReports: boolean }>();
    for (const { contract } of contracts) for (const exam of contract.exams) if (!grants.has(exam.id)) grants.set(exam.id, { exam, studentReports: contract.policy.rights.studentReports });
    if (!grants.size) continue;
    const exams = await prisma.odkExam.findMany({
      where: { id: { in: [...grants.keys()] }, publishedAt: { not: null }, status: { in: ["SCHEDULED", "LIVE", "ENDED", "SCORED", "RELEASED"] } },
      select: {
        id: true, title: true, status: true, resultsReleasedAt: true, answerKeyReleasedAt: true,
        currentVersion: { select: { durationMinutes: true } },
        attempts: { where: { studentUserId: userId }, orderBy: { attemptNumber: "desc" }, take: 1, select: { status: true, score: { select: { publicationStatus: true } } } },
      },
    });
    for (const exam of exams) {
      const grant = grants.get(exam.id)!;
      const schedule = contractExamSchedule(grant.exam);
      const attempt = exam.attempts[0] ?? null;
      // A / B — hatırlatma ve açılış: yalnız henüz denemesi olmayan öğrenci.
      if (!attempt && schedule.startsAt && (exam.status === "SCHEDULED" || exam.status === "LIVE")) {
        const version = schedule.startsAt.toISOString();
        const untilStart = schedule.startsAt.getTime() - now.getTime();
        if (untilStart > 0 && untilStart <= REMINDER_LEAD_MS) {
          candidates.push({ userId, examId: exam.id, kind: "REMINDER", version, title: "Denemen yakında başlıyor", body: `${exam.title} kısa süre sonra açılıyor.`, href: `${BASE}/${exam.id}` });
        } else if (untilStart <= 0 && -untilStart <= OPEN_GRACE_MS && exam.currentVersion) {
          const decision = decideAttemptStart({ status: exam.status, ...schedule, durationMinutes: exam.currentVersion.durationMinutes }, now);
          if (decision.ok) candidates.push({ userId, examId: exam.id, kind: "OPEN", version, title: "Denemen başladı", body: `${exam.title} şu anda açık.`, href: `${BASE}/${exam.id}` });
        }
      }
      // C / D — sonuç ve cevap anahtarı: rapor hakkı + kendi teslim edilmiş denemesi.
      const submitted = attempt && (attempt.status === "SUBMITTED" || attempt.status === "AUTO_SUBMITTED");
      if (!grant.studentReports || !submitted || exam.status !== "RELEASED") continue;
      const releasedAt = resultReleasedAt(grant.exam, exam);
      if (attempt.score?.publicationStatus === "PUBLISHED" && contractResultAvailable(grant.exam, exam, now) && releasedAt && now.getTime() - releasedAt.getTime() <= RELEASE_LOOKBACK_MS) {
        candidates.push({ userId, examId: exam.id, kind: "RESULT", version: releasedAt.toISOString(), title: "Deneme sonucun açıklandı", body: `${exam.title} sonucunu görebilirsin.`, href: `${BASE}/${exam.id}/sonuc` });
      }
      const keyAt = answerKeyReleasedAt(grant.exam, exam);
      if (grant.exam.answerKeyReleaseMode !== "WITH_RESULTS" && attempt.score && contractAnswerKeyAvailable(grant.exam, exam, now) && keyAt && now.getTime() - keyAt.getTime() <= RELEASE_LOOKBACK_MS) {
        candidates.push({ userId, examId: exam.id, kind: "ANSWER_KEY", version: keyAt.toISOString(), title: "Cevap anahtarı yayınlandı", body: `${exam.title} cevap anahtarı açıldı.`, href: `${BASE}/${exam.id}/sonuc` });
      }
    }
  }
  if (!candidates.length) return { enabled: true, candidates: 0, created: 0 };

  // Tercihler: kullanıcı aktif, uygulama içi açık ve Deneme Ligi kategorisi açık (satır yoksa varsayılan açık).
  const userIds = [...new Set(candidates.map((item) => item.userId))];
  const prefs = await prisma.notificationPreference.findMany({ where: { userId: { in: userIds } }, select: { userId: true, inAppEnabled: true, examUpdates: true } });
  const prefByUser = new Map(prefs.map((row) => [row.userId, row]));
  // OPEN, aynı sürüm için hatırlatma üretilmişse atlanır.
  const reminderIds = candidates.filter((item) => item.kind === "OPEN").map((item) => notificationKey(item.userId, "ODK_EXAM", item.examId, `REMINDER:${item.version}`));
  const existingReminders = new Set(reminderIds.length ? (await prisma.notification.findMany({ where: { id: { in: reminderIds } }, select: { id: true } })).map((row) => row.id) : []);
  const rows = candidates
    .filter((item) => {
      const pref = prefByUser.get(item.userId);
      return !pref || (pref.inAppEnabled && pref.examUpdates);
    })
    .filter((item) => item.kind !== "OPEN" || !existingReminders.has(notificationKey(item.userId, "ODK_EXAM", item.examId, `REMINDER:${item.version}`)))
    .map((item) => {
      const category = `${item.kind}:${item.version}`;
      return {
        id: notificationKey(item.userId, "ODK_EXAM", item.examId, category),
        userId: item.userId,
        type: "SYSTEM" as const,
        title: item.title,
        body: item.body,
        href: item.href,
        sourceType: "ODK_EXAM",
        sourceId: item.examId,
        sourceVersion: item.version,
        category,
        preferenceKey: "examUpdates",
      };
    });
  const created = rows.length ? (await prisma.notification.createMany({ data: rows, skipDuplicates: true })).count : 0;
  return { enabled: true, candidates: candidates.length, created };
}

/**
 * Gönderim anında kaynak hâlâ geçerli mi? (push dağıtıcısı çağırır.) Hak iptal
 * edildiyse, sonuç geri çekildiyse veya deneme saati değiştiyse false.
 */
export async function isOdkNotificationSourceCurrent(input: { userId: string; examId: string; category: string }, now = new Date()): Promise<boolean> {
  const grant = await getActiveOdkExamGrant(input.userId, input.examId, now);
  if (!grant) return false;
  const [kind, version] = [input.category.split(":")[0], input.category.slice(input.category.indexOf(":") + 1)];
  const exam = await prisma.odkExam.findFirst({
    where: { id: input.examId, publishedAt: { not: null } },
    select: {
      status: true, resultsReleasedAt: true, answerKeyReleasedAt: true,
      currentVersion: { select: { durationMinutes: true } },
      attempts: { where: { studentUserId: input.userId }, orderBy: { attemptNumber: "desc" }, take: 1, select: { status: true, score: { select: { publicationStatus: true } } } },
    },
  });
  if (!exam) return false;
  const schedule = contractExamSchedule(grant.exam);
  const attempt = exam.attempts[0] ?? null;
  if (kind === "REMINDER") return !attempt && Boolean(schedule.startsAt && schedule.startsAt.toISOString() === version && schedule.startsAt > now) && (exam.status === "SCHEDULED" || exam.status === "LIVE");
  if (kind === "OPEN") {
    if (attempt || !exam.currentVersion || schedule.startsAt?.toISOString() !== version) return false;
    return decideAttemptStart({ status: exam.status, ...schedule, durationMinutes: exam.currentVersion.durationMinutes }, now).ok;
  }
  const submitted = attempt && (attempt.status === "SUBMITTED" || attempt.status === "AUTO_SUBMITTED");
  if (!grant.contract.policy.rights.studentReports || !submitted) return false;
  if (kind === "RESULT") return attempt.score?.publicationStatus === "PUBLISHED" && contractResultAvailable(grant.exam, exam, now);
  if (kind === "ANSWER_KEY") return Boolean(attempt.score) && contractAnswerKeyAvailable(grant.exam, exam, now);
  return false;
}

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
 *  - DAY_BEFORE: başlangıca 3–24 saat kala ("yarın denemen var"); 60 dk
 *    hatırlatmasıyla çakışmaz.
 *  - MISSED: denemesi olmayan öğrencinin giriş süresi (başlangıç + geç giriş)
 *    dolduysa, en fazla 24 saat geriye bakarak.
 *
 * VELİ / ÖĞRETMEN (kaynak `ODK_AUDIENCE`; satır kimliği aynı kararlı anahtar):
 *  - Veli (aktif, `canViewAcademic` bağlantı): DAY_BEFORE, MISSED, SUBMITTED
 *    (çocuk denemeyi teslim etti) ve — sözleşme `parentReports` veriyorsa —
 *    RESULT. Rapor yetkisi raporlar sayfasıyla aynı kuraldır.
 *  - Öğretmen (öğrencinin aktif grubunun öğretmeni, sözleşme `teacherReports`):
 *    deneme başına TEK "sonuçlar açıklandı" (TEACHER_RESULT); öğrenci başına
 *    bildirim yağmuru yok.
 * Deneme başlatılmaz; puanlama / yayın değişmez. Varsayılan KAPALI:
 * `ODK_STUDENT_NOTIFICATIONS=ENABLED` olmadan hiçbir satır üretilmez.
 */

const REMINDER_LEAD_MS = 60 * 60_000;
const DAY_BEFORE_MIN_MS = 3 * 60 * 60_000;
const DAY_BEFORE_MAX_MS = 24 * 60 * 60_000;
const RECENT_MS = 24 * 60 * 60_000;
const PARENT_HOME = "/panel/odk/veli";
const PARENT_REPORTS = "/panel/odk/veli/raporlar";
const TEACHER_REPORTS = "/panel/odk/ogretmen/raporlar";
const WHEN = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
const OPEN_GRACE_MS = 15 * 60_000;
const RELEASE_LOOKBACK_MS = 7 * 24 * 60 * 60_000;
const BASE = "/panel/odk/ogrenci/denemeler";

export function odkStudentNotificationsEnabled(): boolean {
  return (process.env.ODK_STUDENT_NOTIFICATIONS ?? "").trim().toUpperCase() === "ENABLED";
}

type EventKind = "REMINDER" | "OPEN" | "RESULT" | "ANSWER_KEY" | "DAY_BEFORE" | "MISSED";
type Candidate = { userId: string; examId: string; kind: EventKind; version: string; title: string; body: string; href: string };
/** Veli / öğretmen için çözülecek olay (alıcılar döngüden sonra toplu okunur). */
type AudienceKind = "DAY_BEFORE" | "MISSED" | "SUBMITTED" | "RESULT";
type AudienceEvent = { studentUserId: string; examId: string; examTitle: string; kind: AudienceKind; version: string; startsAt: Date | null; parentReports: boolean; teacherReports: boolean };

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
  const audience: AudienceEvent[] = [];
  for (const { userId } of entitlements) {
    const contracts = await listActiveOdkContracts(userId, now);
    const grants = new Map<string, { exam: OdkContractExam; studentReports: boolean; parentReports: boolean; teacherReports: boolean }>();
    for (const { contract } of contracts) for (const exam of contract.exams) {
      const current = grants.get(exam.id);
      const { rights } = contract.policy;
      // Aynı deneme birden çok sözleşmede: rapor hakları birleşir (raporlar sayfasıyla aynı).
      grants.set(exam.id, current ? { ...current, parentReports: current.parentReports || rights.parentReports, teacherReports: current.teacherReports || rights.teacherReports } : { exam, studentReports: rights.studentReports, parentReports: rights.parentReports, teacherReports: rights.teacherReports });
    }
    if (!grants.size) continue;
    const exams = await prisma.odkExam.findMany({
      where: { id: { in: [...grants.keys()] }, publishedAt: { not: null }, status: { in: ["SCHEDULED", "LIVE", "ENDED", "SCORED", "RELEASED"] } },
      select: {
        id: true, title: true, status: true, resultsReleasedAt: true, answerKeyReleasedAt: true,
        currentVersion: { select: { durationMinutes: true } },
        attempts: { where: { studentUserId: userId }, orderBy: { attemptNumber: "desc" }, take: 1, select: { status: true, submittedAt: true, score: { select: { publicationStatus: true } } } },
      },
    });
    for (const exam of exams) {
      const grant = grants.get(exam.id)!;
      const schedule = contractExamSchedule(grant.exam);
      const attempt = exam.attempts[0] ?? null;
      const audienceBase = { studentUserId: userId, examId: exam.id, examTitle: exam.title, startsAt: schedule.startsAt, parentReports: grant.parentReports, teacherReports: grant.teacherReports };
      // Yarın / kaçırıldı: yalnız henüz denemesi olmayan öğrenci.
      if (!attempt && schedule.startsAt && (exam.status === "SCHEDULED" || exam.status === "LIVE")) {
        const untilStart = schedule.startsAt.getTime() - now.getTime();
        if (untilStart > DAY_BEFORE_MIN_MS && untilStart <= DAY_BEFORE_MAX_MS) {
          const version = schedule.startsAt.toISOString();
          candidates.push({ userId, examId: exam.id, kind: "DAY_BEFORE", version, title: "Yarın denemen var", body: `${exam.title} · ${WHEN.format(schedule.startsAt)}`, href: `${BASE}/${exam.id}` });
          audience.push({ ...audienceBase, kind: "DAY_BEFORE", version });
        }
      }
      if (!attempt && schedule.startsAt && ["SCHEDULED", "LIVE", "ENDED", "SCORED", "RELEASED"].includes(exam.status)) {
        const entryClosedAt = schedule.startsAt.getTime() + schedule.lateEntryMinutes * 60_000;
        const sinceClose = now.getTime() - entryClosedAt;
        if (sinceClose > 0 && sinceClose <= RECENT_MS) {
          const version = schedule.startsAt.toISOString();
          candidates.push({ userId, examId: exam.id, kind: "MISSED", version, title: "Denemeyi kaçırdın", body: `${exam.title} için giriş süresi doldu. Sıradaki denemeleri takviminden takip edebilirsin.`, href: `${BASE}/${exam.id}` });
          audience.push({ ...audienceBase, kind: "MISSED", version });
        }
      }
      const submittedAt = attempt && (attempt.status === "SUBMITTED" || attempt.status === "AUTO_SUBMITTED") ? attempt.submittedAt : null;
      if (submittedAt && now.getTime() - submittedAt.getTime() <= RECENT_MS) audience.push({ ...audienceBase, kind: "SUBMITTED", version: submittedAt.toISOString() });
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
      const releasedAt = submitted && exam.status === "RELEASED" ? resultReleasedAt(grant.exam, exam) : null;
      if (releasedAt && (grant.parentReports || grant.teacherReports) && attempt.score?.publicationStatus === "PUBLISHED" && contractResultAvailable(grant.exam, exam, now) && now.getTime() - releasedAt.getTime() <= RELEASE_LOOKBACK_MS) {
        audience.push({ ...audienceBase, kind: "RESULT", version: releasedAt.toISOString() });
      }
      if (!grant.studentReports || !submitted || exam.status !== "RELEASED") continue;
      if (attempt.score?.publicationStatus === "PUBLISHED" && contractResultAvailable(grant.exam, exam, now) && releasedAt && now.getTime() - releasedAt.getTime() <= RELEASE_LOOKBACK_MS) {
        candidates.push({ userId, examId: exam.id, kind: "RESULT", version: releasedAt.toISOString(), title: "Deneme sonucun açıklandı", body: `${exam.title} sonucunu görebilirsin.`, href: `${BASE}/${exam.id}/sonuc` });
      }
      const keyAt = answerKeyReleasedAt(grant.exam, exam);
      if (grant.exam.answerKeyReleaseMode !== "WITH_RESULTS" && attempt.score && contractAnswerKeyAvailable(grant.exam, exam, now) && keyAt && now.getTime() - keyAt.getTime() <= RELEASE_LOOKBACK_MS) {
        candidates.push({ userId, examId: exam.id, kind: "ANSWER_KEY", version: keyAt.toISOString(), title: "Cevap anahtarı yayınlandı", body: `${exam.title} cevap anahtarı açıldı.`, href: `${BASE}/${exam.id}/sonuc` });
      }
    }
  }
  const audienceRows = await resolveAudienceRows(audience);
  if (!candidates.length && !audienceRows.length) return { enabled: true, candidates: 0, created: 0 };

  // Tercihler: kullanıcı aktif, uygulama içi açık ve Deneme Ligi kategorisi açık (satır yoksa varsayılan açık).
  const userIds = [...new Set([...candidates.map((item) => item.userId), ...audienceRows.map((item) => item.userId)])];
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
  const allowed = (userId: string) => {
    const pref = prefByUser.get(userId);
    return !pref || (pref.inAppEnabled && pref.examUpdates);
  };
  const data = [...rows, ...audienceRows.filter((item) => allowed(item.userId))];
  const created = data.length ? (await prisma.notification.createMany({ data, skipDuplicates: true })).count : 0;
  return { enabled: true, candidates: candidates.length + audienceRows.length, created };
}

/**
 * Veli ve öğretmen satırları. Alıcı ilişkisi gönderim anında okunur: aktif
 * veli bağlantısı + akademik izin; öğretmen için öğrencinin aktif grubu.
 */
async function resolveAudienceRows(events: AudienceEvent[]) {
  if (!events.length) return [];
  const profiles = await prisma.studentProfile.findMany({
    where: { userId: { in: [...new Set(events.map((item) => item.studentUserId))] } },
    select: {
      id: true, userId: true, user: { select: { fullName: true } },
      parents: { where: { active: true, endedAt: null, canViewAcademic: true, parent: { status: "ACTIVE" } }, select: { parentId: true } },
      enrollments: { where: { endedAt: null, group: { isActive: true } }, select: { group: { select: { teacherId: true } } } },
    },
  });
  const byUser = new Map(profiles.map((profile) => [profile.userId, profile]));
  const rows: { id: string; userId: string; type: "SYSTEM"; title: string; body: string; href: string; sourceType: string; sourceId: string; sourceVersion: string; category: string; preferenceKey: string }[] = [];
  const push = (userId: string, examId: string, category: string, version: string, title: string, body: string, href: string) =>
    rows.push({ id: notificationKey(userId, "ODK_AUDIENCE", examId, category), userId, type: "SYSTEM", title, body, href, sourceType: "ODK_AUDIENCE", sourceId: examId, sourceVersion: version, category, preferenceKey: "examUpdates" });
  for (const event of events) {
    const profile = byUser.get(event.studentUserId);
    if (!profile) continue;
    const name = profile.user.fullName?.trim() || "Öğrenci";
    const scoped = (path: string) => `${path}?studentId=${encodeURIComponent(profile.id)}`;
    const category = `${event.kind}:${profile.id}:${event.version}`;
    for (const { parentId } of profile.parents) {
      if (event.kind === "DAY_BEFORE") push(parentId, event.examId, category, event.version, "Yarın deneme var", `${name} · ${event.examTitle}${event.startsAt ? ` · ${WHEN.format(event.startsAt)}` : ""}`, scoped(PARENT_HOME));
      if (event.kind === "MISSED") push(parentId, event.examId, category, event.version, "Çocuğunuz denemeye katılmadı", `${name} · ${event.examTitle} için giriş süresi doldu.`, scoped(PARENT_HOME));
      if (event.kind === "SUBMITTED") push(parentId, event.examId, category, event.version, "Çocuğunuz denemeyi tamamladı", `${name} · ${event.examTitle}. Sonuç açıklanınca haber vereceğiz.`, scoped(PARENT_HOME));
      if (event.kind === "RESULT" && event.parentReports) push(parentId, event.examId, category, event.version, "Deneme sonucu açıklandı", `${name} · ${event.examTitle} sonucu raporlarda.`, scoped(PARENT_REPORTS));
    }
    if (event.kind === "RESULT" && event.teacherReports) {
      // Deneme başına tek satır: kimlik öğrenciden bağımsız.
      for (const teacherId of new Set(profile.enrollments.map((item) => item.group.teacherId))) push(teacherId, event.examId, "TEACHER_RESULT", event.version, "Deneme sonuçları açıklandı", `${event.examTitle} · öğrencilerinin sonuçlarını raporlardan inceleyebilirsin.`, TEACHER_REPORTS);
    }
  }
  return [...new Map(rows.map((row) => [row.id, row])).values()];
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
  if (kind === "DAY_BEFORE") return !attempt && Boolean(schedule.startsAt && schedule.startsAt.toISOString() === version && schedule.startsAt > now) && (exam.status === "SCHEDULED" || exam.status === "LIVE");
  if (kind === "MISSED") return !attempt && schedule.startsAt?.toISOString() === version;
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

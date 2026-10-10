/**
 * MOBİL SÖZLEŞME — M6 VELİ (PARENT) uçları.
 *
 * Her uç için TİP + DOĞRULAYICI. Mobil, yanıtı uygulama durumuna almadan önce
 * doğrular; `v.object` yalnız şemadaki alanları geçirir.
 *
 * GÜVENLİK / GİZLİLİK (sunucu sınırında uygulanır, burada belgelenir):
 *  - `studentId` HER ZAMAN `StudentProfile.id`'dir (öğrenci `User.id` değil).
 *    Sunucu onu velinin aktif bağlantıları arasından çözer; bağlı olmayan,
 *    bitmiş, akademik izni kapalı veya yalnız veli-free (KPSS) ürünü olan
 *    çocuk → 404 `CHILD_NOT_FOUND`.
 *  - Bu sözleşmelerde: öğretmene özel ders notu, koçun iç notu, öğrenciye
 *    özel koç notu, ham check-in, enerji / zorluk girdisi, taslak plan, risk
 *    skoru, müdahale verisi, yayınlanmamış sonuç, bütünlük sinyali, başka
 *    öğrenci, personel e-postası / telefonu YOKTUR.
 *  - Hedefler web yolu değil, sunucu navigasyon kimliğidir (`navId`); mobil
 *    yalnız yetkili menüde varsa açar.
 *
 * Bağımlılıksız; yalnız bu dizindeki dosyalardan göreli içe aktarma.
 */

import type { ContractResult } from "./bootstrap";
import { check, v, type Infer } from "./validate";

export const MOBILE_PARENT_CONTRACT_VERSION = 1 as const;

/** Veliye görünür ürünler (KPSS veli-free'dir; hiçbir yanıtta yer almaz). */
export const PARENT_PRODUCTS = ["OD", "OK", "ODK"] as const;
export type ParentProductCode = (typeof PARENT_PRODUCTS)[number];

/** Sunucu veli menüsü kimlikleri (`lib/panel/navigation.ts#parentSections`). */
export const PARENT_NAV_IDS = [
  "today",
  "lessons",
  "assignments",
  "teachers",
  "analiz",
  "progress",
  "coaching",
  "odk-reports",
  "mock-exams",
  "weekly-digest",
  "account",
] as const;
export type ParentNavId = (typeof PARENT_NAV_IDS)[number];

const TONES = ["neutral", "info", "success", "warning", "critical"] as const;
const TREND = ["up", "down", "steady", "limited"] as const;
const navId = v.nullable(v.oneOf(PARENT_NAV_IDS));
const products = v.array(v.oneOf(PARENT_PRODUCTS));
const header = { contractVersion: v.literal(MOBILE_PARENT_CONTRACT_VERSION), studentId: v.nonEmpty() };

/* ------------------------------------------------------------------ *
 * GET /api/panel/parent/children — akademik kapsamdaki çocuklar
 * (bootstrap `workspace.parent.children` ile AYNI kaynak:
 * `listParentVisibleChildren(parentId, "academic")`).
 * ------------------------------------------------------------------ */
const child = v.object({ studentId: v.nonEmpty(), name: v.string(), products });
export type MobileParentChild = Infer<typeof child>;
const children = v.object({ contractVersion: v.literal(MOBILE_PARENT_CONTRACT_VERSION), children: v.array(child) });
export type MobileParentChildren = Infer<typeof children>;
export function parseParentChildren(input: unknown): ContractResult<MobileParentChildren> {
  return check(children, input);
}

/* ------------------------------------------------------------------ *
 * GET /api/panel/parent/home?studentId= — `loadParentCalmHome` (web ile aynı)
 * ------------------------------------------------------------------ */
const home = v.object({
  ...header,
  studentName: v.string(),
  products,
  status: v.object({ code: v.oneOf(["ON_TRACK", "NEEDS_SUPPORT", "LIMITED_DATA"] as const), label: v.string(), sentence: v.string() }),
  weekSummary: v.string(),
  thisWeek: v.object({
    planLabel: v.nullable(v.string()),
    attendanceLabel: v.nullable(v.string()),
    assignmentsLabel: v.nullable(v.string()),
    upcoming: v.array(v.object({ id: v.nonEmpty(), title: v.string(), detail: v.string(), navId })),
  }),
  academic: v.object({
    subjectTrends: v.array(v.object({ subject: v.string(), direction: v.oneOf(TREND), sentence: v.string() })),
    examTrendSentence: v.nullable(v.string()),
    strengths: v.array(v.string()),
    supportAreas: v.array(v.string()),
  }),
  coaching: v.nullable(
    v.object({ coachName: v.nullable(v.string()), weeklyGoal: v.nullable(v.string()), planRealization: v.nullable(v.string()), sharedNote: v.nullable(v.string()) }),
  ),
  actions: v.array(
    v.object({
      id: v.nonEmpty(),
      kind: v.oneOf(["PACKAGE_RENEWAL", "CONTACT_UPDATE", "DIGEST_REVIEW", "IMPORTANT_NOTICE"] as const),
      title: v.string(),
      body: v.string(),
      ctaLabel: v.string(),
      navId,
    }),
  ),
  digest: v.object({ available: v.boolean(), published: v.boolean(), preview: v.nullable(v.string()), supportArea: v.nullable(v.string()) }),
});
export type MobileParentHome = Infer<typeof home>;
export function parseParentHome(input: unknown): ContractResult<MobileParentHome> {
  return check(home, input);
}

/* ------------------------------------------------------------------ *
 * GET /api/panel/parent/lessons?studentId= — yalnız ORTAK ders notu konusu
 * ------------------------------------------------------------------ */
export const PARENT_ATTENDANCE_KEYS = ["PLANNED", "PRESENT", "LATE", "ABSENT", "EXCUSED", "CANCELLED", "NOT_RECORDED"] as const;
const lessons = v.object({
  ...header,
  /** Çocuğun OD (canlı ders) ürünü yoksa false; liste boş. */
  available: v.boolean(),
  lessons: v.array(
    v.object({
      id: v.nonEmpty(),
      startsAt: v.iso(),
      title: v.string(),
      topic: v.nullable(v.string()),
      teacherName: v.nullable(v.string()),
      attendance: v.object({ key: v.oneOf(PARENT_ATTENDANCE_KEYS), label: v.string(), tone: v.oneOf(TONES) }),
    }),
  ),
  lastSummary: v.nullable(v.string()),
});
export type MobileParentLessons = Infer<typeof lessons>;
export function parseParentLessons(input: unknown): ContractResult<MobileParentLessons> {
  return check(lessons, input);
}

/* ------------------------------------------------------------------ *
 * GET /api/panel/parent/assignments?studentId= — SALT OKUNUR
 * ------------------------------------------------------------------ */
export const PARENT_ASSIGNMENT_STATUS = ["ATANDI", "GORULDU", "DEVAM_EDIYOR", "TAMAMLANDI", "GEC", "DEGERLENDIRILDI"] as const;
export const PARENT_ASSIGNMENT_GROUPS = ["active", "late", "done"] as const;
const assignments = v.object({
  ...header,
  available: v.boolean(),
  counts: v.object({ active: v.int(0), late: v.int(0), done: v.int(0) }),
  assignments: v.array(
    v.object({
      id: v.nonEmpty(),
      title: v.string(),
      description: v.nullable(v.string()),
      teacherName: v.nullable(v.string()),
      dueAt: v.iso(),
      status: v.object({ key: v.oneOf(PARENT_ASSIGNMENT_STATUS), label: v.string(), tone: v.oneOf(TONES) }),
      group: v.oneOf(PARENT_ASSIGNMENT_GROUPS),
    }),
  ),
});
export type MobileParentAssignments = Infer<typeof assignments>;
export function parseParentAssignments(input: unknown): ContractResult<MobileParentAssignments> {
  return check(assignments, input);
}

/* ------------------------------------------------------------------ *
 * GET /api/panel/parent/teachers?studentId= — `listParentVisibleTeachers`
 * (iletişim bilgisi / iç not yok)
 * ------------------------------------------------------------------ */
const teachers = v.object({
  ...header,
  available: v.boolean(),
  teachers: v.array(v.object({ id: v.nonEmpty(), subject: v.string(), name: v.string(), bio: v.nullable(v.string()) })),
});
export type MobileParentTeachers = Infer<typeof teachers>;
export function parseParentTeachers(input: unknown): ContractResult<MobileParentTeachers> {
  return check(teachers, input);
}

/* ------------------------------------------------------------------ *
 * GET /api/panel/parent/insights?studentId= — `loadStudentProgressInsight`
 * `audience: "parent_calm"` (risk ipucu ve personel anlatısı yok).
 * `progressInsights` kapalıysa 404 FEATURE_DISABLED.
 * ------------------------------------------------------------------ */
const rate = v.object({ percent: v.nullable(v.number()), numerator: v.int(0), denominator: v.int(0) });
const highlight = v.object({ subject: v.string(), direction: v.oneOf(TREND), sentence: v.string() });
const insightsReady = v.object({
  ...header,
  state: v.literal("READY"),
  hasExamAccess: v.boolean(),
  periodLabel: v.string(),
  periodRange: v.string(),
  narrative: v.array(v.string()),
  isEmpty: v.boolean(),
  academic: v.object({
    examCount: v.int(0),
    netDelta: v.nullable(v.number()),
    netTrend: v.array(v.object({ label: v.string(), net: v.number() })),
    subjects: v.array(v.object({ name: v.string(), direction: v.oneOf(TREND), nets: v.array(v.nullable(v.number())) })),
    labels: v.array(v.string()),
    strengths: v.array(highlight),
    supportAreas: v.array(highlight),
    subjectCaption: v.nullable(v.string()),
  }),
  behavioral: v.object({ attendance: rate, assignments: rate }),
});
const insightsPreparing = v.object({ ...header, state: v.literal("PREPARING") });
const insights = v.union("state", { READY: insightsReady, PREPARING: insightsPreparing });
export type MobileParentInsights = Infer<typeof insights>;
export type MobileParentInsightsReady = Infer<typeof insightsReady>;
export function parseParentInsights(input: unknown): ContractResult<MobileParentInsights> {
  return check(insights, input);
}

/* ------------------------------------------------------------------ *
 * GET /api/panel/parent/coaching?studentId= — yalnız YAYINLANMIŞ (APPROVED)
 * Yön planı, yayınlanmış koç özeti, PARENT_VISIBLE notlar. Görüşmeler
 * salt okunur (katılım bağlantısı yok).
 * ------------------------------------------------------------------ */
const coaching = v.object({
  ...header,
  /** Çocuğun Yön Koçluk (OK) ürünü yoksa false. */
  available: v.boolean(),
  coach: v.nullable(
    v.object({
      name: v.string(),
      nextScheduledAt: v.nullable(v.iso()),
      /** Planlanan görüşme gecikti ve yeni saat bekleniyor. */
      awaitingNewTime: v.boolean(),
      focus: v.nullable(v.string()),
      sharedNote: v.nullable(v.string()),
    }),
  ),
  sessions: v.array(v.object({ id: v.nonEmpty(), scheduledAt: v.iso(), rescheduleRequested: v.boolean(), proposedAt: v.nullable(v.iso()) })),
  week: v.nullable(v.object({ start: v.iso(), end: v.iso(), planCompletionPct: v.nullable(v.int(0)), lines: v.array(v.string()) })),
  summary: v.nullable(
    v.object({ coachSummary: v.nullable(v.string()), strengths: v.nullable(v.string()), focusAreas: v.nullable(v.string()), nextWeekFocus: v.nullable(v.string()) }),
  ),
  notes: v.array(v.object({ id: v.nonEmpty(), body: v.string(), createdAt: v.iso() })),
  goals: v.array(v.object({ id: v.nonEmpty(), label: v.string(), percent: v.nullable(v.number()) })),
});
export type MobileParentCoaching = Infer<typeof coaching>;
export function parseParentCoaching(input: unknown): ContractResult<MobileParentCoaching> {
  return check(coaching, input);
}

/* ------------------------------------------------------------------ *
 * GET /api/panel/parent/digests?studentId= — yalnız YAYINLANMIŞ öğretmen
 * özeti + ayrı blokta otomatik "yaklaşanlar". `parentWeeklyDigest`
 * kapalıysa 404 FEATURE_DISABLED.
 * Geri bildirim: MEVCUT `POST /api/panel/weekly-digests/[id]/feedback`.
 * ------------------------------------------------------------------ */
const digest = v.object({
  ...header,
  /**
   * Mevcut geri bildirim ucu velinin kendi OD erişimini ister
   * (`requireApiOdRole`). false ise mobil formu göstermez (uç değiştirilmedi).
   */
  feedbackAvailable: v.boolean(),
  digest: v.nullable(
    v.object({
      id: v.nonEmpty(),
      weekStart: v.iso(),
      publishedAt: v.nullable(v.iso()),
      dataThrough: v.iso(),
      trendBand: v.oneOf(["IMPROVING", "STEADY", "BUILDING", "LIMITED_DATA"] as const),
      goodThingOne: v.string(),
      goodThingTwo: v.string(),
      supportArea: v.nullable(v.string()),
      homeQuestion: v.nullable(v.string()),
      feedback: v.nullable(v.object({ helpful: v.nullable(v.boolean()), anxietyPulse: v.nullable(v.int(1)) })),
    }),
  ),
  /** Otomatik takvim / koçluk kayıtları — öğretmen özeti DEĞİL. */
  upcoming: v.array(v.object({ kind: v.oneOf(["LESSON", "COACHING"] as const), title: v.string(), at: v.iso() })),
});
export type MobileParentDigest = Infer<typeof digest>;
export function parseParentDigest(input: unknown): ContractResult<MobileParentDigest> {
  return check(digest, input);
}

const feedbackResult = v.object({ saved: v.literal(true) });
export function parseDigestFeedbackResult(input: unknown): ContractResult<{ saved: true }> {
  return check(feedbackResult, input);
}

/* ------------------------------------------------------------------ *
 * GET /api/panel/parent/external-exams?studentId= — OD / okul / kurum
 * DIŞ deneme kayıtları (`MockExam`). Deneme Ligi DEĞİL.
 * `mockExamAnalysis` kapalıysa 404 FEATURE_DISABLED.
 * ------------------------------------------------------------------ */
const externalExams = v.object({
  ...header,
  available: v.boolean(),
  exams: v.array(
    v.object({
      id: v.nonEmpty(),
      title: v.string(),
      takenAt: v.iso(),
      totalNet: v.number(),
      sections: v.array(v.object({ subjectName: v.string(), correctCount: v.int(0), incorrectCount: v.int(0), net: v.number() })),
    }),
  ),
});
export type MobileParentExternalExams = Infer<typeof externalExams>;
export function parseParentExternalExams(input: unknown): ContractResult<MobileParentExternalExams> {
  return check(externalExams, input);
}

/* ------------------------------------------------------------------ *
 * GET /api/odk/parent/report?studentId= — `getOdkAudienceStudentReport`
 * (gerçek PARENT izleyici). Öğrenci `User.id` SUNUCUDA çözülür.
 * ------------------------------------------------------------------ */
const odkReport = v.object({
  ...header,
  /** Hak / `parentReports` / yayın koşulları sağlanmıyorsa false (ayrıntı verilmez). */
  available: v.boolean(),
  summary: v.array(v.string()),
  exams: v.array(
    v.object({
      id: v.nonEmpty(),
      title: v.string(),
      family: v.string(),
      takenAt: v.iso(),
      correctCount: v.int(0),
      wrongCount: v.int(0),
      blankCount: v.int(0),
      totalNet: v.number(),
    }),
  ),
  comparison: v.nullable(v.object({ latestExamId: v.nonEmpty(), previousExamId: v.nullable(v.string()), sameFamily: v.boolean(), netChange: v.nullable(v.number()) })),
  outcomes: v.array(
    v.object({
      id: v.nonEmpty(),
      code: v.string(),
      title: v.string(),
      unitName: v.string(),
      latestAccuracy: v.number(),
      delta: v.nullable(v.number()),
      questionCount: v.int(0),
      evidenceCount: v.int(0),
    }),
  ),
  weakThreshold: v.number(),
});
export type MobileParentOdkReport = Infer<typeof odkReport>;
export function parseParentOdkReport(input: unknown): ContractResult<MobileParentOdkReport> {
  return check(odkReport, input);
}

/* ------------------------------------------------------------------ *
 * GET /api/panel/parent/account — HESAP amacı (`account`): akademik izni
 * kapalı bağlantılar da listelenir ama AKADEMİK VERİ YOKTUR. Fiyat,
 * sipariş tutarı ve ödeme ayrıntısı mobilde yoktur (MD-09).
 * ------------------------------------------------------------------ */
const account = v.object({
  contractVersion: v.literal(MOBILE_PARENT_CONTRACT_VERSION),
  parent: v.object({ fullName: v.nullable(v.string()), email: v.string(), hasPhone: v.boolean() }),
  children: v.array(
    v.object({
      studentId: v.nonEmpty(),
      name: v.string(),
      products: v.array(v.object({ code: v.oneOf(PARENT_PRODUCTS), label: v.string() })),
      /** Bu çocuk için akademik ekranlar açık mı (bağlantı `canViewAcademic`). */
      academicAccess: v.boolean(),
    }),
  ),
});
export type MobileParentAccount = Infer<typeof account>;
export function parseParentAccount(input: unknown): ContractResult<MobileParentAccount> {
  return check(account, input);
}

/* ------------------------------------------------------------------ *
 * Web yolu → veli menü kimliği (saf). Sunucu projeksiyonu (eylem / yaklaşan
 * hedefleri) ve mobil bildirim dokunuşu AYNI tabloyu kullanır. Sorgu dizesi
 * (`?studentId=`) yok sayılır: çocuk kimliği URL'den ASLA alınmaz.
 * Tanınmayan yol → null (keyfi web adresi açılmaz).
 * ------------------------------------------------------------------ */
const PARENT_WEB_PATHS: Record<string, ParentNavId> = {
  "/panel/veli": "today",
  "/panel/veli/takvim": "lessons",
  "/panel/veli/odevler": "assignments",
  "/panel/veli/ogretmenler": "teachers",
  "/panel/veli/analiz": "analiz",
  "/panel/veli/takip": "progress",
  "/panel/veli/kocluk": "coaching",
  "/panel/veli/haftalik": "weekly-digest",
  "/panel/veli/denemeler": "mock-exams",
  "/panel/veli/hesap": "account",
  "/panel/odk/veli/raporlar": "odk-reports",
};

export function parentNavIdForWebPath(href: string | null | undefined): ParentNavId | null {
  if (!href) return null;
  const path = href.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return Object.prototype.hasOwnProperty.call(PARENT_WEB_PATHS, path) ? PARENT_WEB_PATHS[path] : null;
}

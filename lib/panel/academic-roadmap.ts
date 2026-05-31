/**
 * Academic Roadmap helpers — Phase 2 / Session 7.
 *
 * Goal: surface a single, honest, deterministic "what should I do next" view
 * for a student, derived from real homework / attendance / study / exam data.
 *
 * Permission boundary:
 *   - Student   → own active goal only (gated at action / page level).
 *   - Teacher / Admin → read-only summary via Student 360 (existing route auth).
 *   - Parent    → deferred (D8 in §17).
 *
 * No AI calls. No fake data. If a signal is missing the helpers return
 * honest empty/unknown values and the UI shows an empty state.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import type { AcademicGoalExamType, Prisma } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AcademicGoalRow = {
  id: string;
  studentId: string;
  examType: AcademicGoalExamType | null;
  targetUniversity: string | null;
  targetDepartment: string | null;
  targetSchool: string | null;
  targetScore: number | null;
  targetNet: number | null;
  targetRank: number | null;
  targetDate: Date | null;
  note: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AcademicTrendPoint = {
  /** Stable id for React keys */
  id: string;
  /** "EXAM_RESULT" | "ODK" */
  source: "EXAM_RESULT" | "ODK";
  title: string;
  takenAt: Date;
  net: number | null;
  score: number | null;
  /** Optional deep-link to result detail (ODK attempts have one). */
  href: string | null;
};

export type SubjectStat = {
  subject: string;
  net: number | null;
  correctCount: number;
  wrongCount: number;
};

export type AcademicSnapshot = {
  /** Latest single result across both StudentExamResult and OdkExamAttempt */
  latest: AcademicTrendPoint | null;
  /** Subject breakdown of the latest StudentExamResult (if any) */
  latestSubjects: SubjectStat[];
  /** Average of last up-to-5 nets, or null if none. */
  averageNet: number | null;
  /** Total submitted exam count seen by helpers */
  totalExams: number;
  /** Total attendance records last 30 days */
  attendanceTotal: number;
  /** Present + late + left_early / total — null when no records */
  presentRate: number | null;
  /** Sum of completed study session durations in seconds, last 7 days */
  studySecondsLast7: number;
  /** Days in the last 7 with at least one completed session */
  studyDaysLast7: number;
  /** Open homework rows snapshot */
  homework: {
    pendingCount: number;
    overdueCount: number;
    awaitingGradeCount: number;
    nextDueAt: Date | null;
    nextDueTitle: string | null;
    nextDueAssignmentId: string | null;
  };
};

export type AcademicGap = {
  /** True when target and current are on the same axis and a difference is meaningful. */
  comparable: boolean;
  /** "net" | "score" | "rank" | "none" */
  axis: "net" | "score" | "rank" | "none";
  target: number | null;
  current: number | null;
  /** target - current (positive = student must close the gap upward, e.g. net) */
  delta: number | null;
  /** Plain-Turkish reason if not comparable. */
  reason: string | null;
};

export type RoadmapTone = "bad" | "warn" | "ok" | "neutral";

export type RoadmapRecommendation = {
  id: string;
  title: string;
  /** "Why" line shown below the title */
  reason: string;
  tone: RoadmapTone;
  /** Optional CTA target — relative path or null */
  href: string | null;
  /** Short button label */
  cta: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function n(v: Prisma.Decimal | number | null | undefined): number | null {
  if (v == null) return null;
  const num = typeof v === "number" ? v : Number(v);
  return Number.isFinite(num) ? num : null;
}

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number): Date {
  const d = startOfDay();
  d.setDate(d.getDate() - n);
  return d;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) Active goal lookup
// ─────────────────────────────────────────────────────────────────────────────

function rowFromGoal(g: {
  id: string;
  studentId: string;
  examType: AcademicGoalExamType | null;
  targetUniversity: string | null;
  targetDepartment: string | null;
  targetSchool: string | null;
  targetScore: Prisma.Decimal | null;
  targetNet: Prisma.Decimal | null;
  targetRank: number | null;
  targetDate: Date | null;
  note: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AcademicGoalRow {
  return {
    id: g.id,
    studentId: g.studentId,
    examType: g.examType,
    targetUniversity: g.targetUniversity,
    targetDepartment: g.targetDepartment,
    targetSchool: g.targetSchool,
    targetScore: n(g.targetScore),
    targetNet: n(g.targetNet),
    targetRank: g.targetRank,
    targetDate: g.targetDate,
    note: g.note,
    isActive: g.isActive,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

export async function getStudentActiveGoal(
  studentId: string,
): Promise<AcademicGoalRow | null> {
  const goal = await prisma.studentAcademicGoal.findFirst({
    where: { studentId, isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  return goal ? rowFromGoal(goal) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) Net trend — chronological, mixed sources
// ─────────────────────────────────────────────────────────────────────────────

export async function getStudentNetTrend(
  studentId: string,
  studentUserId: string | null,
  take = 10,
): Promise<AcademicTrendPoint[]> {
  const [examResults, odkAttempts] = await Promise.all([
    prisma.studentExamResult.findMany({
      where: { studentId },
      orderBy: { takenAt: "desc" },
      take: take * 2,
      select: {
        id: true,
        title: true,
        takenAt: true,
        net: true,
        score: true,
      },
    }),
    studentUserId
      ? prisma.odkExamAttempt.findMany({
          where: { userId: studentUserId, status: "SUBMITTED" },
          orderBy: { submittedAt: "desc" },
          take: take * 2,
          select: {
            id: true,
            submittedAt: true,
            score: true,
            correctCount: true,
            wrongCount: true,
            exam: { select: { title: true } },
          },
        })
      : Promise.resolve(
          [] as Array<{
            id: string;
            submittedAt: Date | null;
            score: Prisma.Decimal | null;
            correctCount: number;
            wrongCount: number;
            exam: { title: string } | null;
          }>,
        ),
  ]);

  const points: AcademicTrendPoint[] = [];
  for (const r of examResults) {
    points.push({
      id: `exam:${r.id}`,
      source: "EXAM_RESULT",
      title: r.title,
      takenAt: r.takenAt,
      net: n(r.net),
      score: n(r.score),
      href: null,
    });
  }
  for (const a of odkAttempts) {
    if (!a.submittedAt) continue;
    const computedNet = round2(a.correctCount - a.wrongCount / 4);
    points.push({
      id: `odk:${a.id}`,
      source: "ODK",
      title: a.exam?.title ?? "ODK Denemesi",
      takenAt: a.submittedAt,
      net: computedNet,
      score: n(a.score),
      href: `/panel/ogrenci/odk/sonuc/${a.id}`,
    });
  }
  points.sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
  return points.slice(0, take).reverse(); // chronological (oldest → newest)
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) Snapshot — current academic level
// ─────────────────────────────────────────────────────────────────────────────

export async function getStudentCurrentAcademicSnapshot(
  studentId: string,
  studentUserId: string | null,
): Promise<AcademicSnapshot> {
  const since30 = daysAgo(30);
  const since7 = daysAgo(7);

  const [trendDesc, latestExamSubjects, attendance, studySessions, assignments] =
    await Promise.all([
      // Use a small "desc" query to find the latest result (across both sources).
      // We re-use getStudentNetTrend but ask for a larger window then sort newest-first.
      (async () => {
        const points = await getStudentNetTrend(studentId, studentUserId, 10);
        return points.slice().reverse(); // newest first
      })(),
      prisma.studentExamResult.findFirst({
        where: { studentId },
        orderBy: { takenAt: "desc" },
        select: {
          id: true,
          subjectStats: {
            select: {
              subject: true,
              net: true,
              correctCount: true,
              wrongCount: true,
            },
          },
        },
      }),
      prisma.attendance.findMany({
        where: { studentId, sessionDate: { gte: since30 } },
        select: { status: true },
      }),
      prisma.studySession.findMany({
        where: {
          studentId,
          endedAt: { not: null },
          startedAt: { gte: since7 },
        },
        select: { startedAt: true, durationSeconds: true },
      }),
      prisma.assignment.findMany({
        where: {
          OR: [
            { studentId },
            {
              classroom: {
                students: { some: { studentId, leftAt: null } },
              },
            },
          ],
          status: "PUBLISHED",
          createdAt: { gte: daysAgo(60) },
        },
        select: {
          id: true,
          title: true,
          dueAt: true,
          submissions: {
            where: { studentId },
            select: { status: true },
            take: 1,
          },
        },
      }),
    ]);

  const latest = trendDesc[0] ?? null;
  const last5 = trendDesc.slice(0, 5);
  const validNets = last5
    .map((p) => p.net)
    .filter((v): v is number => v != null);
  const averageNet =
    validNets.length > 0
      ? round2(validNets.reduce((s, v) => s + v, 0) / validNets.length)
      : null;

  const latestSubjects: SubjectStat[] = (latestExamSubjects?.subjectStats ?? [])
    .filter((s) => s.subject)
    .map((s) => ({
      subject: s.subject,
      net: n(s.net),
      correctCount: s.correctCount,
      wrongCount: s.wrongCount,
    }));

  // Attendance
  let attendancePresentLike = 0;
  for (const a of attendance) {
    if (
      a.status === "PRESENT" ||
      a.status === "LATE" ||
      a.status === "LEFT_EARLY"
    ) {
      attendancePresentLike++;
    }
  }
  const presentRate =
    attendance.length > 0 ? attendancePresentLike / attendance.length : null;

  // Study
  const studySecondsLast7 = studySessions.reduce(
    (s, c) => s + (c.durationSeconds ?? 0),
    0,
  );
  const studyDaysSet = new Set<string>();
  for (const c of studySessions) {
    if (!c.durationSeconds || c.durationSeconds <= 0) continue;
    const k = startOfDay(c.startedAt).toISOString().slice(0, 10);
    studyDaysSet.add(k);
  }

  // Homework
  const now = new Date();
  let pendingCount = 0;
  let overdueCount = 0;
  let awaitingGradeCount = 0;
  type Pending = {
    assignmentId: string;
    title: string;
    dueAt: Date;
  };
  const pending: Pending[] = [];

  for (const a of assignments) {
    const sub = a.submissions[0];
    const subStatus = (sub?.status ?? "NONE") as string;
    const isOpen = !sub || subStatus === "PENDING";
    const pastDue = !!a.dueAt && a.dueAt.getTime() < now.getTime();
    if (isOpen && !pastDue && a.dueAt) {
      pendingCount++;
      pending.push({ assignmentId: a.id, title: a.title, dueAt: a.dueAt });
    } else if (isOpen && pastDue) {
      overdueCount++;
    } else if (subStatus === "SUBMITTED") {
      awaitingGradeCount++;
    }
  }
  pending.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  const nextDue = pending[0] ?? null;

  return {
    latest,
    latestSubjects,
    averageNet,
    totalExams: trendDesc.length,
    attendanceTotal: attendance.length,
    presentRate,
    studySecondsLast7,
    studyDaysLast7: studyDaysSet.size,
    homework: {
      pendingCount,
      overdueCount,
      awaitingGradeCount,
      nextDueAt: nextDue?.dueAt ?? null,
      nextDueTitle: nextDue?.title ?? null,
      nextDueAssignmentId: nextDue?.assignmentId ?? null,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) Goal vs current — gap calculation (pure)
// ─────────────────────────────────────────────────────────────────────────────

export function getStudentGoalGap(
  goal: AcademicGoalRow | null,
  snapshot: AcademicSnapshot,
): AcademicGap {
  if (!goal) {
    return {
      comparable: false,
      axis: "none",
      target: null,
      current: null,
      delta: null,
      reason: "Henüz aktif bir hedefin yok.",
    };
  }
  const latest = snapshot.latest;

  // Prefer net axis when both sides have a net value.
  if (goal.targetNet != null && latest?.net != null) {
    const delta = round2(goal.targetNet - latest.net);
    return {
      comparable: true,
      axis: "net",
      target: goal.targetNet,
      current: latest.net,
      delta,
      reason: null,
    };
  }
  // Score axis fallback.
  if (goal.targetScore != null && latest?.score != null) {
    const delta = round2(goal.targetScore - latest.score);
    return {
      comparable: true,
      axis: "score",
      target: goal.targetScore,
      current: latest.score,
      delta,
      reason: null,
    };
  }
  // Rank — we don't have a "current rank" unless StudentExamResult.ranking is set.
  if (goal.targetRank != null) {
    return {
      comparable: false,
      axis: "rank",
      target: goal.targetRank,
      current: null,
      delta: null,
      reason:
        "Sıralama hedefi var, ancak son denemenin sıralaması henüz girilmedi.",
    };
  }
  // No comparable target.
  if (goal.targetNet != null || goal.targetScore != null) {
    return {
      comparable: false,
      axis: goal.targetNet != null ? "net" : "score",
      target: goal.targetNet ?? goal.targetScore,
      current: null,
      delta: null,
      reason: latest
        ? "Hedef ve mevcut sonuç aynı ölçekte olmadığı için fark hesaplanamadı."
        : "Henüz bir deneme sonucun yok; hedefe kalan farkı hesaplayabilmek için sonuç gerekiyor.",
    };
  }
  return {
    comparable: false,
    axis: "none",
    target: null,
    current: null,
    delta: null,
    reason:
      "Hedefte sayısal bir değer (net / skor / sıralama) yok; eklersen ilerlemeni izleyebilirim.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) Recommendations — deterministic
// ─────────────────────────────────────────────────────────────────────────────

export async function getStudentRoadmapRecommendations(
  studentId: string,
  studentUserId: string | null,
): Promise<RoadmapRecommendation[]> {
  const snapshot = await getStudentCurrentAcademicSnapshot(
    studentId,
    studentUserId,
  );
  const recs: RoadmapRecommendation[] = [];

  // 1) Overdue homework — highest priority.
  if (snapshot.homework.overdueCount > 0) {
    recs.push({
      id: "rec:overdue",
      title: "Önce eksik ödevleri tamamla",
      reason: `${snapshot.homework.overdueCount} ödevin teslim tarihi geçti.`,
      tone: "bad",
      href: "/panel/ogrenci/odevler",
      cta: "Ödevlere git",
    });
  }

  // 2) Attendance risk — last 30 days present-rate < 70%.
  if (
    snapshot.presentRate !== null &&
    snapshot.attendanceTotal >= 4 &&
    snapshot.presentRate < 0.7
  ) {
    recs.push({
      id: "rec:attendance",
      title: "Kaçırdığın derslerin materyallerini incele",
      reason: `Son 30 gündeki devam oranın %${Math.round(
        snapshot.presentRate * 100,
      )}.`,
      tone: "warn",
      href: "/panel/ogrenci/kutuphane",
      cta: "Materyallere git",
    });
  }

  // 3) Lowest-net subject from latest exam.
  if (snapshot.latestSubjects.length > 0) {
    const sorted = [...snapshot.latestSubjects]
      .filter((s) => s.net !== null)
      .sort((a, b) => (a.net ?? 0) - (b.net ?? 0));
    const weakest = sorted[0];
    if (weakest && (weakest.net ?? 0) < 8) {
      recs.push({
        id: `rec:subject:${weakest.subject}`,
        title: `${weakest.subject} dersini tekrar et`,
        reason: `Son denemede ${weakest.subject} netin: ${weakest.net}`,
        tone: "warn",
        href: "/panel/ogrenci/performansim",
        cta: "Performansa git",
      });
    }
  }

  // 4) Low study time — last 7 days < 1 hour.
  if (snapshot.studySecondsLast7 < 60 * 60) {
    recs.push({
      id: "rec:study",
      title: "Bugün 25 dakikalık çalışma oturumu başlat",
      reason:
        snapshot.studySecondsLast7 === 0
          ? "Son 7 günde tamamlanmış bir çalışma oturumun yok."
          : `Son 7 gündeki toplam çalışma süren ${Math.round(
              snapshot.studySecondsLast7 / 60,
            )} dk.`,
      tone: "warn",
      href: "/panel/ogrenci/calisma-odasi",
      cta: "Çalışma başlat",
    });
  }

  // 5) Next due homework — informative only when no other "bad" rec.
  if (snapshot.homework.nextDueAt && snapshot.homework.nextDueAssignmentId) {
    recs.push({
      id: "rec:nextDue",
      title: `Sıradaki ödev: ${snapshot.homework.nextDueTitle ?? "Ödev"}`,
      reason: `Teslim: ${snapshot.homework.nextDueAt.toLocaleDateString(
        "tr-TR",
        { day: "2-digit", month: "short" },
      )}`,
      tone: "neutral",
      href: `/panel/ogrenci/odevler/${snapshot.homework.nextDueAssignmentId}`,
      cta: "Ödevi aç",
    });
  }

  // 6) No exam data → suggest taking a deneme.
  if (snapshot.totalExams === 0) {
    recs.push({
      id: "rec:noExam",
      title: "İlk deneme sonucunu kaydet",
      reason:
        "Hedefe ne kadar yakın olduğunu görebilmek için en az bir deneme sonucu gerekiyor.",
      tone: "neutral",
      href: "/panel/ogrenci/odk/denemeler",
      cta: "Denemelere git",
    });
  }

  // Empty fallback — keep the page from being silent.
  if (recs.length === 0) {
    recs.push({
      id: "rec:keep",
      title: "Mevcut tempoyu koru",
      reason:
        "Eksik ödev, devamsızlık ve düşük net sinyali görünmüyor. Sıradaki ödeve odaklan.",
      tone: "ok",
      href: "/panel/ogrenci/odevler",
      cta: "Ödevlere git",
    });
  }

  // Cap at 5 — bad first, then warn, then neutral, then ok.
  const order: Record<RoadmapTone, number> = {
    bad: 0,
    warn: 1,
    neutral: 2,
    ok: 3,
  };
  recs.sort((a, b) => order[a.tone] - order[b.tone]);
  return recs.slice(0, 5);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) Compact summary — used by widgets / Student 360
// ─────────────────────────────────────────────────────────────────────────────

export type RoadmapCompactSummary = {
  goal: AcademicGoalRow | null;
  latestNet: number | null;
  latestTitle: string | null;
  gap: AcademicGap;
  topRecommendation: RoadmapRecommendation | null;
  studySecondsLast7: number;
};

export async function getStudentRoadmapCompactSummary(
  studentId: string,
  studentUserId: string | null,
): Promise<RoadmapCompactSummary> {
  const [goal, snapshot, recs] = await Promise.all([
    getStudentActiveGoal(studentId),
    getStudentCurrentAcademicSnapshot(studentId, studentUserId),
    getStudentRoadmapRecommendations(studentId, studentUserId),
  ]);
  return {
    goal,
    latestNet: snapshot.latest?.net ?? null,
    latestTitle: snapshot.latest?.title ?? null,
    gap: getStudentGoalGap(goal, snapshot),
    topRecommendation: recs[0] ?? null,
    studySecondsLast7: snapshot.studySecondsLast7,
  };
}

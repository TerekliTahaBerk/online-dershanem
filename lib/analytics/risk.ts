/**
 * FAZ 8 — Risk Engine.
 *
 * Bir öğrencinin "risk skorunu" 0-100 arası hesaplar ve etiketler.
 * Sinyaller:
 *  - Son denemelerde net düşüşü
 *  - Devamsızlık oranı yüksek
 *  - Bekleyen/geciken ödev
 *  - Düşük başarı oranı (correct/total)
 *  - Pasif olma (uzun süre giriş yok)
 *
 * Skor > 70 → "high", 40-70 → "medium", < 40 → "low".
 */

import { prisma } from "@/lib/prisma";
import { cacheWrap } from "@/lib/cache";
import { linearSlope, clampPct } from "./core";

export type RiskLevel = "low" | "medium" | "high";

export type RiskSignal = {
  id: string;
  weight: number; // 0-100
  message: string;
};

export type StudentRisk = {
  studentId: string;
  fullName: string;
  classLevel: string | null;
  userId: string | null;
  score: number; // 0-100
  level: RiskLevel;
  signals: RiskSignal[];
};

const SINCE = (days: number) => new Date(Date.now() - days * 86400000);

function levelOf(score: number): RiskLevel {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/**
 * Tek bir öğrenci için risk skoru. Eski denemeler + devamsızlık + ödev tek sorgu gruplarında
 * çekilir. Toplu liste için `computeRiskListForStudents` kullan.
 */
export async function computeStudentRisk(studentId: string): Promise<StudentRisk | null> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, fullName: true, classLevel: true, userId: true },
  });
  if (!student) return null;

  const [attempts, attendance30, attendance60, overdueCount, totalAsg, submittedAsg] = await Promise.all([
    student.userId
      ? prisma.odkExamAttempt.findMany({
          where: { userId: student.userId, status: "SUBMITTED" },
          orderBy: { submittedAt: "desc" },
          take: 6,
          select: { correctCount: true, wrongCount: true, blankCount: true, submittedAt: true },
        })
      : Promise.resolve([] as { correctCount: number; wrongCount: number; blankCount: number; submittedAt: Date | null }[]),
    prisma.attendance.findMany({
      where: { studentId, sessionDate: { gte: SINCE(30) } },
      select: { status: true },
    }),
    prisma.attendance.findMany({
      where: { studentId, sessionDate: { gte: SINCE(60), lt: SINCE(30) } },
      select: { status: true },
    }),
    prisma.assignment.count({
      where: {
        OR: [
          { studentId },
          { classroom: { students: { some: { studentId, leftAt: null } } } },
        ],
        dueAt: { lt: new Date() },
        submissions: { none: { studentId, submittedAt: { not: null } } },
      },
    }),
    prisma.assignment.count({
      where: {
        OR: [
          { studentId },
          { classroom: { students: { some: { studentId, leftAt: null } } } },
        ],
        createdAt: { gte: SINCE(60) },
      },
    }),
    prisma.assignmentSubmission.count({
      where: { studentId, submittedAt: { not: null }, createdAt: { gte: SINCE(60) } },
    }),
  ]);

  const signals: RiskSignal[] = [];
  let score = 0;

  // 1. Net düşüş trendi
  if (attempts.length >= 3) {
    const nets = attempts
      .slice()
      .reverse()
      .map((a) => a.correctCount - a.wrongCount / 4);
    const slope = linearSlope(nets.slice(-5));
    if (slope < -0.7) {
      const w = Math.min(35, Math.round(Math.abs(slope) * 20));
      score += w;
      signals.push({ id: "net-drop", weight: w, message: `Son denemelerde net eğimi ${slope.toFixed(2)}` });
    } else if (slope < -0.3) {
      score += 15;
      signals.push({ id: "net-slight-drop", weight: 15, message: "Hafif net düşüşü trendi" });
    }
  } else if (attempts.length === 0 && student.userId) {
    score += 5;
    signals.push({ id: "no-attempts", weight: 5, message: "Henüz ODK denemesi yok" });
  }

  // 2. Devamsızlık
  if (attendance30.length > 0) {
    const absent = attendance30.filter((a) => a.status === "ABSENT").length;
    const rate = (absent / attendance30.length) * 100;
    if (rate >= 30) {
      score += 30;
      signals.push({ id: "att-high", weight: 30, message: `Devamsızlık %${Math.round(rate)}` });
    } else if (rate >= 15) {
      score += 15;
      signals.push({ id: "att-mid", weight: 15, message: `Devamsızlık %${Math.round(rate)}` });
    }
    // 60→30 günlük artış
    if (attendance60.length > 0) {
      const prevRate = (attendance60.filter((a) => a.status === "ABSENT").length / attendance60.length) * 100;
      if (rate - prevRate >= 12) {
        score += 12;
        signals.push({ id: "att-rising", weight: 12, message: "Devamsızlık artış trendi" });
      }
    }
  }

  // 3. Ödev
  if (overdueCount >= 5) {
    score += 25;
    signals.push({ id: "asg-overdue-many", weight: 25, message: `${overdueCount} geciken ödev` });
  } else if (overdueCount >= 2) {
    score += 12;
    signals.push({ id: "asg-overdue-few", weight: 12, message: `${overdueCount} geciken ödev` });
  }
  if (totalAsg >= 4) {
    const subRate = (submittedAsg / totalAsg) * 100;
    if (subRate < 40) {
      score += 15;
      signals.push({ id: "asg-low-submit", weight: 15, message: `Ödev gönderim %${Math.round(subRate)}` });
    }
  }

  // 4. Başarı oranı (last 6 attempts)
  if (attempts.length > 0) {
    const totalQ = attempts.reduce((s, a) => s + a.correctCount + a.wrongCount + a.blankCount, 0);
    const totalC = attempts.reduce((s, a) => s + a.correctCount, 0);
    const successPct = totalQ > 0 ? (totalC / totalQ) * 100 : 0;
    if (successPct > 0 && successPct < 35) {
      score += 12;
      signals.push({ id: "low-success", weight: 12, message: `Başarı %${Math.round(successPct)}` });
    }
  }

  score = clampPct(score);
  return {
    studentId: student.id,
    fullName: student.fullName,
    classLevel: student.classLevel,
    userId: student.userId,
    score,
    level: levelOf(score),
    signals,
  };
}

/**
 * Performans için: tüm öğrenciler için "lightweight" risk hesabı.
 * Tek sorguda attendance + overdue + attempts aggregate çeker;
 * full-detail signal istenirse `computeStudentRisk` ile zenginleştirilir.
 *
 * `limit` üst sınır; default 100.
 */
/** Cached public API. Round 3: 5dk TTL. */
export async function getTopRiskyStudents(limit = 20): Promise<StudentRisk[]> {
  return cacheWrap(
    `analytics:risk:top:${limit}`,
    300,
    () => computeTopRiskyStudents(limit),
  );
}

async function computeTopRiskyStudents(limit = 20): Promise<StudentRisk[]> {
  const since30 = SINCE(30);

  // 1) Devamsızlık per studentId
  const attendanceGroups = await prisma.attendance.groupBy({
    by: ["studentId", "status"],
    where: { sessionDate: { gte: since30 } },
    _count: { _all: true },
  });
  const attMap = new Map<string, { total: number; absent: number }>();
  for (const g of attendanceGroups) {
    const cur = attMap.get(g.studentId) ?? { total: 0, absent: 0 };
    cur.total += g._count._all;
    if (g.status === "ABSENT") cur.absent += g._count._all;
    attMap.set(g.studentId, cur);
  }

  // 2) Geciken ödev (per student)
  const overdueGroups = await prisma.$queryRawUnsafe<{ studentId: string; cnt: bigint }[]>(`
    SELECT a."studentId" as "studentId", COUNT(DISTINCT a."id")::bigint as cnt
    FROM "Assignment" a
    WHERE a."dueAt" < NOW()
      AND a."studentId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "AssignmentSubmission" s
        WHERE s."assignmentId" = a."id" AND s."studentId" = a."studentId" AND s."submittedAt" IS NOT NULL
      )
    GROUP BY a."studentId"
  `).catch(() => [] as { studentId: string; cnt: bigint }[]);
  const overdueMap = new Map(overdueGroups.map((g) => [g.studentId, Number(g.cnt)]));

  // 3) Aday öğrenciler — devamsız VEYA geciken ödevli VEYA hiç sorgu yapılmamış
  const candidateIds = new Set<string>([...attMap.keys(), ...overdueMap.keys()]);
  if (candidateIds.size === 0) {
    // fallback: tüm aktif öğrenciler
    const all = await prisma.student.findMany({
      where: { status: "ACTIVE" },
      take: limit * 3,
      select: { id: true },
    });
    all.forEach((s) => candidateIds.add(s.id));
  }

  if (candidateIds.size === 0) return [];

  // 4) Lightweight skor (signal yok, sadece numeric)
  const students = await prisma.student.findMany({
    where: { id: { in: Array.from(candidateIds) } },
    select: { id: true, fullName: true, classLevel: true, userId: true },
  });

  const result: StudentRisk[] = students.map((s) => {
    const att = attMap.get(s.id);
    const overdue = overdueMap.get(s.id) ?? 0;
    const signals: RiskSignal[] = [];
    let score = 0;
    if (att && att.total > 0) {
      const rate = (att.absent / att.total) * 100;
      if (rate >= 30) { score += 30; signals.push({ id: "att-high", weight: 30, message: `Devamsızlık %${Math.round(rate)}` }); }
      else if (rate >= 15) { score += 15; signals.push({ id: "att-mid", weight: 15, message: `Devamsızlık %${Math.round(rate)}` }); }
    }
    if (overdue >= 5) { score += 25; signals.push({ id: "asg-overdue-many", weight: 25, message: `${overdue} geciken ödev` }); }
    else if (overdue >= 2) { score += 12; signals.push({ id: "asg-overdue-few", weight: 12, message: `${overdue} geciken ödev` }); }

    score = clampPct(score);
    return {
      studentId: s.id, fullName: s.fullName, classLevel: s.classLevel, userId: s.userId,
      score, level: levelOf(score), signals,
    };
  });

  return result
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

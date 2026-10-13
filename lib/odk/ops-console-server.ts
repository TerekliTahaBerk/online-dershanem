import "server-only";

import { prisma } from "@/lib/prisma";
import { operationDigest } from "@/lib/panel/group-mutation-core";
import {
  OPS_HEARTBEAT_FILTERS,
  OPS_STATUS_FILTERS,
  opsAttemptMatches,
  opsCounters,
  opsStateOf,
  parseOpsFilter,
} from "./staff-workspace";

/**
 * CANLI OPERASYON KONSOLU yükleyicisi (K04) — web
 * `app/panel/odk/yonetim/operasyon` ve mobil
 * `GET /api/panel/odk/management/operations` AYNI sorgu ve süzgeçleri
 * kullanır (sayfadan taşındı). Kalp atışı tarayıcı bağlantısını gösterir;
 * Meet katılımının kanıtı değildir.
 */
export const OPS_VIEWS = ["all", "live", "attention"] as const;
export const OPS_INTEGRITY_FILTERS = ["tumu", "REVIEW", "HIGH"] as const;
export type OpsView = (typeof OPS_VIEWS)[number];

export type OpsConsoleParams = { q?: string; gorunum?: string; deneme?: string; durum?: string; butunluk?: string; kalp?: string };

/** Konsolun izlediği denemeler: planlı / canlı, bitişi son 24 saat içinde. */
export function opsExamWindow(now: Date) {
  return { status: { in: ["SCHEDULED" as const, "LIVE" as const] }, endsAt: { gte: new Date(now.getTime() - 24 * 60 * 60_000) } };
}

export async function loadOdkOpsConsole(params: OpsConsoleParams, now = new Date()) {
  const query = params.q?.trim().toLocaleLowerCase("tr-TR").slice(0, 80) || "";
  const view: OpsView = OPS_VIEWS.includes(params.gorunum as OpsView) ? (params.gorunum as OpsView) : "all";
  const filters = {
    status: parseOpsFilter(params.durum, OPS_STATUS_FILTERS),
    integrity: parseOpsFilter(params.butunluk, OPS_INTEGRITY_FILTERS),
    heartbeat: parseOpsFilter(params.kalp, OPS_HEARTBEAT_FILTERS),
  };
  const exams = await prisma.odkExam.findMany({
    where: opsExamWindow(now),
    orderBy: { startsAt: "asc" },
    take: 30,
    select: {
      id: true,
      title: true,
      family: true,
      status: true,
      startsAt: true,
      endsAt: true,
      meetRequired: true,
      _count: { select: { assignments: { where: { isActive: true } } } },
      attempts: {
        where: { status: { not: "VOID" } },
        orderBy: { startedAt: "asc" },
        select: {
          id: true,
          status: true,
          meetAcknowledgedAt: true,
          startedAt: true,
          deadlineAt: true,
          lastActivityAt: true,
          integrityLevel: true,
          integrityReviewedAt: true,
          student: { select: { fullName: true, email: true } },
          _count: { select: { answers: true } },
        },
      },
    },
  });
  const isLive = (exam: { startsAt: Date | null; endsAt: Date | null }) => Boolean(exam.startsAt && exam.startsAt <= now && exam.endsAt && exam.endsAt > now);
  const selectable = exams.filter((exam) => {
    const matchesView =
      view === "all" ||
      (view === "live" && isLive(exam)) ||
      (view === "attention" && exam.attempts.some((attempt) => opsStateOf(attempt, now) === "DISCONNECTED"));
    const matchesQuery =
      !query ||
      exam.title.toLocaleLowerCase("tr-TR").includes(query) ||
      exam.attempts.some((attempt) => (attempt.student.fullName || attempt.student.email).toLocaleLowerCase("tr-TR").includes(query));
    return matchesView && matchesQuery;
  });
  const selected = selectable.find((exam) => exam.id === params.deneme) ?? selectable.find(isLive) ?? selectable[0] ?? null;
  const counters = selected ? opsCounters(selected.attempts, selected._count.assignments, now) : null;
  const rows = selected
    ? selected.attempts
        .filter((attempt) => opsAttemptMatches(attempt, filters, now))
        .filter((attempt) => !query || selected.title.toLocaleLowerCase("tr-TR").includes(query) || (attempt.student.fullName || attempt.student.email).toLocaleLowerCase("tr-TR").includes(query))
        .sort((a, b) => Number(opsStateOf(b, now) === "DISCONNECTED") - Number(opsStateOf(a, now) === "DISCONNECTED"))
    : [];
  const alerts = selected
    ? selected.attempts.filter((attempt) => opsStateOf(attempt, now) === "DISCONNECTED" || (attempt.integrityLevel !== "NORMAL" && !attempt.integrityReviewedAt))
    : [];
  return { now, query, view, filters, exams, selectable, selected, counters, rows, alerts, isLive };
}

/** Kayıt yan paneli: yalnız konsolun izlediği bir denemenin kaydı (son 60 olay). */
export async function loadOdkOpsAttempt(attemptId: string, now = new Date()) {
  const attempt = await prisma.odkExamAttempt.findFirst({
    where: { id: attemptId, status: { not: "VOID" }, exam: opsExamWindow(now) },
    select: {
      id: true,
      status: true,
      lastActivityAt: true,
      deadlineAt: true,
      integrityLevel: true,
      integrityReviewedAt: true,
      student: { select: { fullName: true, email: true } },
      exam: { select: { id: true, title: true } },
      _count: { select: { answers: true } },
      events: { orderBy: { sequence: "desc" }, take: 60, select: { id: true, type: true, sequence: true, serverOccurredAt: true } },
    },
  });
  return attempt;
}

/** İnceleme yazması için kaydın sürümü: durum + inceleme anı (mobil `expectedRevision`). */
export function attemptReviewRevision(attempt: { id: string; status: string; integrityLevel: string; integrityReviewedAt: Date | null }) {
  return operationDigest({ id: attempt.id, status: attempt.status, integrityLevel: attempt.integrityLevel, integrityReviewedAt: attempt.integrityReviewedAt?.toISOString() ?? null });
}

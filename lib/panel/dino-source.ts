import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { looksLikePromptInjection, redactSensitiveText } from "@/lib/teacher-ai";
import { netScore } from "@/lib/goals";
import {
  DINO_MAX_SOURCE_CHARS,
  DINO_MAX_SOURCES,
  type DinoAudience,
  type DinoQuestion,
  type DinoScope,
  type DinoSourceRow,
  type SafeDinoSource,
} from "@/lib/dino";
import { filterSourcesForAudience } from "@/lib/panel/dino-allowlist";
import { PLAN_REASON_LABELS } from "@/lib/panel/dino-explanations";
import { getTeacherAttentionInbox } from "@/lib/panel/teacher-attention-server";

/**
 * DINO AI — rol-aware context builder.
 *
 * İki kural:
 *  1. KAPSAM: hangi öğrencinin / grubun verisi toplanacağı çağıranın yetkisinden
 *     türetilir. İstek gövdesindeki kimlik doğrudan kullanılmaz.
 *  2. ROL GÖRÜNÜRLÜĞÜ: panelde görülemeyen veri modele girmez. Allowlist +
 *     deny kategorileri `dino-allowlist.ts` içinde.
 *
 * Deterministic-before-AI: her collector yapılandırılmış Türkçe satırlar üretir;
 * ham satır dump'ı gönderilmez. `privateNote`, ödeme, diğer öğrenciler (öğretmen
 * attention hariç kendi roster'ı), admin-only risk meta ve veli-özel serbest
 * metin hiçbir rolde toplanmaz.
 */

const DAY_MS = 86_400_000;
const NUM = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

function compact(value: string | null | undefined, max = DINO_MAX_SOURCE_CHARS) {
  return (
    value
      ?.replace(/[\x00-\x1F\x7F]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max) || ""
  );
}

type Collected = { id: string; label: string; text: string };

async function collectWeek(studentProfileId: string): Promise<Collected[]> {
  const since = new Date(Date.now() - 14 * DAY_MS);
  const [attendances, plans, assignments] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId: studentProfileId, lesson: { startsAt: { gte: since } } },
      select: { status: true },
    }),
    prisma.weeklyPlan.findMany({
      where: { studentId: studentProfileId },
      orderBy: { weekStart: "desc" },
      take: 2,
      select: {
        tasks: { where: { status: { not: "SKIPPED" } }, select: { status: true, title: true } },
      },
    }),
    prisma.assignmentProgress.findMany({
      where: { studentId: studentProfileId, updatedAt: { gte: since } },
      select: { status: true, assignment: { select: { dueAt: true } } },
    }),
  ]);

  const rows: Collected[] = [];
  if (attendances.length) {
    const present = attendances.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
    rows.push({
      id: "ATTENDANCE",
      label: "Son iki haftanın ders katılımı",
      text: `${attendances.length} dersin ${present} tanesine katıldı.`,
    });
  }

  const tasks = plans.flatMap((p) => p.tasks);
  if (tasks.length) {
    const done = tasks.filter((t) => t.status === "DONE").length;
    const pending = tasks.filter((t) => t.status !== "DONE").map((t) => compact(t.title, 60));
    rows.push({
      id: "PLAN_TASKS",
      label: "Haftalık plan görevleri",
      text: `${tasks.length} görevin ${done} tanesi tamamlandı.${
        pending.length ? ` Tamamlanmayanlar: ${pending.slice(0, 4).join(", ")}.` : ""
      }`,
    });
  }

  if (assignments.length) {
    const done = assignments.filter((a) => a.status === "DONE").length;
    const now = Date.now();
    const overdue = assignments.filter(
      (a) => a.status !== "DONE" && a.assignment.dueAt && a.assignment.dueAt.getTime() < now,
    ).length;
    rows.push({
      id: "ASSIGNMENTS",
      label: "Ödev geçmişi",
      text:
        overdue > 0
          ? `Son iki haftada ${assignments.length} ödevden ${done} tamamlandı; ${overdue} tanesi gecikmiş.`
          : `${assignments.length} çalışmanın ${done} tanesi tamamlandı.`,
    });
  }
  return rows;
}

async function collectLastExam(studentProfileId: string): Promise<Collected[]> {
  const exams = await prisma.mockExam.findMany({
    where: { studentId: studentProfileId },
    orderBy: { takenAt: "desc" },
    take: 2,
    select: {
      title: true,
      takenAt: true,
      sections: {
        select: { subjectName: true, correctCount: true, incorrectCount: true },
        orderBy: { position: "asc" },
      },
    },
  });
  const latest = exams[0];
  if (!latest || latest.sections.length === 0) return [];

  const parts = latest.sections.map(
    (s) =>
      `${compact(s.subjectName, 40)} ${NUM.format(netScore(s.correctCount, s.incorrectCount))} net`,
  );
  const rows: Collected[] = [
    {
      id: "LAST_EXAM",
      label: "Son deneme",
      text: `${compact(latest.title ?? "Deneme", 80)} · ${parts.join(", ")}.`,
    },
  ];

  const previous = exams[1];
  if (previous?.sections.length) {
    const latestTotal = latest.sections.reduce(
      (sum, s) => sum + netScore(s.correctCount, s.incorrectCount),
      0,
    );
    const previousTotal = previous.sections.reduce(
      (sum, s) => sum + netScore(s.correctCount, s.incorrectCount),
      0,
    );
    const delta = Math.round((latestTotal - previousTotal) * 100) / 100;
    rows.push({
      id: "EXAM_DELTA",
      label: "Deneme değişimi",
      text: `Önceki denemeye göre toplam net ${NUM.format(previousTotal)} → ${NUM.format(latestTotal)} (${delta >= 0 ? "+" : ""}${NUM.format(delta)}).`,
    });
  }
  return rows;
}

async function collectCoaching(studentProfileId: string): Promise<Collected[]> {
  const [assignment, goals] = await Promise.all([
    prisma.coachAssignment.findFirst({
      where: { studentId: studentProfileId, endedAt: null },
      select: {
        sessions: {
          where: { status: "COMPLETED" },
          orderBy: { completedAt: "desc" },
          take: 1,
          select: { focus: true, sharedNote: true },
        },
      },
    }),
    prisma.studentGoal.findMany({
      where: { studentId: studentProfileId, archivedAt: null },
      select: { kind: true, subjectName: true, targetValue: true },
    }),
  ]);

  const rows: Collected[] = [];
  const last = assignment?.sessions[0];
  if (last?.focus) {
    rows.push({
      id: "COACH_FOCUS",
      label: "Koçun belirlediği haftalık odak",
      text: compact(last.focus),
    });
  }
  if (last?.sharedNote) {
    rows.push({ id: "COACH_NOTE", label: "Koçun paylaştığı not", text: compact(last.sharedNote) });
  }
  if (goals.length) {
    rows.push({
      id: "GOALS",
      label: "Belirlenen hedefler",
      text: goals
        .map((g) =>
          g.kind === "SUBJECT_NET"
            ? `${compact(g.subjectName, 40)} neti ${NUM.format(g.targetValue)}`
            : `plan tamamlama %${NUM.format(g.targetValue)}`,
        )
        .join(", "),
    });
  }
  return rows;
}

async function collectPlan(studentProfileId: string): Promise<Collected[]> {
  const plan = await prisma.weeklyPlan.findFirst({
    where: { studentId: studentProfileId },
    orderBy: { weekStart: "desc" },
    select: {
      version: true,
      status: true,
      changeRequestCategory: true,
      capacityMinutes: true,
      tasks: {
        where: { status: { not: "SKIPPED" } },
        orderBy: [{ scheduledFor: "asc" }, { position: "asc" }],
        take: 12,
        select: { title: true, reasonCode: true, sourceType: true, status: true },
      },
    },
  });
  if (!plan) return [];

  const rows: Collected[] = [];
  const done = plan.tasks.filter((t) => t.status === "DONE").length;
  rows.push({
    id: "PLAN_TASKS",
    label: "Haftalık plan",
    text: `Durum ${plan.status}, sürüm ${plan.version}, kapasite ${plan.capacityMinutes} dk · ${plan.tasks.length} görevin ${done} tanesi tamamlandı.`,
  });

  const reasonCounts = new Map<string, number>();
  for (const task of plan.tasks) {
    reasonCounts.set(task.reasonCode, (reasonCounts.get(task.reasonCode) || 0) + 1);
  }
  const topReasons = [...reasonCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([code, count]) => `${PLAN_REASON_LABELS[code] || code} (${count})`);
  if (topReasons.length) {
    rows.push({
      id: "PLAN_REASONS",
      label: "Plan gerekçeleri",
      text: topReasons.join("; ") + (plan.changeRequestCategory ? `. Değişiklik talebi: ${plan.changeRequestCategory}.` : "."),
    });
  }

  const pendingTitles = plan.tasks
    .filter((t) => t.status !== "DONE")
    .slice(0, 4)
    .map((t) => compact(t.title, 50));
  if (pendingTitles.length && rows[0]) {
    rows[0] = {
      ...rows[0],
      text: `${rows[0].text} Sıradaki: ${pendingTitles.join(", ")}.`,
    };
  }
  return rows;
}

async function collectReview(studentProfileId: string): Promise<Collected[]> {
  const now = new Date();
  const items = await prisma.reviewItem.findMany({
    where: { studentId: studentProfileId, status: "ACTIVE" },
    orderBy: { dueAt: "asc" },
    take: 8,
    select: {
      title: true,
      dueAt: true,
      sourceReference: true,
      outcome: { select: { code: true, title: true } },
    },
  });
  if (!items.length) return [];

  const due = items.filter((item) => item.dueAt.getTime() <= now.getTime());
  const titles = items.slice(0, 5).map((item) => {
    if (item.outcome) return compact(`${item.outcome.code} ${item.outcome.title}`, 70);
    return compact(item.title, 70);
  });

  return [
    {
      id: "REVIEW_QUEUE",
      label: "Tekrar kuyruğu",
      text: `${items.length} aktif tekrar maddesi; ${due.length} tanesinin vadesi gelmiş. Örnekler: ${titles.join(", ")}.`,
    },
  ];
}

async function collectOutcomes(studentProfileId: string): Promise<Collected[]> {
  const reviews = await prisma.reviewItem.findMany({
    where: {
      studentId: studentProfileId,
      status: "ACTIVE",
      outcomeId: { not: null },
    },
    orderBy: { dueAt: "asc" },
    take: 6,
    select: {
      title: true,
      outcome: { select: { code: true, title: true } },
    },
  });
  if (!reviews.length) return [];

  return reviews.slice(0, 4).map((item, index) => ({
    id: `OUTCOME_${index + 1}`,
    label: "Kazanım tekrarı",
    text: item.outcome
      ? `${compact(item.outcome.code, 20)} · ${compact(item.outcome.title, 80)}`
      : compact(item.title, 100),
  }));
}

async function collectSubjectTrend(studentProfileId: string): Promise<Collected[]> {
  const exams = await prisma.mockExam.findMany({
    where: { studentId: studentProfileId },
    orderBy: { takenAt: "desc" },
    take: 4,
    select: {
      sections: {
        select: { subjectName: true, correctCount: true, incorrectCount: true },
      },
    },
  });
  if (exams.length < 2) {
    const reviewRows = await collectOutcomes(studentProfileId);
    return reviewRows.length
      ? reviewRows
      : [];
  }

  const bySubject = new Map<string, number[]>();
  for (const exam of [...exams].reverse()) {
    const nets = new Map<string, number>();
    for (const section of exam.sections) {
      const name = compact(section.subjectName, 40) || "Ders";
      nets.set(name, (nets.get(name) || 0) + netScore(section.correctCount, section.incorrectCount));
    }
    for (const [subject, value] of nets) {
      const list = bySubject.get(subject) || [];
      list.push(value);
      bySubject.set(subject, list);
    }
  }

  const declining: Collected[] = [];
  let index = 0;
  for (const [subject, nets] of bySubject) {
    if (nets.length < 2) continue;
    const previous = nets[nets.length - 2]!;
    const latest = nets[nets.length - 1]!;
    if (latest - previous > -1.5) continue;
    index += 1;
    declining.push({
      id: `SUBJECT_${index}`,
      label: "Ders eğilimi",
      text: `${subject} neti ${NUM.format(previous)} → ${NUM.format(latest)} (düşüş ${NUM.format(previous - latest)}).`,
    });
  }

  if (!declining.length) {
    const steady = [...bySubject.entries()].slice(0, 3).map(([subject, nets], i) => {
      const latest = nets[nets.length - 1]!;
      return {
        id: `SUBJECT_${i + 1}`,
        label: "Ders eğilimi",
        text: `${subject} son ölçüm ${NUM.format(latest)} net; belirgin düşüş yok.`,
      };
    });
    return steady;
  }
  return declining.slice(0, 4);
}

async function collectTeacherOnly(
  studentProfileId: string,
  teacherUserId: string,
): Promise<Collected[]> {
  const notes = await prisma.lessonNote.findMany({
    where: { studentId: studentProfileId, lesson: { teacherId: teacherUserId } },
    orderBy: { updatedAt: "desc" },
    take: 2,
    select: { topic: true, note: true, nextGoal: true },
  });
  return notes.flatMap((note, index) => {
    const text = compact([note.topic, note.note, note.nextGoal].filter(Boolean).join(" · "));
    return text ? [{ id: `TEACHER_NOTE_${index + 1}`, label: "Kendi ders notun", text }] : [];
  });
}

async function collectTeacherInterventions(
  studentProfileId: string,
  teacherUserId: string,
): Promise<Collected[]> {
  const cases = await prisma.interventionCase.findMany({
    where: {
      studentId: studentProfileId,
      status: { in: ["OPEN", "IN_PROGRESS"] },
      OR: [
        { ownerId: teacherUserId },
        {
          student: {
            enrollments: {
              some: { endedAt: null, group: { teacherId: teacherUserId, isActive: true } },
            },
          },
        },
      ],
    },
    orderBy: { dueAt: "asc" },
    take: 3,
    select: { explanation: true, reasonCode: true },
  });
  return cases.flatMap((item, index) => {
    const text = compact(item.explanation || item.reasonCode, 200);
    return text
      ? [{ id: `INTERVENTION_${index + 1}`, label: "Açık müdahale gerekçesi", text }]
      : [];
  });
}

async function collectTeacherAttention(teacherUserId: string): Promise<Collected[]> {
  const inbox = await getTeacherAttentionInbox(teacherUserId);
  if (!inbox.rows.length) {
    return [
      {
        id: "ATTENTION",
        label: "Öğretmen dikkat kutusu",
        text: "Bugün dikkat gerektiren açık bir öğrenci sinyali yok.",
      },
    ];
  }

  const top = inbox.rows.slice(0, 5).map((row, index) => ({
    id: `ATTENTION_${index + 1}`,
    label: "Dikkat maddesi",
    text: compact(
      `${row.studentName || "Öğrenci"} · ${row.headline} · ${row.reason}`,
      DINO_MAX_SOURCE_CHARS,
    ),
  }));

  return [
    {
      id: "ATTENTION",
      label: "Öğretmen dikkat kutusu",
      text: `${inbox.totalRowCount} sinyalden ${inbox.rows.length} tanesi görünür; ${inbox.scopedStudentCount} kapsamlı öğrenci.`,
    },
    ...top,
  ];
}

async function collectGroupWeek(teacherUserId: string): Promise<Collected[]> {
  const since = new Date(Date.now() - 14 * DAY_MS);
  const groups = await prisma.group.findMany({
    where: { teacherId: teacherUserId, isActive: true },
    select: {
      name: true,
      enrollments: {
        where: { endedAt: null },
        select: { studentId: true },
      },
    },
  });
  const studentIds = [...new Set(groups.flatMap((g) => g.enrollments.map((e) => e.studentId)))];
  if (!studentIds.length) {
    return [{ id: "GROUP_SUMMARY", label: "Grup özeti", text: "Aktif grup öğrencisi yok." }];
  }

  const [attendances, overdueAssignments, plans] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId: { in: studentIds }, lesson: { startsAt: { gte: since }, teacherId: teacherUserId } },
      select: { status: true },
    }),
    prisma.assignmentProgress.count({
      where: {
        studentId: { in: studentIds },
        status: { not: "DONE" },
        assignment: {
          dueAt: { lt: new Date() },
          group: { teacherId: teacherUserId, isActive: true },
        },
      },
    }),
    prisma.weeklyPlan.findMany({
      where: { studentId: { in: studentIds }, weekStart: { gte: since } },
      select: {
        tasks: { where: { status: { not: "SKIPPED" } }, select: { status: true } },
      },
    }),
  ]);

  const present = attendances.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const tasks = plans.flatMap((p) => p.tasks);
  const done = tasks.filter((t) => t.status === "DONE").length;
  const groupNames = groups.map((g) => compact(g.name, 40)).filter(Boolean).slice(0, 4);

  return [
    {
      id: "GROUP_SUMMARY",
      label: "Grup özeti",
      text: `${groupNames.join(", ") || "Gruplar"} · ${studentIds.length} öğrenci · son iki haftada ${attendances.length} yoklama kaydının ${present} tanesi katılım.`,
    },
    {
      id: "ASSIGNMENTS",
      label: "Ödev geçmişi",
      text: overdueAssignments
        ? `Kapsamdaki öğrencilerde ${overdueAssignments} gecikmiş ödev kaydı var.`
        : "Kapsamdaki öğrencilerde gecikmiş ödev kaydı yok.",
    },
    ...(tasks.length
      ? [
          {
            id: "PLAN_TASKS",
            label: "Haftalık plan görevleri",
            text: `${tasks.length} plan görevinin ${done} tanesi tamamlandı.`,
          },
        ]
      : []),
  ];
}

async function collectMeetingDraft(
  studentProfileId: string,
  teacherUserId: string,
): Promise<Collected[]> {
  const [week, coaching, teacherNotes, interventions] = await Promise.all([
    collectWeek(studentProfileId),
    collectCoaching(studentProfileId),
    collectTeacherOnly(studentProfileId, teacherUserId),
    collectTeacherInterventions(studentProfileId, teacherUserId),
  ]);
  return [...week, ...coaching, ...teacherNotes, ...interventions];
}

async function collectByScope(
  scope: DinoScope,
  studentProfileId: string | null,
  teacherUserId: string | undefined,
): Promise<Collected[]> {
  if (scope === "TEACHER_ATTENTION") {
    if (!teacherUserId) return [];
    return collectTeacherAttention(teacherUserId);
  }
  if (scope === "GROUP_WEEK") {
    if (!teacherUserId) return [];
    return collectGroupWeek(teacherUserId);
  }
  if (!studentProfileId) return [];

  if (scope === "WEEK") return collectWeek(studentProfileId);
  if (scope === "LAST_EXAM") return collectLastExam(studentProfileId);
  if (scope === "COACHING") return collectCoaching(studentProfileId);
  if (scope === "PLAN") return collectPlan(studentProfileId);
  if (scope === "REVIEW") {
    const [review, outcomes] = await Promise.all([
      collectReview(studentProfileId),
      collectOutcomes(studentProfileId),
    ]);
    return [...review, ...outcomes];
  }
  if (scope === "OUTCOMES") return collectOutcomes(studentProfileId);
  if (scope === "SUBJECT_TREND") {
    const [trend, exam] = await Promise.all([
      collectSubjectTrend(studentProfileId),
      collectLastExam(studentProfileId),
    ]);
    return [...trend, ...exam.filter((row) => row.id === "EXAM_DELTA" || row.id === "LAST_EXAM")];
  }
  if (scope === "MEETING_DRAFT") {
    if (!teacherUserId) return collectCoaching(studentProfileId);
    return collectMeetingDraft(studentProfileId, teacherUserId);
  }
  return collectCoaching(studentProfileId);
}

export type PreparedDinoSource = {
  safe: SafeDinoSource;
  sourceHash: string;
  redactionCount: number;
  injectionDetected: boolean;
};

/**
 * Soruya ve role göre kaynakları toplar, allowlist uygular, redakte eder ve imzalar.
 */
export async function prepareDinoSource(input: {
  question: DinoQuestion;
  audience: DinoAudience;
  studentProfileId: string | null;
  teacherUserId?: string;
  knownNames: string[];
}): Promise<PreparedDinoSource> {
  const { question, audience, studentProfileId } = input;

  let collected = await collectByScope(question.scope, studentProfileId, input.teacherUserId);

  // Öğretmenin kendi notları yalnız öğretmene; veliye/öğrenciye değil.
  if (
    audience === "TEACHER" &&
    input.teacherUserId &&
    studentProfileId &&
    question.scope !== "TEACHER_ATTENTION" &&
    question.scope !== "GROUP_WEEK" &&
    question.scope !== "MEETING_DRAFT"
  ) {
    collected = collected.concat(await collectTeacherOnly(studentProfileId, input.teacherUserId));
  }

  if (audience === "TEACHER" && input.teacherUserId && studentProfileId && question.scope === "WEEK") {
    collected = collected.concat(
      await collectTeacherInterventions(studentProfileId, input.teacherUserId),
    );
  }

  // Deduplicate by id+text while preserving order, then apply role allowlist.
  const seen = new Set<string>();
  const unique = collected.filter((row) => {
    const key = `${row.id}:${row.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const allowed = filterSourcesForAudience(unique, audience);

  let redactionCount = 0;
  let injectionDetected = false;
  const sources: DinoSourceRow[] = [];
  for (const row of allowed.slice(0, DINO_MAX_SOURCES)) {
    const text = compact(row.text, DINO_MAX_SOURCE_CHARS);
    if (!text) continue;
    if (looksLikePromptInjection(text)) injectionDetected = true;
    const redacted = redactSensitiveText(text, input.knownNames);
    redactionCount += redacted.redactionCount;
    sources.push({ id: row.id, label: row.label, text: redacted.text });
  }

  const safe: SafeDinoSource = {
    audience,
    questionKey: question.key,
    questionLabel: question.label,
    sources,
  };
  const sourceHash = createHash("sha256").update(JSON.stringify(safe)).digest("hex");
  return { safe, sourceHash, redactionCount, injectionDetected };
}

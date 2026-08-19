import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { looksLikePromptInjection, redactSensitiveText } from "@/lib/teacher-ai";
import { netScore } from "@/lib/goals";
import type { DinoAudience, DinoQuestion, DinoSourceRow, SafeDinoSource } from "@/lib/dino";

/**
 * DINO AI — kaynak toplama.
 *
 * Bu dosya Dino'nun güvenlik sınırıdır. İki kural:
 *
 *  1. KAPSAM: hangi öğrencinin verisi toplanacağı ÇAĞIRANIN yetkisinden
 *     türetilir (öğrenci = kendisi, veli = `parent-scope`, eğitmen =
 *     `teacher-scope`). Buraya dışarıdan gelen bir kimlik doğrudan kullanılmaz.
 *
 *  2. ROL GÖRÜNÜRLÜĞÜ: bir rolün panelde göremediği veri Dino'ya da GİRMEZ.
 *     Öğretmenin öğrenciye özel notu ve koçun özel görüşme notu; veliye de,
 *     öğrenciye de gitmez — bu yüzden aşağıda yalnız ÖĞRETMEN dalında
 *     toplanır. Modelin özetleyip sızdırma ihtimali, veriyi hiç göndermeyerek
 *     ortadan kaldırılır.
 *
 * Toplanan her satır gönderilmeden önce redaksiyondan geçer (e-posta, telefon,
 * TC, bağlantı, bilinen öğrenci adları) ve prompt injection için taranır.
 */

const DAY_MS = 86_400_000;

/** Kontrol karakterlerini temizler ve boşlukları tekilleştirir. */
function compact(value: string | null | undefined, max = 400) {
  return (
    value
      ?.replace(/[\x00-\x1F\x7F]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max) || ""
  );
}

const NUM = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

type Collected = { id: string; label: string; text: string };

/** Haftalık sinyaller: ders katılımı ve plan görevleri (her rol için güvenli). */
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
      select: { status: true },
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
    rows.push({
      id: "ASSIGNMENTS",
      label: "Ders çalışmaları",
      text: `${assignments.length} çalışmanın ${done} tanesi tamamlandı.`,
    });
  }
  return rows;
}

/** Son denemenin ders bazında netleri. */
async function collectLastExam(studentProfileId: string): Promise<Collected[]> {
  const exam = await prisma.mockExam.findFirst({
    where: { studentId: studentProfileId },
    orderBy: { takenAt: "desc" },
    select: {
      title: true,
      sections: {
        select: { subjectName: true, correctCount: true, incorrectCount: true },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!exam || exam.sections.length === 0) return [];

  const parts = exam.sections.map(
    (s) =>
      `${compact(s.subjectName, 40)} ${NUM.format(netScore(s.correctCount, s.incorrectCount))} net`,
  );
  return [
    {
      id: "LAST_EXAM",
      label: "Son deneme",
      text: `${compact(exam.title ?? "Deneme", 80)} · ${parts.join(", ")}.`,
    },
  ];
}

/**
 * Koçluk sinyalleri.
 *
 * `privateNote` HİÇBİR rolde toplanmaz — koçun kendi ekranında zaten görünür,
 * modele gönderilmesi için bir sebep yok ve gönderilmediği sürece özetlenip
 * sızma ihtimali de yoktur.
 */
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

/** Yalnız EĞİTMEN dalında: öğretmenin kendi ders notları. */
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

export type PreparedDinoSource = {
  safe: SafeDinoSource;
  sourceHash: string;
  redactionCount: number;
  injectionDetected: boolean;
};

/**
 * Soruya ve role göre kaynakları toplar, redakte eder ve imzalar.
 *
 * `knownNames` öğrencinin ve velisinin adlarıdır; metin içinde geçerlerse
 * çıkarılır ki dış modele kişi adı gitmesin.
 */
export async function prepareDinoSource(input: {
  question: DinoQuestion;
  audience: DinoAudience;
  studentProfileId: string;
  /** Yalnız TEACHER dalında doludur. */
  teacherUserId?: string;
  knownNames: string[];
}): Promise<PreparedDinoSource> {
  const { question, audience, studentProfileId } = input;

  let collected: Collected[] = [];
  if (question.scope === "WEEK") collected = await collectWeek(studentProfileId);
  else if (question.scope === "LAST_EXAM") collected = await collectLastExam(studentProfileId);
  else collected = await collectCoaching(studentProfileId);

  // Öğretmenin kendi notları YALNIZ öğretmene; veliye ve öğrenciye değil.
  if (audience === "TEACHER" && input.teacherUserId) {
    collected = collected.concat(await collectTeacherOnly(studentProfileId, input.teacherUserId));
  }

  let redactionCount = 0;
  let injectionDetected = false;
  const sources: DinoSourceRow[] = [];
  for (const row of collected) {
    const text = compact(row.text);
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

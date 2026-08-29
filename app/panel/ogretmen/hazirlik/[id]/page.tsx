import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { planningWeekStart } from "@/lib/adaptive-plan";
import { addIstanbulCalendarDays } from "@/lib/istanbul-time";
import { resolveTeacherStudent } from "@/lib/panel/teacher-scope";
import { findCoachAssignmentForCoach, getStudentCoaching } from "@/lib/panel/coaching";
import { getStudentExamSubjects, getStudentGoals } from "@/lib/panel/goals";
import { recordCoachingSession, setStudentGoal } from "./actions";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelCard, PanelCardTitle, PanelHeading } from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/**
 * EĞİTMEN · KOÇ GÖRÜŞME HAZIRLIĞI — onaylı tasarım (Panel.dc.html → ePrep).
 *
 * Tasarımın amacı: koç görüşmeye girmeden önce "geçen hafta ne oldu, hangi
 * sinyaller var" sorusunu TEK ekranda cevaplamak.
 *
 * TASARIMDAN BİLİNÇLİ SAPMALAR (§27 — gerçek ürün davranışı görsel
 * birebirliğin önünde):
 *
 *  1. "Dino'nun hazırlık özeti" YOK. Mevcut AI kapısı yalnız ödev/mini test
 *     taslağı üretir; koçluk özeti üretmez. Uydurma AI metni yazılmaz.
 *
 * Görüşme kaydı (`CoachingSession`) artık gerçektir: koç görüşmeyi tamamlandı
 * işaretler, haftanın odağını ve iki ayrı notu yazar. Bu ekran ilk yazıldığında
 * şemada görüşme modeli yoktu ve düğme bilinçli olarak konmamıştı.
 *
 * GÜVENLİK: öğrenci `resolveTeacherStudent` ile çözülür — kapsam dışı 404.
 */

const DAY = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });

export default async function CoachPrepPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("TEACHER");
  if (!getPanelFeatureFlags().adaptivePlan) notFound();

  const { id } = await params;
  const student = await resolveTeacherStudent(session.userId, id);
  const groupIds = student.groups.map((g) => g.id);

  /* Geçen haftanın planı — planlama haftasının bir öncesi. */
  const thisWeek = planningWeekStart();
  const lastWeek = new Date(thisWeek.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [lastPlan, currentPlan, notes, attendances, examSections, coaching, assignment] =
    await Promise.all([
    prisma.weeklyPlan.findFirst({
      where: { studentId: student.id, weekStart: { gte: lastWeek, lt: thisWeek } },
      orderBy: { weekStart: "asc" },
      select: {
        tasks: {
          where: { status: { not: "SKIPPED" } },
          select: { title: true, status: true },
          orderBy: { scheduledFor: "asc" },
        },
      },
    }),
    prisma.weeklyPlan.findFirst({
      where: {
        studentId: student.id,
        weekStart: { gte: thisWeek, lt: addIstanbulCalendarDays(thisWeek, 7) },
      },
      orderBy: { weekStart: "asc" },
      select: { id: true, status: true },
    }),
    prisma.lessonNote.findMany({
      where: { studentId: student.id, lesson: { teacherId: session.userId } },
      select: { note: true, topic: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 2,
    }),
    prisma.attendance.findMany({
      where: { studentId: student.id, lesson: { groupId: { in: groupIds } } },
      select: { status: true },
      orderBy: { lesson: { startsAt: "desc" } },
      take: 6,
    }),
    prisma.mockExamSection.findMany({
      where: { mockExam: { studentId: student.id } },
      select: {
        subjectName: true,
        correctCount: true,
        incorrectCount: true,
        mockExam: { select: { takenAt: true } },
      },
      orderBy: { mockExam: { takenAt: "desc" } },
      take: 4,
    }),
    getStudentCoaching(student.id),
    findCoachAssignmentForCoach(session.userId, student.id),
  ]);

  /* Hedefler yalnız atanmış koç için anlamlı; kapsam dışıysa hiç sorgulanmaz. */
  const [goals, examSubjects] = assignment
    ? await Promise.all([getStudentGoals(student.id), getStudentExamSubjects(student.id)])
    : [[], []];

  const tasks = lastPlan?.tasks ?? [];
  const done = tasks.filter((t) => t.status === "DONE");
  const pending = tasks.filter((t) => t.status !== "DONE");
  const pct = tasks.length ? Math.round((done.length / tasks.length) * 100) : null;
  const attended = attendances.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE",
  ).length;

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Koç görüşme hazırlığı"
    >
      <div className="max-w-[900px]">
        <PanelHeading eyebrow="Koçluk · görüşme hazırlığı" title={student.name} />

        <div className="mt-[22px] grid gap-5 md:grid-cols-2">
          <PanelCard>
            <PanelCardTitle>Geçen haftanın planı</PanelCardTitle>
            {tasks.length === 0 ? (
              <p className="mt-3 text-[13.5px] leading-[1.7] text-dc-ink-muted">
                {DAY.format(lastWeek)} haftası için kayıtlı plan görevi yok.
              </p>
            ) : (
              <>
                <div
                  role="progressbar"
                  aria-valuenow={pct ?? 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Geçen hafta plan tamamlama"
                  className="mt-3 h-2 overflow-hidden rounded-full bg-dc-line-soft"
                >
                  <div className="h-full rounded-full bg-dc-brand" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-[13px] text-dc-ink-muted">
                  {done.length} / {tasks.length} görev tamamlandı
                </p>
                <div className="mt-3.5 text-[13.5px] leading-[1.9] text-dc-ink-body">
                  {done.length ? (
                    <p>Tamamlanan: {done.map((t) => t.title).join(", ")}</p>
                  ) : null}
                  {pending.length ? (
                    <p className="text-[#A5764A]">
                      Yapılmayan: {pending.map((t) => t.title).join(", ")}
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </PanelCard>

          <PanelCard>
            <PanelCardTitle>Ders ve deneme sinyalleri</PanelCardTitle>
            <div className="mt-3 flex flex-col gap-1.5 text-[13.5px] leading-[1.8] text-dc-ink-body">
              {notes.length === 0 && examSections.length === 0 && attendances.length === 0 ? (
                <p className="text-dc-ink-muted">
                  Bu öğrenci için henüz ders veya deneme sinyali birikmedi.
                </p>
              ) : null}

              {notes
                .filter((n) => n.note)
                .map((n, i) => (
                  <p key={i}>
                    Öğretmen notu ({DAY.format(n.updatedAt)}): {n.note}
                  </p>
                ))}

              {examSections.length ? (
                <p>
                  Son deneme:{" "}
                  {examSections
                    .slice(0, 2)
                    .map(
                      (s) =>
                        `${s.subjectName} ${(s.correctCount - s.incorrectCount / 4)
                          .toFixed(2)
                          .replace(".", ",")} net`,
                    )
                    .join(" · ")}
                </p>
              ) : null}

              {attendances.length ? (
                <p>
                  Katılım: son {attendances.length} dersin {attended} tanesine katıldı.
                </p>
              ) : null}
            </div>
          </PanelCard>
        </div>

        {assignment ? (
          <PanelCard className="mt-5">
            <PanelCardTitle>Görüşmeyi kaydet</PanelCardTitle>
            <p className="mt-1.5 text-[13.5px] text-dc-ink-muted">
              {coaching?.nextScheduledAt
                ? `Planlanan görüşme: ${DAY.format(coaching.nextScheduledAt)}`
                : "Planlanmış görüşme yok; kayıt bugünün görüşmesi olarak eklenir."}
            </p>
            <form action={recordCoachingSession} className="mt-4 flex flex-col gap-3.5">
              <input type="hidden" name="studentId" value={student.id} />

              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] text-dc-ink-faint">Haftanın odağı</span>
                <input
                  name="focus"
                  maxLength={300}
                  placeholder="Örn. yüzde–oran ve geometri temelleri"
                  className="rounded-[10px] border border-[#DDE4E0] bg-[#FCFDFC] px-3.5 py-3 text-[14.5px] text-dc-ink"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] text-dc-ink-faint">
                  Koç notu — öğrenciye ve veliye görünür
                </span>
                <textarea
                  name="sharedNote"
                  rows={3}
                  maxLength={4000}
                  className="rounded-[10px] border border-[#DDE4E0] bg-[#FCFDFC] px-3.5 py-3 text-[14.5px] leading-[1.6] text-dc-ink"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] text-dc-ink-faint">
                  Özel not — yalnız sana ve yöneticiye görünür
                </span>
                <textarea
                  name="privateNote"
                  rows={2}
                  maxLength={4000}
                  className="rounded-[10px] border border-[#DDE4E0] bg-[#FCFDFC] px-3.5 py-3 text-[14.5px] leading-[1.6] text-dc-ink"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] text-dc-ink-faint">
                  Sonraki görüşme{assignment.cadenceDays ? " (boş bırakılırsa sıklıktan hesaplanır)" : ""}
                </span>
                <input
                  type="datetime-local"
                  name="nextAt"
                  className="w-fit rounded-[10px] border border-[#DDE4E0] bg-white px-3.5 py-2.5 text-[14px] text-dc-ink"
                />
              </label>

              <button
                type="submit"
                className="w-fit rounded-[10px] bg-dc-brand px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-dc-brand-hover"
              >
                Görüşmeyi tamamlandı işaretle
              </button>
            </form>
          </PanelCard>
        ) : null}

        {assignment ? (
          <PanelCard className="mt-5">
            <PanelCardTitle>Hedefler</PanelCardTitle>
            {goals.length === 0 ? (
              <p className="mt-2 text-[13.5px] text-dc-ink-muted">
                Bu öğrenci için henüz hedef belirlenmedi.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2 text-[14px] text-dc-ink-body">
                {goals.map((g) => (
                  <li key={g.id} className="flex flex-wrap justify-between gap-2">
                    <span className="font-medium">{g.label}</span>
                    <span className="text-dc-ink-muted">
                      {g.current === null
                        ? "ölçüm yok"
                        : g.kind === "PLAN_COMPLETION"
                          ? `şimdi %${g.current}`
                          : `şimdi ${g.current.toFixed(2).replace(".", ",")}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <form action={setStudentGoal} className="mt-4 flex flex-wrap items-end gap-2.5">
              <input type="hidden" name="studentId" value={student.id} />
              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] text-dc-ink-faint">Hedef türü</span>
                <select
                  name="kind"
                  className="rounded-[10px] border border-[#DDE4E0] bg-white px-3 py-2.5 text-[13.5px] font-semibold text-dc-ink"
                >
                  <option value="SUBJECT_NET">Ders neti</option>
                  <option value="PLAN_COMPLETION">Plan tamamlama %</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] text-dc-ink-faint">Ders</span>
                <select
                  name="subjectName"
                  className="rounded-[10px] border border-[#DDE4E0] bg-white px-3 py-2.5 text-[13.5px] font-semibold text-dc-ink"
                >
                  <option value="">— (plan hedefi için boş)</option>
                  {examSubjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] text-dc-ink-faint">Hedef değer</span>
                <input
                  name="targetValue"
                  required
                  inputMode="decimal"
                  className="w-[96px] rounded-[10px] border border-[#DDE4E0] bg-white px-3 py-2.5 text-[13.5px] text-dc-ink"
                />
              </label>

              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-[12.5px] text-dc-ink-faint">Yakın hedef notu</span>
                <input
                  name="nearTermNote"
                  maxLength={300}
                  placeholder="Örn. bir sonraki denemede 21 net"
                  className="min-w-[200px] rounded-[10px] border border-[#DDE4E0] bg-white px-3 py-2.5 text-[13.5px] text-dc-ink"
                />
              </label>

              <button
                type="submit"
                className="rounded-[10px] border border-[#DDE4E0] bg-white px-4 py-2.5 text-[13.5px] font-bold text-dc-ink transition-colors hover:border-dc-brand"
              >
                Hedefi kaydet
              </button>
            </form>
            {examSubjects.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-dc-ink-faint">
                Ders neti hedefi koyabilmek için önce bu öğrenciye deneme sonucu
                girilmiş olmalı.
              </p>
            ) : null}
          </PanelCard>
        ) : null}

        <PanelCard className="mt-5">
          <PanelCardTitle>Bu haftanın planı</PanelCardTitle>
          <p className="mt-2 text-[14px] leading-[1.65] text-dc-ink-body">
            {currentPlan
              ? "Bu hafta için bir plan taslağı hazır. Görev listesini gözden geçirip onaylayabilirsin."
              : "Bu hafta için henüz plan taslağı oluşmadı. Plan ekranından oluşturabilirsin."}
          </p>
          <Link
            href="/panel/ogretmen/plan"
            className="mt-3.5 inline-block rounded-[10px] bg-dc-brand px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-dc-brand-hover"
          >
            Plan ekranını aç
          </Link>
        </PanelCard>
      </div>
    </PanelShell>
  );
}

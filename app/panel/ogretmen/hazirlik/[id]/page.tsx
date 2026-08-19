import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { planningWeekStart } from "@/lib/adaptive-plan";
import { resolveTeacherStudent } from "@/lib/panel/teacher-scope";
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
 *  1. "Görüşmeyi tamamlandı işaretle" YOK. Şemada koç görüşmesi (randevu,
 *     katılım, görüşme notu) modeli bulunmuyor; koçluk bu üründe `WeeklyPlan`
 *     onay akışı olarak yaşıyor. İşlevsiz bir düğme koymak yerine ekran
 *     mevcut plan onay akışına bağlanır.
 *  2. "Dino'nun hazırlık özeti" YOK. Mevcut AI kapısı yalnız ödev/mini test
 *     taslağı üretir; koçluk özeti üretmez. Uydurma AI metni yazılmaz.
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
  const lastWeek = new Date(thisWeek);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const [lastPlan, currentPlan, notes, attendances, examSections] = await Promise.all([
    prisma.weeklyPlan.findUnique({
      where: { studentId_weekStart: { studentId: student.id, weekStart: lastWeek } },
      select: {
        tasks: {
          where: { status: { not: "SKIPPED" } },
          select: { title: true, status: true },
          orderBy: { scheduledFor: "asc" },
        },
      },
    }),
    prisma.weeklyPlan.findUnique({
      where: { studentId_weekStart: { studentId: student.id, weekStart: thisWeek } },
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
  ]);

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

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelHeading } from "@/components/panel/ui";
import { TeacherLessonWorkspace } from "@/components/panel/teacher-lesson-workspace";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { academicSupportLabels } from "@/lib/accessibility-preferences";

export const dynamic = "force-dynamic";

const day = new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "numeric", month: "short" });
const time = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

/**
 * EĞİTMEN · DERS KAPANIŞI — panelin kalbi.
 *
 * `TeacherLessonWorkspace` tasarım geçişinde öğretmen ana sayfasından
 * çıkarılmış ama yerine hiçbir ekran konmamıştı: bileşen ve
 * `PUT /api/panel/lessons/[id]/notes` ucu kod tabanında duruyor, hiçbir
 * route'tan render edilmiyordu. Öğretmen ders notu yazamıyor, "not girişi
 * bekliyor" listesi hiç boşalmıyordu.
 *
 * Eski tasarımdaki sekme şeridi yerine dersin kendi adresi var: ana sayfa ve
 * takvim buraya bağlanır, tarayıcı geçmişi ve paylaşılan bağlantı çalışır.
 *
 * YATAY ERİŞİM: ders HER İSTEKTE `teacherId` ile birlikte sorgulanır; başka
 * bir öğretmenin dersi 404 verir.
 */
export default async function TeacherLessonClosePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("TEACHER");
  const { id } = await params;
  const featureFlags = getPanelFeatureFlags();

  const lesson = await prisma.lesson.findFirst({
    where: { id, teacherId: session.userId },
    include: {
      group: {
        include: {
          enrollments: {
            where: { endedAt: null },
            include: {
              student: {
                include: {
                  user: { select: { fullName: true, email: true, accessibilityPreference: true } },
                },
              },
            },
          },
        },
      },
      notes: true,
      attendances: true,
      outcomeLinks: true,
    },
  });
  if (!lesson) notFound();

  const [previous, noteTemplates, outcomes] = await Promise.all([
    prisma.lesson.findFirst({
      where: { groupId: lesson.groupId, startsAt: { lt: lesson.startsAt }, status: "COMPLETED" },
      orderBy: { startsAt: "desc" },
      include: { notes: { where: { studentId: null }, take: 1 } },
    }),
    prisma.teacherNoteTemplate.findMany({
      where: { teacherId: session.userId },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, title: true, note: true, nextGoal: true, homework: true },
    }),
    featureFlags.learningOutcomes
      ? prisma.learningOutcome.findMany({
          where: { isActive: true, unit: { subject: { version: { status: "ACTIVE" } } } },
          orderBy: { code: "asc" },
          take: 300,
          include: {
            unit: { include: { subject: { include: { version: { select: { code: true } } } } } },
            skills: { include: { skill: { select: { name: true } } } },
            favorites: { where: { userId: session.userId }, select: { userId: true } },
            lessons: { where: { linkedById: session.userId }, take: 1, select: { lessonId: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const previousNote = previous?.notes[0] ?? null;
  const previousContext = previousNote
    ? { topic: previousNote.topic, nextGoal: previousNote.nextGoal, homework: previousNote.homework }
    : null;
  const common = lesson.notes.find((note) => note.studentId === null);

  const workspace = {
    id: lesson.id,
    groupId: lesson.groupId,
    groupName: lesson.group.name,
    subject: lesson.group.subject,
    title: lesson.title,
    status: lesson.status,
    timeLabel: `${day.format(lesson.startsAt)} · ${time.format(lesson.startsAt)}–${time.format(lesson.endsAt)}`,
    topic: common?.topic || "",
    note: common?.note || "",
    nextGoal: common?.nextGoal || "",
    homework: common?.homework || "",
    previousGoal: previousContext?.nextGoal || null,
    previousContext,
    closeVersion: lesson.closeVersion,
    templates: noteTemplates.map((template) => ({
      ...template,
      note: template.note || "",
      nextGoal: template.nextGoal || "",
      homework: template.homework || "",
    })),
    outcomeLinks: lesson.outcomeLinks.map((link) => ({
      outcomeId: link.outcomeId,
      evidenceType: link.evidenceType,
    })),
    outcomeSkipReason: lesson.outcomeSkipReason as
      | "CATALOG_MISSING"
      | "COMPLETE_LATER"
      | "NOT_APPLICABLE"
      | null,
    students: lesson.group.enrollments.map((enrollment) => ({
      id: enrollment.student.id,
      name: enrollment.student.user.fullName || enrollment.student.user.email,
      note: lesson.notes.find((note) => note.studentId === enrollment.student.id)?.note || "",
      attendance:
        lesson.attendances.find((item) => item.studentId === enrollment.student.id)?.status ||
        ("PRESENT" as const),
      supportLabels:
        featureFlags.accessibilityProfile && enrollment.student.user.accessibilityPreference
          ? academicSupportLabels(enrollment.student.user.accessibilityPreference)
          : [],
    })),
  };

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Ders kapanışı"
    >
      <div className="max-w-[1040px]">
        <PanelHeading
          eyebrow={`${workspace.groupName} · ${workspace.timeLabel}`}
          title={workspace.title}
          description="Yoklamayı işaretle, ortak notu yaz, gerekiyorsa öğrenciye özel not ekle ve dersi kapat."
          actions={
            <Link
              href="/panel/ogretmen"
              className="rounded-lg border border-dc-line bg-white px-3.5 py-2.5 text-[13px] font-semibold text-dc-ink-muted transition-colors hover:border-dc-brand"
            >
              ← Bugüne dön
            </Link>
          }
        />

        <div className="mt-5">
          <TeacherLessonWorkspace
            key={workspace.id}
            lesson={workspace}
            baselineMetricsEnabled={featureFlags.baselineMetrics}
            learningOutcomesEnabled={featureFlags.learningOutcomes}
            quickLessonCloseEnabled={featureFlags.quickLessonClose}
            outcomes={outcomes.map((outcome) => ({
              id: outcome.id,
              code: outcome.code,
              title: outcome.title,
              subject: outcome.unit.subject.name,
              unit: outcome.unit.name,
              skills: outcome.skills.map((item) => item.skill.name),
              favorite: outcome.favorites.length > 0,
              recent: outcome.lessons.length > 0,
            }))}
          />
        </div>
      </div>
    </PanelShell>
  );
}

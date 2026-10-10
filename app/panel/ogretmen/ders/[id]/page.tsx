import Link from "next/link";
import { notFound } from "next/navigation";
import { loadTeacherLessonWorkspaceData } from "@/lib/panel/teacher-lesson-server";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { TeacherLessonWorkspace } from "@/components/panel/lesson/workspace";
import { parseLessonTab } from "@/components/panel/lesson/types";
import { PageHeader, StatusBadge, buttonClass } from "@/components/panel/ui";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { academicSupportLabels } from "@/lib/accessibility-preferences";
import type { OutcomeSearchItem } from "@/lib/outcome-search";

export const dynamic = "force-dynamic";

const day = new Intl.DateTimeFormat("tr-TR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const time = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
});

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sekme?: string | string[] }>;
}) {
  const session = await requireRole("TEACHER");
  const { id } = await params;
  const initialTab = parseLessonTab((await searchParams).sekme);
  const featureFlags = getPanelFeatureFlags();

  // Ortak yükleyici (mobil `GET /api/panel/staff/teacher/lessons/[id]` ile aynı sorgular).
  const data = await loadTeacherLessonWorkspaceData(session.userId, id, featureFlags.learningOutcomes);
  if (!data) notFound();
  const { lesson, previous, noteTemplates, outcomes } = data;

  const previousNote = previous?.notes[0] ?? null;
  const previousContext = previousNote
    ? {
        topic: previousNote.topic,
        nextGoal: previousNote.nextGoal,
        homework: previousNote.homework,
      }
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
      note:
        lesson.notes.find((note) => note.studentId === enrollment.student.id)
          ?.note || "",
      attendance:
        lesson.attendances.find(
          (item) => item.studentId === enrollment.student.id,
        )?.status || ("PRESENT" as const),
      supportLabels:
        featureFlags.accessibilityProfile &&
        enrollment.student.user.accessibilityPreference
          ? academicSupportLabels(
              enrollment.student.user.accessibilityPreference,
            )
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
        {/*
          Başlık sunucuda çizilir (Design Phase 8 RSC bölmesi); istemci adası
          yalnız sekmeler ve kapanış formudur. Sayfanın tek `<h1>`'i burada.
        */}
        <PageHeader
          title={workspace.title}
          description={`${workspace.subject} · 60 dakikalık ders özeti`}
          metadata={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-pn-text-secondary">
              <span>{workspace.groupName}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{workspace.timeLabel}</span>
              <StatusBadge
                tone={lesson.status === "COMPLETED" ? "success" : lesson.status === "CANCELLED" ? "neutral" : "info"}
                label={lesson.status === "COMPLETED" ? "Tamamlandı" : lesson.status === "CANCELLED" ? "İptal" : "Planlandı"}
              />
            </span>
          }
          actions={
            <Link href="/panel/ogretmen" className={buttonClass("secondary", "md")}>
              ← Bugüne dön
            </Link>
          }
        />

        <div className="mt-5">
          <TeacherLessonWorkspace
            key={workspace.id}
            lesson={workspace}
            initialTab={initialTab}
            baselineMetricsEnabled={featureFlags.baselineMetrics}
            learningOutcomesEnabled={featureFlags.learningOutcomes}
            quickLessonCloseEnabled={featureFlags.quickLessonClose}
            outcomes={
              (
                outcomes as Array<
                  (typeof outcomes)[number] & {
                    unit: { name: string; subject: { name: string } };
                    skills: Array<{ skill: { name: string } }>;
                    favorites: Array<unknown>;
                    lessons: Array<unknown>;
                  }
                >
              ).map((outcome) => ({
                id: outcome.id,
                code: outcome.code,
                title: outcome.title,
                subject: outcome.unit.subject.name,
                unit: outcome.unit.name,
                skills: outcome.skills.map((item) => item.skill.name),
                favorite: outcome.favorites.length > 0,
                recent: outcome.lessons.length > 0,
              })) as OutcomeSearchItem[]
            }
          />
        </div>
      </div>
    </PanelShell>
  );
}

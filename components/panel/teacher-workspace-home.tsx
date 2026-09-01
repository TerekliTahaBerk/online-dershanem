import Link from "next/link";
import {
  PanelActionRow,
  PanelCard,
  PanelCardTitle,
  PanelEmpty,
  PanelStatusBadge,
} from "@/components/panel/ui";
import { DinoExplanationAction } from "@/components/panel/dino-explanation-action";
import {
  lessonTypeLabel,
  pendingKindLabel,
  upcomingKindLabel,
  type TeacherWorkspace,
  type TeacherWorkspaceLesson,
  type TeacherWorkspacePendingItem,
  type TeacherWorkspaceRiskStudent,
  type TeacherWorkspaceUpcomingItem,
} from "@/lib/panel/teacher-workspace";
import { buildTeacherAttentionDeterministicReason } from "@/lib/panel/dino-explanations";

const TIME = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

const DAY_TIME = new Intl.DateTimeFormat("tr-TR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

function prepTone(status: TeacherWorkspaceLesson["prepStatus"]): "neutral" | "info" | "success" | "warning" {
  if (status === "closed") return "success";
  if (status === "needs_close") return "warning";
  if (status === "ready") return "info";
  return "neutral";
}

function primaryLessonHref(lesson: TeacherWorkspaceLesson): string {
  if (lesson.prepStatus === "needs_close") return `/panel/ogretmen/ders/${lesson.id}`;
  if (lesson.meetingUrl) return lesson.meetingUrl;
  return `/panel/ogretmen/ders/${lesson.id}`;
}

function primaryLessonLabel(lesson: TeacherWorkspaceLesson): string {
  if (lesson.prepStatus === "needs_close") return "Ders kapanışı";
  if (lesson.meetingUrl) return "Dersi aç";
  return "Derse git";
}

function LessonRow({ lesson }: { lesson: TeacherWorkspaceLesson }) {
  return (
    <li className="border-b border-dc-line-soft px-4 py-4 last:border-b-0 sm:px-[22px]">
      <div className="flex flex-wrap items-start gap-3 sm:gap-5">
        <span className="w-[52px] flex-none text-[14px] font-bold text-dc-ink sm:w-[60px]">
          {TIME.format(new Date(lesson.startsAt))}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-dc-ink">
            {lesson.title} · {lesson.groupName}
          </p>
          <p className="mt-0.5 text-[13px] text-dc-ink-muted">
            {lessonTypeLabel(lesson.lessonType)}
            {lesson.subject ? ` · ${lesson.subject}` : ""}
            {` · ${lesson.studentCount} öğrenci`}
          </p>
          <div className="mt-2">
            <PanelStatusBadge label={lesson.prepLabel} tone={prepTone(lesson.prepStatus)} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 sm:pl-[65px]">
        <Link
          href={primaryLessonHref(lesson)}
          className={`panel-quick-action inline-flex ${
            lesson.prepStatus === "needs_close" ? "panel-quick-action-primary" : ""
          }`}
          {...(lesson.meetingUrl && lesson.prepStatus !== "needs_close"
            ? { target: "_blank", rel: "noreferrer" }
            : {})}
        >
          {primaryLessonLabel(lesson)}
        </Link>
        {lesson.primaryStudentId ? (
          <Link
            href={`/panel/ogretmen/ogrenci/${lesson.primaryStudentId}`}
            className="panel-quick-action inline-flex"
          >
            Öğrenciye git
          </Link>
        ) : (
          <Link href="/panel/ogretmen/gruplar" className="panel-quick-action inline-flex">
            Öğrenciler
          </Link>
        )}
        <Link href="/panel/ogretmen/materyaller" className="panel-quick-action inline-flex">
          Materyaller
        </Link>
        {lesson.prepStatus !== "closed" ? (
          <Link href={`/panel/ogretmen/ders/${lesson.id}`} className="panel-quick-action inline-flex">
            Ders kapanışı
          </Link>
        ) : null}
      </div>
    </li>
  );
}

function PendingSection({ items }: { items: TeacherWorkspacePendingItem[] }) {
  return (
    <PanelCard className="mt-5">
      <PanelCardTitle>Bekleyen işler</PanelCardTitle>
      {items.length ? (
        <div className="mt-3.5 rounded-[12px] border border-dc-line-soft bg-white">
          {items.map((item, index) => (
            <PanelActionRow
              key={item.id}
              title={item.title}
              description={item.detail}
              status={<PanelStatusBadge label={pendingKindLabel(item.kind)} tone="info" />}
              cta={
                <Link href={item.href} className="panel-quick-action inline-flex">
                  {item.ctaLabel}
                </Link>
              }
              last={index === items.length - 1}
            />
          ))}
        </div>
      ) : (
        <PanelEmpty
          title="Bekleyen iş yok."
          body="Kapanış, yardım, plan veya değerlendirme biriktiğinde burada görünür."
          className="mt-3 border-dashed p-5"
        />
      )}
    </PanelCard>
  );
}

function RiskSection({ items }: { items: TeacherWorkspaceRiskStudent[] }) {
  return (
    <PanelCard className="mt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PanelCardTitle>Riskli öğrenciler</PanelCardTitle>
        <Link
          href="/panel/ogretmen/gruplar?filtre=risky"
          className="shrink-0 text-[13.5px] font-bold text-dc-brand-strong hover:text-dc-brand-hover"
        >
          Listeyi aç
        </Link>
      </div>
      {items.length ? (
        <div className="mt-3.5 rounded-[12px] border border-dc-line-soft bg-white">
          {items.map((item, index) => (
            <PanelActionRow
              key={item.studentId}
              title={item.studentName}
              description={
                <>
                  {item.whyRisky}
                  <span className="mt-1 block text-[12.5px] text-dc-ink-faint">
                    {item.groupName} · son sinyal {item.lastSignal}
                  </span>
                </>
              }
              cta={
                <Link href={item.href} className="panel-quick-action inline-flex">
                  Öğrenci 360
                </Link>
              }
              last={index === items.length - 1}
            />
          ))}
        </div>
      ) : (
        <PanelEmpty
          title="Riskli öğrenci yok."
          body="Güçlü bir sinyal oluştuğunda en fazla 8 öğrenci burada listelenir."
          className="mt-3 border-dashed p-5"
        />
      )}
    </PanelCard>
  );
}

function UpcomingSection({ items }: { items: TeacherWorkspaceUpcomingItem[] }) {
  if (!items.length) return null;
  return (
    <PanelCard className="mt-5">
      <PanelCardTitle>Yaklaşanlar</PanelCardTitle>
      <div className="mt-3.5 rounded-[12px] border border-dc-line-soft bg-white">
        {items.map((item, index) => (
          <PanelActionRow
            key={item.id}
            title={item.title}
            description={item.detail}
            meta={DAY_TIME.format(new Date(item.at))}
            status={<PanelStatusBadge label={upcomingKindLabel(item.kind)} tone="neutral" />}
            cta={
              <Link href={item.href} className="panel-quick-action inline-flex">
                Aç
              </Link>
            }
            last={index === items.length - 1}
          />
        ))}
      </div>
    </PanelCard>
  );
}

export function TeacherWorkspaceHome({
  workspace,
  dinoEnabled = false,
}: {
  workspace: TeacherWorkspace;
  dinoEnabled?: boolean;
}) {
  const helpFirst = workspace.pending.some((item) => item.kind === "HELP_REQUEST");
  const attentionReason = buildTeacherAttentionDeterministicReason({
    visibleCount: workspace.riskyStudents.length || workspace.pending.length,
    topHeadlines: [
      ...workspace.riskyStudents.slice(0, 2).map((item) => item.whyRisky),
      ...workspace.pending.slice(0, 2).map((item) => item.title),
    ],
  });

  const lessonsSection = (
    <PanelCard className="mt-5" padded={false}>
      <div className="px-4 pt-[22px] sm:px-[22px]">
        <PanelCardTitle>Bugünkü dersler</PanelCardTitle>
      </div>
      {workspace.todayLessons.length === 0 ? (
        <div className="px-4 py-[26px] sm:px-[22px]">
          <p className="text-[15px] font-bold text-dc-ink">Bugün dersin yok.</p>
          <p className="mt-1.5 text-[14px] text-dc-ink-muted">
            Bekleyen işleri bitirebilir ya da yarının derslerine hazırlanabilirsin.
          </p>
        </div>
      ) : (
        <ul className="mt-2">
          {workspace.todayLessons.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} />
          ))}
        </ul>
      )}
    </PanelCard>
  );

  return (
    <div className="max-w-[1040px]">
      {dinoEnabled ? (
        <div className="mt-4 max-w-[720px]">
          <DinoExplanationAction
            deterministicReason={attentionReason}
            questionKey="teacher_today"
            audience="TEACHER"
            openLabel="Bugün hangi öğrencilerle ilgilenmeliyim?"
            prepareLabel="Dino ile bugünkü dikkat listesini açıkla"
          />
        </div>
      ) : null}
      {helpFirst ? (
        <>
          <PendingSection items={workspace.pending} />
          {lessonsSection}
        </>
      ) : (
        <>
          {lessonsSection}
          <PendingSection items={workspace.pending} />
        </>
      )}
      <RiskSection items={workspace.riskyStudents} />
      <UpcomingSection items={workspace.upcoming} />
    </div>
  );
}

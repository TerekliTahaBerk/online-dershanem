import Link from "next/link";
import {
  EmptyState,
  List,
  ListRow,
  Section,
  StatusBadge,
  buttonClass,
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

function prepTone(
  status: TeacherWorkspaceLesson["prepStatus"],
): "neutral" | "info" | "success" | "warning" {
  if (status === "closed") return "success";
  if (status === "needs_close") return "warning";
  if (status === "ready") return "info";
  return "neutral";
}

function primaryLessonHref(lesson: TeacherWorkspaceLesson): string {
  if (lesson.prepStatus === "needs_close")
    return `/panel/ogretmen/ders/${lesson.id}`;
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
    <li className="flex flex-wrap items-start gap-x-4 gap-y-2 border-b border-pn-border py-3 last:border-b-0">
      <span className="w-[52px] flex-none pt-0.5 text-[14px] font-semibold tabular-nums text-pn-text">
        {TIME.format(new Date(lesson.startsAt))}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[14.5px] font-semibold text-pn-text">
            {lesson.title} · {lesson.groupName}
          </p>
          <StatusBadge label={lesson.prepLabel} tone={prepTone(lesson.prepStatus)} />
        </div>
        <p className="mt-0.5 text-[13px] text-pn-text-muted">
          {lessonTypeLabel(lesson.lessonType)}
          {lesson.subject ? ` · ${lesson.subject}` : ""}
          {` · ${lesson.studentCount} öğrenci`}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Link
            href={primaryLessonHref(lesson)}
            className={buttonClass("primary", "sm")}
            {...(lesson.meetingUrl && lesson.prepStatus !== "needs_close"
              ? { target: "_blank", rel: "noreferrer" }
              : {})}
          >
            {primaryLessonLabel(lesson)}
          </Link>
          {lesson.primaryStudentId ? (
            <Link href={`/panel/ogretmen/ogrenci/${lesson.primaryStudentId}`} className={buttonClass("ghost", "sm")}>
              Öğrenciye git
            </Link>
          ) : (
            <Link href="/panel/ogretmen/gruplar" className={buttonClass("ghost", "sm")}>
              Öğrenciler
            </Link>
          )}
          <Link href="/panel/ogretmen/materyaller" className={buttonClass("ghost", "sm")}>
            Materyaller
          </Link>
          {lesson.prepStatus !== "closed" && lesson.prepStatus !== "needs_close" ? (
            <Link href={`/panel/ogretmen/ders/${lesson.id}`} className={buttonClass("ghost", "sm")}>
              Ders kapanışı
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function PendingSection({ items }: { items: TeacherWorkspacePendingItem[] }) {
  return (
    <Section title="Bekleyen işler">
      {items.length ? (
        <List label="Bekleyen işler">
          {items.map((item) => (
            <ListRow
              key={item.id}
              title={item.title}
              description={item.detail}
              status={<StatusBadge label={pendingKindLabel(item.kind)} tone="info" />}
              action={
                <Link href={item.href} className={buttonClass("secondary", "sm")}>
                  {item.ctaLabel}
                </Link>
              }
            />
          ))}
        </List>
      ) : (
        <EmptyState
          title="Bekleyen iş yok."
          body="Kapanış, yardım, plan veya değerlendirme biriktiğinde burada görünür."
        />
      )}
    </Section>
  );
}

function RiskSection({ items }: { items: TeacherWorkspaceRiskStudent[] }) {
  return (
    <Section
      title="Riskli öğrenciler"
      actions={
        <Link href="/panel/ogretmen/gruplar?filtre=risky" className={buttonClass("ghost", "sm")}>
          Listeyi aç
        </Link>
      }
    >
      {items.length ? (
        <List label="Riskli öğrenciler">
          {items.map((item) => (
            <ListRow
              key={item.studentId}
              title={item.studentName}
              description={item.whyRisky}
              meta={`${item.groupName} · son sinyal ${item.lastSignal}`}
              action={
                <Link href={item.href} className={buttonClass("secondary", "sm")}>
                  Öğrenci profili
                </Link>
              }
            />
          ))}
        </List>
      ) : (
        <EmptyState
          title="Riskli öğrenci yok."
          body="Güçlü bir sinyal oluştuğunda en fazla 8 öğrenci burada listelenir."
        />
      )}
    </Section>
  );
}

function UpcomingSection({ items }: { items: TeacherWorkspaceUpcomingItem[] }) {
  if (!items.length) return null;
  return (
    <Section title="Yaklaşanlar">
      <List label="Yaklaşanlar">
        {items.map((item) => (
          <ListRow
            key={item.id}
            title={item.title}
            description={item.detail}
            meta={DAY_TIME.format(new Date(item.at))}
            status={<StatusBadge label={upcomingKindLabel(item.kind)} tone="neutral" />}
            action={
              <Link href={item.href} className={buttonClass("secondary", "sm")}>
                Aç
              </Link>
            }
          />
        ))}
      </List>
    </Section>
  );
}

export function TeacherWorkspaceHome({
  workspace,
  dinoEnabled = false,
}: {
  workspace: TeacherWorkspace;
  dinoEnabled?: boolean;
}) {
  const helpFirst = workspace.pending.some(
    (item) => item.kind === "HELP_REQUEST",
  );
  const attentionReason = buildTeacherAttentionDeterministicReason({
    visibleCount: workspace.riskyStudents.length || workspace.pending.length,
    topHeadlines: [
      ...workspace.riskyStudents.slice(0, 2).map((item) => item.whyRisky),
      ...workspace.pending.slice(0, 2).map((item) => item.title),
    ],
  });

  const lessonsSection = (
    <Section title="Bugünkü dersler">
      {workspace.todayLessons.length === 0 ? (
        <EmptyState
          title="Bugün dersin yok."
          body="Bekleyen işleri bitirebilir ya da yarının derslerine hazırlanabilirsin."
        />
      ) : (
        <ul aria-label="Bugünkü dersler" className="border-t border-pn-border">
          {workspace.todayLessons.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} />
          ))}
        </ul>
      )}
    </Section>
  );

  return (
    <div>
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

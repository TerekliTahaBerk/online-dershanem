import Link from "next/link";
import type { ReactNode } from "react";
import {
  PanelAttentionCard,
  PanelCard,
  PanelCardTitle,
  PanelFilterLink,
  PanelHeading,
  PanelStatusBadge,
  PanelTaskRow,
} from "@/components/panel/ui";
import { DinoExplanationAction } from "@/components/panel/dino-explanation-action";
import {
  STUDENT_360_PACKAGE_STATUS_LABELS,
  STUDENT_360_RISK_LEVEL_LABELS,
  STUDENT_360_TAB_LABELS,
  student360TabHref,
  type Student360RiskLevel,
} from "@/lib/panel/student-360";
import type { Student360Bundle } from "@/lib/panel/student-360-server";
import { RelationshipRemoveButton } from "@/components/panel/relationship-remove-button";
import { StudentParentLinkForm } from "@/components/panel/student-parent-link-form";
import { buildTeacherStudentRiskDeterministicReason } from "@/lib/panel/dino-explanations";

const DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

const DAY = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Istanbul",
});

const ATTENDANCE_LABEL: Record<string, string> = {
  PRESENT: "Katıldı",
  ABSENT: "Katılmadı",
  LATE: "Geç",
  EXCUSED: "İzinli",
};

function riskTone(level: Student360RiskLevel): "neutral" | "success" | "warning" | "critical" {
  if (level === "high") return "critical";
  if (level === "medium") return "warning";
  if (level === "low") return "warning";
  return "success";
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-dc-ink-faint">{label}</p>
      <p className="mt-1 truncate text-[13.5px] font-semibold text-dc-ink">{value}</p>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-[13.5px] leading-6 text-dc-ink-muted">{text}</p>;
}

function SectionTitle({ children }: { children: string }) {
  return <h3 className="text-[15px] font-bold text-dc-ink">{children}</h3>;
}

export function Student360View({
  bundle,
  listHref,
  adminActions,
  dinoEnabled = false,
}: {
  bundle: Student360Bundle;
  listHref: string;
  adminActions?: ReactNode;
  /** Öğretmen contextual Dino; admin 360'da açılmaz. */
  dinoEnabled?: boolean;
}) {
  const { summary, tab, tabs, actions, basePath } = bundle;
  const packageLabel =
    bundle.access.canViewCommerce
      ? STUDENT_360_PACKAGE_STATUS_LABELS[summary.packageStatus]
      : summary.productLabels.length
        ? summary.productLabels.join(" · ")
        : "Ürün erişimi yok";
  const showTeacherDino = dinoEnabled && bundle.access.role === "TEACHER";
  const riskReason = buildTeacherStudentRiskDeterministicReason(summary.risk.whyRisky);

  return (
    <div className="max-w-[1100px]">
      <p className="text-[13px] text-dc-ink-faint">
        <Link href={listHref} className="hover:text-dc-brand-hover hover:underline">
          Öğrenciler
        </Link>
      </p>

      <div className="mt-2">
        <PanelHeading
          eyebrow="Öğrenci 360"
          title={summary.fullName}
          description={`${summary.email}${summary.classLevel ? ` · ${summary.classLevel}` : ""}${
            summary.targetGoal ? ` · ${summary.targetGoal}` : ""
          }`}
          actions={
            <PanelStatusBadge
              label={STUDENT_360_RISK_LEVEL_LABELS[summary.risk.level]}
              tone={riskTone(summary.risk.level)}
              pulse={summary.risk.level === "high"}
            />
          }
        />
      </div>

      <div className="mt-5 grid gap-4 rounded-[14px] border border-dc-line bg-white p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4 lg:p-[22px]">
        <MetaItem
          label="Aktif ürünler"
          value={summary.productLabels.length ? summary.productLabels.join(" · ") : "Yok"}
        />
        <MetaItem
          label="Grup"
          value={
            summary.groups.length
              ? summary.groups.map((group) => group.name).join(", ")
              : "Aktif grup yok"
          }
        />
        <MetaItem
          label="Öğretmen / koç"
          value={
            [
              ...new Set([
                ...summary.groups.map((group) => group.teacherName),
                ...(summary.coachName ? [summary.coachName] : []),
              ]),
            ].join(" · ") || "Atama yok"
          }
        />
        <MetaItem label="Paket" value={packageLabel} />
        <MetaItem
          label="Son aktivite"
          value={summary.lastActivityAt ? DATE.format(summary.lastActivityAt) : "Kayıt yok"}
        />
        <MetaItem label="Risk puanı" value={String(summary.risk.totalPoints)} />
      </div>

      {summary.risk.whyRisky.length ? (
        <PanelAttentionCard
          className="mt-4"
          tone={summary.risk.level === "high" ? "critical" : "warning"}
          title="Bu öğrenci neden riskli?"
          body={summary.risk.whyRisky.join(" ")}
        />
      ) : null}

      {showTeacherDino ? (
        <div className="mt-3 max-w-[720px]">
          <DinoExplanationAction
            deterministicReason={riskReason}
            questionKey="teacher_student_risk"
            audience="TEACHER"
            studentId={bundle.access.studentProfileId}
            openLabel="Bu öğrenciyi özetle"
            prepareLabel="Dino ile öğrenciyi özetle"
          />
        </div>
      ) : null}

      {actions.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className="rounded-[10px] border border-[#DDE4E0] bg-white px-3.5 py-2 text-[12.5px] font-bold text-dc-ink transition-colors hover:border-dc-brand"
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Öğrenci 360 sekmeleri">
        {tabs.map((item) => (
          <PanelFilterLink
            key={item}
            href={student360TabHref(basePath, item)}
            active={tab === item}
          >
            {STUDENT_360_TAB_LABELS[item]}
          </PanelFilterLink>
        ))}
      </nav>

      <div className="mt-5 space-y-5">
        {tab === "genel" && bundle.overview ? <OverviewPanel data={bundle.overview} /> : null}
        {tab === "akademik" && bundle.academic ? <AcademicPanel data={bundle.academic} /> : null}
        {tab === "dersler" && bundle.lessons ? <LessonsPanel data={bundle.lessons} /> : null}
        {tab === "kocluk" && bundle.coaching ? <CoachingPanel data={bundle.coaching} /> : null}
        {tab === "denemeler" && bundle.exams ? <ExamsPanel data={bundle.exams} /> : null}
        {tab === "risk" && bundle.riskTab ? <RiskPanel data={bundle.riskTab} /> : null}
        {tab === "veli" && bundle.parent ? (
          <ParentPanel
            data={bundle.parent}
            studentId={bundle.access.studentProfileId}
            canManage={bundle.access.role === "ADMIN"}
            parentOptions={bundle.parentOptions}
          />
        ) : null}
        {tab === "paket" && bundle.commerce ? (
          <CommercePanel data={bundle.commerce} adminActions={adminActions} />
        ) : null}
        {tab === "paket" && adminActions && bundle.access.role === "ADMIN" && !bundle.commerce
          ? adminActions
          : null}
      </div>

      {bundle.access.role === "ADMIN" && tab === "genel" ? adminActions : null}
    </div>
  );
}

function OverviewPanel({ data }: { data: NonNullable<Student360Bundle["overview"]> }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <PanelCard>
        <PanelCardTitle>Bu haftanın durumu</PanelCardTitle>
        <dl className="mt-4 space-y-3 text-[13.5px] text-dc-ink-body">
          <div className="flex justify-between gap-3">
            <dt>Ders katılımı</dt>
            <dd className="font-semibold text-dc-ink">
              {data.weekAttendancePresent} / {data.weekAttendanceTotal}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Tamamlanan çalışmalar</dt>
            <dd className="font-semibold text-dc-ink">
              {data.completedAssignments} / {data.assignmentTotal}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Plan gerçekleşme</dt>
            <dd className="font-semibold text-dc-ink">
              {data.planCompletionPercent == null ? "Plan yok" : `%${data.planCompletionPercent}`}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Açık yardım</dt>
            <dd className="font-semibold text-dc-ink">{data.openHelpRequests}</dd>
          </div>
          {data.nearestOdkExamTitle ? (
            <div className="flex justify-between gap-3">
              <dt>Yaklaşan ODK</dt>
              <dd className="font-semibold text-dc-ink">{data.nearestOdkExamTitle}</dd>
            </div>
          ) : null}
        </dl>

        <SectionTitle>Yaklaşan dersler</SectionTitle>
        <div className="mt-2.5 space-y-1">
          {data.upcomingLessons.length ? (
            data.upcomingLessons.map((lesson) => (
              <PanelTaskRow
                key={lesson.id}
                title={lesson.title}
                meta={DATE.format(lesson.startsAt)}
              />
            ))
          ) : (
            <EmptyLine text="Yaklaşan ders yok." />
          )}
        </div>
      </PanelCard>

      <div className="space-y-5">
        <PanelCard>
          <PanelCardTitle>Son denemeler</PanelCardTitle>
          <div className="mt-3 space-y-2">
            {data.recentExams.length ? (
              data.recentExams.map((exam) => (
                <div key={exam.id} className="flex justify-between gap-3 text-[13.5px]">
                  <span className="text-dc-ink-body">
                    {exam.title} · {DAY.format(exam.takenAt)}
                  </span>
                  <span className="font-semibold text-dc-ink">
                    {exam.totalNet.toFixed(1).replace(".", ",")} net
                  </span>
                </div>
              ))
            ) : (
              <EmptyLine text="Deneme kaydı yok." />
            )}
          </div>
        </PanelCard>

        <PanelCard>
          <PanelCardTitle>Açık görev / müdahale</PanelCardTitle>
          <div className="mt-3 space-y-2">
            {data.openInterventions.length ? (
              data.openInterventions.map((item) => (
                <div key={item.id} className="rounded-[10px] border border-dc-line-soft px-3 py-2.5">
                  <p className="text-[13px] font-semibold text-dc-ink">{item.status}</p>
                  <p className="mt-1 text-[12.5px] leading-5 text-dc-ink-muted">{item.reason}</p>
                </div>
              ))
            ) : data.activeRiskReasons.length ? (
              data.activeRiskReasons.map((reason) => (
                <p key={reason} className="text-[13px] leading-6 text-dc-ink-body">
                  {reason}
                </p>
              ))
            ) : (
              <EmptyLine text="Açık müdahale yok." />
            )}
          </div>
        </PanelCard>
      </div>
    </div>
  );
}

function AcademicPanel({ data }: { data: NonNullable<Student360Bundle["academic"]> }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <PanelCard>
        <PanelCardTitle>Ders bazlı performans</PanelCardTitle>
        <div className="mt-3 space-y-2">
          {data.subjectPerformance.length ? (
            data.subjectPerformance.map((row) => (
              <div key={row.subject} className="flex justify-between gap-3 text-[13.5px]">
                <span>{row.subject}</span>
                <span className="font-semibold text-dc-ink">
                  {row.avgNet == null
                    ? "Veri yok"
                    : `${row.avgNet.toFixed(1).replace(".", ",")} ort. · ${row.sampleSize} bölüm`}
                </span>
              </div>
            ))
          ) : (
            <EmptyLine text="Henüz ders bazlı deneme verisi yok." />
          )}
        </div>
        <p className="mt-4 text-[12.5px] text-dc-ink-faint">
          Tekrar kuyruğu: {data.reviewDueCount} · kazanım sinyali: {data.evidenceCount}
        </p>
      </PanelCard>

      <PanelCard>
        <PanelCardTitle>Ödev geçmişi</PanelCardTitle>
        <div className="mt-3 space-y-2">
          {data.assignmentHistory.length ? (
            data.assignmentHistory.map((row) => (
              <PanelTaskRow
                key={row.id}
                title={row.title}
                meta={`${row.groupName} · ${row.status}${row.dueAt ? ` · ${DAY.format(row.dueAt)}` : ""}`}
              />
            ))
          ) : (
            <EmptyLine text="Ödev kaydı yok." />
          )}
        </div>
      </PanelCard>

      {data.outcomeHints.length ? (
        <PanelCard className="lg:col-span-2">
          <PanelCardTitle>Kazanım / tekrar ihtiyacı</PanelCardTitle>
          <ul className="mt-3 space-y-2 text-[13.5px] text-dc-ink-body">
            {data.outcomeHints.map((hint, index) => (
              <li key={`${hint.title}-${index}`}>
                {hint.subject} · {hint.title} · {hint.type}
              </li>
            ))}
          </ul>
        </PanelCard>
      ) : null}
    </div>
  );
}

function LessonsPanel({ data }: { data: NonNullable<Student360Bundle["lessons"]> }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <PanelCard>
        <PanelCardTitle>Gelecek dersler</PanelCardTitle>
        <div className="mt-3 space-y-2">
          {data.upcoming.length ? (
            data.upcoming.map((lesson) => (
              <PanelTaskRow
                key={lesson.id}
                title={lesson.title}
                meta={`${lesson.groupName} · ${DATE.format(lesson.startsAt)}`}
              />
            ))
          ) : (
            <EmptyLine text="Planlı ders yok." />
          )}
        </div>
        {data.recoveryOpenCount > 0 ? (
          <p className="mt-4 text-[13px] font-semibold text-[#A5764A]">
            {data.recoveryOpenCount} açık telafi paketi var.
          </p>
        ) : null}
      </PanelCard>

      <PanelCard>
        <PanelCardTitle>Geçmiş dersler</PanelCardTitle>
        <div className="mt-3 space-y-3">
          {data.past.length ? (
            data.past.map((lesson) => (
              <article key={lesson.id} className="border-b border-dc-line-soft pb-3 last:border-0 last:pb-0">
                <p className="text-[13.5px] font-semibold text-dc-ink">{lesson.title}</p>
                <p className="mt-1 text-[12.5px] text-dc-ink-muted">
                  {DAY.format(lesson.startsAt)}
                  {lesson.attendance
                    ? ` · ${ATTENDANCE_LABEL[lesson.attendance] ?? lesson.attendance}`
                    : ""}
                </p>
                {lesson.note ? (
                  <p className="mt-1.5 text-[13px] leading-5 text-dc-ink-body">{lesson.note}</p>
                ) : null}
              </article>
            ))
          ) : (
            <EmptyLine text="Tamamlanmış ders kaydı yok." />
          )}
        </div>
      </PanelCard>
    </div>
  );
}

function CoachingPanel({ data }: { data: NonNullable<Student360Bundle["coaching"]> }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <PanelCard>
        <PanelCardTitle>Haftalık plan</PanelCardTitle>
        {data.plan ? (
          <>
            <p className="mt-2 text-[13.5px] text-dc-ink-body">
              {data.plan.status}
              {data.plan.completionPercent != null
                ? ` · %${data.plan.completionPercent} tamamlandı`
                : ""}
            </p>
            <div className="mt-3 space-y-1">
              {data.plan.tasks.slice(0, 8).map((task) => (
                <PanelTaskRow
                  key={task.id}
                  title={task.title}
                  meta={`${task.status} · ${DAY.format(task.scheduledFor)}`}
                />
              ))}
            </div>
            {data.feedbackCategory ? (
              <p className="mt-3 text-[12.5px] text-dc-ink-faint">
                Plan geri bildirimi: {data.feedbackCategory}
              </p>
            ) : null}
          </>
        ) : (
          <EmptyLine text="Bu hafta için onaylı plan yok." />
        )}
      </PanelCard>

      <PanelCard>
        <PanelCardTitle>Koçluk özeti</PanelCardTitle>
        <dl className="mt-3 space-y-2.5 text-[13.5px] text-dc-ink-body">
          <div className="flex justify-between gap-3">
            <dt>Koç</dt>
            <dd className="font-semibold text-dc-ink">{data.coachName ?? "Atama yok"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Sıklık</dt>
            <dd>{data.cadenceDays ? `${data.cadenceDays} günde bir` : "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Durum</dt>
            <dd className={data.overdue ? "font-semibold text-[#C2493D]" : ""}>
              {data.overdue ? "Görüşme gecikmiş" : "Takipte"}
            </dd>
          </div>
        </dl>
        {data.sharedNote ? (
          <p className="mt-4 rounded-[10px] border border-dc-line-soft bg-dc-surface-soft px-3.5 py-3 text-[13.5px] leading-6 text-dc-ink-body">
            {data.sharedNote}
          </p>
        ) : (
          <p className="mt-4 text-[13px] text-dc-ink-muted">Paylaşılan koçluk notu yok.</p>
        )}
        {data.focus ? (
          <p className="mt-2 text-[12.5px] text-dc-ink-faint">Odak: {data.focus}</p>
        ) : null}
      </PanelCard>

      <PanelCard>
        <PanelCardTitle>Hedefler</PanelCardTitle>
        <div className="mt-3 space-y-2">
          {data.goals.length ? (
            data.goals.map((goal) => (
              <div key={goal.id} className="flex justify-between gap-3 text-[13.5px]">
                <span>{goal.label}</span>
                <span className="font-semibold text-dc-ink">
                  {goal.current == null ? "—" : goal.current} / {goal.target}
                </span>
              </div>
            ))
          ) : (
            <EmptyLine text="Hedef tanımlanmamış." />
          )}
        </div>
      </PanelCard>

      <PanelCard>
        <PanelCardTitle>Check-in geçmişi</PanelCardTitle>
        <div className="mt-3 space-y-2">
          {data.checkIns.length ? (
            data.checkIns.map((row) => (
              <PanelTaskRow
                key={row.id}
                title={`${row.energy} · ${row.barrier}`}
                meta={`${DAY.format(row.createdAt)}${row.shared ? " · öğretmenle paylaşıldı" : ""}`}
              />
            ))
          ) : (
            <EmptyLine text="Check-in kaydı yok." />
          )}
        </div>
      </PanelCard>
    </div>
  );
}

function ExamsPanel({ data }: { data: NonNullable<Student360Bundle["exams"]> }) {
  return (
    <div className="space-y-5">
      <PanelCard>
        <PanelCardTitle>Net değişimi</PanelCardTitle>
        <p className="mt-2 text-[14px] text-dc-ink-body">
          {data.netDelta == null
            ? "Kıyaslanacak en az iki deneme yok."
            : data.netDelta > 0
              ? `Son denemede ${data.netDelta.toFixed(1).replace(".", ",")} net düşüş var.`
              : data.netDelta < 0
                ? `Son denemede ${Math.abs(data.netDelta).toFixed(1).replace(".", ",")} net artış var.`
                : "Son iki denemede toplam net aynı."}
        </p>
        {data.recurringGaps.length ? (
          <ul className="mt-3 space-y-1 text-[13px] text-dc-ink-muted">
            {data.recurringGaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        ) : null}
      </PanelCard>

      <PanelCard>
        <PanelCardTitle>Son denemeler</PanelCardTitle>
        {data.recent.length ? (
          <div className="mt-3 space-y-4">
            {data.recent.map((exam) => (
              <article key={exam.id} className="border-b border-dc-line-soft pb-3 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[14px] font-semibold text-dc-ink">
                    {exam.exam} · {DAY.format(exam.takenAt)}
                  </p>
                  <p className="text-[13.5px] font-bold text-dc-ink">
                    {exam.totalNet.toFixed(1).replace(".", ",")} net
                  </p>
                </div>
                {exam.sections.length ? (
                  <p className="mt-1.5 text-[12.5px] text-dc-ink-muted">
                    {exam.sections
                      .map(
                        (section) =>
                          `${section.subject} ${section.net.toFixed(1).replace(".", ",")}`,
                      )
                      .join(" · ")}
                  </p>
                ) : (
                  <p className="mt-1.5 text-[12.5px] text-dc-ink-faint">
                    Bu kapsamda görüntülenebilir bölüm yok.
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyLine text="Hiç deneme kaydı yok." />
        )}
      </PanelCard>
    </div>
  );
}

function RiskPanel({ data }: { data: NonNullable<Student360Bundle["riskTab"]> }) {
  return (
    <div className="space-y-5">
      <PanelAttentionCard
        tone={data.summary.level === "high" ? "critical" : data.summary.level === "none" ? "info" : "warning"}
        title={`Risk: ${STUDENT_360_RISK_LEVEL_LABELS[data.summary.level]} (${data.summary.totalPoints} puan)`}
        body={
          data.summary.whyRisky.length
            ? data.summary.whyRisky.join(" ")
            : "Açık risk sinyali yok."
        }
      />

      <PanelCard>
        <PanelCardTitle>Risk sinyalleri</PanelCardTitle>
        <div className="mt-3 space-y-3">
          {data.summary.items.length ? (
            data.summary.items.map((item) => (
              <article
                key={`${item.code}-${item.reason}`}
                className="rounded-[10px] border border-dc-line-soft px-3.5 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13.5px] font-bold text-dc-ink">{item.reason}</p>
                  <PanelStatusBadge
                    label={`${item.points} puan · ${item.severity}`}
                    tone={
                      item.severity === "high"
                        ? "critical"
                        : item.severity === "medium"
                          ? "warning"
                          : "neutral"
                    }
                  />
                </div>
                <p className="mt-1.5 text-[12.5px] leading-5 text-dc-ink-muted">
                  Önerilen aksiyon: {item.suggestedAction}
                </p>
                <p className="mt-1 text-[12px] text-dc-ink-faint">
                  Durum: {item.status ?? "—"}
                  {item.ownerName ? ` · Sorumlu: ${item.ownerName}` : ""}
                  {item.detectedAt ? ` · ${DAY.format(item.detectedAt)}` : ""}
                </p>
              </article>
            ))
          ) : (
            <EmptyLine text="Risk sinyali üretilmedi." />
          )}
        </div>
      </PanelCard>

      <PanelCard>
        <PanelCardTitle>Müdahale kayıtları</PanelCardTitle>
        <div className="mt-3 space-y-3">
          {data.cases.length ? (
            data.cases.map((item) => (
              <article key={item.id} className="rounded-[10px] border border-dc-line-soft px-3.5 py-3">
                <p className="text-[13px] font-bold text-dc-ink">
                  {item.reasonCode} · {item.status}
                </p>
                <p className="mt-1 text-[13px] leading-5 text-dc-ink-body">{item.explanation}</p>
                <p className="mt-1 text-[12.5px] text-dc-ink-muted">{item.suggestedAction}</p>
                <p className="mt-1 text-[12px] text-dc-ink-faint">
                  Vade {DAY.format(item.dueAt)}
                  {item.ownerName ? ` · ${item.ownerName}` : ""}
                </p>
              </article>
            ))
          ) : (
            <EmptyLine text="Açık müdahale kaydı yok." />
          )}
        </div>
      </PanelCard>
    </div>
  );
}

function ParentPanel({
  data,
  studentId,
  canManage,
  parentOptions,
}: {
  data: NonNullable<Student360Bundle["parent"]>;
  studentId: string;
  canManage: boolean;
  parentOptions: { id: string; label: string }[];
}) {
  return (
    <div className="space-y-5">
      <PanelCard>
        <PanelCardTitle>Bağlı veliler</PanelCardTitle>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {data.parents.map((parent) => (
            <div
              key={parent.linkId}
              className="flex items-center justify-between gap-3 rounded-[10px] border border-dc-line p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold text-dc-ink">{parent.fullName}</p>
                <p className="mt-1 truncate text-[12px] text-dc-ink-muted">
                  {parent.email}
                  {parent.relationship ? ` · ${parent.relationship}` : ""}
                </p>
              </div>
              {canManage ? <RelationshipRemoveButton id={parent.linkId} /> : null}
            </div>
          ))}
          {!data.parents.length ? <EmptyLine text="Aktif veli bağlantısı yok." /> : null}
        </div>
        {canManage ? (
          <StudentParentLinkForm studentId={studentId} parents={parentOptions.map((p) => ({ id: p.id, name: p.label }))} />
        ) : null}
      </PanelCard>

      <PanelCard>
        <PanelCardTitle>Haftalık özetler</PanelCardTitle>
        <div className="mt-3 space-y-2">
          {data.digests.length ? (
            data.digests.map((digest) => (
              <PanelTaskRow
                key={digest.id}
                title={`${digest.trendBand} · ${digest.supportArea}`}
                meta={`${DAY.format(digest.weekStart)} · ${digest.status}${
                  digest.publishedAt ? ` · yayın ${DAY.format(digest.publishedAt)}` : ""
                }`}
              />
            ))
          ) : (
            <EmptyLine text="Yayınlanmış veya taslak haftalık özet yok." />
          )}
        </div>
      </PanelCard>
    </div>
  );
}

function CommercePanel({
  data,
  adminActions,
}: {
  data: NonNullable<Student360Bundle["commerce"]>;
  adminActions?: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <PanelCard>
        <PanelCardTitle>Paket durumu</PanelCardTitle>
        <p className="mt-2 text-[14px] font-semibold text-dc-ink">
          {STUDENT_360_PACKAGE_STATUS_LABELS[data.packageStatus]}
        </p>
        <dl className="mt-4 space-y-2 text-[13.5px] text-dc-ink-body">
          {data.memberships.map((membership) => (
            <div key={membership.product} className="flex justify-between gap-3">
              <dt>{membership.label}</dt>
              <dd>
                {membership.expiresAt
                  ? `Bitiş ${DAY.format(membership.expiresAt)}`
                  : "Süresiz / dönem tanımsız"}
              </dd>
            </div>
          ))}
          {!data.memberships.length ? <EmptyLine text="Aktif ürün üyeliği yok." /> : null}
        </dl>
      </PanelCard>

      <PanelCard>
        <PanelCardTitle>Siparişler ve provisioning</PanelCardTitle>
        <div className="mt-3 space-y-3">
          {data.orders.map((order) => (
            <article key={order.id} className="rounded-[10px] border border-dc-line-soft p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[13.5px] font-bold text-dc-ink">{order.packageName}</p>
                  <p className="mt-1 text-[12px] text-dc-ink-faint">
                    {DATE.format(order.createdAt)} · {(order.totalCents / 100).toLocaleString("tr-TR")} ₺
                  </p>
                </div>
                <Link
                  href={`/panel/yonetim/siparisler/${order.id}`}
                  className="text-[12.5px] font-semibold text-dc-brand hover:underline"
                >
                  Siparişi aç
                </Link>
              </div>
              <p className="mt-2 text-[12.5px] text-dc-ink-muted">
                Ödeme: {order.status} · Erişim: {order.provisioningStatus}
              </p>
              {order.provisioningError ? (
                <p className="mt-2 text-[12px] text-[#C2493D]">{order.provisioningError}</p>
              ) : null}
            </article>
          ))}
          {!data.orders.length ? <EmptyLine text="Sipariş kaydı yok." /> : null}
        </div>
      </PanelCard>

      {adminActions}
    </div>
  );
}

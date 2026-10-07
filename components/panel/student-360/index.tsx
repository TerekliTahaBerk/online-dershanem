import Link from "next/link";
import {
  EmptyState,
  PanelAttentionCard,
  PanelHeading,
  PanelStatusBadge,
  PropertyList,
  PropertyRow,
  ViewTabs,
  buttonClass,
} from "@/components/panel/ui";
import { productLabel } from "@/lib/auth/roles";
import { DinoExplanationAction } from "@/components/panel/dino-explanation-action";
import {
  STUDENT_360_PACKAGE_STATUS_LABELS,
  STUDENT_360_RISK_LEVEL_LABELS,
  STUDENT_360_GROUP_LABELS,
  STUDENT_360_TAB_LABELS,
  student360GroupHref,
  type Student360RiskLevel,
  type Student360Tab,
} from "@/lib/panel/student-360";
import { buildTeacherStudentRiskDeterministicReason } from "@/lib/panel/dino-explanations";

import { AcademicPanel } from "./AcademicPanel";
import { AssignmentsPanel } from "./AssignmentsPanel";
import { CalendarPanel } from "./CalendarPanel";
import { CoachingPanel } from "./CoachingPanel";
import { CommercePanel } from "./CommercePanel";
import { ExamsPanel } from "./ExamsPanel";
import { LessonsPanel } from "./LessonsPanel";
import { OverviewPanel } from "./OverviewPanel";
import { ParentPanel } from "./ParentPanel";
import { RiskPanel } from "./RiskPanel";
import { TeachersPanel } from "./TeachersPanel";
import { DATE } from "./shared";
import type { Student360ViewProps } from "./types";

function riskTone(
  level: Student360RiskLevel,
): "neutral" | "success" | "warning" | "critical" {
  if (level === "high") return "critical";
  if (level === "medium") return "warning";
  if (level === "low") return "warning";
  return "success";
}

export function Student360View({
  bundle,
  listHref,
  adminActions,
  dinoEnabled = false,
}: Student360ViewProps) {
  const { summary, actions, basePath, group, groups, view, sections } = bundle;
  const shows = (section: Student360Tab) => sections.includes(section);
  const learningViews = bundle.tabs.filter((section): section is "dersler" | "odevler" | "takvim" | "gelisim" =>
    section === "dersler" || section === "odevler" || section === "takvim" || section === "gelisim",
  );
  const packageLabel = bundle.access.canViewCommerce
    ? STUDENT_360_PACKAGE_STATUS_LABELS[summary.packageStatus]
    : summary.productLabels.length
      ? summary.productLabels.join(" · ")
      : "Ürün erişimi yok";
  const showTeacherDino = dinoEnabled && bundle.access.role === "TEACHER";
  const riskReason = buildTeacherStudentRiskDeterministicReason(
    summary.risk.whyRisky,
  );

  return (
    <div className="max-w-[1100px]">
      <p className="text-[13px] text-dc-ink-faint">
        <Link
          href={listHref}
          className="hover:text-dc-brand-hover hover:underline"
        >
          Öğrenciler
        </Link>
      </p>

      <div className="mt-2">
        <PanelHeading
          eyebrow="Öğrenci profili"
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

      <div className="mt-4">
        <PropertyList>
          <PropertyRow label="Ürünler">{summary.productLabels.length ? summary.productLabels.join(" · ") : "Yok"}</PropertyRow>
          <PropertyRow label="Grup / öğretmen">
            {summary.groups.length ? summary.groups.map((item) => `${item.name} · ${item.teacherName}`).join(", ") : "Aktif grup yok"}
          </PropertyRow>
          <PropertyRow label="Koç">{summary.coachName || "Atanmadı"}</PropertyRow>
          <PropertyRow label="Paket">{packageLabel}</PropertyRow>
          <PropertyRow label="Son aktivite">{summary.lastActivityAt ? DATE.format(summary.lastActivityAt) : "Kayıt yok"}</PropertyRow>
          <PropertyRow label="Risk puanı">{String(summary.risk.totalPoints)}</PropertyRow>
        </PropertyList>
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
              className={buttonClass("secondary", "sm")}
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-6">
        <ViewTabs
          label="Öğrenci profili sekmeleri"
          activeId={group}
          tabs={groups.map((item) => ({ id: item, label: STUDENT_360_GROUP_LABELS[item], href: student360GroupHref(basePath, item) }))}
        />
      </div>

      {group === "ogrenme" && learningViews.length > 1 ? (
        <nav aria-label="Öğrenme görünümü" className="mt-3 flex flex-wrap gap-1.5">
          {learningViews.map((item) => (
            <Link
              key={item}
              href={student360GroupHref(basePath, "ogrenme", item)}
              aria-current={view === item ? "page" : undefined}
              className={`inline-flex min-h-8 items-center rounded-full border px-3 text-[13px] ${
                view === item ? "border-pn-text bg-pn-text font-semibold text-white" : "border-pn-border text-pn-text-secondary hover:bg-pn-hover"
              }`}
            >
              {STUDENT_360_TAB_LABELS[item]}
            </Link>
          ))}
        </nav>
      ) : null}

      <div className="mt-5 space-y-5">
        {shows("genel") && bundle.overview ? <OverviewPanel data={bundle.overview} /> : null}
        {group === "genel" && (bundle.teachersTab || bundle.parent) ? (
          <section id="iliskiler" aria-labelledby="iliskiler-baslik" className="scroll-mt-24 space-y-5">
            <h2 id="iliskiler-baslik" className="text-[15px] font-semibold text-pn-text">
              Öğretmenler ve veliler
            </h2>
            {bundle.teachersTab ? (
              <TeachersPanel
                data={bundle.teachersTab}
                studentId={bundle.access.studentProfileId}
                teacherOptions={bundle.teacherOptions}
                canManage={bundle.access.role === "ADMIN"}
              />
            ) : null}
            {bundle.parent ? (
              <ParentPanel
                data={bundle.parent}
                studentId={bundle.access.studentProfileId}
                canManage={bundle.access.role === "ADMIN"}
                parentOptions={bundle.parentOptions}
              />
            ) : null}
          </section>
        ) : null}
        {shows("gelisim") && bundle.academic ? <AcademicPanel data={bundle.academic} /> : null}
        {shows("dersler") && bundle.lessons ? <LessonsPanel data={bundle.lessons} /> : null}
        {shows("takvim") && bundle.lessons ? <CalendarPanel data={bundle.lessons} /> : null}
        {shows("odevler") && bundle.assignmentsTab ? <AssignmentsPanel data={bundle.assignmentsTab} /> : null}
        {shows("kocluk") && bundle.coaching ? <CoachingPanel data={bundle.coaching} /> : null}
        {shows("denemeler") && bundle.exams ? <ExamsPanel data={bundle.exams} /> : null}
        {shows("risk") && bundle.riskTab ? <RiskPanel data={bundle.riskTab} /> : null}
        {shows("paket") && bundle.commerce ? <CommercePanel data={bundle.commerce} adminActions={adminActions} /> : null}
        {shows("paket") && adminActions && bundle.access.role === "ADMIN" && !bundle.commerce ? adminActions : null}
        {group === "etkinlik" ? (
          bundle.timeline && bundle.timeline.length ? (
            <ol aria-label="Etkinlik zaman çizelgesi" className="divide-y divide-pn-border-subtle rounded-lg border border-pn-border">
              {bundle.timeline.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5 text-[13.5px]">
                  <span className="min-w-0">
                    {entry.product ? <span className="mr-2 text-[12px] font-semibold text-pn-text-muted">{productLabel(entry.product)}</span> : null}
                    <span className="text-pn-text">{entry.title}</span>
                    {entry.summary ? <span className="text-pn-text-secondary"> · {entry.summary}</span> : null}
                  </span>
                  <time dateTime={entry.occurredAt.toISOString()} className="shrink-0 text-[12.5px] text-pn-text-muted">
                    {DATE.format(entry.occurredAt)}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="Henüz kayıtlı etkinlik yok." body="Ders, ödev, koçluk ve deneme olayları burada tek akışta görünür." />
          )
        ) : null}
      </div>

      {bundle.access.role === "ADMIN" && group === "genel" ? adminActions : null}
    </div>
  );
}

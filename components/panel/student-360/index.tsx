import Link from "next/link";
import {
  PanelAttentionCard,
  PanelFilterLink,
  PanelHeading,
  PanelStatusBadge,
} from "@/components/panel/ui";
import { DinoExplanationAction } from "@/components/panel/dino-explanation-action";
import {
  STUDENT_360_PACKAGE_STATUS_LABELS,
  STUDENT_360_RISK_LEVEL_LABELS,
  STUDENT_360_TAB_LABELS,
  student360TabHref,
  type Student360RiskLevel,
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

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-dc-ink-faint">
        {label}
      </p>
      <p className="mt-1 truncate text-[13.5px] font-semibold text-dc-ink">
        {value}
      </p>
    </div>
  );
}

export function Student360View({
  bundle,
  listHref,
  adminActions,
  dinoEnabled = false,
}: Student360ViewProps) {
  const { summary, tab, tabs, actions, basePath } = bundle;
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
          value={
            summary.productLabels.length
              ? summary.productLabels.join(" · ")
              : "Yok"
          }
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
          value={
            summary.lastActivityAt
              ? DATE.format(summary.lastActivityAt)
              : "Kayıt yok"
          }
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

      <nav
        className="mt-6 flex flex-wrap gap-2"
        aria-label="Öğrenci 360 sekmeleri"
      >
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
        {tab === "genel" && bundle.overview ? (
          <OverviewPanel data={bundle.overview} />
        ) : null}
        {tab === "gelisim" && bundle.academic ? (
          <AcademicPanel data={bundle.academic} />
        ) : null}
        {tab === "dersler" && bundle.lessons ? (
          <LessonsPanel data={bundle.lessons} />
        ) : null}
        {tab === "takvim" && bundle.lessons ? (
          <CalendarPanel data={bundle.lessons} />
        ) : null}
        {tab === "odevler" && bundle.assignmentsTab ? (
          <AssignmentsPanel data={bundle.assignmentsTab} />
        ) : null}
        {tab === "ogretmenler" && bundle.teachersTab ? (
          <TeachersPanel
            data={bundle.teachersTab}
            studentId={bundle.access.studentProfileId}
            teacherOptions={bundle.teacherOptions}
            canManage={bundle.access.role === "ADMIN"}
          />
        ) : null}
        {tab === "kocluk" && bundle.coaching ? (
          <CoachingPanel data={bundle.coaching} />
        ) : null}
        {tab === "denemeler" && bundle.exams ? (
          <ExamsPanel data={bundle.exams} />
        ) : null}
        {tab === "risk" && bundle.riskTab ? (
          <RiskPanel data={bundle.riskTab} />
        ) : null}
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
        {tab === "paket" &&
        adminActions &&
        bundle.access.role === "ADMIN" &&
        !bundle.commerce
          ? adminActions
          : null}
      </div>

      {bundle.access.role === "ADMIN" && tab === "genel" ? adminActions : null}
    </div>
  );
}

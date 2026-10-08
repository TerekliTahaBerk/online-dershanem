import Link from "next/link";
import {
  PageHeader,
  PanelAttentionCard,
  PropertyList,
  PropertyRow,
  StatusBadge,
  ViewTabs,
  buttonClass,
} from "@/components/panel/ui";
import {
  GROUP_360_OPS_STATUS_LABELS,
  GROUP_360_TAB_LABELS,
  group360TabHref,
} from "@/lib/panel/group-360";
import type { Group360Bundle } from "@/lib/panel/group-360-server";
import { GROUP_360_DATE, opsTone } from "./shared";
import { OverviewPanel } from "./overview-panel";
import { StudentsPanel } from "./students-panel";
import { ProgramPanel } from "./program-panel";
import { HistoryPanel } from "./history-panel";
import { OpsPanel } from "./ops-panel";

/**
 * GRUP 360 — sunucu bileşeni (Design Phase 8, RSC split).
 *
 * Sekmeler URL'den (`?sekme=`) gelir; başlık, özet, dikkat satırı, eylemler,
 * sekme gezintisi ve salt okunur sekmeler sunucuda çizilir. Yalnız etkileşimli
 * sekmeler (Öğrenciler, Operasyon) istemci adasıdır.
 */
export function Group360View({ bundle }: { bundle: Group360Bundle }) {
  const { summary, tab, tabs, actions, basePath } = bundle;

  return (
    <div className="max-w-[1100px]">
      <nav aria-label="Konum" className="text-[13px] text-pn-text-muted">
        <Link
          href="/panel/yonetim/egitim"
          className="hover:text-pn-text hover:underline"
        >
          Gruplar ve dersler
        </Link>
      </nav>

      <div className="mt-2">
        <PageHeader
          eyebrow="Grup 360"
          title={summary.name}
          description={`${summary.subject}${summary.level ? ` · ${summary.level}` : ""} · ${summary.teacher.name}`}
          metadata={`Operasyon: ${summary.ops.label}`}
          actions={
            <StatusBadge
              label={GROUP_360_OPS_STATUS_LABELS[summary.ops.status]}
              tone={opsTone(summary.ops.status)}
              live={summary.ops.status === "critical"}
            />
          }
        />
      </div>

      <PropertyList className="mt-5">
        <PropertyRow label="Durum">
          {summary.isActive ? "Aktif" : "Arşiv"}
        </PropertyRow>
        <PropertyRow label="Kapasite">
          {`${summary.activeStudentCount}/${summary.capacity}`}
        </PropertyRow>
        <PropertyRow label="Ana öğretmen">{summary.teacher.name}</PropertyRow>
        <PropertyRow label="Haftalık ders">
          {String(summary.weeklyLessonCount)}
        </PropertyRow>
        <PropertyRow label="Bir sonraki ders">
          {summary.nextLesson
            ? `${summary.nextLesson.title} · ${GROUP_360_DATE.format(summary.nextLesson.startsAt)}`
            : "Planlı ders yok"}
        </PropertyRow>
        <PropertyRow label="Operasyon">{summary.ops.label}</PropertyRow>
      </PropertyList>

      {summary.ops.whyAttention.length ? (
        <PanelAttentionCard
          className="mt-4"
          headingLevel={2}
          tone={summary.ops.status === "critical" ? "critical" : "warning"}
          title="Bu grupla ilgili şu an çözülmesi gereken bir sorun var mı?"
          body={summary.ops.whyAttention.join(" ")}
        />
      ) : (
        <PanelAttentionCard
          className="mt-4"
          headingLevel={2}
          tone="info"
          title="Bu grupla ilgili şu an çözülmesi gereken bir sorun var mı?"
          body="Hayır — açık operasyon sorunu görünmüyor."
        />
      )}

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
          label="Grup 360 sekmeleri"
          activeId={tab}
          tabs={tabs.map((item) => ({
            id: item,
            label: GROUP_360_TAB_LABELS[item],
            href: group360TabHref(basePath, item),
          }))}
        />
      </div>

      <div>
        {tab === "genel" && bundle.overview ? (
          <OverviewPanel data={bundle.overview} />
        ) : null}
        {tab === "ogrenciler" && bundle.students ? (
          <StudentsPanel
            groupId={summary.id}
            isActive={summary.isActive}
            members={bundle.students.members}
            targetGroups={bundle.targetGroups}
          />
        ) : null}
        {tab === "program" && bundle.program ? (
          <ProgramPanel data={bundle.program} />
        ) : null}
        {tab === "gecmis" && bundle.history ? (
          <HistoryPanel data={bundle.history} />
        ) : null}
        {tab === "operasyon" && bundle.opsTab ? (
          <OpsPanel groupId={summary.id} data={bundle.opsTab} />
        ) : null}
      </div>
    </div>
  );
}

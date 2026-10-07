import Link from "next/link";
import type { OdkExamStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAnyStaffPermission } from "@/lib/auth/guards";
import { ODK_EXAM_LIST_PERMISSIONS } from "@/lib/products/staff-permission-matrix";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  EmptyState,
  PageHeader,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
  StatusBadge,
  ViewTabs,
  buttonClass,
} from "@/components/panel/ui";
import { AdminExamCreate } from "@/components/odk/admin-exam-create";
import { examStatusPresentation } from "@/lib/odk/presentation";
import { getOdkExamReadiness } from "@/lib/odk/admin-exam-server";
import { listActiveExamFamilies } from "@/lib/products/registry";
import { asLegacyOdkExamFamily, getOdkExamFamilyCode } from "@/lib/odk/exam-family";
import {
  ODK_EXAM_VIEWS,
  defaultExamView,
  examViewOf,
  examWorkspaceHref,
  isOdkExamView,
  type OdkExamViewId,
} from "@/lib/odk/staff-workspace";
import { SUBMITTED_STATUSES, loadStaffViewer } from "../staff-data";

export const dynamic = "force-dynamic";
const statuses: OdkExamStatus[] = ["DRAFT", "READY", "SCHEDULED", "LIVE", "ENDED", "SCORED", "RELEASED", "ARCHIVED"];
const DATE = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });
const TONE = { neutral: "neutral", info: "info", warning: "warning", success: "success", danger: "critical" } as const;
/** Hazırlık sorunu sayımı satır başına sürüm okur; tabloyu hafif tutmak için sınır. */
const READINESS_ROW_LIMIT = 25;

/**
 * DENEMELER (docs/panel-design-roadmap.md §15.4) — kayıtlı görünümler
 * (`?gorunum=`), role göre varsayılan görünüm, tek tablo. Eski `?durum=`
 * süzgeci çalışmaya devam eder (görünüm "Tümü" olur). "Yeni deneme" yalnız
 * `odk:exam:edit` ile (uç ayrıca doğrular).
 */
export default async function OdkAdminExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; aile?: string; durum?: string; gorunum?: string }>;
}) {
  const session = await requireAnyStaffPermission(ODK_EXAM_LIST_PERMISSIONS);
  const viewer = await loadStaffViewer(session.userId);
  const canCreate = viewer.permissions.has("odk:exam:edit");
  const params = await searchParams;
  const familyRecords = await listActiveExamFamilies();
  const familyRecord = familyRecords.find((item) => item.code === params.aile);
  const status = statuses.includes(params.durum as OdkExamStatus) ? (params.durum as OdkExamStatus) : undefined;
  const view: OdkExamViewId = status ? "tumu" : isOdkExamView(params.gorunum) ? params.gorunum : defaultExamView(viewer);
  const query = params.q?.trim().slice(0, 80) || "";
  const where: Prisma.OdkExamWhereInput = {
    ...(familyRecord ? { examFamilyRefId: familyRecord.id } : {}),
    ...(status ? { status } : {}),
    ...(query ? { title: { contains: query, mode: "insensitive" } } : {}),
  };
  const now = new Date();
  const [series, exams] = await Promise.all([
    canCreate
      ? prisma.odkExamSeries.findMany({
          where: { isActive: true },
          orderBy: [{ title: "asc" }],
          select: { id: true, title: true, family: true, examFamilyRef: { select: { code: true } } },
        })
      : Promise.resolve([]),
    prisma.odkExam.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        startsAt: true,
        endsAt: true,
        family: true,
        examFamilyRef: { select: { code: true } },
        series: { select: { title: true } },
        _count: {
          select: {
            assignments: { where: { isActive: true } },
            attempts: { where: { status: { not: "VOID" } } },
          },
        },
        attempts: { where: { status: { in: [...SUBMITTED_STATUSES] } }, select: { id: true } },
      },
    }),
  ]);

  const counts = new Map<OdkExamViewId, number>(ODK_EXAM_VIEWS.map((item) => [item.id, 0]));
  for (const exam of exams) {
    const id = examViewOf(exam, now);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  counts.set("tumu", exams.filter((exam) => exam.status !== "ARCHIVED").length);
  const shown = exams.filter((exam) => (view === "tumu" ? status === "ARCHIVED" || exam.status !== "ARCHIVED" : examViewOf(exam, now) === view));
  const drafts = shown.filter((exam) => exam.status === "DRAFT").slice(0, READINESS_ROW_LIMIT);
  const blockingByExam = new Map(
    await Promise.all(
      drafts.map(async (exam) => {
        const { issues } = await getOdkExamReadiness(exam.id);
        return [exam.id, issues.filter((issue) => issue.level === "error").length] as const;
      }),
    ),
  );

  const hrefFor = (next: OdkExamViewId) => {
    const search = new URLSearchParams();
    search.set("gorunum", next);
    if (query) search.set("q", query);
    if (familyRecord) search.set("aile", familyRecord.code);
    return `/panel/odk/yonetim/sinavlar?${search.toString()}`;
  };

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK" pageTitle="Denemeler">
      <PageHeader
        title="Denemeler"
        description="Taslak → hazır → plan → canlı → puanlama → yayın. Sonuçlar yayınlanmadan öğrenciye açılmaz."
        actions={
          canCreate ? (
            <AdminExamCreate
              series={series.map((item) => ({ id: item.id, title: item.title, familyCode: getOdkExamFamilyCode(item) }))}
              families={familyRecords.map((item) => ({ code: item.code, name: item.name, legacy: Boolean(asLegacyOdkExamFamily(item.code)) }))}
            />
          ) : undefined
        }
      />

      <div className="mt-2">
        <ViewTabs
          label="Deneme görünümleri"
          activeId={view}
          tabs={ODK_EXAM_VIEWS.map((item) => ({ id: item.id, label: item.label, href: hrefFor(item.id), count: counts.get(item.id) }))}
        />
      </div>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="gorunum" value={view} />
        <label className="grid min-w-[200px] flex-1 gap-1 text-[12.5px] font-medium text-pn-text-muted sm:max-w-xs">
          Deneme ara
          <input
            name="q"
            defaultValue={query}
            placeholder="Deneme adı"
            className="min-h-9 rounded-md border border-pn-border-strong bg-white px-3 text-[14px] text-pn-text"
          />
        </label>
        <label className="grid gap-1 text-[12.5px] font-medium text-pn-text-muted">
          Tür
          <select name="aile" defaultValue={familyRecord?.code || ""} className="min-h-9 rounded-md border border-pn-border-strong bg-white px-2 text-[14px] text-pn-text">
            <option value="">Tüm türler</option>
            {familyRecords.map((item) => (
              <option key={item.id} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button className={buttonClass("secondary", "sm", "min-h-9")}>Süz</button>
        {query || familyRecord || status ? (
          <Link href={hrefFor(view)} className={buttonClass("ghost", "sm", "min-h-9")}>
            Süzgeci temizle
          </Link>
        ) : null}
      </form>

      {shown.length ? (
        <PanelTable
          caption={`Denemeler · ${ODK_EXAM_VIEWS.find((item) => item.id === view)?.label}`}
          columns={["Deneme", "Tür", "Seri", "Durum", "Başlangıç", "Hazırlık", "Atanan", "Katılım", ""]}
        >
          {shown.map((exam) => {
            const presentation = examStatusPresentation[exam.status];
            const blocking = blockingByExam.get(exam.id);
            const examView = examViewOf(exam, now);
            return (
              <PanelTableRow key={exam.id}>
                <PanelTableCell>
                  <Link href={examWorkspaceHref(exam.id)} className="font-medium text-pn-text underline-offset-2 hover:underline">
                    {exam.title}
                  </Link>
                </PanelTableCell>
                <PanelTableCell>{getOdkExamFamilyCode(exam)}</PanelTableCell>
                <PanelTableCell>{exam.series?.title || "—"}</PanelTableCell>
                <PanelTableCell>
                  <StatusBadge tone={TONE[presentation.tone]} label={presentation.label} live={examView === "canli"} />
                </PanelTableCell>
                <PanelTableCell>
                  <span className="tabular-nums">{exam.startsAt ? DATE.format(exam.startsAt) : "—"}</span>
                </PanelTableCell>
                <PanelTableCell tone={blocking ? "warn" : "default"}>
                  {exam.status === "DRAFT"
                    ? blocking === undefined
                      ? "—"
                      : blocking
                        ? `${blocking} sorun`
                        : "Kilitlenmeye hazır"
                    : "Sürüm kilitli"}
                </PanelTableCell>
                <PanelTableCell>
                  <span className="tabular-nums">{exam._count.assignments}</span>
                </PanelTableCell>
                <PanelTableCell>
                  <span className="tabular-nums">
                    {exam._count.attempts ? `${exam.attempts.length}/${exam._count.attempts}` : "—"}
                  </span>
                </PanelTableCell>
                <PanelTableCell label="Eylem">
                  {examView === "canli" && viewer.permissions.has("odk:ops:live") ? (
                    <Link href={`/panel/odk/yonetim/operasyon?deneme=${exam.id}`} className={buttonClass("ghost", "sm")}>
                      Canlı izle<span className="sr-only"> · {exam.title}</span>
                    </Link>
                  ) : examView === "puanlama" && viewer.permissions.has("odk:result:score") ? (
                    <Link href={examWorkspaceHref(exam.id, "puanlama")} className={buttonClass("ghost", "sm")}>
                      Puanlama<span className="sr-only"> · {exam.title}</span>
                    </Link>
                  ) : (
                    <Link href={examWorkspaceHref(exam.id)} className={buttonClass("ghost", "sm")}>
                      Aç<span className="sr-only"> · {exam.title}</span>
                    </Link>
                  )}
                </PanelTableCell>
              </PanelTableRow>
            );
          })}
        </PanelTable>
      ) : (
        <EmptyState
          className="mt-5"
          title={query || familyRecord ? "Süzgece uygun deneme bulunamadı." : "Bu görünümde deneme yok."}
          body={query || familyRecord ? "Süzgeci temizleyin ya da başka bir görünüm seçin." : "Başka bir görünüm seçin."}
          action={
            <Link href={hrefFor("tumu")} className={buttonClass("secondary", "sm")}>
              Tüm denemeler
            </Link>
          }
        />
      )}
    </PanelShell>
  );
}

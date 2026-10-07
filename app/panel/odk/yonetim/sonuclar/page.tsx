import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaffPermission } from "@/lib/auth/guards";
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
import { getOdkExamFamilyCode } from "@/lib/odk/exam-family";
import { PUBLICATION_STAGES, examWorkspaceHref, publicationStageOf, type PublicationStage } from "@/lib/odk/staff-workspace";
import { SUBMITTED_STATUSES } from "../staff-data";

export const dynamic = "force-dynamic";

const DATE_TIME = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });
const QUEUE_TABS: Array<{ id: "kuyruk" | PublicationStage | "tumu"; label: string }> = [
  { id: "kuyruk", label: "İş kuyruğu" },
  { id: "PUANLANIYOR", label: "Puanlama bekliyor" },
  { id: "INCELEME", label: "Yayın bekliyor" },
  { id: "YAYINLANDI", label: "Yayınlandı" },
  { id: "tumu", label: "Tümü" },
];
const ACTION: Record<PublicationStage, string> = {
  PUANLANIYOR: "Puanla",
  INCELEME: "Yayın önizleme",
  BEKLIYOR: "Aç",
  YAYINLANDI: "Sonuçları gör",
};

/**
 * PUANLAMA VE YAYIN (docs/panel-design-roadmap.md §15.4, §15.6) — yayın akışı
 * kuyruğu. Aşama: penceresi bitmiş + puansız teslim → Puanlama bekliyor;
 * SCORED → Yayın bekliyor; RELEASED → Yayınlandı. Puanlamanın tamamlanması
 * sonucu açmaz; yayın ayrı, iki adımlı ve geri alınamaz bir eylemdir
 * (çalışma alanı "Puanlama ve yayın" sekmesi).
 */
export default async function OdkAdminResultsHubPage({ searchParams }: { searchParams: Promise<{ asama?: string }> }) {
  // Deneme Ligi personel izni (ADMIN her izinde geçer); global rol tek başına yetmez.
  const session = await requireStaffPermission("odk:result:score");
  const requested = (await searchParams).asama;
  const tab = QUEUE_TABS.find((item) => item.id === requested)?.id ?? "kuyruk";
  const now = new Date();
  const exams = await prisma.odkExam.findMany({
    where: {
      OR: [{ status: { in: ["ENDED", "SCORED", "RELEASED"] } }, { status: { in: ["SCHEDULED", "LIVE"] }, endsAt: { lte: now } }],
    },
    orderBy: [{ endsAt: "desc" }, { updatedAt: "desc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      family: true,
      examFamilyRef: { select: { code: true } },
      status: true,
      startsAt: true,
      endsAt: true,
      resultsReleasedAt: true,
      _count: { select: { assignments: { where: { isActive: true } } } },
      attempts: {
        where: { status: { in: [...SUBMITTED_STATUSES] } },
        select: { integrityLevel: true, integrityReviewedAt: true, score: { select: { publicationStatus: true } } },
      },
    },
  });
  const rows = exams.map((exam) => {
    const unscored = exam.attempts.filter((attempt) => !attempt.score).length;
    return {
      exam,
      unscored,
      scored: exam.attempts.length - unscored,
      published: exam.attempts.filter((attempt) => attempt.score?.publicationStatus === "PUBLISHED").length,
      review: exam.attempts.filter((attempt) => attempt.integrityLevel !== "NORMAL" && !attempt.integrityReviewedAt).length,
      stage: publicationStageOf({ ...exam, unscored }, now),
    };
  });
  const counts = new Map<string, number>([
    ["kuyruk", rows.filter((row) => row.stage === "PUANLANIYOR" || row.stage === "INCELEME").length],
    ["tumu", rows.length],
    ...PUBLICATION_STAGES.map((stage) => [stage.id, rows.filter((row) => row.stage === stage.id).length] as [string, number]),
  ]);
  const shown = rows.filter((row) =>
    tab === "tumu" ? true : tab === "kuyruk" ? row.stage === "PUANLANIYOR" || row.stage === "INCELEME" : row.stage === tab,
  );

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK" pageTitle="Puanlama ve yayın">
      <PageHeader
        title="Puanlama ve yayın"
        description="Puanlama sonucu öğrenciye açmaz. Yayın ayrı, iki adımlı ve geri alınamaz bir eylemdir."
      />
      <div className="mt-2">
        <ViewTabs
          label="Yayın akışı aşamaları"
          activeId={tab}
          tabs={QUEUE_TABS.map((item) => ({
            id: item.id,
            label: item.label,
            href: item.id === "kuyruk" ? "/panel/odk/yonetim/sonuclar" : `/panel/odk/yonetim/sonuclar?asama=${item.id}`,
            count: counts.get(item.id) ?? 0,
          }))}
        />
      </div>
      {shown.length ? (
        <PanelTable caption="Puanlama ve yayın kuyruğu" columns={["Deneme", "Tür", "Bitiş", "Teslim", "Puanlanan", "Bütünlük", "Aşama", ""]}>
          {shown.map(({ exam, scored, unscored, published, review, stage }) => {
            const stagePresentation = PUBLICATION_STAGES.find((item) => item.id === stage)!;
            return (
              <PanelTableRow key={exam.id}>
                <PanelTableCell>
                  <Link href={examWorkspaceHref(exam.id, "puanlama")} className="font-medium text-pn-text underline-offset-2 hover:underline">
                    {exam.title}
                  </Link>
                </PanelTableCell>
                <PanelTableCell>{getOdkExamFamilyCode(exam)}</PanelTableCell>
                <PanelTableCell>
                  <span className="tabular-nums">{exam.endsAt ? DATE_TIME.format(exam.endsAt) : "—"}</span>
                </PanelTableCell>
                <PanelTableCell>
                  <span className="tabular-nums">
                    {exam.attempts.length}
                    {exam._count.assignments ? `/${exam._count.assignments}` : ""}
                  </span>
                </PanelTableCell>
                <PanelTableCell tone={unscored ? "warn" : "default"}>
                  <span className="tabular-nums">
                    {scored}
                    {unscored ? ` · ${unscored} eksik` : ""}
                  </span>
                </PanelTableCell>
                <PanelTableCell tone={review ? "warn" : "default"}>{review ? `${review} incelenmedi` : "—"}</PanelTableCell>
                <PanelTableCell>
                  <StatusBadge
                    tone={stagePresentation.tone}
                    label={stage === "YAYINLANDI" ? `Yayınlandı · ${published}` : stagePresentation.label}
                  />
                </PanelTableCell>
                <PanelTableCell label="Eylem">
                  <Link href={examWorkspaceHref(exam.id, review && stage !== "YAYINLANDI" ? "butunluk" : "puanlama")} className={buttonClass(stage === "YAYINLANDI" ? "ghost" : "secondary", "sm")}>
                    {review && stage !== "YAYINLANDI" ? "İncele" : ACTION[stage]}
                    <span className="sr-only"> · {exam.title}</span>
                  </Link>
                </PanelTableCell>
              </PanelTableRow>
            );
          })}
        </PanelTable>
      ) : (
        <EmptyState
          className="mt-5"
          title={tab === "kuyruk" ? "Puanlama ya da yayın bekleyen deneme yok." : "Bu aşamada deneme yok."}
          body="Sınav penceresi biten denemeler burada sıraya girer."
          action={
            <Link href="/panel/odk/yonetim/sinavlar" className={buttonClass("secondary", "sm")}>
              Denemelere git
            </Link>
          }
        />
      )}
    </PanelShell>
  );
}

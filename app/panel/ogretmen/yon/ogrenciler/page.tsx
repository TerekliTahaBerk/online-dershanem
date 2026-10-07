import Link from "next/link";
import { requireTeacherStaffPermission } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { ISTANBUL_TIME_ZONE } from "@/lib/istanbul-time";
import { PanelShell } from "@/components/panel/panel-shell";
import { AttentionBadge } from "@/components/panel/yon/attention-badge";
import { ExamCell } from "@/components/panel/yon/exam-cell";
import {
  EmptyState,
  PageHeader,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
  ViewTabs,
  buttonClass,
} from "@/components/panel/ui";
import { loadCoachWorkspace } from "../coach-workspace-data";

export const dynamic = "force-dynamic";

/**
 * KOÇ · ÖĞRENCİLERİM (docs/panel-design-roadmap.md §7.4) — aktif koçluk
 * öğrencilerinin tam tablosu. Görünüm sekmeleri (`?gorunum=`): Tümü /
 * Dikkat bekleyen / Yolunda. Kapsam ve yetki koç çalışma alanıyla aynıdır.
 */

const DATE_TIME = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const VIEWS = ["tumu", "dikkat", "yolunda"] as const;
type View = (typeof VIEWS)[number];

export default async function CoachStudentsPage({ searchParams }: { searchParams: Promise<{ gorunum?: string | string[] }> }) {
  const session = await requireTeacherStaffPermission("ok:coaching:write");
  const flags = getPanelFeatureFlags();
  const requested = (await searchParams).gorunum;
  const view: View = typeof requested === "string" && (VIEWS as readonly string[]).includes(requested) ? (requested as View) : "tumu";
  const { signals, workspace, lastExam } = await loadCoachWorkspace(session.userId, flags);

  const attention = signals.filter((item) => workspace.primaryReason.get(item.studentId));
  const rows = (view === "dikkat" ? attention : view === "yolunda" ? signals.filter((item) => !workspace.primaryReason.get(item.studentId)) : signals)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} pageTitle="Öğrencilerim">
      <div className="max-w-[1100px]">
        <PageHeader title="Öğrencilerim" description={`${signals.length} aktif öğrenci · ${attention.length} dikkat bekliyor`} />
        <div className="mt-5">
          <ViewTabs
            label="Öğrenci görünümü"
            activeId={view}
            tabs={[
              { id: "tumu", label: "Tümü", href: "/panel/ogretmen/yon/ogrenciler", count: signals.length },
              { id: "dikkat", label: "Dikkat bekleyen", href: "/panel/ogretmen/yon/ogrenciler?gorunum=dikkat", count: attention.length },
              { id: "yolunda", label: "Yolunda", href: "/panel/ogretmen/yon/ogrenciler?gorunum=yolunda", count: signals.length - attention.length },
            ]}
          />
        </div>
        <div className="mt-4">
          {rows.length ? (
            <PanelTable caption="Öğrencilerim" columns={["Öğrenci", "Sınav", "Haftalık uyum", "Son deneme", "Sonraki görüşme", "Durum", ""]}>
              {rows.map((item) => (
                <PanelTableRow key={item.studentId}>
                  <PanelTableCell>
                    <Link href={`/panel/ogretmen/hazirlik/${item.studentId}`} className="font-medium text-pn-text underline-offset-2 hover:underline">
                      {item.name}
                    </Link>
                  </PanelTableCell>
                  <PanelTableCell>{item.targetGoal || "—"}</PanelTableCell>
                  <PanelTableCell>{item.planCompletionPct == null ? "—" : `%${item.planCompletionPct}`}</PanelTableCell>
                  <PanelTableCell>
                    <ExamCell exam={lastExam.get(item.studentId)} />
                  </PanelTableCell>
                  <PanelTableCell>{item.nextScheduledAt ? DATE_TIME.format(item.nextScheduledAt) : "Planlanmadı"}</PanelTableCell>
                  <PanelTableCell>
                    <AttentionBadge reason={workspace.primaryReason.get(item.studentId) ?? null} />
                  </PanelTableCell>
                  <PanelTableCell>
                    <Link href={`/panel/ogretmen/hazirlik/${item.studentId}?sekme=plan`} className={buttonClass("ghost", "sm")}>
                      Plan<span className="sr-only"> · {item.name}</span>
                    </Link>
                  </PanelTableCell>
                </PanelTableRow>
              ))}
            </PanelTable>
          ) : (
            <EmptyState title={signals.length ? "Bu görünümde öğrenci yok." : "Henüz aktif koçluk öğrencin yok."} />
          )}
        </div>
      </div>
    </PanelShell>
  );
}

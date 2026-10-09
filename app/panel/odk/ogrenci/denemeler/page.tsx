import Link from "next/link";
import { requireProductRole } from "@/lib/auth/guards";
import { loadOdkStudentExamList } from "@/lib/odk/student-dashboard-server";
import type { StudentExamTab } from "@/lib/odk/student-exam-state";
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

export const dynamic = "force-dynamic";

/**
 * DENEME LİGİ · DENEMELERİM (docs/panel-design-roadmap.md §11.2).
 * Görünüm sekmeleri (`?gorunum=`): Tümü · Yaklaşan · Açık · Tamamlanan.
 * Devam eden deneme en üstte tek bir dikkat satırıdır; satırdaki deneme adı
 * doğrudan doğru hedefe (sınav ekranı / ayrıntı / sonuç) bağlanır.
 */

const DATE_TIME = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});
const NET = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TABS: Array<{ id: "tumu" | StudentExamTab; label: string }> = [
  { id: "tumu", label: "Tümü" },
  { id: "yaklasan", label: "Yaklaşan" },
  { id: "acik", label: "Açık" },
  { id: "tamamlanan", label: "Tamamlanan" },
];

export default async function OdkStudentExamsPage({ searchParams }: { searchParams: Promise<{ gorunum?: string | string[] }> }) {
  const session = await requireProductRole("ODK", "STUDENT");
  const requested = (await searchParams).gorunum;
  const tab = TABS.find((item) => item.id === requested)?.id ?? "tumu";
  // Okuma `lib/odk/student-dashboard-server.ts`'te; mobil uç (`/api/odk/student/exams`) aynı yükleyiciyi kullanır.
  const { rows, visible, active, counts, netOf } = await loadOdkStudentExamList(session.userId, tab);

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK" pageTitle="Denemeler">
      <div className="max-w-[1100px]">
        <PageHeader
          title="Denemeler"
          description="Devam eden denemen, başlayabileceğin ve yaklaşan denemeler, açıklanan sonuçların."
        />

        {active ? (
          <div
            role="region"
            aria-label="Devam eden deneme"
            className="mt-5 flex flex-col gap-3 rounded-md border border-(--pn-tone-warning)/40 bg-(--pn-tone-warning-soft) px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-[14px] text-pn-text">
              <span className="font-semibold">{active.exam.title}</span> devam ediyor
              {active.exam.attempts[0]?.deadlineAt ? ` · bitiş ${DATE_TIME.format(active.exam.attempts[0].deadlineAt)}` : ""}
            </p>
            <Link href={active.state.href} className={buttonClass("primary", "sm", "shrink-0")}>
              Denemeye dön
            </Link>
          </div>
        ) : null}

        <div className="mt-5">
          <ViewTabs
            label="Deneme görünümü"
            activeId={tab}
            tabs={TABS.map((item) => ({
              id: item.id,
              label: item.label,
              href: item.id === "tumu" ? "/panel/odk/ogrenci/denemeler" : `/panel/odk/ogrenci/denemeler?gorunum=${item.id}`,
              count: counts[item.id],
            }))}
          />
        </div>

        <div className="mt-4">
          {visible.length ? (
            <PanelTable caption="Denemeler" columns={["Deneme", "Tür", "Tarih", "Durum", "Süre", "Sonuç"]}>
              {visible.map(({ exam, state }) => {
                const net = netOf({ exam, state });
                return (
                  <PanelTableRow key={exam.id}>
                    <PanelTableCell>
                      <Link href={state.href} className="font-medium text-pn-text underline-offset-2 hover:underline">
                        {exam.title}
                      </Link>
                    </PanelTableCell>
                    <PanelTableCell>{exam.family}</PanelTableCell>
                    <PanelTableCell>{exam.startsAt ? DATE_TIME.format(exam.startsAt) : "—"}</PanelTableCell>
                    <PanelTableCell>
                      <StatusBadge label={state.label} tone={state.tone} live={state.key === "AVAILABLE"} />
                    </PanelTableCell>
                    <PanelTableCell>{exam.currentVersion?.durationMinutes ? `${exam.currentVersion.durationMinutes} dk` : "—"}</PanelTableCell>
                    <PanelTableCell>
                      {net != null ? <span className="font-mono tabular-nums">{NET.format(net)} net</span> : <span className="text-pn-text-muted">—</span>}
                    </PanelTableCell>
                  </PanelTableRow>
                );
              })}
            </PanelTable>
          ) : (
            <EmptyState
              title={rows.length ? "Bu görünümde deneme yok." : "Henüz yayınlanmış bir denemen yok."}
              body={rows.length ? undefined : "Yeni deneme açıldığında burada görünecek."}
            />
          )}
        </div>
      </div>
    </PanelShell>
  );
}

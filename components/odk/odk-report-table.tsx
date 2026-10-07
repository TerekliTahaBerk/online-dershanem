import Link from "next/link";
import { getOdkAudienceStudentReport } from "@/lib/odk/reporting-server";
import { summarizeAudienceReport, WEAK_OUTCOME_THRESHOLD } from "@/lib/odk/staff-workspace";
import {
  EmptyState,
  PageHeader,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
  UrlDrawer,
  buttonClass,
} from "@/components/panel/ui";

type Student = { userId: string; name: string; context: string };
const DATE = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" });
const ROW_LIMIT = 50;
const net = (value: number) => value.toFixed(2);

/**
 * SONUÇ RAPORU TABLOSU (docs/panel-design-roadmap.md §11.7) — öğrenci × son
 * açıklanmış deneme (net, Δ, zayıf kazanım). Görünürlük kuralları rapor
 * sunucusundan gelir (`getOdkAudienceStudentReport`: ilişki + sözleşme +
 * yayın); bu bileşen yeni bir veri yolu açmaz. Satır → öğrenci yan paneli
 * (`?onizle=ogrenci:<id>`); "Tam rapor" eski ayrıntılı görünümü
 * (`?ogrenci=<id>`) açar. Öğrenci sıralaması yapılmaz.
 */
export async function OdkReportTable({
  viewer,
  basePath,
  students,
  query,
}: {
  viewer: { userId: string; role: "ADMIN" | "TEACHER" };
  basePath: string;
  students: Student[];
  query: { q?: string; grup?: string; onizle?: string };
}) {
  const search = query.q?.trim().toLocaleLowerCase("tr-TR").slice(0, 80) || "";
  const groups = [...new Set(students.flatMap((student) => student.context.split(" · ").filter(Boolean)))].sort((a, b) => a.localeCompare(b, "tr"));
  const group = groups.includes(query.grup ?? "") ? query.grup! : "";
  const filtered = students.filter(
    (student) =>
      (!search || student.name.toLocaleLowerCase("tr-TR").includes(search)) && (!group || student.context.split(" · ").includes(group)),
  );
  const visible = filtered.slice(0, ROW_LIMIT);
  const reports = await Promise.all(visible.map((student) => getOdkAudienceStudentReport(viewer, student.userId)));
  const rows = visible.map((student, index) => ({ student, report: reports[index], summary: summarizeAudienceReport(reports[index]) }));

  const drawerId = query.onizle?.startsWith("ogrenci:") ? query.onizle.slice("ogrenci:".length) : null;
  const drawerRow = drawerId ? rows.find((row) => row.student.userId === drawerId) ?? null : null;
  const params = (extra: Record<string, string>) => {
    const next = new URLSearchParams();
    if (query.q) next.set("q", query.q);
    if (group) next.set("grup", group);
    for (const [key, value] of Object.entries(extra)) next.set(key, value);
    const text = next.toString();
    return text ? `${basePath}?${text}` : basePath;
  };

  return (
    <>
      <PageHeader
        title="Sonuç raporları"
        description={
          viewer.role === "TEACHER"
            ? "Sorumlu olduğunuz öğrencilerin açıklanmış sonuçları. Eğilimler öğrencinin kendi önceki ölçümüyle karşılaştırılır."
            : "Açıklanmış sonuçlar. Eğilimler öğrencinin kendi önceki ölçümüyle karşılaştırılır; sıralama yapılmaz."
        }
      />
      <form method="get" className="mt-2 flex flex-wrap items-end gap-2">
        <label className="grid min-w-[200px] flex-1 gap-1 text-[12.5px] font-medium text-pn-text-muted sm:max-w-xs">
          Öğrenci ara
          <input name="q" defaultValue={query.q || ""} placeholder="Ad soyad" className="min-h-9 rounded-md border border-pn-border-strong bg-white px-3 text-[14px] text-pn-text" />
        </label>
        {groups.length > 1 ? (
          <label className="grid gap-1 text-[12.5px] font-medium text-pn-text-muted">
            {viewer.role === "TEACHER" ? "Grup" : "Sınıf"}
            <select name="grup" defaultValue={group} className="min-h-9 rounded-md border border-pn-border-strong bg-white px-2 text-[14px] text-pn-text">
              <option value="">Tümü</option>
              {groups.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button className={buttonClass("secondary", "sm", "min-h-9")}>Süz</button>
      </form>

      {rows.length ? (
        <>
          <PanelTable caption="Sonuç raporları" columns={["Öğrenci", viewer.role === "TEACHER" ? "Grup" : "Sınıf", "Son deneme", "Net", "Δ", "Zayıf kazanım", ""]}>
            {rows.map(({ student, summary }) => (
              <PanelTableRow key={student.userId}>
                <PanelTableCell>
                  <Link href={params({ onizle: `ogrenci:${student.userId}` })} scroll={false} className="font-medium text-pn-text underline-offset-2 hover:underline">
                    {student.name}
                  </Link>
                </PanelTableCell>
                <PanelTableCell>{student.context || "—"}</PanelTableCell>
                <PanelTableCell>{summary.latestTitle ?? <span className="text-pn-text-muted">Açıklanmış sonuç yok</span>}</PanelTableCell>
                <PanelTableCell>
                  <span className="tabular-nums">{summary.latestNet === null ? "—" : net(summary.latestNet)}</span>
                </PanelTableCell>
                <PanelTableCell tone={summary.delta !== null && summary.delta < 0 ? "warn" : summary.delta ? "ok" : "default"}>
                  <span className="tabular-nums">
                    {summary.delta === null ? "—" : `${summary.delta > 0 ? "+" : ""}${net(summary.delta)}`}
                  </span>
                </PanelTableCell>
                <PanelTableCell tone={summary.weakOutcomes ? "warn" : "default"}>
                  <span className="tabular-nums">{summary.examCount ? summary.weakOutcomes : "—"}</span>
                </PanelTableCell>
                <PanelTableCell label="Eylem">
                  <Link href={params({ ogrenci: student.userId })} className={buttonClass("ghost", "sm")}>
                    Tam rapor<span className="sr-only"> · {student.name}</span>
                  </Link>
                </PanelTableCell>
              </PanelTableRow>
            ))}
          </PanelTable>
          {filtered.length > ROW_LIMIT ? (
            <p className="mt-3 text-[13px] text-pn-text-muted">
              İlk {ROW_LIMIT} öğrenci gösteriliyor ({filtered.length} kayıt). Daraltmak için arayın.
            </p>
          ) : null}
        </>
      ) : (
        <EmptyState
          className="mt-5"
          title={students.length ? "Süzgece uyan öğrenci yok." : "Raporu görülebilen öğrenci yok."}
          body={students.length ? "Aramayı temizleyin." : "Sonuçlar yayınlandığında ve rapor hakkı olduğunda öğrenciler burada görünür."}
        />
      )}

      {drawerRow ? (
        <UrlDrawer title={drawerRow.student.name} description={drawerRow.student.context || undefined}>
          {drawerRow.report && drawerRow.report.exams.length ? (
            <>
              {(() => {
                const latest = [...drawerRow.report.exams].sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime()).at(-1)!;
                return (
                  <div className="rounded-lg border border-pn-border p-3">
                    <p className="text-[12.5px] text-pn-text-muted">Son açıklanan · {DATE.format(latest.takenAt)}</p>
                    <p className="mt-0.5 text-[15px] font-semibold text-pn-text">{latest.title}</p>
                    <p className="mt-1 text-[13.5px] tabular-nums text-pn-text-secondary">
                      <strong className="text-[18px] text-pn-text">{net(latest.totalNet)}</strong> net · {latest.correctCount} D · {latest.wrongCount} Y · {latest.blankCount} B
                    </p>
                    {latest.integrityNotice ? <p className="mt-1 text-[12.5px] text-pn-text-muted">{latest.integrityNotice}</p> : null}
                  </div>
                );
              })()}
              <h3 className="mt-5 text-[13.5px] font-semibold text-pn-text">Denemeler</h3>
              <ol className="mt-2 divide-y divide-pn-border-subtle rounded-lg border border-pn-border text-[13.5px]">
                {[...drawerRow.report.exams].reverse().map((exam) => (
                  <li key={exam.id} className="flex items-baseline justify-between gap-3 px-3 py-2">
                    <span className="min-w-0 text-pn-text">
                      {exam.title}
                      <span className="block text-[12.5px] text-pn-text-muted">{DATE.format(exam.takenAt)}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-pn-text">{net(exam.totalNet)}</span>
                  </li>
                ))}
              </ol>
              <h3 className="mt-5 text-[13.5px] font-semibold text-pn-text">Gelişim alanları</h3>
              {drawerRow.report.trends.filter((trend) => trend.latestAccuracy < WEAK_OUTCOME_THRESHOLD).length ? (
                <ul className="mt-2 space-y-1.5 text-[13.5px]">
                  {drawerRow.report.trends
                    .filter((trend) => trend.latestAccuracy < WEAK_OUTCOME_THRESHOLD)
                    .slice(0, 8)
                    .map((trend) => (
                      <li key={trend.outcomeId} className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 text-pn-text">
                          {trend.code} · {trend.title}
                        </span>
                        <span className="shrink-0 tabular-nums text-pn-text-secondary">%{Math.round(trend.latestAccuracy)}</span>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="mt-2 text-[13.5px] text-pn-text-muted">%{WEAK_OUTCOME_THRESHOLD} altında kazanım yok.</p>
              )}
              <Link href={params({ ogrenci: drawerRow.student.userId })} className={buttonClass("secondary", "md", "mt-5")}>
                Tam raporu aç
              </Link>
            </>
          ) : (
            <p className="text-[14px] text-pn-text-muted">Bu öğrencinin görülebilen açıklanmış sonucu yok.</p>
          )}
        </UrlDrawer>
      ) : null}
    </>
  );
}

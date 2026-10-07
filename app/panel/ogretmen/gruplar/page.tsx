import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  PanelEmpty,
  PanelHeading,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
  StatusBadge,
  ViewTabs,
  buttonClass,
} from "@/components/panel/ui";
import { getTeacherRoster } from "@/lib/panel/teacher-roster-server";
import {
  TEACHER_ROSTER_FILTER_LABELS,
  type TeacherRosterRiskLevel,
} from "@/lib/panel/teacher-roster";

export const dynamic = "force-dynamic";

const DAY = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Istanbul",
});

function riskTone(
  level: TeacherRosterRiskLevel,
): "neutral" | "success" | "warning" | "critical" {
  if (level === "high") return "critical";
  if (level === "medium") return "warning";
  if (level === "low") return "warning";
  return "success";
}

function riskLabel(level: TeacherRosterRiskLevel): string {
  if (level === "none") return "Normal";
  if (level === "low") return "Düşük";
  if (level === "medium") return "Orta";
  return "Yüksek";
}

/**
 * Öğretmen öğrenci listesi — aksiyon odaklı roster.
 *
 * YETKİ: yalnız öğretmenin kendi aktif gruplarındaki öğrenciler.
 * Feature kapalıysa plan/deneme/yardım kolonları ve filtreleri düşer.
 */
export default async function TeacherStudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("TEACHER");
  const query = await searchParams;
  const roster = await getTeacherRoster({
    teacherId: session.userId,
    filterRaw: query.filtre,
  });

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Öğrenciler"
    >
      <div>
        <PanelHeading
          title="Öğrencilerin"
          description={`${roster.totalCount} öğrenci · yalnız sana atanmış`}
        />

        <div className="mt-5 mb-4">
          <ViewTabs
            label="Öğrenci görünümü"
            activeId={roster.filter}
            tabs={roster.filters.map((filter) => ({
              id: filter,
              label: TEACHER_ROSTER_FILTER_LABELS[filter],
              href: filter === "all" ? "/panel/ogretmen/gruplar" : `/panel/ogretmen/gruplar?filtre=${filter}`,
            }))}
          />
        </div>

        {roster.rows.length === 0 ? (
          <PanelEmpty
            className="mt-5"
            title={
              roster.totalCount === 0
                ? "Sana atanmış aktif öğrenci yok."
                : "Bu filtrede öğrenci yok."
            }
            body={
              roster.totalCount === 0
                ? "Gruplarına öğrenci eklendiğinde risk, plan ve ders özeti burada listelenir."
                : "Filtreyi temizleyip tüm öğrencileri görebilirsin."
            }
          />
        ) : (
          <PanelTable
            caption="Sana atanmış öğrenciler"
            columns={["Öğrenci", "Durum", "Son ders", "Plan", "Son deneme", "Neden", ""]}
          >
            {roster.rows.map((row) => (
              <PanelTableRow key={row.studentId}>
                <PanelTableCell>
                  <Link
                    href={`/panel/ogretmen/ogrenci/${row.studentId}`}
                    className="font-semibold text-pn-text underline-offset-2 hover:underline"
                  >
                    {row.name}
                  </Link>
                  <span className="block text-[12.5px] text-pn-text-muted">{row.groupName}</span>
                </PanelTableCell>
                <PanelTableCell>
                  <StatusBadge label={riskLabel(row.riskLevel)} tone={riskTone(row.riskLevel)} />
                </PanelTableCell>
                <PanelTableCell>
                  {row.lastLessonAt
                    ? `${DAY.format(new Date(row.lastLessonAt))}${row.lastLessonTitle ? ` · ${row.lastLessonTitle}` : ""}`
                    : "—"}
                </PanelTableCell>
                <PanelTableCell>{row.planLabel ?? "—"}</PanelTableCell>
                <PanelTableCell>{row.examDeltaLabel != null ? `${row.examDeltaLabel} net` : "—"}</PanelTableCell>
                <PanelTableCell>{row.riskReason || "Aksiyon gerektiren sinyal yok"}</PanelTableCell>
                <PanelTableCell>
                  <span className="flex flex-wrap gap-1.5">
                    <Link href={`/panel/ogretmen/ogrenci/${row.studentId}`} className={buttonClass("secondary", "sm")}>
                      Öğrenci profili
                    </Link>
                    {roster.flags.studentCheckIn && row.tags.includes("help") ? (
                      <Link href="/panel/ogretmen/yardim" className={buttonClass("ghost", "sm")}>
                        Yardım talebi
                      </Link>
                    ) : null}
                  </span>
                </PanelTableCell>
              </PanelTableRow>
            ))}
          </PanelTable>
        )}
      </div>
    </PanelShell>
  );
}

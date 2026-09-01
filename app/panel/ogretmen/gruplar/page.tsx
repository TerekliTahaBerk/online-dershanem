import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  PanelEmpty,
  PanelFilterLink,
  PanelHeading,
  PanelStatusBadge,
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

function riskTone(level: TeacherRosterRiskLevel): "neutral" | "success" | "warning" | "critical" {
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
      <div className="max-w-[1100px]">
        <PanelHeading
          title="Öğrencilerin"
          description={`${roster.totalCount} öğrenci · yalnız sana atanmış`}
        />

        <div className="mt-5 flex flex-wrap gap-2">
          {roster.filters.map((filter) => (
            <PanelFilterLink
              key={filter}
              href={filter === "all" ? "/panel/ogretmen/gruplar" : `/panel/ogretmen/gruplar?filtre=${filter}`}
              active={roster.filter === filter}
            >
              {TEACHER_ROSTER_FILTER_LABELS[filter]}
            </PanelFilterLink>
          ))}
        </div>

        {roster.rows.length === 0 ? (
          <PanelEmpty
            className="mt-5"
            title={roster.totalCount === 0 ? "Sana atanmış aktif öğrenci yok." : "Bu filtrede öğrenci yok."}
            body={
              roster.totalCount === 0
                ? "Gruplarına öğrenci eklendiğinde risk, plan ve ders özeti burada listelenir."
                : "Filtreyi temizleyip tüm öğrencileri görebilirsin."
            }
          />
        ) : (
          <ul className="mt-5 space-y-3">
            {roster.rows.map((row) => (
              <li
                key={row.studentId}
                className="rounded-[14px] border border-dc-line-soft bg-white px-4 py-4 sm:px-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/panel/ogretmen/ogrenci/${row.studentId}`}
                      className="text-[15px] font-bold text-dc-ink underline-offset-2 hover:text-dc-brand-hover hover:underline"
                    >
                      {row.name}
                    </Link>
                    <p className="mt-1 text-[13px] text-dc-ink-muted">{row.groupName}</p>
                  </div>
                  <PanelStatusBadge label={riskLabel(row.riskLevel)} tone={riskTone(row.riskLevel)} />
                </div>

                <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-dc-ink-faint">
                      Son ders
                    </dt>
                    <dd className="mt-1 text-[13.5px] font-semibold text-dc-ink">
                      {row.lastLessonAt
                        ? `${DAY.format(new Date(row.lastLessonAt))}${row.lastLessonTitle ? ` · ${row.lastLessonTitle}` : ""}`
                        : "—"}
                    </dd>
                  </div>
                  {row.planLabel != null ? (
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-dc-ink-faint">
                        Plan
                      </dt>
                      <dd className="mt-1 text-[13.5px] font-semibold text-dc-ink">{row.planLabel}</dd>
                    </div>
                  ) : null}
                  {row.examDeltaLabel != null ? (
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-dc-ink-faint">
                        Son deneme
                      </dt>
                      <dd className="mt-1 text-[13.5px] font-semibold text-dc-ink">
                        {row.examDeltaLabel} net
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-dc-ink-faint">
                      Neden
                    </dt>
                    <dd className="mt-1 text-[13.5px] font-semibold text-dc-ink">
                      {row.riskReason || "Aksiyon gerektiren sinyal yok"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3.5 flex flex-wrap gap-2">
                  <Link
                    href={`/panel/ogretmen/ogrenci/${row.studentId}`}
                    className="panel-quick-action inline-flex"
                  >
                    Öğrenci 360
                  </Link>
                  {roster.flags.studentCheckIn && row.tags.includes("help") ? (
                    <Link href="/panel/ogretmen/yardim" className="panel-quick-action inline-flex">
                      Yardım talebi
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PanelShell>
  );
}

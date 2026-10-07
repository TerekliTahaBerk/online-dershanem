import Link from "next/link";
import { requireTeacherStaffPermission } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import {
  type CoachAttentionReason,
  type CoachStudentSignals,
} from "@/lib/kocum/coach-workspace";
import { loadCoachWorkspace } from "./coach-workspace-data";
import { ExamCell } from "@/components/panel/yon/exam-cell";
import { AttentionBadge } from "@/components/panel/yon/attention-badge";
import { ISTANBUL_TIME_ZONE } from "@/lib/istanbul-time";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  EmptyState,
  List,
  ListRow,
  PageHeader,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
  Section,
  buttonClass,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/**
 * KOÇ ÇALIŞMA ALANI (docs/panel-design-roadmap.md §10.5) — Yön Koçluk
 * panelinde koçun "Bugün"ü. Kapsam: giriş yapan koçun AKTİF koçluk atamaları
 * (`coach.userId = <oturum>`, `endedAt = null`). Yetki: COACH@OK
 * (`ok:coaching:write`); OD grup öğretmenliği yetmez. Gizli görüşme notu ve
 * öğrencinin serbest metinleri okunmaz; yalnız sayılar ve durumlar.
 */

const TIME = new Intl.DateTimeFormat("tr-TR", { timeZone: ISTANBUL_TIME_ZONE, hour: "2-digit", minute: "2-digit" });
const DATE_TIME = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const REASON_ACTION: Record<CoachAttentionReason, { label: string; href: (studentId: string) => string }> = {
  RESCHEDULE_REQUESTED: { label: "Saat öner", href: (id) => `/panel/ogretmen/hazirlik/${id}` },
  HELP_OPEN: { label: "Yanıtla", href: () => "/panel/ogretmen/yardim" },
  SESSION_OVERDUE: { label: "Görüşme planla", href: (id) => `/panel/ogretmen/hazirlik/${id}` },
  PLAN_APPROVAL: { label: "Planı incele", href: () => "/panel/ogretmen/plan" },
  SUGGESTION_PENDING: { label: "Öneriyi incele", href: () => "/panel/ogretmen/plan" },
  NO_PLAN: { label: "Plan hazırla", href: () => "/panel/ogretmen/plan" },
  CHECK_IN_MISSING: { label: "Öğrenciyi aç", href: (id) => `/panel/ogretmen/hazirlik/${id}` },
  LOW_COMPLIANCE: { label: "Öğrenciyi aç", href: (id) => `/panel/ogretmen/hazirlik/${id}` },
};


export default async function CoachWorkspacePage() {
  const session = await requireTeacherStaffPermission("ok:coaching:write");
  const flags = getPanelFeatureFlags();
  const { now, assignmentCount, signals, todaySessions, workspace, lastExam } = await loadCoachWorkspace(session.userId, flags);
  const signalById = new Map(signals.map((item) => [item.studentId, item]));
  const nextSession = todaySessions.find((item) => item.at >= now) ?? todaySessions[0] ?? null;
  const sortedStudents = [...signals].sort(
    (a, b) =>
      Number(Boolean(workspace.primaryReason.get(b.studentId))) - Number(Boolean(workspace.primaryReason.get(a.studentId))) ||
      a.name.localeCompare(b.name, "tr"),
  );

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} pageTitle="Bugün">
      <div className="max-w-[1100px]">
        <PageHeader
          title="Bugün"
          description={
            assignmentCount
              ? `${todaySessions.length} görüşme · ${workspace.attentionCount} öğrenci dikkat bekliyor`
              : "Yön Koçluk öğrencilerin burada görünecek."
          }
          actions={
            <>
              {nextSession ? (
                <Link href={`/panel/ogretmen/hazirlik/${nextSession.studentId}`} className={buttonClass("primary", "md")}>
                  Hazırlığa başla
                </Link>
              ) : null}
              {flags.adaptivePlan ? (
                <Link href="/panel/ogretmen/plan" className={buttonClass("secondary", "md")}>
                  Plan masası
                </Link>
              ) : null}
            </>
          }
        />

        {!assignmentCount ? (
          <EmptyState
            className="mt-6"
            title="Henüz aktif koçluk öğrencin yok."
            body="Yönetim sana öğrenci atadığında görüşmeler ve dikkat bekleyenler burada açılır."
          />
        ) : (
          <>
            <Section id="bugunku-gorusmeler" title="Bugünkü görüşmeler" divider={false}>
              {todaySessions.length ? (
                <PanelTable caption="Bugünkü görüşmeler" columns={["Saat", "Öğrenci", "Odak", "Plan uyumu", ""]}>
                  {todaySessions.map((item) => {
                    const pct = signalById.get(item.studentId)?.planCompletionPct;
                    return (
                      <PanelTableRow key={item.id}>
                        <PanelTableCell>
                          <span className="font-semibold tabular-nums">{TIME.format(item.at)}</span>
                        </PanelTableCell>
                        <PanelTableCell>{item.name}</PanelTableCell>
                        <PanelTableCell>{item.focus || "—"}</PanelTableCell>
                        <PanelTableCell>{pct == null ? "—" : `%${pct}`}</PanelTableCell>
                        <PanelTableCell>
                          <span className="flex flex-wrap gap-1.5">
                            <Link href={`/panel/ogretmen/hazirlik/${item.studentId}`} className={buttonClass("secondary", "sm")}>
                              Hazırlık<span className="sr-only"> · {item.name}</span>
                            </Link>
                            {item.meetingUrl ? (
                              <a href={item.meetingUrl} target="_blank" rel="noreferrer" className={buttonClass("ghost", "sm")}>
                                Katıl<span className="sr-only"> · {item.name}</span>
                              </a>
                            ) : null}
                          </span>
                        </PanelTableCell>
                      </PanelTableRow>
                    );
                  })}
                </PanelTable>
              ) : (
                <p className="text-[14px] text-pn-text-muted">Bugün planlı görüşmen yok.</p>
              )}
            </Section>

            <Section
              id="dikkat"
              title="Dikkat bekleyenler"
              description={workspace.groups.length ? "Nedene göre gruplanmış; her satırda sıradaki adım." : undefined}
            >
              {workspace.groups.length ? (
                <div className="space-y-5">
                  {workspace.groups.map((group) => (
                    <div key={group.reason}>
                      <h3 className="mb-1.5 flex items-center gap-2 text-[13.5px] font-semibold text-pn-text">
                        {group.label}
                        <span className="rounded-full bg-pn-surface-subtle px-1.5 text-[11.5px] font-semibold text-pn-text-muted">
                          {group.students.length}
                        </span>
                      </h3>
                      <List label={group.label}>
                        {group.students.map((item) => (
                          <ListRow
                            key={item.studentId}
                            title={item.name}
                            href={`/panel/ogretmen/hazirlik/${item.studentId}`}
                            meta={reasonMeta(group.reason, item)}
                            action={
                              <Link href={REASON_ACTION[group.reason].href(item.studentId)} className={buttonClass("ghost", "sm")}>
                                {REASON_ACTION[group.reason].label}
                                <span className="sr-only"> · {item.name}</span>
                              </Link>
                            }
                          />
                        ))}
                      </List>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="Şu an dikkat bekleyen öğrenci yok." />
              )}
            </Section>

            <Section
              id="ogrencilerim"
              title="Öğrencilerim"
              description={`${signals.length} aktif öğrenci${signals.length > 10 ? " · önce dikkat bekleyenler" : ""}`}
              actions={
                <Link href="/panel/ogretmen/yon/ogrenciler" className={buttonClass("ghost", "sm")}>
                  Tümünü gör
                </Link>
              }
            >
              <PanelTable caption="Öğrencilerim" columns={["Öğrenci", "Sınav", "Haftalık uyum", "Son deneme", "Sonraki görüşme", "Durum"]}>
                {sortedStudents.slice(0, 10).map((item) => {
                  const reason = workspace.primaryReason.get(item.studentId) ?? null;
                  return (
                    <PanelTableRow key={item.studentId}>
                      <PanelTableCell>
                        <Link href={`/panel/ogretmen/hazirlik/${item.studentId}`} className="font-medium text-pn-text underline-offset-2 hover:underline">
                          {item.name}
                        </Link>
                      </PanelTableCell>
                      <PanelTableCell>{item.targetGoal || "—"}</PanelTableCell>
                      <PanelTableCell>
                        {item.planCompletionPct == null ? (
                          "—"
                        ) : (
                          <span className="flex items-center gap-2">
                            <span aria-hidden="true" className="block h-1 w-16 overflow-hidden rounded-full bg-pn-surface-subtle">
                              <span className="block h-full rounded-full bg-pn-accent-marker" style={{ width: `${item.planCompletionPct}%` }} />
                            </span>
                            <span className="tabular-nums">%{item.planCompletionPct}</span>
                          </span>
                        )}
                      </PanelTableCell>
                      <PanelTableCell><ExamCell exam={lastExam.get(item.studentId)} /></PanelTableCell>
                      <PanelTableCell>{item.nextScheduledAt ? DATE_TIME.format(item.nextScheduledAt) : "Planlanmadı"}</PanelTableCell>
                      <PanelTableCell>
                        <AttentionBadge reason={reason} />
                      </PanelTableCell>
                    </PanelTableRow>
                  );
                })}
              </PanelTable>
            </Section>
          </>
        )}
      </div>
    </PanelShell>
  );
}

function reasonMeta(reason: CoachAttentionReason, item: CoachStudentSignals): string | undefined {
  switch (reason) {
    case "HELP_OPEN":
      return `${item.openHelpRequests} açık istek`;
    case "SUGGESTION_PENDING":
      return `${item.pendingSuggestions} öneri`;
    case "LOW_COMPLIANCE":
      return item.planCompletionPct == null ? undefined : `Bu hafta %${item.planCompletionPct}`;
    case "PLAN_APPROVAL":
      return item.planStatus === "CHANGE_REQUESTED" ? "Öğrenci değişiklik istedi" : "Taslak";
    default:
      return item.targetGoal ?? undefined;
  }
}


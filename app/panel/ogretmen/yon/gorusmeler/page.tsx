import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTeacherStaffPermission } from "@/lib/auth/guards";
import { addIstanbulCalendarDays, ISTANBUL_TIME_ZONE } from "@/lib/istanbul-time";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  EmptyState,
  PageHeader,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
  Section,
  StatusBadge,
  buttonClass,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/**
 * KOÇ · GÖRÜŞMELER (docs/panel-design-roadmap.md §7.4) — koçun aktif
 * atamalarındaki `CoachingSession` kayıtları: planlı olanlar ve son 30 günün
 * geçmişi. Görüşme notları (paylaşılan / özel) burada okunmaz; ayrıntı ve
 * kayıt öğrenci çalışma alanının Görüşmeler sekmesindedir.
 */

const DATE_TIME = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const STATUS: Record<string, { label: string; tone: "success" | "warning" | "neutral" | "info" }> = {
  PLANNED: { label: "Planlı", tone: "info" },
  COMPLETED: { label: "Yapıldı", tone: "success" },
  MISSED: { label: "Kaçırıldı", tone: "warning" },
  CANCELLED: { label: "İptal", tone: "neutral" },
};

export default async function CoachSessionsPage() {
  const session = await requireTeacherStaffPermission("ok:coaching:write");
  const now = new Date();
  const scope = { endedAt: null, coach: { userId: session.userId } };
  const select = {
    id: true,
    scheduledAt: true,
    completedAt: true,
    status: true,
    focus: true,
    meetingUrl: true,
    rescheduleRequestedAt: true,
    proposedAt: true,
    // privateNote / sharedNote BİLEREK seçilmiyor.
    assignment: { select: { student: { select: { id: true, user: { select: { fullName: true, email: true } } } } } },
  } as const;

  const [upcoming, past] = await Promise.all([
    prisma.coachingSession.findMany({
      where: { status: "PLANNED", assignment: scope },
      orderBy: { scheduledAt: "asc" },
      take: 50,
      select,
    }),
    prisma.coachingSession.findMany({
      where: { status: { not: "PLANNED" }, scheduledAt: { gte: addIstanbulCalendarDays(now, -30) }, assignment: scope },
      orderBy: { scheduledAt: "desc" },
      take: 50,
      select,
    }),
  ]);

  const studentName = (row: (typeof upcoming)[number]) => row.assignment.student.user.fullName || row.assignment.student.user.email;

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} pageTitle="Görüşmeler">
      <div className="max-w-[1100px]">
        <PageHeader title="Görüşmeler" description={`${upcoming.length} planlı görüşme · son 30 günde ${past.length} kayıt`} />

        <Section id="planli" title="Planlı" divider={false}>
          {upcoming.length ? (
            <PanelTable caption="Planlı görüşmeler" columns={["Zaman", "Öğrenci", "Odak", "Durum", ""]}>
              {upcoming.map((row) => (
                <PanelTableRow key={row.id}>
                  <PanelTableCell>
                    <span className="tabular-nums">{DATE_TIME.format(row.scheduledAt)}</span>
                  </PanelTableCell>
                  <PanelTableCell>{studentName(row)}</PanelTableCell>
                  <PanelTableCell>{row.focus || "—"}</PanelTableCell>
                  <PanelTableCell>
                    {row.rescheduleRequestedAt ? (
                      <StatusBadge label="Yeni saat istendi" tone="warning" />
                    ) : row.proposedAt ? (
                      <StatusBadge label="Yeni saat önerildi" tone="info" />
                    ) : row.scheduledAt < now ? (
                      <StatusBadge label="Saati geçti" tone="warning" />
                    ) : (
                      <StatusBadge label="Planlı" tone="info" />
                    )}
                  </PanelTableCell>
                  <PanelTableCell>
                    <span className="flex flex-wrap gap-1.5">
                      <Link href={`/panel/ogretmen/hazirlik/${row.assignment.student.id}?sekme=gorusmeler`} className={buttonClass("secondary", "sm")}>
                        Aç<span className="sr-only"> · {studentName(row)}</span>
                      </Link>
                      {row.meetingUrl && !row.proposedAt && row.scheduledAt >= now ? (
                        <a href={row.meetingUrl} target="_blank" rel="noreferrer" className={buttonClass("ghost", "sm")}>
                          Katıl<span className="sr-only"> · {studentName(row)}</span>
                        </a>
                      ) : null}
                    </span>
                  </PanelTableCell>
                </PanelTableRow>
              ))}
            </PanelTable>
          ) : (
            <EmptyState title="Planlı görüşmen yok." body="Öğrenci çalışma alanının Görüşmeler sekmesinden yeni görüşme planlayabilirsin." />
          )}
        </Section>

        <Section id="gecmis" title="Son 30 gün">
          {past.length ? (
            <PanelTable caption="Son 30 günün görüşmeleri" columns={["Tarih", "Öğrenci", "Odak", "Durum"]}>
              {past.map((row) => (
                <PanelTableRow key={row.id}>
                  <PanelTableCell>
                    <span className="tabular-nums">{DATE_TIME.format(row.completedAt ?? row.scheduledAt)}</span>
                  </PanelTableCell>
                  <PanelTableCell>
                    <Link href={`/panel/ogretmen/hazirlik/${row.assignment.student.id}?sekme=gorusmeler`} className="text-pn-text underline-offset-2 hover:underline">
                      {studentName(row)}
                    </Link>
                  </PanelTableCell>
                  <PanelTableCell>{row.focus || "—"}</PanelTableCell>
                  <PanelTableCell>
                    <StatusBadge label={STATUS[row.status]?.label ?? row.status} tone={STATUS[row.status]?.tone ?? "neutral"} />
                  </PanelTableCell>
                </PanelTableRow>
              ))}
            </PanelTable>
          ) : (
            <p className="text-[14px] text-pn-text-muted">Son 30 günde görüşme kaydı yok.</p>
          )}
        </Section>
      </div>
    </PanelShell>
  );
}

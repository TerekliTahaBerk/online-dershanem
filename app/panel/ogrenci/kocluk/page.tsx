import Link from "next/link";
import { CoachingSessions } from "@/components/panel/coaching-sessions";
import { prisma } from "@/lib/prisma";
import { requireProductRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { getStudentCoaching } from "@/lib/panel/coaching";
import { addIstanbulCalendarDays, istanbulWeekStart, ISTANBUL_TIME_ZONE } from "@/lib/istanbul-time";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  EmptyState,
  List,
  ListRow,
  PageHeader,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
  PropertyList,
  PropertyRow,
  Section,
  StatusBadge,
  buttonClass,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/**
 * Koçum (docs/panel-design-roadmap.md §10.3) — koçunla ilgili her şey:
 * kimlik, görüşmeler (saat değişikliği akışı), ortak notlar, koçun verdiği
 * yapılacaklar ve geçmiş görüşmeler. Hedef özeti ve hızlı erişim Yön Bugün'e
 * taşındı. Gizli not (`privateNote`) ve INTERNAL notlar BİLEREK seçilmez.
 */

const DATE = new Intl.DateTimeFormat("tr-TR", { timeZone: ISTANBUL_TIME_ZONE, day: "numeric", month: "long" });
const DATE_TIME = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function StudentCoachingHubPage() {
  const session = await requireProductRole("OK", "STUDENT");
  const adaptivePlanEnabled = getPanelFeatureFlags().adaptivePlan;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });

  const shell = (body: React.ReactNode) => (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} pageTitle="Koçum">
      <div className="max-w-[880px]">{body}</div>
    </PanelShell>
  );

  if (!profile) {
    return shell(
      <>
        <PageHeader title="Koçum" />
        <EmptyState
          className="mt-6"
          title="Profilin hazırlanıyor."
          body="Öğrenci profilin tamamlandığında koçluk durumun burada görünecek."
        />
      </>,
    );
  }

  const weekStart = istanbulWeekStart(new Date());
  const [coaching, notes, pastSessions, coachTasks] = await Promise.all([
    getStudentCoaching(profile.id),
    prisma.coachNote.findMany({
      where: { studentId: profile.id, visibility: { in: ["STUDENT_VISIBLE", "PARENT_VISIBLE"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, body: true, createdAt: true },
    }),
    prisma.coachingSession.findMany({
      where: { status: { not: "PLANNED" }, assignment: { studentId: profile.id } },
      orderBy: { scheduledAt: "desc" },
      take: 8,
      // privateNote BİLEREK seçilmiyor.
      select: { id: true, scheduledAt: true, completedAt: true, status: true, focus: true, sharedNote: true },
    }),
    adaptivePlanEnabled
      ? prisma.weeklyPlanTask.findMany({
          where: {
            sourceType: "MANUAL_COACH",
            status: { not: "SKIPPED" },
            scheduledFor: { gte: weekStart, lt: addIstanbulCalendarDays(weekStart, 7) },
            plan: { studentId: profile.id, status: "APPROVED" },
          },
          orderBy: [{ scheduledFor: "asc" }, { position: "asc" }],
          select: { id: true, title: true, scheduledFor: true, durationMinutes: true, status: true },
        })
      : Promise.resolve([]),
  ]);

  // Ortak notlar: görünür koç notları + görüşmelerin paylaşılan notu, en yeni önce.
  const sharedNotes = [
    ...notes.map((note) => ({ id: `note:${note.id}`, body: note.body, at: note.createdAt })),
    ...pastSessions
      .filter((item) => item.sharedNote)
      .map((item) => ({ id: `session:${item.id}`, body: item.sharedNote!, at: item.completedAt ?? item.scheduledAt })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  return shell(
    <>
      <PageHeader
        title="Koçum"
        description={
          coaching
            ? `${coaching.coachName}${coaching.cadenceDays ? ` · ${coaching.cadenceDays} günde bir görüşme` : ""}`
            : "Koçluk görüşmeni ve koçunun notlarını buradan takip edebilirsin."
        }
        actions={
          adaptivePlanEnabled ? (
            <Link href="/panel/ogrenci/plan" className={buttonClass("secondary", "md")}>
              Haftalık planı aç
            </Link>
          ) : undefined
        }
      />

      {coaching ? (
        <Section id="kocun" title="Koçun" divider={false}>
          <PropertyList>
            <PropertyRow label="Koç">{coaching.coachName}</PropertyRow>
            <PropertyRow label="Sonraki görüşme">
              {coaching.overdue
                ? "Yeni saat bekleniyor"
                : coaching.nextScheduledAt
                  ? DATE_TIME.format(coaching.nextScheduledAt)
                  : "Planlanmadı"}
            </PropertyRow>
            {coaching.lastCompletedAt ? (
              <PropertyRow label="Son görüşme">{DATE.format(coaching.lastCompletedAt)}</PropertyRow>
            ) : null}
            {coaching.focus ? <PropertyRow label="Bu haftanın odağı">{coaching.focus}</PropertyRow> : null}
          </PropertyList>
        </Section>
      ) : (
        <EmptyState
          className="mt-6"
          title="Henüz atanmış koç görünmüyor."
          body="Koç ataması yapıldığında görüşme bilgisi ve yönlendirmeler burada açılır."
        />
      )}

      {coaching ? (
        <Section id="gorusmeler" title="Görüşmeler" description="Saat uymuyorsa nedenini seçip değişiklik isteyebilirsin.">
          <CoachingSessions actor={{ userId: session.userId, role: "STUDENT" }} studentId={profile.id} />
        </Section>
      ) : null}

      <Section id="ortak-notlar" title="Ortak notlar">
        {sharedNotes.length ? (
          <ul className="border-t border-pn-border">
            {sharedNotes.map((note) => (
              <li key={note.id} className="border-b border-pn-border py-3">
                <p className="text-[14px] leading-[1.6] text-pn-text">{note.body}</p>
                <p className="mt-1 text-[12px] text-pn-text-muted">{DATE.format(note.at)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-pn-text-muted">Bu hafta için yeni koç notu yok.</p>
        )}
      </Section>

      <Section id="yapilacaklar" title="Yapılacaklar" description="Koçunun bu hafta senin için eklediği çalışmalar.">
        {!adaptivePlanEnabled ? (
          <p className="text-[14px] text-pn-text-muted">Koçunla belirlediğiniz çalışmalar hazır olduğunda burada görünecek.</p>
        ) : coachTasks.length ? (
          <List label="Koçunun eklediği çalışmalar">
            {coachTasks.map((task) => (
              <ListRow
                key={task.id}
                title={task.title}
                meta={`${DATE.format(task.scheduledFor)} · ${task.durationMinutes} dk`}
                status={
                  task.status === "DONE" || task.status === "PARTIAL" ? (
                    <StatusBadge label="Tamamlandı" tone="success" />
                  ) : task.status === "COULD_NOT" ? (
                    <StatusBadge label="Yapılamadı" tone="warning" />
                  ) : undefined
                }
              />
            ))}
          </List>
        ) : (
          <p className="text-[14px] text-pn-text-muted">
            Bu hafta koçunun eklediği yayında bir çalışma yok. Plan görevlerin Bugün sayfasında.
          </p>
        )}
      </Section>

      {pastSessions.length ? (
        <Section id="gecmis" title="Geçmiş görüşmeler">
          <PanelTable caption="Geçmiş görüşmeler" columns={["Tarih", "Durum", "Odak"]}>
            {pastSessions.map((item) => (
              <PanelTableRow key={item.id}>
                <PanelTableCell>{DATE.format(item.completedAt ?? item.scheduledAt)}</PanelTableCell>
                <PanelTableCell>
                  <StatusBadge
                    label={item.status === "COMPLETED" ? "Yapıldı" : item.status === "CANCELLED" ? "İptal" : "Kaçırıldı"}
                    tone={item.status === "COMPLETED" ? "success" : "neutral"}
                  />
                </PanelTableCell>
                <PanelTableCell>{item.focus || "—"}</PanelTableCell>
              </PanelTableRow>
            ))}
          </PanelTable>
        </Section>
      ) : null}
    </>,
  );
}

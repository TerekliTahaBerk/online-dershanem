import Link from "next/link";
import { CoachingSessions } from "@/components/panel/coaching-sessions";
import { requireProductRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { loadStudentCoachingHub } from "@/lib/kocum/student-coaching-server";
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

  // Okuma `lib/kocum/student-coaching-server.ts`'te; mobil uç (`/api/panel/student/coaching`) aynı yükleyiciyi kullanır.
  const hub = await loadStudentCoachingHub({ userId: session.userId, adaptivePlanEnabled });
  const profile = hub?.profile ?? null;

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
          title="Hesabını hazırlıyoruz."
          body="Her şey hazır olduğunda koçunu ve görüşmelerini burada göreceksin."
        />
      </>,
    );
  }

  const { coaching, sharedNotes, pastSessions, coachTasks } = hub!;

  return shell(
    <>
      <PageHeader
        title="Koçum"
        description={
          coaching
            ? `${coaching.coachName}${coaching.cadenceDays ? ` · ${coaching.cadenceDays} günde bir görüşme` : ""}`
            : "Koçunla görüşmelerin ve sana bıraktığı notlar burada."
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
                ? "Yeni saat belirleniyor"
                : coaching.nextScheduledAt
                  ? DATE_TIME.format(coaching.nextScheduledAt)
                  : "Henüz planlanmadı"}
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
          title="Koçunla çok yakında tanışacaksın."
          body="Koçun belli olduğunda görüşmelerin ve önerileri burada olacak."
        />
      )}

      {coaching ? (
        <Section id="gorusmeler" title="Görüşmeler" description="Saat sana uymuyorsa nedenini seçip değişiklik isteyebilirsin.">
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
          <p className="text-[14px] text-pn-text-muted">Koçun bu hafta henüz yeni bir not bırakmadı.</p>
        )}
      </Section>

      <Section id="yapilacaklar" title="Yapılacaklar" description="Koçunun bu hafta sana özel eklediği çalışmalar.">
        {!adaptivePlanEnabled ? (
          <p className="text-[14px] text-pn-text-muted">Koçunla belirlediğiniz çalışmalar hazır olunca burada göreceksin.</p>
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
                    <StatusBadge label="Yapamadım" tone="warning" />
                  ) : undefined
                }
              />
            ))}
          </List>
        ) : (
          <p className="text-[14px] text-pn-text-muted">
            Koçun bu hafta ayrıca bir çalışma eklemedi. Plan görevlerin Bugün sayfasında seni bekliyor.
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
                    label={item.status === "COMPLETED" ? "Yapıldı" : item.status === "CANCELLED" ? "İptal edildi" : "Kaçırıldı"}
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

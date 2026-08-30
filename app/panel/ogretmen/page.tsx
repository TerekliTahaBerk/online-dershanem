import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelHeading, PanelCard, PanelCardTitle, PanelEmpty } from "@/components/panel/ui";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { getOrRefreshTeacherHomeSnapshot } from "@/lib/panel/teacher-home-server";
import { getTeacherAttentionInbox } from "@/lib/panel/teacher-attention-server";

export const dynamic = "force-dynamic";

/**
 * EĞİTMEN · BUGÜN — onaylı tasarım (Panel.dc.html → scEduHome).
 *
 * Bugünün ders akışı snapshot'tan gelir. Aksiyon bekleyen kayıtlar
 * `getTeacherAttentionInbox` read-model'inden canlı üretilir; sağlıklı
 * öğrenci kartı gösterilmez.
 */

const TIME = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

export default async function TeacherHomePage() {
  const session = await requireRole("TEACHER");
  const flags = getPanelFeatureFlags();
  const [snapshot, inbox] = await Promise.all([
    getOrRefreshTeacherHomeSnapshot(session.userId),
    getTeacherAttentionInbox(session.userId),
  ]);
  const now = new Date();

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Ana Sayfa"
    >
      <div className="max-w-[1040px]">
        <PanelHeading title="Bugün" description={snapshot.summary} />

        <PanelCard className="mt-6" padded={false}>
          {snapshot.todayLessons.length === 0 ? (
            <div className="px-[22px] py-[26px]">
              <p className="text-[15px] font-bold text-dc-ink">Bugün dersin yok.</p>
              <p className="mt-1.5 text-[14px] text-dc-ink-muted">
                Takvimindeki bir sonraki derse hazırlanabilir ya da bekleyen not girişlerini
                tamamlayabilirsin.
              </p>
            </div>
          ) : (
            <ul>
              {snapshot.todayLessons.map((lesson, i) => (
                <li
                  key={lesson.id}
                  className={`flex flex-wrap items-center gap-5 px-[22px] py-4 ${
                    i < snapshot.todayLessons.length - 1 ? "border-b border-dc-line-soft" : ""
                  }`}
                >
                  <span className="w-[60px] flex-none text-[14px] font-bold text-dc-ink">
                    {TIME.format(new Date(lesson.startsAt))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold text-dc-ink">
                      {lesson.title} · {lesson.groupName}
                    </span>
                    <span className="mt-0.5 block text-[13.5px] text-dc-ink-muted">
                      {lesson.studentCount} öğrenci
                    </span>
                  </span>
                  <Link
                    href={`/panel/ogretmen/ders/${lesson.id}`}
                    className={`flex-none ${lesson.hasPendingNote && new Date(lesson.startsAt) < now ? "panel-quick-action panel-quick-action-primary" : "panel-quick-action"}`}
                  >
                    {lesson.hasPendingNote && new Date(lesson.startsAt) < now ? "Ders sonrası" : "Hazırlık"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard className="mt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <PanelCardTitle>Seni bekleyen işlemler</PanelCardTitle>
            {flags.studentCheckIn ? (
                <Link
                  href="/panel/ogretmen/yardim"
                  className="shrink-0 text-[13.5px] font-bold text-dc-brand-strong hover:text-dc-brand-hover"
                >
                  Yardım kutusunu aç
                </Link>
              ) : null}
            </div>
            {inbox.rows.length ? (
              <ul className="mt-3.5 flex flex-col gap-3.5">
                {inbox.rows.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] font-semibold text-dc-ink">
                        {row.studentName ?? row.context}
                        {row.studentName ? ` · ${row.context}` : ""}
                      </p>
                      <p className="mt-1 text-[13.5px] leading-[1.55] text-dc-ink-muted">
                        {row.headline}
                      </p>
                      <p className="mt-0.5 text-[13.5px] leading-[1.55] text-dc-ink-muted">{row.reason}</p>
                    </div>
                    <Link
                      href={row.cta.href}
                      className="shrink-0 text-[13.5px] font-bold text-dc-brand-strong hover:text-dc-brand-hover"
                    >
                      {row.cta.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <PanelEmpty
                title="Senden aksiyon bekleyen bir kayıt yok."
                body="Yeni sinyal oluştuğunda bu alanda görünür."
                className="mt-3 border-dashed p-5"
              />
            )}
            {inbox.quietStudentCount > 0 ? (
              <p className="mt-3.5 text-[12.5px] text-dc-ink-faint">
                Diğer {inbox.quietStudentCount} öğrencide senden aksiyon bekleyen bir sinyal yok.
              </p>
            ) : null}
          </PanelCard>
      </div>
    </PanelShell>
  );
}

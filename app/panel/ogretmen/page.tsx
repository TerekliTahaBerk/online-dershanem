import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  PanelPageHeader,
  PanelCard,
  PanelCardTitle,
  PanelEmpty,
  PanelStatusBadge,
  PanelActionRow,
} from "@/components/panel/ui";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { getOrRefreshTeacherHomeSnapshot } from "@/lib/panel/teacher-home-server";
import {
  getTeacherAttentionInbox,
} from "@/lib/panel/teacher-attention-server";
import { formatAttentionAge, type TeacherAttentionRow } from "@/lib/panel/teacher-attention";

export const dynamic = "force-dynamic";

const TIME = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

function sourceBadge(row: TeacherAttentionRow) {
  if (row.source === "HELP_REQUEST") {
    return <PanelStatusBadge label="Öğrenci talebi" tone="info" />;
  }
  return <PanelStatusBadge label="Takip sinyali" tone="neutral" />;
}

function stateBadge(row: TeacherAttentionRow) {
  if (row.severity === "overdue") {
    return <PanelStatusBadge label="Süresi geçti" tone="warning" />;
  }
  if (row.source === "HELP_REQUEST") {
    return <PanelStatusBadge label="Yanıt bekliyor" tone="info" />;
  }
  return null;
}

export default async function TeacherHomePage() {
  const session = await requireRole("TEACHER");
  const flags = getPanelFeatureFlags();
  const [snapshot, inbox] = await Promise.all([
    getOrRefreshTeacherHomeSnapshot(session.userId),
    getTeacherAttentionInbox(session.userId),
  ]);
  const now = new Date();
  const attentionFirst = inbox.rows.some((row) => row.source === "HELP_REQUEST");
  const attentionOverflowHref = inbox.rows.some((row) => row.source === "HELP_REQUEST")
    ? "/panel/ogretmen/yardim"
    : inbox.rows.some((row) => row.source === "INTERVENTION")
      ? "/panel/ogretmen/mudahale"
      : "/panel/ogretmen/gruplar";

  const attentionSection = (
    <PanelCard className="mt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PanelCardTitle>Dikkat bekleyenler</PanelCardTitle>
        {inbox.hiddenRowCount > 0 ? (
          <Link
            href={attentionOverflowHref}
            className="shrink-0 text-[13.5px] font-bold text-dc-brand-strong hover:text-dc-brand-hover"
          >
            Tümünü Gör ({inbox.hiddenRowCount})
          </Link>
        ) : flags.studentCheckIn ? (
          <Link
            href="/panel/ogretmen/yardim"
            className="shrink-0 text-[13.5px] font-bold text-dc-brand-strong hover:text-dc-brand-hover"
          >
            Yardım İsteyenler
          </Link>
        ) : null}
      </div>
      {inbox.rows.length ? (
        <div className="mt-3.5 rounded-[12px] border border-dc-line-soft bg-white">
          {inbox.rows.map((row, index) => (
            <PanelActionRow
              key={row.id}
              title={
                <>
                  {row.studentName ?? row.context}
                  {row.studentName ? ` · ${row.context}` : ""}
                </>
              }
              description={
                <>
                  {row.headline} {row.reason}
                </>
              }
              status={
                <div className="flex flex-wrap items-center gap-1.5">
                  {sourceBadge(row)}
                  {stateBadge(row)}
                </div>
              }
              cta={
                <Link href={row.cta.href} className="panel-quick-action inline-flex">
                  {row.cta.label}
                </Link>
              }
              last={index === inbox.rows.length - 1}
            />
          ))}
        </div>
      ) : (
        <PanelEmpty
          title="Senden aksiyon bekleyen bir kayıt yok."
          body="Yeni bir yardım talebi ya da takip sinyali oluştuğunda burada görünür."
          className="mt-3 border-dashed p-5"
        />
      )}
      {inbox.quietStudentCount > 0 ? (
        <p className="mt-3.5 text-[12.5px] text-dc-ink-faint">
          Diğer {inbox.quietStudentCount} öğrencide senden aksiyon bekleyen bir sinyal yok.
        </p>
      ) : null}
    </PanelCard>
  );

  const lessonsSection = (
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
                {lesson.hasPendingNote && new Date(lesson.startsAt) < now ? "Dersi Kapat" : "Hazırlık"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  );

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Bugün"
    >
      <div className="max-w-[1040px]">
        <PanelPageHeader
          title="Bugün"
          description="Bugünkü derslerini, dikkat bekleyen kayıtları ve ders sonrası işlerini tek akışta gör."
        />

        {attentionFirst ? attentionSection : lessonsSection}
        {attentionFirst ? lessonsSection : attentionSection}

        <PanelCard className="mt-5" padded={false}>
          <div className="flex flex-wrap items-start justify-between gap-3 px-[22px] pt-[22px]">
            <PanelCardTitle>Ders sonrası tamamlanacaklar</PanelCardTitle>
          </div>
          {snapshot.awaitingNotes.length ? (
            <div className="mt-2">
              {snapshot.awaitingNotes.map((lesson, i) => (
                <PanelActionRow
                  key={lesson.id}
                  title={lesson.groupName}
                  meta={`Ders başlangıcı ${formatAttentionAge(new Date(lesson.startsAt), now)}`}
                  cta={
                    <Link href={`/panel/ogretmen/ders/${lesson.id}`} className="panel-quick-action inline-flex">
                      Notu Tamamla
                    </Link>
                  }
                  last={i === snapshot.awaitingNotes.length - 1}
                />
              ))}
            </div>
          ) : (
            <div className="px-[22px] py-4">
              <PanelEmpty
                title="Tamamlanacak ders sonrası işi yok."
                body="Not girişi bekleyen ders olduğunda bu alanda görünür."
                className="mt-0 border-dashed p-5"
              />
            </div>
          )}
        </PanelCard>
      </div>
    </PanelShell>
  );
}

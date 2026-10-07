import Link from "next/link";
import type { SessionUser } from "@/lib/auth/session";
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
  StatusBadge,
  buttonClass,
} from "@/components/panel/ui";
import { examStatusPresentation } from "@/lib/odk/presentation";
import { examWorkspaceHref } from "@/lib/odk/staff-workspace";
import { odkStaffModules, type StaffPermission } from "@/lib/products/staff-permission-matrix";
import type { StaffHomeData } from "@/app/panel/odk/yonetim/staff-data";

const DATE_TIME = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });
const TONE = { neutral: "neutral", info: "info", warning: "warning", success: "success", danger: "critical" } as const;

/**
 * DENEME LİGİ PERSONEL ANA SAYFASI (docs/panel-design-roadmap.md §11.8) — ADMIN
 * ve tüm Deneme Ligi personeli için TEK bileşen; her blok izinle filtrelenir.
 * Dikkat satırı yalnız satırın iznini taşıyana görünür; "Yeni deneme" yalnız
 * `odk:exam:edit` ile. Pilot hazırlık kartı yalnız ADMIN. Sayfa ve uçlar izni
 * ayrıca doğrular — bu liste yetki değildir.
 */
export function OdkStaffHome({
  session,
  permissions,
  data,
  pilotBlocked,
}: {
  session: SessionUser;
  permissions: ReadonlySet<StaffPermission>;
  data: StaffHomeData;
  /** Yalnız ADMIN: bloke pilot kapısı sayısı. */
  pilotBlocked?: number | null;
}) {
  const modules = odkStaffModules(permissions);
  const canEdit = permissions.has("odk:exam:edit");
  const canOps = permissions.has("odk:ops:live");
  const summary = [
    `Bu hafta ${data.weekCount} deneme`,
    permissions.has("odk:result:release") || permissions.has("odk:result:score")
      ? data.awaitingReleaseCount
        ? `${data.awaitingReleaseCount} tanesi yayın bekliyor`
        : "yayın bekleyen yok"
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK" pageTitle="Deneme Ligi">
      <div className="max-w-[1100px]">
        <PageHeader
          title="Deneme Ligi"
          description={summary}
          actions={
            canEdit ? (
              <Link href="/panel/odk/yonetim/sinavlar?yeni=1" className={buttonClass("primary", "md")}>
                Yeni deneme
              </Link>
            ) : undefined
          }
        />

        <Section id="dikkat" title="Dikkat bekleyenler" divider={false}>
          {data.attention.length ? (
            <List label="Dikkat bekleyenler">
              {data.attention.map((row) => (
                <ListRow
                  key={row.key}
                  title={row.title}
                  status={<StatusBadge tone={row.tone} label={row.tone === "critical" ? "Bloke" : row.tone === "warning" ? "Bekliyor" : "İnceleme"} />}
                  action={
                    <Link href={row.href} className={buttonClass("ghost", "sm")}>
                      {row.actionLabel}
                      <span className="sr-only"> · {row.title}</span>
                    </Link>
                  }
                />
              ))}
            </List>
          ) : (
            <EmptyState title="Şu an sorumluluğunuzda bekleyen iş yok." body="Hazırlık, puanlama, yayın ve bütünlük işleri burada sıralanır." />
          )}
        </Section>

        <Section
          id="yaklasan"
          title="Yaklaşan"
          actions={
            <Link href="/panel/odk/yonetim/sinavlar" className={buttonClass("ghost", "sm")}>
              Tüm denemeler
            </Link>
          }
        >
          {data.upcoming.length ? (
            <PanelTable caption="Yaklaşan denemeler" columns={["Deneme", "Tür", "Tarih", "Durum", "Hazırlık"]}>
              {data.upcoming.map((exam) => {
                const status = examStatusPresentation[exam.status];
                return (
                  <PanelTableRow key={exam.id}>
                    <PanelTableCell>
                      <Link href={examWorkspaceHref(exam.id)} className="font-medium text-pn-text underline-offset-2 hover:underline">
                        {exam.title}
                      </Link>
                    </PanelTableCell>
                    <PanelTableCell>{exam.family}</PanelTableCell>
                    <PanelTableCell>
                      <span className="tabular-nums">{exam.startsAt ? DATE_TIME.format(exam.startsAt) : "Tarih yok"}</span>
                    </PanelTableCell>
                    <PanelTableCell>
                      <StatusBadge tone={TONE[status.tone]} label={status.label} />
                    </PanelTableCell>
                    <PanelTableCell>
                      <span className="tabular-nums">
                        %{Math.round((exam.readinessDone / Math.max(1, exam.readinessTotal)) * 100)}
                        <span className="text-pn-text-muted"> · {exam.readinessDone}/{exam.readinessTotal}</span>
                      </span>
                    </PanelTableCell>
                  </PanelTableRow>
                );
              })}
            </PanelTable>
          ) : (
            <p className="text-[14px] text-pn-text-muted">Planlanmış ya da hazırlanan yaklaşan deneme yok.</p>
          )}
        </Section>

        {canOps ? (
          <Section
            id="canli"
            title="Canlı şimdi"
            actions={
              <Link href="/panel/odk/yonetim/operasyon" className={buttonClass("ghost", "sm")}>
                Canlı operasyon
              </Link>
            }
          >
            {data.live.length ? (
              <List label="Canlı denemeler">
                {data.live.map((exam) => (
                  <ListRow
                    key={exam.id}
                    title={exam.title}
                    href={`/panel/odk/yonetim/operasyon?deneme=${exam.id}`}
                    status={<StatusBadge tone="critical" label="Canlı" live />}
                    meta={`${exam.active} çözüyor · ${exam.submitted} teslim${exam.assigned ? ` · ${exam.assigned} atanan` : ""}`}
                  />
                ))}
              </List>
            ) : (
              <p className="text-[14px] text-pn-text-muted">Şu an canlı deneme yok.</p>
            )}
          </Section>
        ) : null}

        <Section id="etkinlik" title="Son etkinlik">
          {data.activity.length ? (
            <ol className="divide-y divide-pn-border-subtle rounded-lg border border-pn-border">
              {data.activity.map((event) => (
                <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-[13.5px]">
                  <span className="min-w-0">
                    <Link href={examWorkspaceHref(event.examId, "gecmis")} className="font-medium text-pn-text underline-offset-2 hover:underline">
                      {event.examTitle}
                    </Link>
                    <span className="text-pn-text-secondary"> · {event.label}</span>
                    {event.actor ? <span className="text-pn-text-muted"> · {event.actor}</span> : null}
                  </span>
                  <time dateTime={event.at.toISOString()} className="shrink-0 font-mono text-[12.5px] text-pn-text-muted">
                    {DATE_TIME.format(event.at)}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[14px] text-pn-text-muted">Henüz kayıtlı etkinlik yok.</p>
          )}
        </Section>

        <Section id="moduller" title="Çalışma alanları" description="Görev atamanıza göre açılan Deneme Ligi modülleri.">
          <List label="Çalışma alanları">
            {modules.map((entry) => (
              <ListRow key={entry.id} title={entry.label} href={entry.href} />
            ))}
            {pilotBlocked !== undefined && pilotBlocked !== null ? (
              <ListRow
                title="Pilot hazırlığı"
                href="/panel/odk/yonetim/pilot"
                meta={pilotBlocked ? `${pilotBlocked} bloke yayın kapısı` : "Bloke kapı yok"}
                status={pilotBlocked ? <StatusBadge tone="warning" label="Bloke" /> : undefined}
              />
            ) : null}
          </List>
        </Section>
      </div>
    </PanelShell>
  );
}

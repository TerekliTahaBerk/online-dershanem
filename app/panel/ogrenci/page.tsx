import { CompleteHomeAction } from "@/components/panel/complete-home-action";
import { requirePanelRole } from "@/lib/auth/guards";
import { productLabel } from "@/lib/auth/roles";
import { getStudentHomeData } from "@/lib/panel/student-home-server";
import { ISTANBUL_TIME_ZONE } from "@/lib/istanbul-time";
import { buildStudentHomeActionPlan, type StudentHomeAction } from "@/lib/panel/student-home-actions";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { PanelShell } from "@/components/panel/panel-shell";
import { NoProductAccess } from "@/components/panel/no-product-access";
import { OdStartCard } from "@/components/panel/od-start-card";
import { getCustomerOdStart } from "@/lib/od/onboarding-customer-server";
import {
  ButtonLink,
  EmptyState,
  List,
  ListRow,
  PageHeader,
  PanelProgress,
  Section,
  Sparkline,
  buttonClass,
} from "@/components/panel/ui";
import { TrackedPanelLink } from "@/components/panel/tracked-panel-link";
import { DinoExplanationAction } from "@/components/panel/dino-explanation-action";

export const dynamic = "force-dynamic";

/**
 * ÖĞRENCİ · BUGÜN (docs/panel-design-roadmap.md §9.1).
 *
 * Ana soru: "Şimdi ne yapmalıyım?" Yapı: tek "Şimdi" bloğu → tek ve tekrarsız
 * "Bugün" listesi (sonraki adımlar + birleşik bugün akışı) → tek satır
 * "Bu hafta" özeti → yalnız erişilen ürünlerin sade bölümleri. Büyük sayı
 * kutuları ve kart yığını yok.
 *
 * Aynı domain servisini kullanır; erişimi olmayan ürünün sorgusu çalışmaz ve
 * bölümü çizilmez. Ürün olay adları ve özellikleri değişmedi.
 */

const TR_DATE = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const TR_SHORT = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  day: "numeric",
  month: "long",
});
const TR_TIME = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function greeting(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: ISTANBUL_TIME_ZONE,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
  if (hour < 11) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
}

function actionProductLabel(action: StudentHomeAction): string {
  return action.product === "SHARED" ? "Genel" : productLabel(action.product);
}

function trackedEvent(name: "student_next_action_clicked", action: StudentHomeAction) {
  return {
    name,
    properties: {
      product: action.product,
      actionKind: action.actionKind,
      reasonCode: action.reasonCode,
      ageBand: action.ageBand,
      evidenceBand: "NA" as const,
      role: "STUDENT" as const,
    },
  };
}

export default async function StudentHomePage() {
  const session = await requirePanelRole("STUDENT");
  const now = new Date();
  const [data, start] = await Promise.all([
    getStudentHomeData({ userId: session.userId, role: session.role, now }),
    getCustomerOdStart({ userId: session.userId, role: "STUDENT", now }),
  ]);
  const shell = (children: React.ReactNode) => (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} pageTitle="Bugün">
      {children}
    </PanelShell>
  );
  if (data.products.length === 0) return shell(<NoProductAccess role="STUDENT" start={start} />);
  if (!data.profile) return shell(<OdStartCard start={start} />);

  const od = data.productData.OD;
  const ok = data.productData.OK;
  const odk = data.productData.ODK;
  const latest = odk?.latestExam ?? null;
  const plan = ok?.weeklyPlan ?? null;
  const actionPlan = buildStudentHomeActionPlan({ now, productData: data.productData, products: data.products });
  const primaryAction = actionPlan.nowAction;

  /*
   * TEK "BUGÜN" LİSTESİ. Eskiden "Sonra" ve "Bugünün tamamı" aynı işi iki
   * kez gösteriyordu. Önce öncelikli sonraki adımlar (olay takibiyle), ardından
   * birleşik akıştaki kalan öğeler; aynı hedefe giden ikinci satır basılmaz.
   */
  const usedHrefs = new Set<string>(primaryAction ? [primaryAction.href] : []);
  const nextRows = actionPlan.nextActions.filter((action) => {
    if (usedHrefs.has(action.href)) return false;
    usedHrefs.add(action.href);
    return true;
  });
  const feedRows = (data.unifiedToday?.items ?? []).filter((item) => {
    if (item.href && usedHrefs.has(item.href)) return false;
    if (item.href) usedHrefs.add(item.href);
    return true;
  });
  const todayRowCount = nextRows.length + feedRows.length;
  const feedLimit = Math.max(0, 8 - nextRows.length);

  const upcomingLessons = (od?.todayLessons ?? []).filter((lesson) => lesson.startsAt > now).length;
  const weekFacts = [
    plan ? `Plan ${plan.done}/${plan.total} görev` : null,
    od ? (upcomingLessons ? `Bugün ${upcomingLessons} dersin daha var` : "Bugünkü derslerin bitti") : null,
    odk?.upcomingExam
      ? odk.upcomingExam.startsAt
        ? `Sıradaki deneme ${TR_TIME.format(odk.upcomingExam.startsAt)}`
        : `Sıradaki deneme: ${odk.upcomingExam.title}`
      : null,
  ].filter((fact): fact is string => Boolean(fact));

  const trend = odk?.trend ?? [];
  const trendCaption =
    trend.length >= 2
      ? `Toplam netin ${trend[0].net.toLocaleString("tr-TR")}'ten ${trend[trend.length - 1].net.toLocaleString("tr-TR")}'e ${
          trend[trend.length - 1].net >= trend[0].net ? "çıktı" : "indi"
        }. Seni yalnızca kendi geçmiş denemelerinle karşılaştırıyoruz.`
      : "";

  const summaryParts = [
    actionPlan.allActions.length
      ? `bugün senin için ${Math.min(3, actionPlan.allActions.length)} adım hazırladık`
      : "bugün seni bekleyen bir iş yok",
    plan?.total ? `planında ${Math.max(0, plan.total - plan.done)} görev kaldı` : null,
    od?.todayLessons.length ? `bugün ${od.todayLessons.length} canlı dersin var` : null,
  ].filter(Boolean);

  if (primaryAction) {
    await recordPanelProductEvent(
      {
        name: "student_next_action_viewed",
        properties: {
          product: primaryAction.product,
          actionKind: primaryAction.actionKind,
          reasonCode: primaryAction.reasonCode,
          ageBand: primaryAction.ageBand,
          evidenceBand: "NA",
          role: "STUDENT",
        },
      },
      session.role,
    );
  }

  return shell(
    <div className="max-w-[960px]">
      {start && <OdStartCard start={start} />}
      <PageHeader
        title={`${greeting(now)}, ${session.fullName?.split(" ")[0] || "hoş geldin"}.`}
        description={summaryParts.length ? `${summaryParts.join(" · ")}.` : undefined}
        metadata={TR_DATE.format(now)}
      />

      {/* ŞİMDİ — tek öncelikli eylem; uyarı rengi değil, nötr blok. */}
      <section aria-labelledby="simdi-baslik" className="mt-6 rounded-[10px] border border-pn-border px-5 py-4">
        <p className="text-[12px] font-semibold text-pn-text-muted">
          Şimdi{primaryAction ? ` · ${actionProductLabel(primaryAction)}` : ""}
        </p>
        {primaryAction ? (
          <>
            <h2 id="simdi-baslik" className="mt-1 text-[17px] font-semibold leading-snug text-pn-text">
              {primaryAction.title}
            </h2>
            <p className="mt-1 text-[14px] leading-[1.6] text-pn-text-secondary">
              {primaryAction.description ? `${primaryAction.description} ` : ""}
              {primaryAction.reason}
            </p>
            <div className="mt-3 flex flex-wrap items-start gap-2">
              <TrackedPanelLink
                href={primaryAction.href}
                className={buttonClass("primary")}
                event={trackedEvent("student_next_action_clicked", primaryAction)}
              >
                {primaryAction.ctaLabel}
              </TrackedPanelLink>
              {primaryAction.completionTaskId ? <CompleteHomeAction taskId={primaryAction.completionTaskId} /> : null}
            </div>
            <div className="mt-3">
              <DinoExplanationAction deterministicReason={primaryAction.reason} questionKey="student_nba_reason" />
            </div>
          </>
        ) : (
          <>
            <h2 id="simdi-baslik" className="mt-1 text-[17px] font-semibold leading-snug text-pn-text">
              Şu an bekleyen bir işin yok
            </h2>
            <p className="mt-1 text-[14px] text-pn-text-secondary">Bu boşluğu iyi değerlendir: haftana göz atabilir ya da gidişatına bakabilirsin.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.products.includes("OK") ? <ButtonLink href="/panel/ogrenci/plan">Haftayı Gör</ButtonLink> : null}
              {data.products.includes("OD") ? <ButtonLink href="/panel/ogrenci/analiz">Gidişatıma Bak</ButtonLink> : null}
              {data.products.includes("ODK") ? <ButtonLink href="/panel/odk/ogrenci/denemeler">Denemelerime Bak</ButtonLink> : null}
            </div>
          </>
        )}
      </section>

      <Section title="Bugün" description="Derslerin, ödevlerin, plan görevlerin ve denemelerin tek bir listede.">
        {todayRowCount ? (
          <List label="Bugünün çalışmaları">
            {nextRows.map((action) => (
              <ListRow
                key={action.id}
                title={action.title}
                description={action.reason}
                meta={actionProductLabel(action)}
                action={
                  <TrackedPanelLink
                    href={action.href}
                    className={buttonClass("secondary", "sm")}
                    event={trackedEvent("student_next_action_clicked", action)}
                  >
                    {action.ctaLabel}
                  </TrackedPanelLink>
                }
              />
            ))}
            {feedRows.slice(0, feedLimit).map((item) => (
              <ListRow
                key={item.id}
                title={item.title}
                description={item.subtitle ?? undefined}
                meta={[item.productLabel, item.timeLabel].filter(Boolean).join(" · ")}
                action={item.href ? <ButtonLink href={item.href} size="sm">Aç</ButtonLink> : undefined}
              />
            ))}
          </List>
        ) : (
          <EmptyState title="Bugün takvimin boş." body="Yeni bir ders, ödev ya da plan görevi geldiğinde ilk burada göreceksin." />
        )}
      </Section>

      {weekFacts.length ? (
        <Section title="Bu hafta">
          <p className="text-[14px] text-pn-text-secondary">{weekFacts.join(" · ")}</p>
        </Section>
      ) : null}

      {plan ? (
        <Section
          title="Haftalık plan"
          actions={<ButtonLink href="/panel/ogrenci/plan" size="sm">Planı aç</ButtonLink>}
        >
          <PanelProgress
            label={`Haftalık plan ${plan.done}/${plan.total} görev tamamlandı`}
            value={plan.done}
            max={Math.max(1, plan.total)}
            text={`${plan.done}/${plan.total} görev tamamlandı`}
            className="max-w-sm"
          />
          {plan.tasks.length ? (
            <ul className="mt-3 border-t border-pn-border">
              {plan.tasks.slice(0, 5).map((task) => (
                <li key={task.id} className="flex items-center gap-3 border-b border-pn-border py-2 text-[14px] last:border-b-0">
                  <span
                    aria-hidden="true"
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded-[4px] text-[10px] font-bold ${
                      task.done ? "bg-dc-ink text-white" : "border border-pn-border-strong"
                    }`}
                  >
                    {task.done ? "✓" : ""}
                  </span>
                  <span className={`min-w-0 flex-1 truncate ${task.done ? "text-pn-text-muted line-through" : "text-pn-text"}`}>
                    {task.done ? <span className="sr-only">Tamamlandı: </span> : null}
                    {task.title} · {task.durationMinutes} dk
                  </span>
                  <span className="shrink-0 text-[12px] text-pn-text-muted">{TR_SHORT.format(task.scheduledFor)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
      ) : null}

      {odk ? (
        <Section
          title="Deneme Ligi"
          actions={<ButtonLink href="/panel/odk/ogrenci/denemeler" size="sm">Denemelerim</ButtonLink>}
        >
          {latest ? (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="min-w-0">
                <p className="text-[13px] text-pn-text-muted">
                  Son deneme · {latest.title} · {TR_SHORT.format(latest.takenAt)}
                </p>
                <p className="mt-0.5 text-[22px] font-bold tabular-nums text-pn-text">
                  {latest.net.toLocaleString("tr-TR")} net
                  {latest.delta !== null ? (
                    <span className="ml-2 text-[13px] font-semibold text-pn-text-muted">
                      {latest.delta >= 0 ? "▲" : "▼"} {Math.abs(latest.delta).toLocaleString("tr-TR")}
                    </span>
                  ) : null}
                </p>
              </div>
              {trend.length >= 2 ? (
                <Sparkline
                  values={trend.map((point) => point.net)}
                  label={`Toplam net gelişimi: ${trend.map((point, index) => `D${index + 1} ${point.net}`).join(", ")}`}
                />
              ) : null}
            </div>
          ) : (
            <EmptyState title="Henüz açıklanmış bir Deneme Ligi sonucun yok." body="İlk sonucun açıklandığında net gelişimini ve analizini burada göreceksin." />
          )}
          {trendCaption ? <p className="mt-3 max-w-[720px] text-[13.5px] leading-[1.6] text-pn-text-secondary">{trendCaption}</p> : null}
          {latest?.sections.length ? (
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-pn-text-secondary">
              {latest.sections.map((section) => (
                <li key={section.name}>
                  {section.name} <span className="font-semibold tabular-nums text-pn-text">{section.net.toLocaleString("tr-TR")}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
      ) : null}
    </div>,
  );
}

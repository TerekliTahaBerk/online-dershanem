import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaffPermission } from "@/lib/auth/guards";
import { hasStaffPermission } from "@/lib/products/staff-permissions";
import { PanelShell } from "@/components/panel/panel-shell";
import { EmptyState, PageHeader, StatusBadge, UrlDrawer, buttonClass } from "@/components/panel/ui";
import { OdkOperationsRefresh } from "@/components/odk/odk-operations-refresh";
import { AttemptReviewActions } from "@/components/odk/attempt-review-actions";
import { attemptStatusPresentation, integrityLevelPresentation } from "@/lib/odk/presentation";
import {
  OPS_HEARTBEAT_FILTERS,
  OPS_STATUS_FILTERS,
  attemptEventPresentation,
  examWorkspaceHref,
  opsAttemptMatches,
  opsCounters,
  opsStateOf,
  parseOpsFilter,
} from "@/lib/odk/staff-workspace";

export const dynamic = "force-dynamic";

const TIME = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Istanbul" });
const DATE_TIME = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });
const TONE = { neutral: "neutral", info: "info", warning: "warning", success: "success", danger: "critical" } as const;
const views = ["all", "live", "attention"] as const;
const STATUS_LABEL: Record<(typeof OPS_STATUS_FILTERS)[number], string> = {
  tumu: "Tüm durumlar",
  devam: "Devam ediyor",
  kopuk: "Bağlantı koptu",
  teslim: "Teslim",
  inceleme: "İnceleme",
};
const HEARTBEAT_LABEL: Record<(typeof OPS_HEARTBEAT_FILTERS)[number], string> = {
  tumu: "Tüm sinyaller",
  "2": "2 dk'dan eski",
  "5": "5 dk'dan eski",
  "10": "10 dk'dan eski",
};
const INTEGRITY_FILTERS = ["tumu", "REVIEW", "HIGH"] as const;
const SELECT = "min-h-8 rounded-md border border-pn-border-strong bg-white px-2 text-[13px] text-pn-text";

function ageLabel(now: Date, at: Date) {
  const seconds = Math.max(0, Math.round((now.getTime() - at.getTime()) / 1000));
  if (seconds < 60) return `${seconds} sn`;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} dk` : `${Math.round(minutes / 60)} sa`;
}

/**
 * CANLI OPERASYON KONSOLU (docs/panel-design-roadmap.md §15.5) — yoğun düzen:
 * deneme seçici + oturum çipi, tek satır sayaçlar, süzgeçli deneme kaydı
 * tablosu (yapışkan başlık, 32px satır, Mono saat), sağda bütünlük uyarıları
 * (≥1280; altında tablonun altında). Satır → kayıt yan paneli
 * (`?onizle=kayit:<id>`): olay zaman çizelgesi ve inceleme eylemleri. Kalp
 * atışı tarayıcı bağlantısını gösterir; Meet katılımının kanıtı değildir.
 */
export default async function OdkOperationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; gorunum?: string; deneme?: string; durum?: string; butunluk?: string; kalp?: string; onizle?: string }>;
}) {
  // Deneme Ligi personel izni (ADMIN her izinde geçer); global rol tek başına yetmez.
  const session = await requireStaffPermission("odk:ops:live");
  const canReview = await hasStaffPermission(session.userId, "odk:integrity:review");
  const params = await searchParams;
  const query = params.q?.trim().toLocaleLowerCase("tr-TR").slice(0, 80) || "";
  const view = views.includes(params.gorunum as (typeof views)[number]) ? (params.gorunum as (typeof views)[number]) : "all";
  const filters = {
    status: parseOpsFilter(params.durum, OPS_STATUS_FILTERS),
    integrity: parseOpsFilter(params.butunluk, INTEGRITY_FILTERS),
    heartbeat: parseOpsFilter(params.kalp, OPS_HEARTBEAT_FILTERS),
  };
  const now = new Date();
  const exams = await prisma.odkExam.findMany({
    where: { status: { in: ["SCHEDULED", "LIVE"] }, endsAt: { gte: new Date(now.getTime() - 24 * 60 * 60_000) } },
    orderBy: { startsAt: "asc" },
    take: 30,
    select: {
      id: true,
      title: true,
      family: true,
      status: true,
      startsAt: true,
      endsAt: true,
      meetRequired: true,
      _count: { select: { assignments: { where: { isActive: true } } } },
      attempts: {
        where: { status: { not: "VOID" } },
        orderBy: { startedAt: "asc" },
        select: {
          id: true,
          status: true,
          meetAcknowledgedAt: true,
          startedAt: true,
          deadlineAt: true,
          lastActivityAt: true,
          integrityLevel: true,
          integrityReviewedAt: true,
          student: { select: { fullName: true, email: true } },
          _count: { select: { answers: true } },
        },
      },
    },
  });
  const isLive = (exam: (typeof exams)[number]) => Boolean(exam.startsAt && exam.startsAt <= now && exam.endsAt && exam.endsAt > now);
  const selectable = exams.filter((exam) => {
    const matchesView =
      view === "all" ||
      (view === "live" && isLive(exam)) ||
      (view === "attention" && exam.attempts.some((attempt) => opsStateOf(attempt, now) === "DISCONNECTED"));
    const matchesQuery =
      !query ||
      exam.title.toLocaleLowerCase("tr-TR").includes(query) ||
      exam.attempts.some((attempt) => (attempt.student.fullName || attempt.student.email).toLocaleLowerCase("tr-TR").includes(query));
    return matchesView && matchesQuery;
  });
  const selected = selectable.find((exam) => exam.id === params.deneme) ?? selectable.find(isLive) ?? selectable[0] ?? null;
  const counters = selected ? opsCounters(selected.attempts, selected._count.assignments, now) : null;
  const rows = selected
    ? selected.attempts
        .filter((attempt) => opsAttemptMatches(attempt, filters, now))
        .filter((attempt) => !query || selected.title.toLocaleLowerCase("tr-TR").includes(query) || (attempt.student.fullName || attempt.student.email).toLocaleLowerCase("tr-TR").includes(query))
        .sort((a, b) => Number(opsStateOf(b, now) === "DISCONNECTED") - Number(opsStateOf(a, now) === "DISCONNECTED"))
    : [];
  const alerts = selected
    ? selected.attempts.filter((attempt) => opsStateOf(attempt, now) === "DISCONNECTED" || (attempt.integrityLevel !== "NORMAL" && !attempt.integrityReviewedAt))
    : [];

  const baseParams = () => {
    const search = new URLSearchParams();
    if (selected) search.set("deneme", selected.id);
    if (params.q) search.set("q", params.q);
    if (view !== "all") search.set("gorunum", view);
    if (filters.status !== "tumu") search.set("durum", filters.status);
    if (filters.integrity !== "tumu") search.set("butunluk", filters.integrity);
    if (filters.heartbeat !== "tumu") search.set("kalp", filters.heartbeat);
    return search;
  };
  const drawerHref = (attemptId: string) => {
    const search = baseParams();
    search.set("onizle", `kayit:${attemptId}`);
    return `/panel/odk/yonetim/operasyon?${search.toString()}`;
  };

  const drawerId = params.onizle?.startsWith("kayit:") ? params.onizle.slice("kayit:".length) : null;
  const drawerAttempt = drawerId && selected ? selected.attempts.find((attempt) => attempt.id === drawerId) ?? null : null;
  const drawerEvents = drawerAttempt
    ? await prisma.odkAttemptEvent.findMany({
        where: { attemptId: drawerAttempt.id },
        orderBy: { sequence: "desc" },
        take: 60,
        select: { id: true, type: true, sequence: true, serverOccurredAt: true },
      })
    : [];

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK" pageTitle="Canlı operasyon">
      <PageHeader
        title="Canlı operasyon"
        description="Kalp atışı tarayıcı bağlantısını gösterir; Google Meet katılımının teknik kanıtı değildir. Gecikmede öğrenciyle doğrudan iletişim kurun."
        actions={<OdkOperationsRefresh renderedAt={now.toISOString()} />}
      />

      <form method="get" className="mt-2 flex flex-wrap items-end gap-2 border-b border-pn-border pb-3">
        <label className="grid gap-1 text-[12px] font-medium text-pn-text-muted">
          Deneme
          <select name="deneme" defaultValue={selected?.id ?? ""} className={`${SELECT} min-w-[220px] max-w-full`}>
            {selectable.length ? null : <option value="">İzlenecek deneme yok</option>}
            {selectable.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {isLive(exam) ? "● " : ""}
                {exam.title}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[12px] font-medium text-pn-text-muted">
          Görünüm
          <select name="gorunum" defaultValue={view} className={SELECT}>
            <option value="all">Tüm planlı ve canlı</option>
            <option value="live">Yalnız canlı</option>
            <option value="attention">Bağlantısı geciken</option>
          </select>
        </label>
        <label className="grid gap-1 text-[12px] font-medium text-pn-text-muted">
          Durum
          <select name="durum" defaultValue={filters.status} className={SELECT}>
            {OPS_STATUS_FILTERS.map((item) => (
              <option key={item} value={item}>
                {STATUS_LABEL[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[12px] font-medium text-pn-text-muted">
          Bütünlük
          <select name="butunluk" defaultValue={filters.integrity} className={SELECT}>
            <option value="tumu">Tüm düzeyler</option>
            <option value="REVIEW">İncelenmeli ve üstü</option>
            <option value="HIGH">Yüksek sinyal</option>
          </select>
        </label>
        <label className="grid gap-1 text-[12px] font-medium text-pn-text-muted">
          Son sinyal
          <select name="kalp" defaultValue={filters.heartbeat} className={SELECT}>
            {OPS_HEARTBEAT_FILTERS.map((item) => (
              <option key={item} value={item}>
                {HEARTBEAT_LABEL[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[12px] font-medium text-pn-text-muted">
          Ara
          <input name="q" defaultValue={params.q || ""} placeholder="Öğrenci veya deneme" className={`${SELECT} w-44`} />
        </label>
        <button className={buttonClass("secondary", "sm")}>Uygula</button>
      </form>

      {!selected || !counters ? (
        <EmptyState
          className="mt-6"
          title="Bu görünümde izlenecek deneme bulunmuyor."
          body="Planlanan ya da canlı deneme olduğunda burada görünür; süzgeci temizlemeyi deneyin."
          action={
            <Link href="/panel/odk/yonetim/operasyon" className={buttonClass("secondary", "sm")}>
              Süzgeci temizle
            </Link>
          }
        />
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h2 className="text-[16px] font-semibold text-pn-text">{selected.title}</h2>
            <StatusBadge tone={isLive(selected) ? "critical" : "info"} label={isLive(selected) ? "Canlı" : "Planlandı"} live={isLive(selected)} />
            <span className="font-mono text-[12.5px] text-pn-text-muted">
              {selected.startsAt ? DATE_TIME.format(selected.startsAt) : "—"} – {selected.endsAt ? DATE_TIME.format(selected.endsAt) : "—"}
            </span>
            <Link href={examWorkspaceHref(selected.id)} className={buttonClass("ghost", "sm", "ml-auto")}>
              Çalışma alanı
            </Link>
          </div>

          <dl aria-label="Canlı sayaçlar" className="mt-3 grid grid-cols-3 divide-pn-border rounded-lg border border-pn-border sm:grid-cols-6 sm:divide-x">
            {[
              ["Başlamadı", counters.notStarted, false],
              ["Devam ediyor", counters.inProgress, false],
              ["Bağlantı koptu", counters.disconnected, counters.disconnected > 0],
              ["Teslim", counters.submitted, false],
              ["Otomatik teslim", counters.autoSubmitted, false],
              ["İnceleme", counters.review, counters.review > 0],
            ].map(([label, value, alert]) => (
              <div key={String(label)} className="px-3 py-2">
                <dt className="text-[11.5px] text-pn-text-muted">{label}</dt>
                <dd className={`font-mono text-[18px] font-semibold tabular-nums ${alert ? "text-(--pn-tone-critical)" : "text-pn-text"}`}>{String(value)}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div
              role="region"
              aria-label="Deneme kayıtları"
              tabIndex={0}
              className="max-h-[70vh] overflow-auto rounded-lg border border-pn-border focus-visible:outline-2 focus-visible:outline-pn-accent"
            >
              <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
                <caption className="sr-only">{selected.title} · deneme kayıtları</caption>
                <thead className="sticky top-0 z-10 bg-pn-surface-subtle text-[12px] text-pn-text-muted">
                  <tr className="h-8 border-b border-pn-border">
                    <th scope="col" className="px-3 font-semibold">Öğrenci</th>
                    <th scope="col" className="px-3 font-semibold">Durum</th>
                    <th scope="col" className="px-3 font-semibold">Cevap</th>
                    <th scope="col" className="px-3 font-semibold">Başladı</th>
                    <th scope="col" className="px-3 font-semibold">Son sinyal</th>
                    <th scope="col" className="px-3 font-semibold">Bütünlük</th>
                    <th scope="col" className="px-3 font-semibold">Meet</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((attempt) => {
                    const state = opsStateOf(attempt, now);
                    const status = attemptStatusPresentation[attempt.status];
                    const integrity = integrityLevelPresentation[attempt.integrityLevel];
                    const name = attempt.student.fullName || attempt.student.email;
                    return (
                      <tr key={attempt.id} className={`h-8 border-b border-pn-border-subtle last:border-0 ${state === "DISCONNECTED" ? "bg-(--pn-tone-warning-soft)" : ""}`}>
                        <td className="px-3">
                          <Link href={drawerHref(attempt.id)} scroll={false} className="font-medium text-pn-text underline-offset-2 hover:underline">
                            {name}
                          </Link>
                        </td>
                        <td className="px-3">
                          {state === "DISCONNECTED" ? <StatusBadge tone="warning" label="Bağlantı koptu" /> : <StatusBadge tone={TONE[status.tone]} label={status.label} />}
                        </td>
                        <td className="px-3 font-mono tabular-nums">{attempt._count.answers}</td>
                        <td className="px-3 font-mono tabular-nums text-pn-text-secondary">{TIME.format(attempt.startedAt)}</td>
                        <td className={`px-3 font-mono tabular-nums ${state === "DISCONNECTED" ? "font-semibold text-(--pn-tone-warning)" : "text-pn-text-secondary"}`}>
                          {TIME.format(attempt.lastActivityAt)} <span className="text-pn-text-muted">· {ageLabel(now, attempt.lastActivityAt)}</span>
                        </td>
                        <td className="px-3">
                          {attempt.integrityLevel === "NORMAL" ? (
                            <span className="text-pn-text-muted">Normal</span>
                          ) : (
                            <StatusBadge tone={TONE[integrity.tone]} label={attempt.integrityReviewedAt ? `${integrity.label} · incelendi` : integrity.label} />
                          )}
                        </td>
                        <td className="px-3 text-pn-text-secondary">
                          {!selected.meetRequired ? "Gerekmiyor" : attempt.meetAcknowledgedAt ? "Onayladı" : "Onay eksik"}
                        </td>
                      </tr>
                    );
                  })}
                  {!rows.length ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-pn-text-muted">
                        {selected.attempts.length ? "Süzgece uyan kayıt yok." : "Henüz sınava giren öğrenci yok."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <aside aria-labelledby="operasyon-uyarilar" className="h-fit rounded-lg border border-pn-border">
              <h2 id="operasyon-uyarilar" className="flex items-baseline justify-between border-b border-pn-border px-3 py-2 text-[13.5px] font-semibold text-pn-text">
                Uyarılar
                <span className="font-mono text-pn-text-muted">{alerts.length}</span>
              </h2>
              {alerts.length ? (
                <ul className="divide-y divide-pn-border-subtle text-[13px]">
                  {alerts.map((attempt) => {
                    const disconnected = opsStateOf(attempt, now) === "DISCONNECTED";
                    return (
                      <li key={attempt.id} className="px-3 py-2">
                        <Link href={drawerHref(attempt.id)} scroll={false} className="font-medium text-pn-text underline-offset-2 hover:underline">
                          {attempt.student.fullName || attempt.student.email}
                        </Link>
                        <p className="text-[12.5px] text-pn-text-muted">
                          {disconnected
                            ? `Bağlantı ${ageLabel(now, attempt.lastActivityAt)} önce koptu`
                            : `${integrityLevelPresentation[attempt.integrityLevel].label} · incelenmedi`}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-3 py-3 text-[13px] text-pn-text-muted">Uyarı yok.</p>
              )}
            </aside>
          </div>
        </>
      )}

      {drawerAttempt && selected ? (
        <UrlDrawer title={drawerAttempt.student.fullName || drawerAttempt.student.email} description={selected.title}>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-[13.5px]">
            <dt className="text-pn-text-muted">Durum</dt>
            <dd>{attemptStatusPresentation[drawerAttempt.status].label}</dd>
            <dt className="text-pn-text-muted">Başladı</dt>
            <dd className="font-mono">{DATE_TIME.format(drawerAttempt.startedAt)}</dd>
            <dt className="text-pn-text-muted">Teslim sınırı</dt>
            <dd className="font-mono">{DATE_TIME.format(drawerAttempt.deadlineAt)}</dd>
            <dt className="text-pn-text-muted">Son sinyal</dt>
            <dd className="font-mono">
              {TIME.format(drawerAttempt.lastActivityAt)} · {ageLabel(now, drawerAttempt.lastActivityAt)} önce
            </dd>
            <dt className="text-pn-text-muted">Cevap</dt>
            <dd>{drawerAttempt._count.answers}</dd>
            <dt className="text-pn-text-muted">Bütünlük</dt>
            <dd>
              {integrityLevelPresentation[drawerAttempt.integrityLevel].label}
              {drawerAttempt.integrityReviewedAt ? ` · ${DATE_TIME.format(drawerAttempt.integrityReviewedAt)} incelendi` : ""}
            </dd>
          </dl>
          {canReview ? (
            <div className="mt-5 border-t border-pn-border pt-4">
              <h3 className="mb-2 text-[13.5px] font-semibold text-pn-text">Bütünlük incelemesi</h3>
              <AttemptReviewActions attemptId={drawerAttempt.id} reviewed={Boolean(drawerAttempt.integrityReviewedAt)} />
            </div>
          ) : null}
          <div className="mt-5 border-t border-pn-border pt-4">
            <h3 className="mb-2 text-[13.5px] font-semibold text-pn-text">Olaylar</h3>
            {drawerEvents.length ? (
              <ol className="space-y-1.5 text-[13px]">
                {drawerEvents.map((event) => {
                  const presentation = attemptEventPresentation(event.type);
                  return (
                    <li key={event.id} className="flex gap-3">
                      <time dateTime={event.serverOccurredAt.toISOString()} className="shrink-0 font-mono text-[12.5px] text-pn-text-muted">
                        {TIME.format(event.serverOccurredAt)}
                      </time>
                      <span className={presentation.signal ? "font-medium text-(--pn-tone-warning)" : "text-pn-text"}>
                        {presentation.signal ? <span className="sr-only">Sinyal: </span> : null}
                        {presentation.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-[13px] text-pn-text-muted">Kayıtlı olay yok.</p>
            )}
          </div>
        </UrlDrawer>
      ) : null}
    </PanelShell>
  );
}

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Download,
  ListChecks,
  RotateCcw,
  UserRoundX,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { AdminPageHeader } from "@/components/panel/admin-page-header";
import { loadAdminReports } from "@/lib/panel/admin-reports-server";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const session = await requireRole("ADMIN");
  const reports = await loadAdminReports();
  const { noteRate, attendanceRate, overdueAssignments, pendingPayments, review, plan, ai, teachers } = reports;
  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
    >
      <AdminPageHeader
        eyebrow="Son 30 gün"
        title="Eğitimin nabzı, sayılarla."
        description="Not yazma düzenini, katılımı ve ödev tamamlanmasını sorun büyümeden görün."
        icon={BarChart3}
        meta={`${reports.lessonCount} ders`}
      />
      <div className="mt-4 flex justify-end">
        <a
          href="/api/panel/reports/export?range=30"
          download
          className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 bg-dc-ink text-white hover:bg-black min-h-10 px-3.5 text-[13.5px]"
        >
          <Download size={15} /> CSV raporu indir
        </a>
      </div>
      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <article className="panel-metric-card">
          <CheckCircle2 size={18} className="text-emerald-700" />
          <p className="mt-4 text-3xl font-extrabold text-(--site-ink)">
            %{noteRate}
          </p>
          <p className="mt-1 text-xs text-(--site-muted)">
            Ders tamamlama
          </p>
        </article>
        <article className="panel-metric-card">
          <UsersRound size={18} className="text-dc-ink-muted" />
          <p className="mt-4 text-3xl font-extrabold text-(--site-ink)">
            %{attendanceRate}
          </p>
          <p className="mt-1 text-xs text-(--site-muted)">Katılım</p>
        </article>
        <article className="panel-metric-card">
          <ClipboardCheck size={18} className="text-dc-brand-strong" />
          <p className="mt-4 text-3xl font-extrabold text-(--site-ink)">
            {reports.activeAssignments}
          </p>
          <p className="mt-1 text-xs text-(--site-muted)">Aktif ödev</p>
        </article>
        <article className="panel-metric-card">
          <AlertTriangle size={18} className="text-rose-700" />
          <p className="mt-4 text-3xl font-extrabold text-(--site-ink)">
            {overdueAssignments}
          </p>
          <p className="mt-1 text-xs text-(--site-muted)">
            Gecikmiş çalışma
          </p>
        </article>
        <article className="panel-metric-card">
          <UserRoundX size={18} className="text-[#8A5F37]" />
          <p className="mt-4 text-3xl font-extrabold text-(--site-ink)">
            {reports.emptyGroups}
          </p>
          <p className="mt-1 text-xs text-(--site-muted)">Boş grup</p>
        </article>
        <article className="panel-metric-card">
          <WalletCards size={18} className="text-amber-700" />
          <p className="mt-4 text-3xl font-extrabold text-(--site-ink)">
            {pendingPayments}
          </p>
          <p className="mt-1 text-xs text-(--site-muted)">
            Bekleyen ödeme
          </p>
        </article>
      </section>
      {review ? (
        <section className="mt-5 grid gap-3 sm:grid-cols-2">
          <article className="panel-metric-card">
            <RotateCcw size={18} className="text-(--brand-olive)" />
            <p className="mt-4 text-3xl font-extrabold">
              {review.sevenDayRate === null ? "—" : `%${review.sevenDayRate}`}
            </p>
            <p className="mt-1 text-xs text-(--site-muted)">
              7 günde yeniden çözüm · {review.eligible} uygun öğe ·
              hedef ≥%60
            </p>
          </article>
          <article className="panel-metric-card">
            <CheckCircle2 size={18} className="text-emerald-700" />
            <p className="mt-4 text-3xl font-extrabold">
              {review.retentionRate === null ? "—" : `%${review.retentionRate}`}
            </p>
            <p className="mt-1 text-xs text-(--site-muted)">
              30 günlük doğru geri çağırma · {review.retentionAttempts} deneme
            </p>
          </article>
        </section>
      ) : null}
      {plan ? (
        <section className="mt-5">
          <article className="panel-metric-card">
            <ListChecks size={18} className="text-dc-brand-strong" />
            <p className="mt-4 text-3xl font-extrabold">
              {plan.completionRate === null ? "—" : `%${plan.completionRate}`}
            </p>
            <p className="mt-1 text-xs text-(--site-muted)">
              Haftalık plan görevi tamamlama · {plan.completed}/
              {plan.generated} · pilot baz çizgisi
            </p>
          </article>
        </section>
      ) : null}
      {ai ? (
        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="panel-metric-card">
            <Bot size={18} className="text-dc-brand-strong" />
            <p className="mt-4 text-3xl font-extrabold">
              {ai.approvalRate === null ? "—" : `%${ai.approvalRate}`}
            </p>
            <p className="mt-1 text-xs text-(--site-muted)">
              AI taslak onayı · {ai.reviewed} inceleme · en az 5 örnek
            </p>
          </article>
          <article className="panel-metric-card">
            <Activity size={18} className="text-amber-700" />
            <p className="mt-4 text-3xl font-extrabold">
              {ai.fallbackRate === null ? "—" : `%${ai.fallbackRate}`}
            </p>
            <p className="mt-1 text-xs text-(--site-muted)">
              Güvenli fallback · {ai.drafts} üretim
            </p>
          </article>
          <article className="panel-metric-card">
            <AlertTriangle size={18} className="text-rose-700" />
            <p className="mt-4 text-3xl font-extrabold">
              {ai.flagRate === null ? "—" : `%${ai.flagRate}`}
            </p>
            <p className="mt-1 text-xs text-(--site-muted)">
              Doğrulanmış hata işareti · küçük örnek gizlenir
            </p>
          </article>
          <article className="panel-metric-card">
            <WalletCards size={18} className="text-dc-ink-muted" />
            <p className="mt-4 text-3xl font-extrabold">
              {ai.knownCostUsd === null
                ? "Eksik"
                : `$${ai.knownCostUsd.toLocaleString("tr-TR", { maximumFractionDigits: 4 })}`}
            </p>
            <p className="mt-1 text-xs text-(--site-muted)">
              Bilinen model maliyeti · fiyat env'i yoksa rollout durur
            </p>
          </article>
        </section>
      ) : null}
      <section className="overflow-hidden rounded-[10px] border border-pn-border bg-white mt-5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#eef2df] text-(--brand-olive)">
            <Activity size={19} />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-(--site-ink)">
              Kritik yolculuk SLO'ları
            </h2>
            <p className="mt-1 text-xs leading-5 text-(--site-muted)">
              Son 30 gün · Kimliksiz ürün event'leri · En az 5 örnek olmadan
              durum kararı verilmez.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {reports.slo.map((metric) => (
            <article
              key={metric.key}
              className="rounded-2xl border border-(--site-line) bg-(--site-bg-warm) p-4"
            >
              <div
                className={`inline-flex rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-[.06em] ${metric.status === "healthy" ? "bg-emerald-100 text-emerald-800" : metric.status === "breached" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"}`}
              >
                {metric.statusLabel}
              </div>
              <p className="mt-4 text-2xl font-extrabold tracking-[-.04em] text-(--site-ink)">
                {metric.display}
              </p>
              <p className="mt-1 text-xs font-bold text-(--site-body)">
                {metric.label}
              </p>
              <p className="mt-2 text-[11px] text-(--site-muted)">
                {metric.sampleSize} örnek · {metric.targetDisplay === null ? "Hedef iş kararı bekliyor" : <>{metric.comparison === "gte" ? "≥" : "≤"}{metric.targetDisplay}</>}
              </p>
            </article>
          ))}
        </div>
      </section>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="rounded-[10px] border border-pn-border bg-white overflow-hidden">
          <div className="border-b border-(--site-line) p-5">
            <h2 className="text-sm font-extrabold text-(--site-ink)">
              Öğretmen ders tamamlama
            </h2>
          </div>
          <div className="divide-y divide-(--site-line)">
            {teachers.map((teacher) => {
              const percent = teacher.percent;
              return (
                <article key={teacher.name} className="p-5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{teacher.name}</span>
                    <span>
                      {teacher.completed}/{teacher.total} · %{percent}
                    </span>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-dc-line-soft"
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${teacher.name} ders tamamlama oranı`}
                  >
                    <div
                      className="h-full rounded-full bg-dc-brand"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        <section className="rounded-[10px] border border-pn-border bg-white overflow-hidden">
          <div className="border-b border-(--site-line) p-5">
            <h2 className="text-sm font-extrabold text-(--site-ink)">
              Grup ödev ilerlemesi
            </h2>
          </div>
          <div className="divide-y divide-(--site-line)">
            {reports.groups.map((group) => {
              const percent = group.percent;
              return (
                <article key={group.id} className="p-5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{group.name}</span>
                    <span>
                      {group.students} öğrenci · %{percent}
                    </span>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-dc-line-soft"
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${group.name} ödev ilerlemesi`}
                  >
                    <div
                      className="h-full rounded-full bg-dc-brand"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </PanelShell>
  );
}

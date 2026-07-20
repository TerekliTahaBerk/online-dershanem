import type { SessionUser } from "@/lib/auth/session";
import { CalendarClock, ClipboardCheck, LineChart, ShieldCheck } from "lucide-react";
import { PanelShell } from "@/components/panel/panel-shell";
import { OdkPanelNav } from "@/components/odk/odk-panel-nav";

const COPY = {
  ADMIN: { eyebrow: "ODK yönetimi", title: "Matematik denemelerini uçtan uca yönetin.", body: "Sınav serileri, yayın akışı, canlı operasyon ve sonuç açıklama adımları sırayla bu alana eklenecek." },
  TEACHER: { eyebrow: "ODK öğretmen", title: "Denemeden öğrenme kararına geçin.", body: "Yetkili öğrencilerinizin katılımını ve açıklanmış kazanım analizlerini bu alandan izleyeceksiniz." },
  STUDENT: { eyebrow: "ODK öğrenci", title: "Sıradaki matematik denemene hazırlan.", body: "Yaklaşan sınavlar, canlı çözüm ekranı ve açıklanan kazanım raporların burada olacak." },
  PARENT: { eyebrow: "ODK veli", title: "Gelişimi sakin ve anlaşılır biçimde izleyin.", body: "Bağlı öğrencinizin yaklaşan denemeleri ve açıklanmış sonuçları bu alanda yer alacak." },
} as const;

export function OdkHome({ session }: { session: SessionUser }) {
  const copy = COPY[session.role];
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK" nav={<OdkPanelNav role={session.role} />}>
    <header><p className="text-xs font-extrabold uppercase tracking-[.1em] text-[var(--brand-olive)]">{copy.eyebrow}</p><h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-.05em] text-[var(--site-ink)] sm:text-4xl">{copy.title}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--site-body)]">{copy.body}</p></header>
    <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      { icon: CalendarClock, label: "Planlama", value: "Hazırlanıyor" },
      { icon: ClipboardCheck, label: "Denemeler", value: "Henüz yok" },
      { icon: LineChart, label: "Kazanım analizi", value: "Henüz yok" },
      { icon: ShieldCheck, label: "Erişim", value: "Aktif" },
    ].map(({ icon: Icon, label, value }) => <article key={label} className="panel-metric-card"><Icon size={18} className="text-[var(--brand-olive)]" /><p className="mt-4 text-lg font-bold text-[var(--site-ink)]">{value}</p><p className="mt-1 text-xs text-[var(--site-muted)]">{label}</p></article>)}</section>
  </PanelShell>;
}

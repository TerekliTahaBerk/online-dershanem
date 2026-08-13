import Link from "next/link";
import { CalendarDays, Check, FileChartColumn, Users } from "lucide-react";
import type { PublicOdkPackage } from "@/lib/odk/public-commerce-server";
import { odkAvailabilityLabel } from "@/lib/odk/public-commerce-server";

const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });

export function formatOdkPrice(cents: number) {
  return money.format(cents / 100);
}

export function formatOdkDate(value: string | null) {
  return value ? date.format(new Date(value)) : "Tarih ilan edilecek";
}

export function PublicOdkPackageCard({ item }: { item: PublicOdkPackage }) {
  const { contract, availability } = item;
  const rights = contract.policy.rights;
  return (
    <article className="flex h-full flex-col rounded-[28px] border border-[var(--site-line)] bg-white p-6 shadow-[0_18px_55px_-38px_rgba(36,45,28,.45)] sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--brand-olive)]">{contract.exams.map((exam) => exam.family).filter((value, index, all) => all.indexOf(value) === index).join(" + ") || "Online deneme"}</p>
          <h2 className="mt-2 font-display text-3xl tracking-[-.035em] text-[var(--site-ink)]">{contract.package.title}</h2>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${availability.allowed ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          {odkAvailabilityLabel(availability.reason)}
        </span>
      </div>
      {contract.package.description ? <p className="mt-4 leading-7 text-[var(--site-body)]">{contract.package.description}</p> : null}
      <div className="mt-6 flex items-end gap-3">
        <strong className="font-display text-4xl tracking-[-.04em] text-[var(--site-ink)]">{formatOdkPrice(contract.package.priceCents)}</strong>
        {contract.package.originalPriceCents ? <del className="pb-1 text-sm text-[var(--site-muted)]">{formatOdkPrice(contract.package.originalPriceCents)}</del> : null}
      </div>
      <ul className="mt-6 space-y-3 text-sm text-[var(--site-body)]">
        <li className="flex gap-3"><CalendarDays size={18} className="mt-0.5 shrink-0 text-[var(--brand-orange)]" />{contract.exams.length} planlı deneme</li>
        <li className="flex gap-3"><FileChartColumn size={18} className="mt-0.5 shrink-0 text-[var(--brand-orange)]" />{rights.studentReports ? "Öğrenci sonuç ve kazanım raporu" : "Temel sonuç görünümü"}</li>
        <li className="flex gap-3"><Users size={18} className="mt-0.5 shrink-0 text-[var(--brand-orange)]" />{rights.parentReports && rights.teacherReports ? "Veli ve öğretmen rapor erişimi" : "Sözleşmede belirtilen rol erişimleri"}</li>
        {contract.policy.rights.liveService ? <li className="flex gap-3"><Check size={18} className="mt-0.5 shrink-0 text-[var(--brand-orange)]" />Canlı sınav hizmeti</li> : null}
      </ul>
      <Link href={`/odk-paketleri/${contract.package.slug}`} className="site-btn site-btn-primary mt-7 w-full justify-center">
        Paketi ve tarihleri incele
      </Link>
    </article>
  );
}

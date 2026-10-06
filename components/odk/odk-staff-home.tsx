import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelPageHeader } from "@/components/panel/panel-page-header";
import { odkStaffModules, type StaffPermission } from "@/lib/products/staff-permission-matrix";

const MODULE_COPY: Record<string, string> = {
  "odk-exams": "Deneme, bölüm, soru, cevap anahtarı ve kazanım hazırlığı.",
  "odk-ops": "Sınav günü canlı takip, bağlantı ve bütünlük incelemesi.",
  "odk-results": "Puanlama, yeniden puanlama ve sonuç yayını.",
  "odk-reports": "Katılım, ders ve kazanım bazında sonuç raporları.",
  "odk-packages": "Deneme Ligi paketleri ve sözleşme politikası.",
};

/**
 * Deneme Ligi PERSONEL ana sayfası (ADMIN olmayan, birden çok modülü olan
 * personel). Yalnız izinli modüller gösterilir; her modülün kendi sayfası ve
 * API'si ayrıca izin kontrolü yapar — bu liste yetki değildir.
 */
export function OdkStaffHome({ session, permissions }: { session: SessionUser; permissions: ReadonlySet<StaffPermission> }) {
  const modules = odkStaffModules(permissions);
  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK">
      <PanelPageHeader
        eyebrow="Deneme Ligi ekibi"
        title="Sorumlu olduğunuz modüller"
        description="Görev atamanıza göre açılan Deneme Ligi çalışma alanları."
        icon={ShieldCheck}
      />
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {modules.map((entry) => (
          <li key={entry.id}>
            <Link
              href={entry.href}
              className="panel-surface flex h-full items-start justify-between gap-3 p-5 transition-colors hover:border-dc-brand"
            >
              <span>
                <span className="block text-[15px] font-bold text-dc-ink">{entry.label}</span>
                <span className="mt-1 block text-[13px] leading-5 text-dc-ink-muted">{MODULE_COPY[entry.id]}</span>
              </span>
              <ArrowRight size={16} aria-hidden="true" className="mt-1 shrink-0 text-dc-ink-faint" />
            </Link>
          </li>
        ))}
      </ul>
    </PanelShell>
  );
}

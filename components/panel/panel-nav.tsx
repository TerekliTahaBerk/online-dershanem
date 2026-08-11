"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { UserRole } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import { Accessibility, BarChart3, Bell, BookOpenCheck, Bot, CalendarDays, ChartNoAxesCombined, ClipboardCheck, CreditCard, Flag, HandHeart, HeartHandshake, History, Inbox, LayoutDashboard, Library, ListChecks, PackageCheck, Rocket, RotateCcw, UsersRound, WifiOff } from "lucide-react";
import { rolePath } from "@/lib/auth/roles";
import { usePanelFeatureFlags } from "@/components/panel/panel-feature-provider";
import type { PanelFeatureFlags } from "@/lib/panel-feature-flags";

type NavItem = { href: string; label: string; hint?: string; icon: LucideIcon };
const NAV: Record<UserRole, (root: string, flags: PanelFeatureFlags) => NavItem[]> = {
  ADMIN: (root, flags) => [
    { href: root, label: "Kontrol merkezi", hint: "Bugün ve uyarılar", icon: LayoutDashboard },
    { href: `${root}/takvim`, label: "Takvim", hint: "Haftalık ders akışı", icon: CalendarDays },
    { href: `${root}/kullanicilar`, label: "Kişiler", hint: "Hesaplar ve roller", icon: UsersRound },
    { href: `${root}/egitim`, label: "Eğitim", hint: "Gruplar ve dersler", icon: BookOpenCheck },
    { href: `${root}/kazanimlar`, label: "Kazanımlar", hint: "Müfredat ve kanıt kapsamı", icon: ClipboardCheck },
    ...(flags.mockExamAnalysis ? [{ href: `${root}/denemeler`, label: "Denemeler", hint: "Süre ve hata eğilimi", icon: ChartNoAxesCombined }] : []),
    ...(flags.interventionInbox ? [{ href: `${root}/mudahale`, label: "Müdahale kutusu", hint: "Sahip, SLA ve sonuç", icon: Inbox }] : []),
    { href: `${root}/isler`, label: "Operasyon", hint: "Talepler ve ödemeler", icon: CreditCard },
    { href: `${root}/kayitlar`, label: "İşlem geçmişi", hint: "Değişiklik ve güvenlik izi", icon: History },
    { href: `${root}/raporlar`, label: "Raporlar", hint: "Katılım ve tamamlama", icon: BarChart3 },
    { href: `${root}/pilot`, label: "Pilot yayını", hint: "Kohort, kapılar ve geri alma", icon: Rocket },
    { href: `${root}/ozellikler`, label: "Özellik envanteri", hint: "Canlı flag ve rollout durumu", icon: Flag },
    ...(flags.cohortQuality ? [{ href: `${root}/kalite`, label: "Öğrenme kalitesi", hint: "Adil kohort gelişimi", icon: BarChart3 }] : []),
    { href: "/panel/bildirimler", label: "Bildirimler", hint: "Son gelişmeler", icon: Bell },
    ...(flags.accessibilityProfile ? [{ href: "/panel/erisilebilirlik", label: "Erişilebilirlik", hint: "Görünüm ve işlevsel destek", icon: Accessibility }] : []),
    ...(flags.offlineMode ? [{ href: "/panel/veri-kullanimi", label: "Veri kullanımı", hint: "Düşük veri ve çevrimdışı kayıt", icon: WifiOff }] : []),
  ],
  TEACHER: (root, flags) => [
    { href: root, label: "Bugün", icon: BookOpenCheck },
    { href: `${root}/takvim`, label: "Takvim", icon: CalendarDays },
    { href: `${root}/gruplar`, label: "Gruplarım", icon: UsersRound },
    { href: `${root}/odevler`, label: "Ödevler", icon: ClipboardCheck },
    ...(flags.mockExamAnalysis ? [{ href: `${root}/denemeler`, label: "Denemeler", icon: ChartNoAxesCombined }] : []),
    ...(flags.reviewQueue ? [{ href: `${root}/tekrar`, label: "Tekrar kuyruğu", icon: RotateCcw }] : []),
    ...(flags.adaptivePlan ? [{ href: `${root}/plan`, label: "Haftalık planlar", icon: ListChecks }] : []),
    ...(flags.recoveryPackage ? [{ href: `${root}/telafi`, label: "Telafi paketleri", icon: PackageCheck }] : []),
    ...(flags.parentWeeklyDigest ? [{ href: `${root}/ozetler`, label: "Veli özetleri", icon: HeartHandshake }] : []),
    ...(flags.interventionInbox ? [{ href: `${root}/mudahale`, label: "Müdahale kutusu", icon: Inbox }] : []),
    ...(flags.studentCheckIn ? [{ href: `${root}/yardim`, label: "Yardım istekleri", icon: HandHeart }] : []),
    ...(flags.teacherAiDrafts ? [{ href: `${root}/ai-yardimci`, label: "Taslak yardımcısı", icon: Bot }] : []),
    { href: `${root}/materyaller`, label: "Materyaller", icon: Library },
    { href: "/panel/bildirimler", label: "Bildirimler", icon: Bell },
    ...(flags.accessibilityProfile ? [{ href: "/panel/erisilebilirlik", label: "Erişilebilirlik", icon: Accessibility }] : []),
    ...(flags.offlineMode ? [{ href: "/panel/veri-kullanimi", label: "Veri kullanımı", icon: WifiOff }] : []),
  ],
  STUDENT: (root, flags) => [
    { href: root, label: "Özet", icon: LayoutDashboard },
    { href: `${root}/takvim`, label: "Takvim", icon: CalendarDays },
    { href: `${root}/odevler`, label: "Ödevler", icon: ClipboardCheck },
    { href: `${root}/gelisim`, label: "Gelişim", icon: BarChart3 },
    ...(flags.mockExamAnalysis ? [{ href: `${root}/denemeler`, label: "Denemeler", icon: ChartNoAxesCombined }] : []),
    ...(flags.reviewQueue ? [{ href: `${root}/tekrar`, label: "Bugünkü tekrar", icon: RotateCcw }] : []),
    ...(flags.adaptivePlan ? [{ href: `${root}/plan`, label: "Haftalık planım", icon: ListChecks }] : []),
    ...(flags.recoveryPackage ? [{ href: `${root}/telafi`, label: "Telafi adımım", icon: PackageCheck }] : []),
    ...(flags.parentWeeklyDigest ? [{ href: `${root}/haftalik`, label: "Haftalık özet", icon: HeartHandshake }] : []),
    ...(flags.studentCheckIn ? [{ href: `${root}/check-in`, label: "Nasılım?", icon: HandHeart }] : []),
    { href: `${root}/materyaller`, label: "Materyaller", icon: Library },
    { href: "/panel/bildirimler", label: "Bildirimler", icon: Bell },
    ...(flags.accessibilityProfile ? [{ href: "/panel/erisilebilirlik", label: "Erişilebilirlik", icon: Accessibility }] : []),
    ...(flags.offlineMode ? [{ href: "/panel/veri-kullanimi", label: "Veri kullanımı", icon: WifiOff }] : []),
  ],
  PARENT: (root, flags) => [
    { href: root, label: "Gelişim", icon: LayoutDashboard },
    { href: `${root}/takvim`, label: "Takvim", icon: CalendarDays },
    { href: `${root}/takip`, label: "Ödev ve ödeme", icon: ClipboardCheck },
    ...(flags.mockExamAnalysis ? [{ href: `${root}/denemeler`, label: "Denemeler", icon: ChartNoAxesCombined }] : []),
    ...(flags.parentWeeklyDigest ? [{ href: `${root}/haftalik`, label: "Haftalık özet", icon: HeartHandshake }] : []),
    { href: "/panel/bildirimler", label: "Bildirimler", icon: Bell },
    ...(flags.accessibilityProfile ? [{ href: "/panel/erisilebilirlik", label: "Erişilebilirlik", icon: Accessibility }] : []),
    ...(flags.offlineMode ? [{ href: "/panel/veri-kullanimi", label: "Veri kullanımı", icon: WifiOff }] : []),
  ],
};

export function PanelNav({ role }: { role: UserRole }) {
  const flags = usePanelFeatureFlags();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const root = rolePath(role);
  const items = NAV[role](root, flags);
  const selectedStudentId = role === "PARENT" ? searchParams.get("studentId") : null;

  return (
    <nav aria-label="Panel menüsü" className={`panel-nav-scroll flex gap-2 overflow-x-auto ${role === "ADMIN" ? "lg:flex-col lg:gap-1 lg:overflow-visible" : ""}`}>
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== root && pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;
        const href = selectedStudentId && item.href.startsWith(root) ? `${item.href}?studentId=${encodeURIComponent(selectedStudentId)}` : item.href;
        return (
          <Link
            key={item.href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`group flex min-w-fit items-center gap-3 rounded-2xl px-3 py-2.5 transition-all lg:w-full ${
              active
                ? "bg-[var(--panel-nav-active)] text-[var(--brand-olive)] shadow-[inset_0_0_0_1px_rgba(58,74,44,.05)]"
                : "text-[var(--site-body)] hover:bg-white hover:text-[var(--site-ink)]"
            }`}
          >
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-colors ${active ? "bg-white text-[var(--brand-olive)] shadow-sm" : "bg-white/65 text-[var(--site-muted)] group-hover:text-[var(--site-ink)]"}`}>
              <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="text-left">
              <span className="block text-[13px] font-bold leading-4">{item.label}</span>
              {item.hint ? <span className="mt-0.5 hidden text-[10.5px] leading-4 text-[var(--site-muted)] lg:block">{item.hint}</span> : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

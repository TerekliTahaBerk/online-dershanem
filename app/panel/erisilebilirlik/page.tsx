import { notFound } from "next/navigation";
import { Accessibility } from "lucide-react";
import { requireActiveUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { AccessibilityPreferencesForm } from "@/components/panel/accessibility-preferences-form";

export const dynamic = "force-dynamic";
export default async function AccessibilityPage() {
  const session = await requireActiveUser(); if (!getPanelFeatureFlags().accessibilityProfile) notFound();
  const preference = await prisma.accessibilityPreference.findUnique({ where: { userId: session.userId } });
  const initial = preference ? { version: preference.version, reducedMotion: preference.reducedMotion, highContrast: preference.highContrast, textScale: preference.textScale, comfortableSpacing: preference.comfortableSpacing, captionsPreferred: preference.captionsPreferred, transcriptPreferred: preference.transcriptPreferred } : { version: 0, reducedMotion: false, highContrast: false, textScale: "DEFAULT" as const, comfortableSpacing: false, captionsPreferred: false, transcriptPreferred: false };
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email}><header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><Accessibility size={16} /> Erişilebilirlik</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em]">Paneli çalışma biçiminize uyarlayın.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--site-body)]">Tercihler hesabınıza bağlıdır ve kullandığınız cihazlar arasında uygulanır. Sağlık tanısı veya engel adı istemeyiz.</p></header><div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]"><AccessibilityPreferencesForm initial={initial} /><aside className="panel-surface h-fit p-5"><h2 className="text-sm font-extrabold">Akademik düzenlemem</h2>{session.role === "STUDENT" ? <>{preference && (preference.assessmentExtraPercent > 0 || preference.breaksAllowed) ? <ul className="mt-3 space-y-2 text-sm"><li>{preference.assessmentExtraPercent > 0 ? `%${preference.assessmentExtraPercent} ek değerlendirme süresi` : "Standart değerlendirme süresi"}</li>{preference.breaksAllowed ? <li>Planlı kısa mola</li> : null}</ul> : <p className="mt-3 text-sm leading-6 text-[var(--site-body)]">Admin tarafından atanmış ek süre veya mola düzenlemesi yok.</p>}<p className="mt-4 text-xs leading-5 text-[var(--site-muted)]">Değişiklik gerekiyorsa yöneticinizle iletişime geçin. Burada tanı paylaşmanız gerekmez.</p></> : <p className="mt-3 text-sm leading-6 text-[var(--site-body)]">Ek süre ve mola yalnız öğrenci hesaplarında admin tarafından yönetilir.</p>}</aside></div></PanelShell>;
}

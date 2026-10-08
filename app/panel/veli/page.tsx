import Link from "next/link";
import { requirePanelRole } from "@/lib/auth/guards";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { loadParentCalmHome } from "@/lib/panel/parent-calm-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChildContext } from "@/components/panel/parent/child-context";
import { ParentCalmHomeView } from "@/components/panel/parent-calm-home";
import { PanelPageHeader } from "@/components/panel/ui";
import { OdStartCard } from "@/components/panel/od-start-card";
import { getCustomerOdStart } from "@/lib/od/onboarding-customer-server";

export const dynamic = "force-dynamic";

/**
 * VELİ ANA SAYFA — Sakin Veli Paneli (Part 7).
 *
 * Tek soru: çocuğum nasıl gidiyor ve benim yapmam gereken bir şey var mı?
 * Öğretmen operasyonları, risk skorları ve özel notlar buraya girmez.
 */

export default async function ParentHomePage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const session = await requirePanelRole("PARENT");
  const { studentId } = await searchParams;
  const { children, selected } = await resolveParentScope(
    session.userId,
    studentId,
  );

  const shell = (body: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Bugün"
    >
      <div className="max-w-[760px]">{body}</div>
    </PanelShell>
  );

  if (!selected) {
    return shell(
      <>
        <PanelPageHeader title="Hoş geldiniz" />
        <OdStartCard start={null} />
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/panel/veli/hesap" className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 bg-dc-ink text-white hover:bg-black min-h-10 px-3.5 text-[13.5px]">
            Hesap durumunu kontrol et
          </Link>
          <Link href="/iletisim" className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 border border-pn-border-strong bg-white text-pn-text hover:bg-pn-hover min-h-10 px-3.5 text-[13.5px]">
            Eşleştirme desteği al
          </Link>
        </div>
      </>,
    );
  }

  const [home, start] = await Promise.all([loadParentCalmHome({
    parentUserId: session.userId,
    selected,
  }), getCustomerOdStart({ userId: session.userId, role: "PARENT", studentId: selected.id })]);

  return shell(<>{start && <OdStartCard start={start} />}<ParentCalmHomeView home={home} childContext={<ChildContext options={children} selectedId={selected.id} basePath="/panel/veli" />} /></>);
}

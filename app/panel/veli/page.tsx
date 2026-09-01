import { requirePanelRole } from "@/lib/auth/guards";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { loadParentCalmHome } from "@/lib/panel/parent-calm-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChildSwitcher } from "@/components/panel/parent/child-switcher";
import { ParentCalmHomeView } from "@/components/panel/parent-calm-home";
import { PanelEmpty, PanelPageHeader } from "@/components/panel/ui";

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
  const { children, selected } = await resolveParentScope(session.userId, studentId);

  const shell = (body: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Bugün"
      topbarSlot={
        <ChildSwitcher options={children} selectedId={selected?.id ?? null} basePath="/panel/veli" />
      }
    >
      <div className="max-w-[760px]">{body}</div>
    </PanelShell>
  );

  if (!selected) {
    return shell(
      <>
        <PanelPageHeader title="Öğrenci bağlantınız hazırlanıyor." />
        <PanelEmpty
          title="Henüz bağlı öğrenci yok."
          body="Yönetim ekibi hesabınızı öğrencinizle eşleştirdiğinde sakin özet burada açılır."
        />
      </>,
    );
  }

  const home = await loadParentCalmHome({
    parentUserId: session.userId,
    selected,
  });

  return shell(<ParentCalmHomeView home={home} />);
}

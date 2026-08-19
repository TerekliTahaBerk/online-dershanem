import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChildSwitcher } from "@/components/panel/parent/child-switcher";
import { PanelHeading, PanelEmpty } from "@/components/panel/ui";
import { CalmDigestCard } from "@/components/panel/calm-digest-card";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

export const dynamic = "force-dynamic";

/**
 * VELİ · HAFTALIK ÖZET — onaylı tasarım dili (Panel.dc.html → veli ekranları).
 *
 * Tasarım geçişinde geride kalan ikinci veli ekranı. Artık ortak parçaları
 * kullanır: `resolveParentScope` (bağlı olmayan öğrenci 404), topbar'daki
 * `ChildSwitcher` ve dc token'ları.
 *
 * Korunan davranışlar: sakin özet kartı (`CalmDigestCard`) ve görüntüleme
 * ürün olayı — ikisi de üründe anlamlı, yeniden yazılmadı.
 */

export default async function ParentWeeklyDigestPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const session = await requirePanelRole("PARENT");
  if (!getPanelFeatureFlags().parentWeeklyDigest) notFound();

  const { studentId } = await searchParams;
  const { children, selected } = await resolveParentScope(session.userId, studentId);

  const shell = (body: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Haftalık özet"
      topbarSlot={
        <ChildSwitcher
          options={children}
          selectedId={selected?.id ?? null}
          basePath="/panel/veli/haftalik"
        />
      }
    >
      <div className="max-w-[860px]">{body}</div>
    </PanelShell>
  );

  if (!selected) {
    return shell(
      <>
        <PanelHeading title="Haftalık özet" />
        <PanelEmpty
          title="Öğrenci bağlantın hazırlanıyor."
          body="Bağlantı kurulduğunda haftalık özet burada görünür."
        />
      </>,
    );
  }

  const digest = await prisma.weeklyDigest.findFirst({
    where: { studentId: selected.id, status: "PUBLISHED" },
    orderBy: { weekStart: "desc" },
    include: { feedback: { where: { userId: session.userId }, take: 1 } },
  });

  if (!digest) {
    return shell(
      <>
        <PanelHeading title={selected.name} description="Haftada bir sakin bakış" />
        <PanelEmpty
          title="Haftalık özet henüz yayınlanmadı."
          body="Öğretmen önizlemeyi tamamladığında öğrenciyle aynı anda burada açılır."
        />
      </>,
    );
  }

  const ageDays = digest.publishedAt
    ? (Date.now() - digest.publishedAt.getTime()) / 86400000
    : 0;
  await recordPanelProductEvent(
    {
      name: "weekly_digest_viewed",
      properties: {
        actorRole: "PARENT",
        trendBand: digest.trendBand as "IMPROVING" | "STEADY" | "BUILDING" | "LIMITED_DATA",
        ageBand: ageDays <= 2 ? "0-2D" : ageDays <= 7 ? "3-7D" : "8D+",
      },
    },
    session.role,
  );

  const feedback = digest.feedback[0];

  return shell(
    <>
      <PanelHeading title={selected.name} description="Haftada bir sakin bakış" />
      <div className="mt-7">
        <CalmDigestCard
          viewerRole="PARENT"
          digest={{
            id: digest.id,
            goodThingOne: digest.goodThingOne,
            goodThingTwo: digest.goodThingTwo,
            supportArea: digest.supportArea,
            homeQuestion: digest.homeQuestion,
            dataThrough: digest.dataThrough.toISOString(),
            trendBand: digest.trendBand,
            feedback: feedback
              ? { helpful: feedback.helpful, anxietyPulse: feedback.anxietyPulse }
              : null,
          }}
        />
      </div>
    </>,
  );
}

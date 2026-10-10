import { notFound } from "next/navigation";
import { requirePanelRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { loadParentDigest } from "@/lib/panel/parent-digest-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChildContext } from "@/components/panel/parent/child-context";
import {
  EmptyState,
  List,
  ListRow,
  PanelHeading,
  Section,
} from "@/components/panel/ui";
import { CalmDigestCard } from "@/components/panel/calm-digest-card";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { ISTANBUL_TIME_ZONE } from "@/lib/istanbul-time";

export const dynamic = "force-dynamic";

/**
 * VELİ · HAFTALIK ÖZET
 *
 * Yayınlanmış öğretmen özeti ile sistemden görünen yaklaşanlar ayrı bloklarda
 * tutulur. Özel öğretmen notu ve risk skoru buraya girmez.
 */

const TR_DATE = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  day: "numeric",
  month: "long",
  weekday: "short",
});

export default async function ParentWeeklyDigestPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const session = await requirePanelRole("PARENT");
  if (!getPanelFeatureFlags().parentWeeklyDigest) notFound();

  const { studentId } = await searchParams;
  const { children, selected } = await resolveParentScope(
    session.userId,
    studentId,
  );
  // Hangi çocuğun verisine bakıldığı başlığın özellik satırında (§9.7).
  const childContext = <ChildContext options={children} selectedId={selected?.id ?? null} basePath="/panel/veli/haftalik" />;

  const shell = (body: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Haftalık özet"
    >
      <div className="max-w-[860px]">{body}</div>
    </PanelShell>
  );

  if (!selected) {
    return shell(
      <>
        <PanelHeading title="Haftalık özet" />
        <EmptyState
          className="mt-6"
          title="Öğrenci bağlantın hazırlanıyor."
          body="Bağlantı kurulduğunda haftalık özet burada görünür."
        />
      </>,
    );
  }

  // Ortak yükleyici (mobil `GET /api/panel/parent/digests` ile aynı).
  const { digest, upcoming } = await loadParentDigest(session.userId, selected);
  const systemUpcoming = upcoming.map((item) => ({ title: item.title, meta: TR_DATE.format(item.at) }));
  // Otomatik kayıtlar öğretmen/koç özetinden ayrı bir bölümde durur.
  const upcomingSection = (description: string) => (
    <Section title="Sistemden görünenler · önümüzdeki günler" description={description}>
      {systemUpcoming.length ? (
        <List label="Önümüzdeki günler">
          {systemUpcoming.map((item) => (
            <ListRow key={`${item.title}-${item.meta}`} title={item.title} meta={item.meta} />
          ))}
        </List>
      ) : (
        <p className="text-[14px] text-pn-text-muted">
          Önümüzdeki iki hafta için planlanmış ders veya görüşme görünmüyor.
        </p>
      )}
    </Section>
  );

  if (!digest) {
    return shell(
      <>
        <PanelHeading
          title="Haftalık özet"
          description="Haftada bir sakin bakış"
          metadata={childContext}
        />
        <EmptyState
          className="mt-6"
          title="Haftalık özet henüz yayınlanmadı."
          body="Öğretmen önizlemeyi tamamladığında öğrenciyle aynı anda burada açılır."
        />
        {systemUpcoming.length
          ? upcomingSection("Bu liste otomatik kayıtlardan gelir; öğretmen özeti değildir.")
          : null}
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
        trendBand: digest.trendBand as
          | "IMPROVING"
          | "STEADY"
          | "BUILDING"
          | "LIMITED_DATA",
        ageBand: ageDays <= 2 ? "0-2D" : ageDays <= 7 ? "3-7D" : "8D+",
      },
    },
    session.role,
  );

  const feedback = digest.feedback[0];

  return shell(
    <>
      <PanelHeading
        title="Haftalık özet"
        description="Haftada bir sakin bakış"
        metadata={childContext}
      />
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
              ? {
                  helpful: feedback.helpful,
                  anxietyPulse: feedback.anxietyPulse,
                }
              : null,
          }}
        />
      </div>
      {upcomingSection(
        "Otomatik takvim ve koçluk kayıtlarıdır; öğretmen/koç özetinden ayrı tutulur.",
      )}
    </>,
  );
}

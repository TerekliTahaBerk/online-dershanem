import Link from "next/link";
import type { ReactNode } from "react";
import {
  List,
  ListRow,
  PageHeader,
  PropertyList,
  PropertyRow,
  Section,
  buttonClass,
} from "@/components/panel/ui";
import { DinoExplanationAction } from "@/components/panel/dino-explanation-action";
import type { ParentCalmHome } from "@/lib/panel/parent-calm";
import { withParentStudentContext } from "@/lib/panel/parent-calm";

/**
 * VELİ BUGÜN (docs/panel-design-roadmap.md §9.7) — kart yok, sakin bölümler:
 * genel durum cümlesi, "Dikkat edilmesi gereken" (yalnız varsa), gereken
 * aksiyonlar, "Bu hafta" özellik satırları + yaklaşanlar, akademik gelişim
 * cümleleri ve ürün sinyali satırları (Yön). Veri `loadParentCalmHome`'dan;
 * öğretmen operasyonu, risk puanı ve özel not buraya girmez.
 */
export function ParentCalmHomeView({ home, childContext }: { home: ParentCalmHome; childContext?: ReactNode }) {
  const progressHref = withParentStudentContext("/panel/veli/analiz", home.studentId);

  return (
    <>
      <PageHeader title="Bugün" description={home.statusSentence} metadata={childContext} />

      {home.digest.supportArea ? (
        <section
          aria-labelledby="veli-dikkat"
          className="mt-4 rounded-lg border border-pn-border border-l-[3px] border-l-(--pn-tone-warning) px-4 py-3"
        >
          <h2 id="veli-dikkat" className="text-[14px] font-semibold text-pn-text">
            Dikkat edilmesi gereken
          </h2>
          <p className="mt-1 text-[14px] leading-[1.65] text-pn-text-secondary">{home.digest.supportArea}</p>
        </section>
      ) : null}

      <Section title="Sizden beklenen" divider={false}>
        {home.actions.length ? (
          <List label="Sizden beklenen">
            {home.actions.map((action) => (
              <ListRow
                key={action.id}
                title={action.title}
                description={action.body}
                action={
                  <Link href={action.href} className={buttonClass("primary", "sm")}>
                    {action.ctaLabel}
                    <span className="sr-only"> · {action.title}</span>
                  </Link>
                }
              />
            ))}
          </List>
        ) : (
          <p className="text-[14px] text-pn-text-muted">Şu an sizden beklenen bir işlem yok. Düzenli takibe devam etmeniz yeterli.</p>
        )}
      </Section>

      <Section title="Bu hafta">
        <p className="text-[14.5px] leading-[1.7] text-pn-text">{home.weekSummary}</p>
        <PropertyList className="mt-3">
          <PropertyRow label="Genel durum">{home.statusLabel}</PropertyRow>
          {home.thisWeek.planLabel ? <PropertyRow label="Plan">{home.thisWeek.planLabel}</PropertyRow> : null}
          {home.thisWeek.attendanceLabel ? <PropertyRow label="Derslere katılım">{home.thisWeek.attendanceLabel}</PropertyRow> : null}
          {home.thisWeek.assignmentsLabel ? <PropertyRow label="Ödevler">{home.thisWeek.assignmentsLabel}</PropertyRow> : null}
        </PropertyList>
        {!home.thisWeek.planLabel && !home.thisWeek.attendanceLabel && !home.thisWeek.assignmentsLabel ? (
          <p className="mt-2 text-[13.5px] text-pn-text-muted">Bu hafta için henüz kayıt oluşmadı.</p>
        ) : null}
        {home.thisWeek.upcoming.length ? (
          <div className="mt-4">
            <List label="Yaklaşanlar">
              {home.thisWeek.upcoming.map((item) => (
                <ListRow key={item.id} title={item.title} description={item.detail} href={item.href} />
              ))}
            </List>
          </div>
        ) : (
          <p className="mt-3 text-[13.5px] text-pn-text-muted">Yaklaşan önemli bir ders, görüşme veya deneme görünmüyor.</p>
        )}
        {home.dinoEnabled ? (
          <DinoExplanationAction
            deterministicReason={home.weekSummary}
            questionKey="parent_week"
            audience="PARENT"
            studentId={home.studentId}
            openLabel="Bu haftayı açıkla"
            prepareLabel="Dino ile bu haftayı açıkla"
          />
        ) : null}
      </Section>

      <Section
        title="Akademik gelişim"
        actions={
          <Link href={progressHref} className={buttonClass("ghost", "sm")}>
            Gelişimi aç
          </Link>
        }
      >
        {home.academic.examTrendSentence ? <p className="text-[14px] leading-[1.65] text-pn-text">{home.academic.examTrendSentence}</p> : null}
        {home.academic.subjectTrends.length ? (
          <ul className="mt-2 space-y-1.5 text-[14px] text-pn-text">
            {home.academic.subjectTrends.map((item) => (
              <li key={item.subject}>{item.sentence}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[14px] text-pn-text-muted">Ders bazlı eğilim için henüz yeterli deneme yok.</p>
        )}
        {home.academic.strengths.length || home.academic.supportAreas.length ? (
          <PropertyList className="mt-3">
            <PropertyRow label="Güçlü alanlar">{home.academic.strengths.join(", ") || "Henüz belirgin güçlü alan yok."}</PropertyRow>
            <PropertyRow label="Destek gereken">{home.academic.supportAreas.join(", ") || "Şu an ek destek alanı görünmüyor."}</PropertyRow>
          </PropertyList>
        ) : null}
        {home.dinoEnabled ? (
          <DinoExplanationAction
            deterministicReason={home.academic.supportAreas[0] || home.academic.examTrendSentence || home.weekSummary}
            questionKey="parent_support"
            audience="PARENT"
            studentId={home.studentId}
            openLabel="En çok desteğe nerede ihtiyacı var?"
            prepareLabel="Dino ile destek alanını açıkla"
          />
        ) : null}
        {home.dinoEnabled && home.academic.examTrendSentence ? (
          <DinoExplanationAction
            deterministicReason={home.academic.examTrendSentence}
            questionKey="parent_exam"
            audience="PARENT"
            studentId={home.studentId}
            openLabel="Son denemede ne değişti?"
            prepareLabel="Dino ile deneme değişimini açıkla"
          />
        ) : null}
      </Section>

      {home.coaching ? (
        <Section
          title="Yön Koçluk"
          actions={
            <Link href={home.coaching.href} className={buttonClass("ghost", "sm")}>
              Koçluğu aç
            </Link>
          }
        >
          <PropertyList>
            <PropertyRow label="Haftalık hedef">{home.coaching.weeklyGoal || "Henüz paylaşılmadı."}</PropertyRow>
            {home.coaching.planRealization ? <PropertyRow label="Plan">{home.coaching.planRealization}</PropertyRow> : null}
            {home.coaching.coachName ? <PropertyRow label="Koç">{home.coaching.coachName}</PropertyRow> : null}
          </PropertyList>
          {home.coaching.sharedNote ? (
            <p className="mt-3 border-l-2 border-pn-border-strong pl-3 text-[14px] leading-[1.65] text-pn-text">{home.coaching.sharedNote}</p>
          ) : (
            <p className="mt-3 text-[13px] text-pn-text-muted">Koçun paylaştığı bir özet yok. Birebir görüşme notları veliye açılmaz.</p>
          )}
        </Section>
      ) : null}

      {home.digest.available ? (
        <p className="mt-6 text-[13px] text-pn-text-muted">
          {home.digest.published && home.digest.preview
            ? `Öğretmenin yayınladığı özet: ${home.digest.preview.slice(0, 120)}${home.digest.preview.length > 120 ? "…" : ""}`
            : "Öğretmen haftalık özeti yayınladığında ayrıntılı bakış burada açılır."}{" "}
          <Link href={home.digest.href} className="font-medium text-pn-text underline underline-offset-2">
            Haftalık özeti gör
          </Link>
        </p>
      ) : null}
    </>
  );
}

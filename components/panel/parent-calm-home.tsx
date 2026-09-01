import Link from "next/link";
import {
  PanelActionRow,
  PanelAttentionCard,
  PanelCard,
  PanelCardTitle,
  PanelPageHeader,
  PanelStatusBadge,
} from "@/components/panel/ui";
import { DinoExplanationAction } from "@/components/panel/dino-explanation-action";
import type { ParentCalmHome } from "@/lib/panel/parent-calm";
import { withParentStudentContext } from "@/lib/panel/parent-calm";

function statusTone(
  code: ParentCalmHome["statusCode"],
): "success" | "warning" | "info" {
  if (code === "NEEDS_SUPPORT") return "warning";
  if (code === "LIMITED_DATA") return "info";
  return "success";
}

export function ParentCalmHomeView({ home }: { home: ParentCalmHome }) {
  const progressHref = withParentStudentContext("/panel/veli/takip", home.studentId);

  return (
    <>
      <PanelPageHeader
        eyebrow={home.studentName}
        title="Çocuğum nasıl gidiyor?"
        description="Bu haftanın kısa özeti ve sizden gerçekten beklenenler."
      />

      <PanelAttentionCard
        className="mt-6 max-w-[720px]"
        tone={home.statusCode === "NEEDS_SUPPORT" ? "warning" : "info"}
        title={`Genel durum · ${home.statusLabel}`}
        body={home.statusSentence}
        action={<PanelStatusBadge label={home.statusLabel} tone={statusTone(home.statusCode)} />}
      />

      <PanelCard className="mt-4 max-w-[720px] py-5">
        <PanelCardTitle>Bu haftanın özeti</PanelCardTitle>
        <p className="mt-2 text-[15px] leading-[1.7] text-dc-ink-body">{home.weekSummary}</p>
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
      </PanelCard>

      <PanelCard className="mt-5 max-w-[720px] py-5">
        <PanelCardTitle>Bu hafta</PanelCardTitle>
        <ul className="mt-3 space-y-2.5 text-[14px] leading-[1.6] text-dc-ink-body">
          {home.thisWeek.planLabel ? <li>{home.thisWeek.planLabel}</li> : null}
          {home.thisWeek.attendanceLabel ? <li>{home.thisWeek.attendanceLabel}</li> : null}
          {home.thisWeek.assignmentsLabel ? <li>{home.thisWeek.assignmentsLabel}</li> : null}
          {!home.thisWeek.planLabel &&
          !home.thisWeek.attendanceLabel &&
          !home.thisWeek.assignmentsLabel ? (
            <li className="text-dc-ink-muted">Bu hafta için henüz kayıt oluşmadı.</li>
          ) : null}
        </ul>
        {home.thisWeek.upcoming.length ? (
          <div className="mt-4 rounded-[10px] border border-dc-line-soft">
            {home.thisWeek.upcoming.map((item, index) => (
              <PanelActionRow
                key={item.id}
                title={item.title}
                description={item.detail}
                cta={
                  <Link href={item.href} className="panel-quick-action inline-flex">
                    Aç
                  </Link>
                }
                last={index === home.thisWeek.upcoming.length - 1}
              />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[13.5px] text-dc-ink-muted">
            Yaklaşan önemli bir ders, görüşme veya deneme görünmüyor.
          </p>
        )}
      </PanelCard>

      <PanelCard className="mt-5 max-w-[720px] py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PanelCardTitle>Akademik gelişim</PanelCardTitle>
          <Link href={progressHref} className="panel-quick-action inline-flex">
            Gelişimi aç
          </Link>
        </div>
        {home.academic.examTrendSentence ? (
          <p className="mt-3 text-[14px] leading-[1.65] text-dc-ink-body">
            {home.academic.examTrendSentence}
          </p>
        ) : null}
        {home.academic.subjectTrends.length ? (
          <ul className="mt-3 space-y-2 text-[14px] text-dc-ink-body">
            {home.academic.subjectTrends.map((item) => (
              <li key={item.subject}>{item.sentence}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[14px] text-dc-ink-muted">
            Ders bazlı eğilim için henüz yeterli deneme yok.
          </p>
        )}
        {home.academic.strengths.length || home.academic.supportAreas.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[.06em] text-dc-ink-faint">
                Güçlü alanlar
              </p>
              <ul className="mt-2 space-y-1.5 text-[13.5px] text-dc-ink-body">
                {home.academic.strengths.length ? (
                  home.academic.strengths.map((item) => <li key={item}>{item}</li>)
                ) : (
                  <li className="text-dc-ink-muted">Henüz belirgin güçlü alan yok.</li>
                )}
              </ul>
            </div>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[.06em] text-dc-ink-faint">
                Destek gereken
              </p>
              <ul className="mt-2 space-y-1.5 text-[13.5px] text-dc-ink-body">
                {home.academic.supportAreas.length ? (
                  home.academic.supportAreas.map((item) => <li key={item}>{item}</li>)
                ) : (
                  <li className="text-dc-ink-muted">Şu an ek destek alanı görünmüyor.</li>
                )}
              </ul>
            </div>
          </div>
        ) : null}
        {home.dinoEnabled ? (
          <DinoExplanationAction
            deterministicReason={
              home.academic.supportAreas[0] ||
              home.academic.examTrendSentence ||
              home.weekSummary
            }
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
      </PanelCard>

      {home.coaching ? (
        <PanelCard className="mt-5 max-w-[720px] py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <PanelCardTitle>Koçluk</PanelCardTitle>
            <Link href={home.coaching.href} className="panel-quick-action inline-flex">
              Koçluğu aç
            </Link>
          </div>
          <ul className="mt-3 space-y-2 text-[14px] leading-[1.6] text-dc-ink-body">
            {home.coaching.weeklyGoal ? (
              <li>
                <span className="text-dc-ink-muted">Haftalık hedef · </span>
                {home.coaching.weeklyGoal}
              </li>
            ) : (
              <li className="text-dc-ink-muted">Haftalık hedef henüz paylaşılmadı.</li>
            )}
            {home.coaching.planRealization ? <li>{home.coaching.planRealization}</li> : null}
            {home.coaching.coachName ? (
              <li>
                <span className="text-dc-ink-muted">Koç · </span>
                {home.coaching.coachName}
              </li>
            ) : null}
          </ul>
          {home.coaching.sharedNote ? (
            <p className="mt-3 rounded-[10px] border border-dc-line-soft bg-[#FCFDFC] px-3.5 py-3 text-[14px] leading-[1.65] text-dc-ink-body">
              {home.coaching.sharedNote}
            </p>
          ) : (
            <p className="mt-3 text-[13px] text-dc-ink-muted">
              Koçun paylaştığı bir özet yok. Birebir görüşme notları veliye açılmaz.
            </p>
          )}
        </PanelCard>
      ) : null}

      {home.actions.length ? (
        <PanelCard className="mt-5 max-w-[720px] py-5">
          <PanelCardTitle>Gereken aksiyon</PanelCardTitle>
          <div className="mt-3 rounded-[10px] border border-dc-line-soft">
            {home.actions.map((action, index) => (
              <PanelActionRow
                key={action.id}
                title={action.title}
                description={action.body}
                cta={
                  <Link href={action.href} className="panel-quick-action panel-quick-action-primary inline-flex">
                    {action.ctaLabel}
                  </Link>
                }
                last={index === home.actions.length - 1}
              />
            ))}
          </div>
        </PanelCard>
      ) : (
        <PanelCard className="mt-5 max-w-[720px] py-5" variant="subtle">
          <PanelCardTitle>Gereken aksiyon</PanelCardTitle>
          <p className="mt-2 text-[14px] leading-[1.65] text-dc-ink-muted">
            Şu an sizden beklenen bir işlem yok. Düzenli takibe devam etmeniz yeterli.
          </p>
        </PanelCard>
      )}

      {home.digest.available ? (
        <p className="mt-5 max-w-[720px] text-[13px] text-dc-ink-faint">
          {home.digest.published && home.digest.preview
            ? `Öğretmenin yayınladığı özet: ${home.digest.preview.slice(0, 120)}${home.digest.preview.length > 120 ? "…" : ""}`
            : "Öğretmen haftalık özeti yayınladığında ayrıntılı bakış burada açılır."}{" "}
          <Link href={home.digest.href} className="font-semibold text-dc-brand-strong underline-offset-2 hover:underline">
            Haftalık özeti gör
          </Link>
        </p>
      ) : null}
    </>
  );
}

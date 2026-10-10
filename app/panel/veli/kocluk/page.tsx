import { CoachingSessions } from "@/components/panel/coaching-sessions";
import { requirePanelRole } from "@/lib/auth/guards";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { loadParentCoaching } from "@/lib/panel/parent-coaching-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChildContext } from "@/components/panel/parent/child-context";
import {
  EmptyState,
  PageHeader,
  PropertyList,
  PropertyRow,
  Section,
} from "@/components/panel/ui";
import { ISTANBUL_TIME_ZONE } from "@/lib/istanbul-time";

export const dynamic = "force-dynamic";

/**
 * VELİ · KOÇLUK — sakin sonuç görünümü.
 *
 * Operasyonel mikro görev listesi, internal koç notları, ham check-in ve
 * risk metadata gösterilmez. Yalnız plan tamamlanma, çalışma düzeni,
 * hedeflere ilerleme özeti ve koçun yayınladığı veli metni.
 */

const RANGE = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  day: "numeric",
  month: "long",
});

export default async function ParentCoachingPage({
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
  // Hangi çocuğun verisine bakıldığı başlığın özellik satırında (§9.7).
  const childContext = <ChildContext options={children} selectedId={selected?.id ?? null} basePath="/panel/veli/kocluk" />;

  const shell = (body: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Yön Koçluk"
    >
      <div className="max-w-[1000px]">{body}</div>
    </PanelShell>
  );

  if (!selected) {
    return shell(
      <>
        <PageHeader title="Yön Koçluk" />
        <EmptyState
          className="mt-6"
          title="Henüz bağlı öğrenci yok."
          body="Hesabınız öğrencinizle eşleştirildiğinde koçluk özeti burada açılır."
        />
      </>,
    );
  }

  if (!selected.products.includes("OK")) {
    return shell(
      <>
        <PageHeader title="Yön Koçluk" metadata={childContext} />
        <EmptyState
          className="mt-6"
          title="Bu hesapta Yön Koçluk bulunmuyor."
          body="Koçluk eklendiğinde haftalık plan, tamamlanma oranı ve koç özeti burada görünür."
        />
      </>,
    );
  }

  // Ortak yükleyici (mobil `GET /api/panel/parent/coaching` ile aynı): yalnız
  // APPROVED + Yön Koçluk (OK) planı, PUBLISHED koç özeti, PARENT_VISIBLE notlar.
  const { coaching, week, notes: parentNotes, goals } = await loadParentCoaching(selected);

  const coachCard = coaching ? (
    <Section id="koc" title="Koç" divider={false}>
      <PropertyList>
        <PropertyRow label="Koçu">{coaching.coachName}</PropertyRow>
        <PropertyRow label="Sonraki görüşme">
          {coaching.overdue
            ? "Yeni saat bekleniyor"
            : coaching.nextScheduledAt
              ? RANGE.format(coaching.nextScheduledAt)
              : "Planlanmadı"}
        </PropertyRow>
        {coaching.focus ? <PropertyRow label="Haftanın odağı">{coaching.focus}</PropertyRow> : null}
      </PropertyList>
      {coaching.sharedNote ? (
        <blockquote className="mt-3 border-l-2 border-pn-accent-marker pl-3 text-[14px] leading-[1.6] text-pn-text">
          {coaching.sharedNote}
        </blockquote>
      ) : null}
    </Section>
  ) : null;

  const sessionsBlock = (
    <Section id="gorusmeler" title="Görüşmeler">
      <CoachingSessions actor={{ userId: session.userId, role: "PARENT" }} studentId={selected.id} />
    </Section>
  );

  const notesBlock = parentNotes.length ? (
    <Section id="koc-notlari" title="Koç notları" description="Koçun veliyle paylaştığı notlar.">
      <ul className="border-t border-pn-border">
        {parentNotes.map((note) => (
          <li key={note.id} className="border-b border-pn-border py-3">
            <p className="text-[14px] leading-[1.6] text-pn-text">{note.body}</p>
            <p className="mt-1 text-[12px] text-pn-text-muted">{RANGE.format(note.createdAt)}</p>
          </li>
        ))}
      </ul>
    </Section>
  ) : null;

  const goalsBlock = goals.length ? (
    <Section id="hedefler" title="Hedefler" description="Koçla belirlenen hedefler; yalnız görüntüleme.">
      <PropertyList>
        {goals.slice(0, 5).map((goal) => (
          <PropertyRow key={goal.id} label={goal.label}>
            {goal.percent != null ? `%${goal.percent} ilerleme` : "ölçüm yok"}
          </PropertyRow>
        ))}
      </PropertyList>
    </Section>
  ) : null;

  if (!week) {
    return shell(
      <>
        <PageHeader title="Yön Koçluk" metadata={childContext} />
        {coachCard}
        {sessionsBlock}
        <Section id="bu-hafta" title="Bu hafta">
          <EmptyState
            title="Bu hafta için plan yayınlanmadı."
            body="Koç haftalık planı yayınladığında tamamlanma özeti burada görünür."
          />
        </Section>
        {notesBlock}
        {goalsBlock}
      </>,
    );
  }

  const { start, end, summary: parentSummary } = week;

  return shell(
    <>
      <PageHeader
        title="Yön Koçluk"
        description={`${RANGE.format(start)} – ${RANGE.format(end)}`}
        metadata={childContext}
      />

      {coachCard}
      {sessionsBlock}

      <Section id="bu-hafta" title="Bu hafta">
        <p className="text-[15px] font-semibold text-pn-text">
          Planın %{parentSummary.planCompletionPct ?? 0}&apos;ü tamamlandı.
        </p>
        {[parentSummary.studyRhythm, parentSummary.goalProgressLine, parentSummary.overdueTrend]
          .filter(Boolean)
          .map((line) => (
            <p key={line} className="mt-1.5 text-[14px] text-pn-text-secondary">
              {line}
            </p>
          ))}
      </Section>

      {(parentSummary.strengths || parentSummary.focusAreas || parentSummary.nextWeekFocus) && (
        <Section id="koc-ozeti" title="Koç özeti">
          {parentSummary.coachSummary ? (
            <p className="mb-2 text-[14px] leading-[1.6] text-pn-text">{parentSummary.coachSummary}</p>
          ) : null}
          <PropertyList>
            {parentSummary.strengths ? <PropertyRow label="Güçlü">{parentSummary.strengths}</PropertyRow> : null}
            {parentSummary.focusAreas ? <PropertyRow label="Odak">{parentSummary.focusAreas}</PropertyRow> : null}
            {parentSummary.nextWeekFocus ? <PropertyRow label="Gelecek hafta">{parentSummary.nextWeekFocus}</PropertyRow> : null}
          </PropertyList>
        </Section>
      )}

      {notesBlock}
      {goalsBlock}

      <p className="mt-8 text-[12.5px] leading-[1.6] text-pn-text-muted">
        Bu ekran sakin bir özet sunar. İç koç notları, ham check-in ayrıntıları
        ve diğer öğrencilerin verisi paylaşılmaz.
      </p>
    </>,
  );
}

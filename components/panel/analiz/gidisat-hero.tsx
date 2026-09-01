import { PanelCard, PanelCardTitle } from "@/components/panel/ui";

/**
 * Gidişat hero — dönem + birincil durum cümleleri.
 * Kart değil; tek kompozisyon başlığı.
 */
export function GidisatHero({
  title,
  periodLabel,
  sentences,
}: {
  title: string;
  periodLabel: string;
  sentences: string[];
}) {
  const lead = sentences[0];
  const rest = sentences.slice(1, 3);

  return (
    <header className="mt-2">
      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-dc-ink-faint">
        {periodLabel}
      </p>
      <h1 className="mt-1.5 text-[26px] font-extrabold tracking-[-0.02em] text-dc-ink sm:text-[30px]">
        {title}
      </h1>
      {lead ? (
        <p className="mt-3 max-w-[54ch] text-[15px] leading-[1.55] text-dc-ink-body">{lead}</p>
      ) : null}
      {rest.length ? (
        <ul className="mt-3 max-w-[54ch] space-y-1.5 text-[14px] leading-[1.5] text-dc-ink-muted">
          {rest.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}

export function GidisatStrengthSupport({
  strengths,
  supports,
}: {
  strengths: Array<{ subject: string; sentence: string }>;
  supports: Array<{ subject: string; sentence: string }>;
}) {
  if (!strengths.length && !supports.length) return null;

  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <PanelCard>
        <PanelCardTitle>Güçlü alanlar</PanelCardTitle>
        {strengths.length ? (
          <ul className="mt-3 space-y-2 text-[14px] text-dc-ink-body">
            {strengths.map((item) => (
              <li key={item.subject}>{item.sentence}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[14px] text-dc-ink-muted">Henüz belirgin güçlü alan yok.</p>
        )}
      </PanelCard>
      <PanelCard>
        <PanelCardTitle>Destek gereken alanlar</PanelCardTitle>
        {supports.length ? (
          <ul className="mt-3 space-y-2 text-[14px] text-dc-ink-body">
            {supports.map((item) => (
              <li key={item.subject}>{item.sentence}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[14px] text-dc-ink-muted">Şu an ek destek alanı görünmüyor.</p>
        )}
      </PanelCard>
    </div>
  );
}

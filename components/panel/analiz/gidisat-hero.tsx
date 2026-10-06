import { PAGE_EYEBROW_CLASS, PAGE_TITLE_CLASS } from "@/components/panel/ui";

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
      <p className={PAGE_EYEBROW_CLASS}>
        {periodLabel}
      </p>
      <h1 className={`mt-1.5 ${PAGE_TITLE_CLASS}`}>
        {title}
      </h1>
      {lead ? (
        <p className="mt-3 max-w-[54ch] text-[15px] leading-[1.55] text-pn-text">
          {lead}
        </p>
      ) : null}
      {rest.length ? (
        <ul className="mt-3 max-w-[54ch] space-y-1.5 text-[14px] leading-normal text-pn-text-secondary">
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

  // Kart yerine iki sütunlu düz liste (roadmap §5.4: kartsız bölümler).
  return (
    <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
      <AreaList
        title="Güçlü alanlar"
        items={strengths}
        empty="Henüz belirgin güçlü alan yok."
      />
      <AreaList
        title="Destek gereken alanlar"
        items={supports}
        empty="Şu an ek destek alanı görünmüyor."
      />
    </div>
  );
}

function AreaList({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<{ subject: string; sentence: string }>;
  empty: string;
}) {
  return (
    <div>
      <h3 className="text-[13.5px] font-semibold text-pn-text">{title}</h3>
      {items.length ? (
        <ul className="mt-2 border-t border-pn-border">
          {items.map((item) => (
            <li
              key={item.subject}
              className="border-b border-pn-border py-2 text-[14px] leading-6 text-pn-text-secondary last:border-b-0"
            >
              {item.sentence}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[14px] text-pn-text-muted">{empty}</p>
      )}
    </div>
  );
}

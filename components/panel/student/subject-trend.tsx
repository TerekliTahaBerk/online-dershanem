import { PanelCard, PanelCardTitle } from "@/components/panel/ui";

/**
 * DERS BAZINDA NET GRAFİĞİ — onaylı tasarım (Panel.dc.html → sProgress).
 * Her ders için ayrı çizgi, altta renk açıklaması ve yorum cümlesi.
 *
 * §32: grafik tek başına bilgi taşımaz. Aynı sayılar hem `aria-label`'da hem
 * de altındaki ekran-okuyucu tablosunda bulunur; renk ayrımı da metinle
 * (ders adı) eşlenir, yalnız renge dayanmaz.
 */

export type SubjectSeries = { name: string; color: string; nets: Array<number | null> };

export function SubjectTrendCard({
  series,
  labels,
  caption,
}: {
  series: SubjectSeries[];
  labels: string[];
  caption?: string;
}) {
  const all = series.flatMap((s) => s.nets).filter((n): n is number => n !== null);
  if (!series.length || all.length === 0 || labels.length < 2) return null;

  const W = 640;
  const H = 180;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const step = W / (labels.length - 1);

  const toSegments = (nets: Array<number | null>) => {
    const segments: string[] = [];
    let active: string[] = [];
    for (let i = 0; i < nets.length; i += 1) {
      const n = nets[i];
      if (n === null) {
        if (active.length >= 2) segments.push(active.join(" "));
        active = [];
        continue;
      }
      active.push(
        `${Math.round(i * step)},${Math.round(H - 30 - ((n - min) / span) * (H - 60))}`,
      );
    }
    if (active.length >= 2) segments.push(active.join(" "));
    return segments;
  };

  return (
    <PanelCard className="mt-6">
      <PanelCardTitle>Ders bazında deneme neti · son {labels.length} deneme</PanelCardTitle>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3.5 h-[200px] w-full"
        role="img"
        aria-label={series
          .map((s) =>
            `${s.name}: ${s.nets.map((n) => (n === null ? "ölçüm yok" : n.toLocaleString("tr-TR"))).join(", ")}`,
          )
          .join(" | ")}
      >
        {[30, 90, 150].map((y) => (
          <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="#EDF0EE" strokeWidth="1" />
        ))}
        {series.map((s) =>
          toSegments(s.nets).map((points, segmentIdx) => (
            <polyline
              key={`${s.name}-${segmentIdx}`}
              points={points}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          )),
        )}
      </svg>

      <div className="flex flex-wrap gap-5 text-[13px] text-dc-ink-muted">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-0.5 w-2.5"
              style={{ background: s.color }}
            />
            {s.name}
          </span>
        ))}
      </div>

      {/* Grafiğin sayısal karşılığı — ekran okuyucu için */}
      <table className="sr-only">
        <caption>Ders bazında deneme netleri</caption>
        <thead>
          <tr>
            <th scope="col">Ders</th>
            {labels.map((l) => (
              <th key={l} scope="col">
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {series.map((s) => (
            <tr key={s.name}>
              <th scope="row">{s.name}</th>
              {s.nets.map((n, i) => (
                <td key={i}>{n === null ? "Ölçüm yok" : n}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {caption ? (
        <p className="mt-4 text-[14.5px] leading-[1.65] text-[var(--pd-ink-3)]">{caption}</p>
      ) : null}
    </PanelCard>
  );
}

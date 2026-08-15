import Image from "next/image";
import Link from "next/link";

/**
 * ÖĞRENCİ ANA SAYFA KARTLARI — onaylı tasarım (Panel.dc.html → scStudentHome).
 * Haftalık plan özeti, son deneme özeti, net gelişim grafiği ve Dino bandı.
 */

/* ── Bu haftaki planın ────────────────────────────────────────────────── */

export type PlanTaskRow = { id: string; title: string; meta: string; done: boolean };

export function WeeklyPlanCard({
  done,
  total,
  tasks,
  href,
}: {
  done: number;
  total: number;
  tasks: PlanTaskRow[];
  href: string;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const remaining = Math.max(0, total - done);

  return (
    <section className="rounded-[14px] border border-dc-line bg-white p-[22px]">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[16px] font-bold text-dc-ink">Bu haftaki planın</h2>
        <span className="text-[13px] text-dc-ink-faint">
          {done} / {total} görev
        </span>
      </div>

      <div
        className="mt-3.5 h-2 overflow-hidden rounded-full bg-dc-line-soft"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Haftalık plan ilerlemesi"
      >
        <div className="h-full rounded-full bg-dc-brand" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-[13px] text-dc-ink-muted">
        {remaining > 0
          ? `Hafta sonuna kadar ${remaining} görev kaldı.`
          : "Bu haftanın görevleri tamam."}
      </p>

      <ul className="mt-4 flex flex-col gap-2.5">
        {tasks.map((task) => (
          <li
            key={task.id}
            className={`flex items-center gap-2.5 text-[14px] font-medium ${
              task.done ? "text-dc-ink-ghost" : "text-[var(--pd-ink-3)]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`grid h-4 w-4 flex-none place-items-center rounded ${
                task.done
                  ? "bg-dc-brand-strong text-[9px] font-bold text-white"
                  : "border border-[#DDE4E0]"
              }`}
            >
              {task.done ? "✓" : ""}
            </span>
            <span className={task.done ? "line-through" : ""}>{task.title}</span>
            <span className="ml-auto shrink-0 text-[12.5px] text-dc-ink-faint">{task.meta}</span>
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className="mt-[18px] inline-block text-[14px] font-bold text-dc-brand-strong hover:text-dc-brand-hover"
      >
        Planın tamamını gör →
      </Link>
    </section>
  );
}

/* ── Son deneme ───────────────────────────────────────────────────────── */

export type ExamSubjectRow = { name: string; correct: number; incorrect: number; net: number };

export function LatestExamCard({
  net,
  delta,
  title,
  dateLabel,
  subjects,
  href,
}: {
  net: number;
  delta: number | null;
  title: string;
  dateLabel: string;
  subjects: ExamSubjectRow[];
  href: string;
}) {
  const fmt = (value: number) =>
    value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <section className="rounded-[14px] border border-dc-line bg-white p-[22px]">
      <h2 className="text-[16px] font-bold text-dc-ink">Son deneme</h2>

      <p className="mt-3 flex items-baseline gap-2.5">
        <span className="text-[30px] font-extrabold tracking-[-0.02em] text-dc-ink">
          {fmt(net)} net
        </span>
        {delta !== null ? (
          <span
            className={`text-[13.5px] font-bold ${
              delta >= 0 ? "text-dc-brand-hover" : "text-[#8A5F37]"
            }`}
          >
            {delta >= 0 ? "+" : ""}
            {fmt(delta)}
          </span>
        ) : null}
      </p>
      <p className="mt-1 text-[13.5px] text-dc-ink-muted">
        {title} · {dateLabel}
      </p>

      <ul className="mt-4 flex flex-col gap-2.5 text-[13.5px] font-medium text-[var(--pd-ink-3)]">
        {subjects.map((s) => (
          <li key={s.name} className="flex gap-3">
            <span className="flex-1">{s.name}</span>
            <span className="text-dc-ink-faint">
              {s.correct}D / {s.incorrect}Y · {fmt(s.net)}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className="mt-[18px] inline-block text-[14px] font-bold text-dc-brand-strong hover:text-dc-brand-hover"
      >
        Sonucu ve analizi aç →
      </Link>
    </section>
  );
}

/* ── Net gelişimi ─────────────────────────────────────────────────────── */

export type TrendPoint = { label: string; net: number };

/**
 * Son denemelerin toplam neti. Tasarımdaki çizgi grafiğin aynısı.
 *
 * §32 gereği grafik TEK BAŞINA bilgi taşımaz: aynı değerler altındaki
 * etiketlerde ve ekran okuyucuya açık bir tabloda da bulunur.
 */
export function NetTrendCard({ points, caption }: { points: TrendPoint[]; caption: string }) {
  if (points.length < 2) return null;

  const W = 640;
  const H = 160;
  const nets = points.map((p) => p.net);
  const min = Math.min(...nets);
  const max = Math.max(...nets);
  const span = max - min || 1;
  const step = W / (points.length - 1);

  const coords = points.map((p, i) => ({
    x: Math.round(i * step) || 0,
    y: Math.round(H - 20 - ((p.net - min) / span) * (H - 50)),
    ...p,
  }));

  return (
    <section className="mt-5 rounded-[14px] border border-dc-line bg-white p-[22px]">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[16px] font-bold text-dc-ink">
          Son {points.length} deneme · toplam net
        </h2>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3.5 h-[180px] w-full"
        role="img"
        aria-label={`Toplam net gelişimi: ${points.map((p) => `${p.label} ${p.net}`).join(", ")}`}
      >
        {[20, 70, 120].map((y) => (
          <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="#EDF0EE" strokeWidth="1" />
        ))}
        <polyline
          points={coords.map((c) => `${c.x},${c.y}`).join(" ")}
          fill="none"
          stroke="#14976B"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {coords.map((c, i) => (
          <circle
            key={c.label}
            cx={c.x}
            cy={c.y}
            r={i === coords.length - 1 ? 5 : 4}
            fill={i === coords.length - 1 ? "#0C4A38" : "#14976B"}
          />
        ))}
      </svg>

      <div className="-mt-1.5 flex justify-between text-[12px] text-dc-ink-ghost">
        {points.map((p) => (
          <span key={p.label}>{p.label}</span>
        ))}
      </div>

      <p className="mt-4 max-w-[720px] text-[14.5px] leading-[1.65] text-[var(--pd-ink-3)]">
        {caption}
      </p>
    </section>
  );
}

/* ── Dino bandı ───────────────────────────────────────────────────────── */

/**
 * Dino AI özeti.
 *
 * §22: canlı bir Dino AI arka ucu HENÜZ YOK. Bu yüzden burada uydurma bir
 * "AI çıktısı" üretilmez — `insight` verilmediğinde bileşen, özetin neye
 * dayanacağını ve ne zaman görüneceğini söyleyen dürüst bir durum gösterir.
 */
export function DinoInsightCard({
  insight,
  basis,
}: {
  insight: string | null;
  basis: string | null;
}) {
  return (
    <section className="mt-5 flex items-start gap-5 rounded-[14px] border border-dc-line bg-white p-[22px]">
      <Image
        src="/design/dino-mascot.png"
        alt=""
        aria-hidden="true"
        width={1319}
        height={1193}
        sizes="64px"
        className="w-12 flex-none sm:w-16"
      />
      <div className="min-w-0 flex-1">
        <h2 className="text-[16px] font-bold text-dc-ink">Dino bu hafta ne görüyor?</h2>

        {insight ? (
          <>
            <p className="mt-2 text-[14.5px] leading-[1.65] text-[var(--pd-ink-3)]">{insight}</p>
            {basis ? <p className="mt-2 text-[12.5px] text-dc-ink-faint">{basis}</p> : null}
          </>
        ) : (
          <p className="mt-2 text-[14.5px] leading-[1.65] text-dc-ink-muted">
            Haftalık Dino özeti, yeterli ders ve deneme verisi biriktiğinde burada
            görünecek. Özet yalnızca senin ders notların, plan görevlerin ve deneme
            sonuçlarına dayanır.
          </p>
        )}
      </div>
    </section>
  );
}

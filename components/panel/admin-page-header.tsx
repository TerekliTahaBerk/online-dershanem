import type { LucideIcon } from "lucide-react";

/**
 * YÖNETİM SAYFA BAŞLIĞI — onaylı tasarım (Panel.dc.html → admin ekranları).
 *
 * Bu bileşen 11 yönetim ekranını birden besliyor, o yüzden tasarım ölçeğine
 * ÇEKİLDİ; sayfalar tek tek yeniden yazılmadı.
 *
 * Önceki hâli pazarlama tipografisi kullanıyordu: `clamp(1.75rem,3.5vw,2.65rem)`
 * (42px'e kadar), `font-semibold`, `tracking-[-.05em]`. Tasarımın panel başlığı
 * bundan belirgin şekilde daha sakin: 26px / 800 / -.02em, altında 14.5px
 * ikincil metin. Operasyon ekranı bir açılış sayfası gibi bağırmamalı.
 *
 * `PanelHeading` ile aynı ölçüleri kullanır; farkı yalnız yönetim ekranlarına
 * özgü ikonlu üst etiket ve sağdaki sayaç rozetidir.
 */
export function AdminPageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  meta,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  meta?: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        <p className="flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[.1em] text-dc-brand-strong">
          <span
            aria-hidden="true"
            className="grid h-6 w-6 place-items-center rounded-lg bg-dc-brand-soft"
          >
            <Icon size={13} />
          </span>
          {eyebrow}
        </p>
        <h1 className="mt-2 text-[26px] font-extrabold leading-[1.25] tracking-[-0.02em] text-dc-ink">
          {title}
        </h1>
        <p className="mt-1.5 max-w-2xl text-[14.5px] leading-[1.55] text-dc-ink-muted">
          {description}
        </p>
      </div>
      {meta ? (
        <span className="w-fit rounded-full border border-dc-line bg-white px-3 py-1.5 text-[12px] font-semibold text-dc-ink-muted">
          {meta}
        </span>
      ) : null}
    </header>
  );
}

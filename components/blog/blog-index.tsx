"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { BlogPost } from "@/lib/blog-content";

/**
 * BLOG DİZİNİ — onaylı tasarım (Web.dc.html → isBlog):
 * eyebrow + başlık + kategori çipleri, öne çıkan yazı (2 kolon),
 * altında 3 kolonluk kart ızgarası.
 *
 * DÜRÜSTLÜK: tasarımdaki kartlar tamamen yer tutucudur ("Yazı başlığı
 * placeholder", "İÇERİK PLACEHOLDER"). Buraya GERÇEK yazılar bağlandı;
 * placeholder metin üretime taşınmadı (§54).
 *
 * Yazıların kendi görseli yok. Önceki sürümdeki soyut "çizgi" paneli her
 * kartta aynı olduğu için yükleme iskeleti gibi okunuyordu ve mobilde sayfayı
 * ~10.000 px'e uzatıyordu. Kartlar artık metin odaklı: kategori, başlık,
 * kısa özet; kartın tamamı tıklanabilir.
 */

const ALL = "Tümü";

export function BlogIndex({ posts }: { posts: readonly BlogPost[] }) {
  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(posts.map((p) => p.category)))],
    [posts],
  );
  const [active, setActive] = useState(ALL);

  const visible =
    active === ALL ? posts : posts.filter((p) => p.category === active);
  const featured = visible.find((p) => p.featured) ?? visible[0];
  const rest = visible.filter((p) => p.slug !== featured?.slug);

  return (
    <>
      <section className="site-container pt-14 sm:pt-[72px]">
        <p className="dc-eyebrow">Blog</p>
        <h1 className="mt-4 font-display text-[length:var(--public-display)] leading-[1.08] tracking-[-0.03em] text-dc-ink">
          Sınav hazırlığında işe yarayan yazılar
        </h1>
        <p className="mt-3.5 max-w-[600px] text-[16.5px] leading-[1.65] text-dc-ink-body sm:text-[17.5px]">
          Çalışma yöntemi, plan kurma, deneme analizi ve veli rehberliği üzerine
          yazılar.
        </p>

        <div
          role="group"
          aria-label="Kategori filtresi"
          className="mt-6 flex flex-wrap gap-2.5"
        >
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActive(c)}
              aria-pressed={active === c}
              className={`min-h-11 rounded-full px-[18px] text-[13.5px] font-bold transition-colors ${
                active === c
                  ? "bg-dc-brand-strong text-white"
                  : "border border-[#DDE4E0] bg-white text-dc-ink hover:border-dc-brand"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section className="site-container pt-9">
        {featured ? (
          <article className="dc-surface-deep relative rounded-dc-card bg-dc-brand-deep p-7 sm:p-10">
            <span className="text-[13px] font-bold text-[#7FD3AF]">
              Öne çıkan · {featured.category}
            </span>
            <h2 className="mt-3 max-w-[820px] font-display text-[26px] leading-[1.18] tracking-[-0.02em] text-white sm:text-[34px]">
              <Link
                href={`/blog/${featured.slug}/`}
                className="after:absolute after:inset-0 after:rounded-dc-card after:content-['']"
              >
                {featured.title}
              </Link>
            </h2>
            <p className="mt-3 max-w-[640px] text-[16px] leading-[1.65] text-[#B6CEC4]">
              {featured.cardSnippet || featured.excerpt}
            </p>
            <span
              aria-hidden="true"
              className="mt-6 inline-flex min-h-11 items-center rounded-full bg-white px-6 text-[15px] font-bold text-dc-brand-deep"
            >
              Yazıyı oku
            </span>
          </article>
        ) : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <article
              key={post.slug}
              className="group relative flex flex-col rounded-[18px] border border-dc-line bg-white p-5 transition-colors hover:border-dc-brand sm:p-6"
            >
              <span className="self-start rounded-full bg-dc-brand-soft px-2.5 py-1 text-xs font-bold text-dc-brand-hover">
                {post.category}
              </span>
              <h3 className="mt-3 text-[18px] font-bold leading-[1.3] text-dc-ink sm:text-[19px]">
                <Link
                  href={`/blog/${post.slug}/`}
                  className="after:absolute after:inset-0 after:rounded-[18px] after:content-[''] group-hover:text-dc-brand-hover"
                >
                  {post.title}
                </Link>
              </h3>
              <p className="mt-2 text-[14.5px] leading-[1.6] text-dc-ink-muted">
                {post.cardSnippet || post.excerpt}
              </p>
            </article>
          ))}
        </div>

        {rest.length === 0 && !featured ? (
          <p className="rounded-dc-card border border-dc-line bg-white p-8 text-[15px] text-dc-ink-muted">
            Bu kategoride henüz yazı yok. Başka bir kategoriyi deneyebilirsin.
          </p>
        ) : null}
      </section>
    </>
  );
}

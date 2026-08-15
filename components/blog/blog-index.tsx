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
 * Yazıların kendi görseli yok. Görsel alanı bu yüzden taralı bir yer tutucu
 * değil, yazının kategorisini taşıyan sakin bir marka panelidir — yarım
 * bırakılmış değil, bilinçli bir tercih gibi durur.
 */

const ALL = "Tümü";

/**
 * Kart görseli. Yazıların kendi fotoğrafı yok; kategori zaten kartın içinde
 * rozet olarak yazdığı için burada METİN YOK — yoksa aynı kelime kartta iki
 * kez görünüyor. Sakin, soyut bir marka paneli.
 */
function ArticleThumb({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`flex flex-col justify-center gap-2.5 bg-dc-brand-soft px-8 ${className}`}
    >
      <span className="h-2 w-[62%] rounded-full bg-[#BBDCCA]" />
      <span className="h-2 w-[86%] rounded-full bg-[#CFE6DA]" />
      <span className="h-2 w-[44%] rounded-full bg-[#9CCDB5]" />
      <span className="h-2 w-[74%] rounded-full bg-[#CFE6DA]" />
    </div>
  );
}

export function BlogIndex({ posts }: { posts: readonly BlogPost[] }) {
  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(posts.map((p) => p.category)))],
    [posts],
  );
  const [active, setActive] = useState(ALL);

  const visible = active === ALL ? posts : posts.filter((p) => p.category === active);
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
          Çalışma yöntemi, plan kurma, deneme analizi ve veli rehberliği üzerine yazılar.
        </p>

        <div role="group" aria-label="Kategori filtresi" className="mt-6 flex flex-wrap gap-2.5">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActive(c)}
              aria-pressed={active === c}
              className={`rounded-full px-4.5 py-2.5 text-[13px] font-bold transition-colors ${
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
          <article className="grid overflow-hidden rounded-dc-card border border-dc-line bg-white lg:grid-cols-2">
            <ArticleThumb className="min-h-[220px] lg:min-h-[300px]" />
            <div className="p-7 sm:p-9">
              <span className="rounded-full bg-dc-brand-soft px-[11px] py-[5px] text-[11.5px] font-bold uppercase text-dc-brand-hover">
                {featured.category}
              </span>
              <h2 className="mt-4 font-display text-[24px] leading-[1.2] tracking-[-0.02em] text-dc-ink sm:text-[30px]">
                <Link href={`/blog/${featured.slug}/`} className="hover:text-dc-brand-hover">
                  {featured.title}
                </Link>
              </h2>
              <p className="mt-3 text-[15.5px] leading-[1.65] text-dc-ink-muted">
                {featured.cardSnippet || featured.excerpt}
              </p>
              <Link
                href={`/blog/${featured.slug}/`}
                className="mt-4.5 inline-block pt-4 text-[15px] font-bold text-dc-brand-strong hover:text-dc-brand-hover"
              >
                Yazıyı oku →
              </Link>
            </div>
          </article>
        ) : null}

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <article
              key={post.slug}
              className="overflow-hidden rounded-[18px] border border-dc-line bg-white"
            >
              <ArticleThumb className="h-[170px]" />
              <div className="p-5">
                <span className="rounded-full bg-dc-brand-soft px-2.5 py-1 text-[11px] font-bold uppercase text-dc-brand-hover">
                  {post.category}
                </span>
                <h3 className="mt-3 text-[19px] font-bold leading-[1.3] text-dc-ink">
                  <Link href={`/blog/${post.slug}/`} className="hover:text-dc-brand-hover">
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-2 text-[14.5px] leading-[1.6] text-dc-ink-muted">
                  {post.cardSnippet || post.excerpt}
                </p>
              </div>
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

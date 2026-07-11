import Link from "next/link";
import { ArrowRight, BookOpen, Compass, GraduationCap, LineChart, NotebookText, PenLine, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { blogPosts } from "@/lib/content";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMarketingMetadata } from "@/lib/seo/metadata";
import { blogPublishedAt, estimateBlogReadingMinutes, formatBlogDate, getBlogAuthor } from "@/lib/blog-meta";

export const metadata = buildMarketingMetadata({
  title: "Online Dershanem Blog",
  description:
    "Online dershane ve online özel ders rehberleri: LGS-YKS çalışma planı, küçük grup ders modeli ve haftalık takip sistemi üzerine yazılar.",
  canonical: "/blog",
  imagePath: "/blog/opengraph-image",
  imageAlt: "Online Dershanem Blog",
});

type BlogPost = (typeof blogPosts)[number];

const visualByCategory: Record<string, { Icon: LucideIcon; tone: string; tile: string }> = {
  "Online Dershane": { Icon: GraduationCap, tone: "var(--od-olive)", tile: "var(--od-mint)" },
  "Online Özel Ders": { Icon: Compass, tone: "#A67C4F", tile: "var(--od-cream-2)" },
  YKS: { Icon: LineChart, tone: "var(--od-olive)", tile: "var(--od-yellow-soft)" },
  LGS: { Icon: NotebookText, tone: "#5C7BA6", tile: "var(--od-sky-soft)" },
  "e Dershane": { Icon: BookOpen, tone: "var(--od-olive)", tile: "var(--od-mint)" },
  "Online Ders": { Icon: BookOpen, tone: "var(--od-olive)", tile: "var(--od-cream-2)" },
  "Özel Ders": { Icon: Compass, tone: "#A67C4F", tile: "var(--od-cream-2)" },
  "Sınav Stratejisi": { Icon: PenLine, tone: "#9C5340", tile: "var(--od-blush)" }
};

function getVisual(category: string) {
  return (
    visualByCategory[category] ?? { Icon: BookOpen, tone: "var(--od-olive)", tile: "var(--od-cream-2)" }
  );
}

function PostVisual({ post, height = "aspect-[5/3]" }: { post: BlogPost; height?: string }) {
  const { Icon, tone, tile } = getVisual(post.category);
  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-[var(--od-line)] ${height}`}
      style={{ background: tile }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(20,20,15,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,20,15,0.08) 1px, transparent 1px)",
          backgroundSize: "28px 28px"
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-4 text-center sm:flex-row sm:gap-4 sm:px-6 sm:text-left">
        <span
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-[0_8px_24px_-12px_rgba(20,20,15,0.25)] sm:h-14 sm:w-14"
          style={{ color: tone }}
        >
          <Icon size={22} strokeWidth={1.6} className="sm:hidden" />
          <Icon size={26} strokeWidth={1.6} className="hidden sm:block" />
        </span>
        <span className="font-display text-[16px] leading-tight tracking-tight text-[var(--od-ink)] sm:text-[20px]">
          {post.category}
        </span>
      </div>
    </div>
  );
}

export default function BlogPage() {
  const sorted = [...blogPosts].sort((a, b) => {
    const da = blogPublishedAt[a.slug] ?? "1970-01-01";
    const db = blogPublishedAt[b.slug] ?? "1970-01-01";
    return db.localeCompare(da);
  });

  const featured = sorted[0];
  const others = sorted.slice(1);

  return (
    <div className="site-scope">
      <SchemaJsonLd
        schema={breadcrumbJsonLd([
          { name: "Ana Sayfa", url: "/" },
          { name: "Blog", url: "/blog/" },
        ])}
      />
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="border-b border-[var(--site-line)] bg-[var(--site-bg-warm)]">
          <div className="site-container py-16 text-center sm:py-20">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-[var(--site-line)] bg-white text-[var(--brand-orange-ink)] shadow-sm">
              <Send size={27} strokeWidth={1.6} aria-hidden="true" />
            </span>
            <span className="mt-6 inline-flex">
              <span className="site-eyebrow">Yazılar</span>
            </span>
            <h1 className="mx-auto mt-4 max-w-3xl font-display text-[clamp(2.3rem,5.5vw,3.9rem)] leading-[1.05] tracking-[-0.02em] text-[var(--site-ink)]">
              Online Dershanem <span className="site-hl">Blog</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[17px] leading-8 text-[var(--site-body)]">
              LGS ve YKS için haftalık rehberler, deneme analizi ipuçları ve küçük grup matematik
              modeli üzerine yazılar.
            </p>
          </div>
        </section>

        {/* Featured */}
        <section className="site-container py-16 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="max-w-md">
              <p className="text-[12.5px] text-[var(--site-muted)]">
                {getBlogAuthor(featured.category)} · {formatBlogDate(blogPublishedAt[featured.slug])} · {estimateBlogReadingMinutes(featured)} dk okuma
              </p>
              <h2 className="mt-3 font-display text-[28px] leading-[1.1] tracking-[-0.02em] text-[var(--site-ink)] sm:text-[36px]">
                {featured.title}
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-[var(--site-body)]">{featured.excerpt}</p>
              <Link href={`/blog/${featured.slug}/`} className="site-btn site-btn-primary mt-6">
                Yazıyı oku
                <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
              </Link>
            </div>

            <Link href={`/blog/${featured.slug}/`} className="group block">
              <PostVisual post={featured} height="aspect-[16/10]" />
            </Link>
          </div>
        </section>

        <div className="site-container">
          <hr className="border-t border-[var(--site-line)]" />
        </div>

        {/* Grid */}
        <section className="site-container py-16 sm:py-20">
          <div className="grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((post) => (
              <article key={post.slug} className="flex flex-col">
                <Link href={`/blog/${post.slug}/`} className="group flex h-full flex-col">
                  <PostVisual post={post} />
                  <p className="mt-5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-orange-ink)]">
                    {post.category}
                  </p>
                  <h2 className="mt-2 font-display text-[20px] leading-[1.2] tracking-[-0.01em] text-[var(--site-ink)] transition-colors group-hover:text-[var(--brand-orange-ink)] sm:text-[22px]">
                    {post.title}
                  </h2>
                  <p className="mt-3 text-[14px] leading-6 text-[var(--site-body)]">{post.cardSnippet}</p>
                  <p className="mt-4 text-[12.5px] text-[var(--site-muted)]">
                    {formatBlogDate(blogPublishedAt[post.slug])} · {estimateBlogReadingMinutes(post)} dk okuma
                  </p>
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* Soft CTA */}
        <section className="site-container pb-24">
          <div className="overflow-hidden rounded-[28px] border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-8 sm:p-12">
            <div className="grid gap-6 sm:grid-cols-[1.4fr_auto] sm:items-center">
              <div>
                <span className="site-eyebrow">Sıradaki adım</span>
                <h3 className="mt-3 font-display text-[28px] leading-tight tracking-[-0.02em] text-[var(--site-ink)] sm:text-[36px]">
                  Okuduklarını uygulamaya geçirelim.
                </h3>
                <p className="mt-3 max-w-md text-[14.5px] leading-7 text-[var(--site-body)]">
                  Sana uygun ders, hoca ve haftalık plan kombinasyonunu birlikte kuralım.
                </p>
              </div>
              <Link href="/ders-paketleri/" className="site-btn site-btn-primary shrink-0">
                Paketleri gör
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

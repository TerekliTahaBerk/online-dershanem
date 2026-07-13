import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Container } from "@/components/ui/container";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";
import { blogPosts } from "@/lib/blog-content";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { buildMarketingMetadata } from "@/lib/seo/metadata";
import { blogHeadingId, blogPublishedAt, blogReviewedAt, estimateBlogReadingMinutes, formatBlogDate, getBlogAuthor } from "@/lib/blog-meta";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((item) => item.slug === slug);

  if (!post) {
    return {
      title: "Yazı Bulunamadı"
    };
  }

  const publishedTime = `${blogPublishedAt[post.slug] ?? "2025-01-01"}T09:00:00+03:00`;
  const modifiedTime = `${blogReviewedAt[post.slug] ?? blogPublishedAt[post.slug] ?? "2025-01-01"}T09:00:00+03:00`;

  return buildMarketingMetadata({
    title: post.seoTitle,
    description: post.metaDescription,
    canonical: `/blog/${post.slug}`,
    type: "article",
    imagePath: `/blog/${post.slug}/opengraph-image`,
    imageAlt: post.title,
    publishedTime,
    modifiedTime,
    authors: [getBlogAuthor(post.category)],
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = blogPosts.find((item) => item.slug === slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = post.relatedSlugs
    .map((relatedSlug) => blogPosts.find((item) => item.slug === relatedSlug))
    .filter((item): item is (typeof blogPosts)[number] => Boolean(item));

  const publishedAt = blogPublishedAt[post.slug] ?? "2025-01-01";
  const reviewedAt = blogReviewedAt[post.slug] ?? publishedAt;
  const articleLd = articleJsonLd({
    headline: post.title,
    description: post.metaDescription,
    url: `/blog/${post.slug}/`,
    image: `/blog/${post.slug}/opengraph-image`,
    datePublished: `${publishedAt}T09:00:00+03:00`,
    dateModified: `${reviewedAt}T09:00:00+03:00`,
    authorName: getBlogAuthor(post.category),
  });
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Ana Sayfa", url: "/" },
    { name: "Blog", url: "/blog/" },
    { name: post.title, url: `/blog/${post.slug}/` },
  ]);

  return (
    <div className="site-scope">
      <SchemaJsonLd schema={post.faq?.length ? [articleLd, breadcrumbLd, faqJsonLd(post.faq)] : [articleLd, breadcrumbLd]} />
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="bg-[var(--site-bg-warm)] py-14 sm:py-20">
        <Container>
          <article className="mx-auto max-w-4xl rounded-3xl border border-[var(--site-line)] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,15,0.04)] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-orange-ink)]">{post.category}</p>
            <p className="mt-3 text-[12.5px] text-[var(--site-muted)]">
              {getBlogAuthor(post.category)} · {formatBlogDate(publishedAt)} · {estimateBlogReadingMinutes(post)} dk okuma
            </p>
            <h1 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] leading-tight tracking-[-0.02em] text-[var(--site-ink)]">{post.title}</h1>
            <p className="mt-4 text-[15px] leading-7 text-[var(--site-body)]">{post.excerpt}</p>

            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-[var(--site-line)] py-4 text-[12.5px] leading-6 text-[var(--site-muted)]">
              <span className="font-semibold text-[var(--site-ink)]">Editoryal kontrol:</span>
              <span>Online Dershanem Eğitim Ekibi</span>
              <span aria-hidden="true">·</span>
              <span>Son kontrol {formatBlogDate(reviewedAt)}</span>
            </div>

            {post.summary?.length ? (
              <aside className="mt-8 rounded-2xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-5 sm:p-6" aria-labelledby="summary-title">
                <h2 id="summary-title" className="font-display text-xl text-[var(--site-ink)]">Kısa cevap</h2>
                <ul className="mt-3 space-y-2 text-[14.5px] leading-7 text-[var(--site-body)]">
                  {post.summary.map((item) => <li key={item} className="flex gap-3"><span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-orange)]" />{item}</li>)}
                </ul>
              </aside>
            ) : null}

            <nav aria-label="Yazı içeriği" className="mt-8 rounded-2xl border border-[var(--site-line)] p-5 sm:p-6">
              <h2 className="font-display text-xl text-[var(--site-ink)]">Bu yazıda</h2>
              <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {post.sections.map((section, index) => (
                  <li key={section.h2}>
                    <Link href={`#${blogHeadingId(section.h2)}`} className="inline-flex gap-2 leading-6 text-[var(--site-body)] underline decoration-[var(--site-line)] underline-offset-4 hover:text-[var(--brand-orange-ink)]">
                      <span className="text-[var(--site-muted)]">{String(index + 1).padStart(2, "0")}</span>
                      {section.h2}
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="mt-8 space-y-8">
              {post.sections.map((section) => (
                <section key={section.h2} id={blogHeadingId(section.h2)} className="scroll-mt-28 space-y-4">
                  <h2 className="font-display text-[clamp(1.4rem,2.6vw,1.9rem)] leading-tight tracking-[-0.01em] text-[var(--site-ink)]">{section.h2}</h2>

                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="text-[15px] leading-7 text-[var(--site-body)]">
                      {paragraph}
                    </p>
                  ))}

                  {section.bullets?.length ? (
                    <ul className="list-disc space-y-2 pl-5 text-[15px] leading-7 text-[var(--site-body)]">
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}

                  {section.links?.length ? (
                    <div className="space-y-2 rounded-2xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-4">
                      <h3 className="text-sm font-semibold text-[var(--site-ink)]">İlgili içerikler</h3>
                      {section.links.map((item) => (
                        <Link key={item.href} href={item.href} className="block text-sm font-semibold text-[var(--brand-orange-ink)] underline">
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </section>
              ))}
            </div>

            {post.faq?.length ? (
              <section className="mt-10 border-t border-[var(--site-line)] pt-9" aria-labelledby="article-faq-title">
                <p className="site-eyebrow">Sık sorulanlar</p>
                <h2 id="article-faq-title" className="mt-3 font-display text-[clamp(1.5rem,2.8vw,2rem)] leading-tight text-[var(--site-ink)]">Bu konu hakkında kısa yanıtlar</h2>
                <div className="mt-5 divide-y divide-[var(--site-line)] border-y border-[var(--site-line)]">
                  {post.faq.map((item) => (
                    <details key={item.q} className="group py-1">
                      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[15px] font-semibold text-[var(--site-ink)] marker:content-none">
                        {item.q}<span aria-hidden="true" className="text-xl font-normal text-[var(--brand-orange-ink)] group-open:rotate-45">+</span>
                      </summary>
                      <p className="pb-5 pr-8 text-[14.5px] leading-7 text-[var(--site-body)]">{item.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="mt-10 rounded-3xl border border-[var(--site-line)] bg-[var(--brand-orange-soft)] p-6 sm:p-8">
              <h2 className="font-display text-[clamp(1.4rem,2.6vw,1.9rem)] leading-tight tracking-[-0.01em] text-[var(--site-ink)]">{post.cta.title}</h2>
              <p className="mt-2 text-[15px] leading-7 text-[var(--site-body)]">{post.cta.text}</p>
              <LeadFunnelTrigger
                source={`blog_post_${post.slug}_cta`}
                eventName="landing_cta_click"
                href={post.cta.href ?? (/(Paket|Sistemini İncele)/i.test(post.cta.buttonLabel) ? "/ders-paketleri/" : "/iletisim/")}
                className="site-btn site-btn-primary mt-5"
                analyticsId={`blog_post_${post.slug}_cta`}
              >
                {post.cta.buttonLabel}
              </LeadFunnelTrigger>
            </section>

            <section className="mt-8">
              <h2 className="font-display text-[20px] leading-tight tracking-[-0.01em] text-[var(--site-ink)]">Önerilen Yazılar</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {relatedPosts.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/blog/${item.slug}/`}
                    className="rounded-2xl border border-[var(--site-line)] bg-white p-4 text-sm font-semibold text-[var(--site-ink)] transition-colors hover:border-[var(--brand-orange)]"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </section>
          </article>

          <section className="mx-auto mt-6 grid max-w-4xl gap-4 rounded-3xl border border-[var(--site-line)] bg-white p-6 sm:grid-cols-2">
            <Link href="/online-dershane/" className="rounded-2xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-4 text-sm font-semibold text-[var(--site-ink)] transition-colors hover:border-[var(--brand-orange)]">
              Online dershane sayfasına git
            </Link>
            <Link href="/online-ozel-ders/" className="rounded-2xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-4 text-sm font-semibold text-[var(--site-ink)] transition-colors hover:border-[var(--brand-orange)]">
              Online özel ders sayfasına git
            </Link>
          </section>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Container } from "@/components/ui/container";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";
import { blogPosts, siteUrl } from "@/lib/content";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";

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

  return {
    title: post.seoTitle,
    description: post.metaDescription,
    alternates: {
      canonical: `/blog/${post.slug}/`
    },
    openGraph: {
      title: post.seoTitle,
      description: post.metaDescription,
      url: `${siteUrl}/blog/${post.slug}`,
      type: "article"
    }
  };
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

  // Article JSON-LD — blog post tarihi yok, statik fallback (genel SEO için yeterli)
  const articleLd = articleJsonLd({
    headline: post.title,
    description: post.metaDescription,
    url: `/blog/${post.slug}/`,
    datePublished: "2025-01-01T00:00:00Z",
    dateModified: new Date().toISOString(),
  });
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Ana Sayfa", url: "/" },
    { name: "Blog", url: "/blog/" },
    { name: post.title, url: `/blog/${post.slug}/` },
  ]);

  return (
    <div className="site-scope">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <SiteHeader />
      <main className="bg-[var(--site-bg-warm)] py-14 sm:py-20">
        <Container>
          <article className="mx-auto max-w-4xl rounded-3xl border border-[var(--site-line)] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,15,0.04)] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-orange-ink)]">{post.category}</p>
            <h1 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] leading-tight tracking-[-0.02em] text-[var(--site-ink)]">{post.title}</h1>
            <p className="mt-4 text-[15px] leading-7 text-[var(--site-body)]">{post.excerpt}</p>

            <div className="mt-8 space-y-8">
              {post.sections.map((section) => (
                <section key={section.h2} className="space-y-4">
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

            <section className="mt-10 rounded-3xl border border-[var(--site-line)] bg-[var(--brand-orange-soft)] p-6 sm:p-8">
              <h2 className="font-display text-[clamp(1.4rem,2.6vw,1.9rem)] leading-tight tracking-[-0.01em] text-[var(--site-ink)]">{post.cta.title}</h2>
              <p className="mt-2 text-[15px] leading-7 text-[var(--site-body)]">{post.cta.text}</p>
              <LeadFunnelTrigger
                source={`blog_post_${post.slug}_cta`}
                eventName="landing_cta_click"
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

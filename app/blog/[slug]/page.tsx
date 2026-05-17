import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
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
      url: `${siteUrl}/blog/${post.slug}/`,
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
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Navbar />
      <main className="bg-[var(--od-cream)] text-[var(--od-ink)] py-14 sm:py-20">
        <Container>
          <article className="mx-auto max-w-4xl rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">{post.category}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{post.title}</h1>
            <p className="mt-4 text-sm leading-relaxed text-muted">{post.excerpt}</p>

            <div className="mt-8 space-y-8">
              {post.sections.map((section) => (
                <section key={section.h2} className="space-y-4">
                  <h2 className="text-2xl font-bold tracking-tight text-ink">{section.h2}</h2>

                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-relaxed text-muted">
                      {paragraph}
                    </p>
                  ))}

                  {section.bullets?.length ? (
                    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}

                  {section.links?.length ? (
                    <div className="space-y-2 rounded-2xl border border-line bg-soft p-4">
                      <h3 className="text-sm font-semibold text-ink">İlgili içerikler</h3>
                      {section.links.map((item) => (
                        <Link key={item.href} href={item.href} className="block text-sm font-semibold text-brand underline">
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </section>
              ))}
            </div>

            <section className="mt-10 rounded-3xl border border-brand/30 bg-mint p-6">
              <h2 className="text-2xl font-bold tracking-tight text-ink">{post.cta.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{post.cta.text}</p>
              <LeadFunnelTrigger
                source={`blog_post_${post.slug}_cta`}
                eventName="landing_cta_click"
                className="mt-4 inline-flex rounded-full bg-anchor px-5 py-2.5 text-xs font-semibold text-white"
                analyticsId={`blog_post_${post.slug}_cta`}
              >
                {post.cta.buttonLabel}
              </LeadFunnelTrigger>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-bold tracking-tight text-ink">Önerilen Yazılar</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {relatedPosts.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/blog/${item.slug}/`}
                    className="rounded-2xl border border-line bg-white p-4 text-sm font-semibold text-ink transition hover:bg-soft"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </section>
          </article>

          <section className="mx-auto mt-8 grid max-w-4xl gap-4 rounded-3xl border border-line bg-white p-6 shadow-soft sm:grid-cols-2">
            <Link href="/online-dershane/" className="rounded-2xl border border-line bg-soft p-4 text-sm font-semibold text-ink">
              Online dershane sayfasına git
            </Link>
            <Link href="/online-ozel-ders/" className="rounded-2xl border border-line bg-soft p-4 text-sm font-semibold text-ink">
              Online özel ders sayfasına git
            </Link>
          </section>
        </Container>
      </main>
      <Footer />
    </>
  );
}

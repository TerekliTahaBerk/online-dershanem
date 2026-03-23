import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { Container } from "@/components/ui/container";
import { FadeIn } from "@/components/ui/fade-in";
import { blogPosts, siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "Online Dershane Blog",
  description:
    "Online dershane ve online özel ders rehberleri: LGS-YKS çalışma planı, küçük grup ders modeli ve haftalık takip sistemi.",
  alternates: {
    canonical: "/blog/"
  },
  openGraph: {
    title: "Online Dershane Blog | Online Dershanem",
    description:
      "Online dershane, e dershane, online ders ve özel ders aramalarında ihtiyaç duyacağın uygulamalı rehberler.",
    url: `${siteUrl}/blog/`
  }
};

export default function BlogPage() {
  const featuredPosts = blogPosts.filter((post) => post.featured).slice(0, 2);

  return (
    <>
      <Navbar />
      <main className="py-14 sm:py-20">
        <Container>
          <FadeIn>
            <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">Online Dershane Blog</h1>
            <p className="mt-3 max-w-4xl text-sm leading-relaxed text-muted sm:text-base">
              Online dershane, e dershane, online ders ve özel ders aramalarında doğru karar vermek için hazırlanmış uygulamalı içerikler.
              Bu blogdaki yazılar sadece bilgi vermez; öğrenciyi küçük grup online ders modeline yönlendirir ve ücretsiz deneme adımına taşır.
            </p>
          </FadeIn>

          <section className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-soft">
            <h2 className="text-xl font-bold tracking-tight text-ink">En Popüler Yazılar</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {featuredPosts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}/`} className="rounded-2xl border border-line bg-soft p-4 transition hover:bg-mint">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand">{post.category}</p>
                  <h3 className="mt-2 text-base font-semibold text-ink">{post.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{post.cardSnippet}</p>
                </Link>
              ))}
            </div>
          </section>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {blogPosts.map((post, index) => (
              <FadeIn key={post.slug} delay={index * 0.06}>
                <article className="h-full rounded-3xl border border-line bg-white p-6 shadow-soft">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand">{post.category}</p>
                  <h2 className="mt-2 text-xl font-semibold text-ink">{post.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{post.cardSnippet}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href={`/blog/${post.slug}/`}
                      className="inline-flex rounded-full border border-line-strong px-4 py-2 text-xs font-semibold text-ink transition hover:bg-soft"
                    >
                      Yazıyı Oku
                    </Link>
                    <Link
                      href="/online-dershane/"
                      className="inline-flex rounded-full border border-line-strong px-4 py-2 text-xs font-semibold text-ink transition hover:bg-soft"
                    >
                      Online Dershane
                    </Link>
                    <Link
                      href="/online-ozel-ders/"
                      className="inline-flex rounded-full border border-line-strong px-4 py-2 text-xs font-semibold text-ink transition hover:bg-soft"
                    >
                      Online Özel Ders
                    </Link>
                  </div>
                </article>
              </FadeIn>
            ))}
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}

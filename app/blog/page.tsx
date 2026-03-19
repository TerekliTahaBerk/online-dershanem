import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { Container } from "@/components/ui/container";
import { FadeIn } from "@/components/ui/fade-in";
import { blogPosts, siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "Blog",
  description: "TYT-AYT ve LGS için ders bazlı hazırlık stratejileri, çalışma planları ve sınav içerikleri.",
  alternates: {
    canonical: "/blog/"
  },
  openGraph: {
    title: "Blog | Online Dershanem",
    description: "TYT-AYT ve LGS için ders bazlı hazırlık stratejileri, çalışma planları ve sınav içerikleri.",
    url: `${siteUrl}/blog/`
  }
};

export default function BlogPage() {
  return (
    <>
      <Navbar />
      <main className="py-14 sm:py-20">
        <Container>
          <FadeIn>
            <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">Blog</h1>
            <p className="mt-3 max-w-3xl text-muted">
              Sınav türüne göre hazırlanmış rehber içeriklerle planını netleştir, çalışma düzenini güçlendir.
            </p>
          </FadeIn>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {blogPosts.map((post, index) => (
              <FadeIn key={post.slug} delay={index * 0.06}>
                <article className="h-full rounded-3xl border border-line bg-white p-6 shadow-soft">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand">{post.category}</p>
                  <h2 className="mt-2 text-xl font-semibold text-ink">{post.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{post.excerpt}</p>
                  <Link
                    href={`/blog/${post.slug}/`}
                    className="mt-5 inline-flex rounded-full border border-line-strong px-4 py-2 text-xs font-semibold text-ink transition hover:bg-soft"
                  >
                    Yazıyı Oku
                  </Link>
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

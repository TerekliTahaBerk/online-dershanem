import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, NotebookPen, Sparkles, Target } from "lucide-react";
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

type BlogPost = (typeof blogPosts)[number];

function getReadMinutes(post: BlogPost) {
  const content = [
    post.title,
    post.excerpt,
    post.cardSnippet,
    ...post.sections.flatMap((section) => [section.h2, ...(section.paragraphs ?? []), ...(section.bullets ?? [])])
  ].join(" ");

  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / 180));
}

function getCategoryTheme(category: string) {
  switch (category) {
    case "YKS":
      return { icon: Target, cover: "bg-[#eef8f1]", chip: "bg-emerald-50 text-emerald-700" };
    case "LGS":
      return { icon: GraduationCap, cover: "bg-[#eef5fb]", chip: "bg-sky-50 text-sky-700" };
    case "Online Özel Ders":
      return { icon: Sparkles, cover: "bg-[#fcf5ea]", chip: "bg-amber-50 text-amber-700" };
    default:
      return { icon: BookOpen, cover: "bg-[#f3f7f5]", chip: "bg-[#eef4f1] text-[#166534]" };
  }
}

export default function BlogPage() {
  const featuredPosts = blogPosts.filter((post) => post.featured).slice(0, 2);
  const restPosts = blogPosts.filter((post) => !post.featured);

  return (
    <>
      <Navbar />
      <main className="py-14 sm:py-20">
        <Container>
          <FadeIn>
            <section className="rounded-[24px] border border-line bg-[#f5f7f6] px-6 py-10 text-center sm:px-8 sm:py-14">
              <span className="pd-eyebrow justify-center">Blog</span>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">Sınav rehberi ve öğrenme metodu.</h1>
              <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-muted sm:text-base">
                LGS ve YKS için haftalık yazılar, deneme analizi ipuçları, sınava hazırlık stratejileri ve doğru çalışma modeli
                üzerine net içerikler.
              </p>
            </section>
          </FadeIn>

          <section className="mt-10">
            <div className="grid gap-5 lg:grid-cols-2">
              {featuredPosts.map((post, index) => {
                const theme = getCategoryTheme(post.category);
                const Icon = theme.icon;

                return (
                  <FadeIn key={post.slug} delay={index * 0.05}>
                    <Link
                      href={`/blog/${post.slug}/`}
                      className="group overflow-hidden rounded-[22px] border border-line bg-white shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className={`flex h-40 items-center justify-center ${theme.cover}`}>
                        <Icon className="h-14 w-14 text-ink/50" />
                      </div>
                      <div className="px-6 py-6">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${theme.chip}`}>{post.category}</span>
                        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-ink">{post.title}</h2>
                        <p className="mt-3 text-sm leading-7 text-muted">{post.excerpt}</p>
                        <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                          <span>{getReadMinutes(post)} dk okuma</span>
                          <span className="text-line-strong">·</span>
                          <span>{post.sections.length} bölüm</span>
                        </div>
                      </div>
                    </Link>
                  </FadeIn>
                );
              })}
            </div>
          </section>

          <section className="mt-10">
            <FadeIn>
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink">Son yazılar</h2>
            </FadeIn>

            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {restPosts.map((post, index) => {
                const theme = getCategoryTheme(post.category);
                const Icon = theme.icon;

                return (
                  <FadeIn key={post.slug} delay={index * 0.04}>
                    <Link
                      href={`/blog/${post.slug}/`}
                      className="group flex h-full flex-col rounded-[20px] border border-line bg-white p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className={`mb-5 flex h-28 items-center justify-center rounded-[18px] ${theme.cover}`}>
                        <Icon className="h-10 w-10 text-ink/45" />
                      </div>
                      <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${theme.chip}`}>{post.category}</span>
                      <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em] text-ink">{post.title}</h3>
                      <p className="mt-3 flex-1 text-sm leading-7 text-muted">{post.excerpt}</p>
                      <div className="mt-5 flex items-center gap-2 text-xs text-muted">
                        <span>{getReadMinutes(post)} dk okuma</span>
                        <span className="text-line-strong">·</span>
                        <span>{post.sections.length} bölüm</span>
                        <span className="ml-auto inline-flex items-center font-semibold text-ink">
                          Oku
                          <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </span>
                      </div>
                    </Link>
                  </FadeIn>
                );
              })}
            </div>
          </section>

          <section className="mt-10 rounded-[22px] border border-line bg-white p-6 shadow-soft sm:p-8">
            <FadeIn>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { href: "/online-dershane/", label: "Online Dershane", icon: NotebookPen },
                  { href: "/online-ozel-ders/", label: "Online Özel Ders", icon: Sparkles },
                  { href: "/deneme-kulubu/", label: "Deneme Kulübü", icon: Target }
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 rounded-[18px] border border-line bg-[#f8faf9] px-5 py-5 text-sm font-semibold text-ink transition hover:bg-soft"
                    >
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand shadow-soft">
                        <Icon className="h-4 w-4" />
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </FadeIn>
          </section>
        </Container>
      </main>
      <Footer />
    </>
  );
}

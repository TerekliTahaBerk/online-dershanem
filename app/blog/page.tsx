import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  GraduationCap,
  NotebookPen,
  Sparkles,
  Target
} from "lucide-react";
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
      return {
        icon: Target,
        badge: "bg-emerald-50 text-emerald-700",
        panel: "bg-[#ecf8f2]"
      };
    case "LGS":
      return {
        icon: GraduationCap,
        badge: "bg-sky-50 text-sky-700",
        panel: "bg-[#eef7fb]"
      };
    case "Online Özel Ders":
      return {
        icon: Sparkles,
        badge: "bg-amber-50 text-amber-700",
        panel: "bg-[#fcf5ea]"
      };
    default:
      return {
        icon: BookOpen,
        badge: "bg-[#eef4f1] text-[#166534]",
        panel: "bg-[#f3f7f5]"
      };
  }
}

export default function BlogPage() {
  const featuredPosts = blogPosts.filter((post) => post.featured).slice(0, 2);
  const recentPosts = blogPosts.filter((post) => !post.featured);
  const categoryCount = new Set(blogPosts.map((post) => post.category)).size;

  const readingPaths = [
    {
      title: "Sistemi anlamak için",
      body: "Önce model nasıl çalışıyor onu netleştir, sonra paket kararına geç.",
      href: "/online-dershane/",
      label: "Online Dershane"
    },
    {
      title: "Ders bazlı destek için",
      body: "Tek derste tıkanan öğrenciler için daha hızlı başlangıç rotası.",
      href: "/online-ozel-ders/",
      label: "Online Özel Ders"
    },
    {
      title: "Sınav takibi için",
      body: "Deneme, analiz ve haftalık ritmi ayrı bir ürün olarak incele.",
      href: "/deneme-kulubu/",
      label: "Deneme Kulübü"
    }
  ];

  return (
    <>
      <Navbar />
      <main className="py-14 sm:py-20">
        <Container>
          <section className="overflow-hidden rounded-[24px] bg-[#0b1211] px-6 py-10 text-white sm:px-8 sm:py-14">
            <FadeIn>
              <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
                    <NotebookPen className="h-3.5 w-3.5" />
                    Blog
                  </span>
                  <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl lg:text-[3.6rem]">
                    Sınav rehberi ve öğrenme metodu.
                  </h1>
                  <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                    LGS ve YKS sürecinde sadece bilgi değil, uygulanabilir sistem gerekir. Burada deneme analizi, küçük grup düzeni,
                    haftalık plan ve doğru model seçimi üzerine net içerikler var.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <a
                      href="#one-cikanlar"
                      className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0b1211] transition hover:bg-white/92"
                    >
                      Öne çıkan yazılar
                    </a>
                    <Link
                      href="/online-dershane/"
                      className="inline-flex items-center rounded-full border border-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      Sistemi incele
                    </Link>
                  </div>
                </div>

                <FadeIn delay={0.08}>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      { value: `${blogPosts.length}+`, label: "uygulamalı yazı" },
                      { value: `${categoryCount}`, label: "ana kategori" },
                      { value: "Net", label: "okuma rotası" }
                    ].map((item) => (
                      <div key={item.label} className="rounded-[18px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                        <div className="text-2xl font-semibold tracking-[-0.04em] text-white">{item.value}</div>
                        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </FadeIn>
              </div>
            </FadeIn>
          </section>

          <section id="one-cikanlar" className="mt-10">
            <FadeIn>
              <div className="mb-8 max-w-3xl">
                <span className="pd-eyebrow">Öne Çıkanlar</span>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">
                  İlk bakışta okunması gereken yazılar.
                </h2>
              </div>
            </FadeIn>

            <div className="grid gap-5 lg:grid-cols-2">
              {featuredPosts.map((post, index) => {
                const theme = getCategoryTheme(post.category);
                const Icon = theme.icon;

                return (
                  <FadeIn key={post.slug} delay={index * 0.05}>
                    <Link
                      href={`/blog/${post.slug}/`}
                      className="group flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-white shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className={`flex items-start justify-between gap-4 border-b border-line px-6 py-6 ${theme.panel}`}>
                        <div>
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${theme.badge}`}>{post.category}</span>
                          <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-ink">{post.title}</h3>
                        </div>
                        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-soft">
                          <Icon className="h-5 w-5" />
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col px-6 py-6">
                        <p className="text-sm leading-7 text-muted">{post.cardSnippet}</p>
                        <div className="mt-6 flex items-center gap-3 text-xs text-muted">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {getReadMinutes(post)} dk okuma
                          </span>
                          <span className="h-1 w-1 rounded-full bg-line-strong" />
                          <span>{post.relatedSlugs.length + 1} bağlantılı konu</span>
                        </div>
                        <div className="mt-6 inline-flex items-center text-sm font-semibold text-ink">
                          Yazıyı oku
                          <ArrowRight className="ml-1.5 h-4 w-4 transition group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </Link>
                  </FadeIn>
                );
              })}
            </div>
          </section>

          <section className="mt-10 grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
            <FadeIn>
              <aside className="rounded-[22px] border border-line bg-[#f5f7f6] p-6">
                <span className="pd-eyebrow">Okuma Rotası</span>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">Nereden başlamalı?</h2>
                <p className="mt-4 text-sm leading-7 text-muted">
                  Kararın net değilse içerikleri rastgele dolaşma. Önce ihtiyacını seç, sonra doğru yazıdan ve doğru hizmetten ilerle.
                </p>

                <div className="mt-6 grid gap-4">
                  {readingPaths.map((item, index) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="rounded-[18px] border border-line bg-white p-5 transition hover:border-line-strong hover:shadow-soft"
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Rota {index + 1}</div>
                      <h3 className="mt-2 text-lg font-semibold text-ink">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
                      <div className="mt-4 inline-flex items-center text-sm font-semibold text-ink">
                        {item.label}
                        <ArrowRight className="ml-1.5 h-4 w-4" />
                      </div>
                    </Link>
                  ))}
                </div>
              </aside>
            </FadeIn>

            <div>
              <FadeIn delay={0.04}>
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <span className="pd-eyebrow">Son Yazılar</span>
                    <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">Güncel okuma listesi.</h2>
                  </div>
                  <Link href="/online-ozel-ders/" className="text-sm font-semibold text-ink underline-offset-4 hover:underline">
                    Destek modelini de gör
                  </Link>
                </div>
              </FadeIn>

              <div className="grid gap-4 md:grid-cols-2">
                {recentPosts.map((post, index) => {
                  const theme = getCategoryTheme(post.category);
                  const Icon = theme.icon;

                  return (
                    <FadeIn key={post.slug} delay={index * 0.04}>
                      <article className="flex h-full flex-col rounded-[20px] border border-line bg-white p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                        <div className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${theme.badge}`}>
                          <Icon className="h-3.5 w-3.5" />
                          {post.category}
                        </div>

                        <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em] text-ink">{post.title}</h3>
                        <p className="mt-3 flex-1 text-sm leading-7 text-muted">{post.cardSnippet}</p>

                        <div className="mt-5 flex items-center justify-between gap-4 border-t border-line pt-4">
                          <div className="text-xs text-muted">
                            {getReadMinutes(post)} dk okuma
                            <span className="mx-2 text-line-strong">·</span>
                            {post.sections.length} bölüm
                          </div>
                          <Link href={`/blog/${post.slug}/`} className="inline-flex items-center text-sm font-semibold text-ink">
                            Oku
                            <ArrowRight className="ml-1.5 h-4 w-4" />
                          </Link>
                        </div>
                      </article>
                    </FadeIn>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="mt-10 rounded-[22px] border border-line bg-white p-6 shadow-soft sm:p-8">
            <FadeIn>
              <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr] lg:items-end">
                <div>
                  <span className="pd-eyebrow">Blogdan Sonra</span>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">
                    Okumayı modele dönüştür.
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
                    Yazılar fikir verir. Sonuç ise doğru sistemle gelir. Hangi yapının sana uyduğunu görmek için servis sayfalarına
                    doğrudan geçebilirsin.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/online-dershane/"
                    className="rounded-[18px] border border-line bg-[#f5f7f6] px-5 py-5 text-sm font-semibold text-ink transition hover:bg-soft"
                  >
                    Online Dershane
                  </Link>
                  <Link
                    href="/online-ozel-ders/"
                    className="rounded-[18px] border border-line bg-[#f5f7f6] px-5 py-5 text-sm font-semibold text-ink transition hover:bg-soft"
                  >
                    Online Özel Ders
                  </Link>
                </div>
              </div>
            </FadeIn>
          </section>
        </Container>
      </main>
      <Footer />
    </>
  );
}

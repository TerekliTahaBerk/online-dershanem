import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { blogPosts, siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "Online Dershane Blog",
  description:
    "Online dershane ve online özel ders rehberleri: LGS-YKS çalışma planı, küçük grup ders modeli ve haftalık takip sistemi.",
  alternates: { canonical: "/blog/" },
  openGraph: {
    title: "Online Dershane Blog | Online Dershanem",
    description:
      "Online dershane, e dershane, online ders ve özel ders aramalarında ihtiyaç duyacağın uygulamalı rehberler.",
    url: `${siteUrl}/blog/`,
  },
};

type BlogPost = (typeof blogPosts)[number];

function getReadMinutes(post: BlogPost) {
  const content = [
    post.title,
    post.excerpt,
    post.cardSnippet,
    ...post.sections.flatMap((section) => [
      section.h2,
      ...(section.paragraphs ?? []),
      ...(section.bullets ?? []),
    ]),
  ].join(" ");
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / 180));
}

const categoryAccent: Record<string, string> = {
  YKS: "var(--od-olive)",
  LGS: "#5C7BA6",
  "Online Özel Ders": "#A67C4F",
};

function getAccent(cat: string) {
  return categoryAccent[cat] ?? "var(--od-olive)";
}

export default function BlogPage() {
  const featured = blogPosts.find((p) => p.featured) ?? blogPosts[0];
  const others = blogPosts.filter((p) => p.slug !== featured.slug);

  return (
    <>
      <Navbar />
      <main className="bg-[var(--od-cream)] text-[var(--od-ink)]">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-[var(--od-line)]">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <Image
              src="/v991-nt-35.jpg"
              alt=""
              fill
              sizes="100vw"
              priority
              className="object-cover opacity-[0.12] mix-blend-multiply"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,253,245,0.5) 0%, rgba(255,253,245,0.92) 70%, var(--od-cream) 100%)",
              }}
            />
          </div>

          <div className="mx-auto max-w-3xl px-5 pt-28 pb-14 sm:pt-36 sm:pb-20 text-center">
            <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--od-olive)]">
              Yazılar
            </span>
            <h1 className="mt-5 font-display text-[44px] font-normal leading-[1.02] tracking-tight sm:text-[68px]">
              Sınava giden yolda{" "}
              <em className="italic text-[var(--od-olive)]">notlar</em>.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[15.5px] leading-7 text-[var(--od-ink-soft)]">
              LGS ve YKS için haftalık rehberler, deneme analizi ipuçları,
              çalışma stratejileri ve doğru hazırlık modeli üzerine net içerikler.
            </p>
          </div>
        </section>

        {/* Featured */}
        <section className="mx-auto max-w-6xl px-5 pt-16">
          <Link
            href={`/blog/${featured.slug}/`}
            className="group block overflow-hidden rounded-[32px] border border-[var(--od-line)] bg-white transition hover:-translate-y-0.5 hover:shadow-[0_28px_70px_-32px_rgba(20,20,15,0.22)]"
          >
            <div className="grid gap-0 lg:grid-cols-[1.1fr_1fr]">
              <div className="flex flex-col justify-center gap-5 p-8 sm:p-12">
                <div className="flex items-center gap-3 text-[12px]">
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-1 font-medium uppercase tracking-[0.14em]"
                    style={{
                      background: "var(--od-cream-2)",
                      color: getAccent(featured.category),
                    }}
                  >
                    {featured.category}
                  </span>
                  <span className="text-[#8B8B7E]">
                    {getReadMinutes(featured)} dk okuma
                  </span>
                </div>
                <h2 className="font-display text-[32px] font-normal leading-[1.05] tracking-tight text-[var(--od-ink)] sm:text-[44px]">
                  {featured.title}
                </h2>
                <p className="text-[15px] leading-7 text-[var(--od-ink-soft)]">
                  {featured.excerpt}
                </p>
                <span className="mt-2 inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--od-ink)] transition group-hover:text-[var(--od-olive)]">
                  Yazıyı oku
                  <ArrowRight size={15} strokeWidth={1.8} />
                </span>
              </div>
              <div
                className="relative min-h-[260px] overflow-hidden border-t border-[var(--od-line)] lg:border-l lg:border-t-0"
                style={{ background: "var(--od-cream-2)" }}
              >
                <Image
                  src="/v991-nt-35.jpg"
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover opacity-[0.45] mix-blend-multiply"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="font-display text-[88px] italic leading-none opacity-30"
                    style={{ color: getAccent(featured.category) }}
                  >
                    {featured.category.charAt(0).toLowerCase()}.
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* Others — magazine-style list */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <h3 className="mb-8 font-display text-[26px] leading-tight tracking-tight text-[var(--od-ink)] sm:text-[32px]">
            Son yazılar
          </h3>

          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((post) => {
              const accent = getAccent(post.category);
              return (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}/`}
                  className="group flex flex-col"
                >
                  <div
                    className="relative mb-5 aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--od-line)]"
                    style={{ background: "var(--od-cream-2)" }}
                  >
                    <Image
                      src="/v991-nt-35.jpg"
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover opacity-[0.4] mix-blend-multiply transition duration-500 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        className="font-display text-[64px] italic leading-none opacity-40"
                        style={{ color: accent }}
                      >
                        {post.category.charAt(0).toLowerCase()}.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11.5px] font-medium uppercase tracking-[0.14em] text-[#8B8B7E]">
                    <span style={{ color: accent }}>{post.category}</span>
                    <span className="text-[#C8C8B5]">·</span>
                    <span>{getReadMinutes(post)} dk okuma</span>
                  </div>
                  <h4 className="mt-3 font-display text-[22px] font-normal leading-[1.15] tracking-tight text-[var(--od-ink)] transition group-hover:text-[var(--od-olive)] sm:text-[24px]">
                    {post.title}
                  </h4>
                  <p className="mt-2 text-[14px] leading-6 text-[var(--od-ink-soft)] line-clamp-3">
                    {post.excerpt}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Soft CTA */}
        <section className="mx-auto max-w-6xl px-5 pb-20">
          <div className="overflow-hidden rounded-[28px] border border-[var(--od-line)] bg-[var(--od-yellow-soft)] p-8 sm:p-12">
            <div className="grid gap-6 sm:grid-cols-[1.4fr_auto] sm:items-center">
              <div>
                <span className="text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--od-olive)]">
                  Sıradaki adım
                </span>
                <h3 className="mt-3 font-display text-[28px] leading-tight tracking-tight text-[var(--od-ink)] sm:text-[36px]">
                  Okuduklarını uygulamaya geçirelim.
                </h3>
                <p className="mt-3 max-w-md text-[14.5px] leading-7 text-[var(--od-ink-soft)]">
                  Sana uygun ders, hoca ve haftalık plan kombinasyonunu birlikte
                  kuralım.
                </p>
              </div>
              <Link
                href="/paketler/"
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--od-ink)] px-6 py-3 text-[14px] font-medium text-white transition hover:bg-black"
              >
                Paketleri gör
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

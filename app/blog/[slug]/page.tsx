import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { Container } from "@/components/ui/container";
import { blogPosts, siteUrl } from "@/lib/content";

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
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `/blog/${post.slug}`
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
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

  return (
    <>
      <Navbar />
      <main className="py-14 sm:py-20">
        <Container>
          <article className="mx-auto max-w-4xl rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">{post.category}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{post.title}</h1>
            <p className="mt-4 text-sm leading-relaxed text-muted">{post.excerpt}</p>

            <div className="mt-8 space-y-5">
              {post.content.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-relaxed text-muted">
                  {paragraph}
                </p>
              ))}
            </div>
          </article>
        </Container>
      </main>
      <Footer />
    </>
  );
}

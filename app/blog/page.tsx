import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { BlogIndex } from "@/components/blog/blog-index";
import { EditorialProductHero } from "@/components/product/editorial-product-hero";
import { ArrowDown, ArrowRight } from "lucide-react";
import Link from "next/link";
import { blogPublishedAt, estimateBlogReadingMinutes, formatBlogDate } from "@/lib/blog-meta";
import styles from "@/components/blog/blog.module.css";
import { blogPosts } from "@/lib/blog-content";
import { siteUrl } from "@/lib/content";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "onlinedershanem. Blog",
  description:
    "Online dershane ve online özel ders rehberleri: LGS-YKS çalışma planı, küçük grup ders modeli ve haftalık takip sistemi üzerine yazılar.",
  canonical: "/blog",
  imagePath: "/blog/opengraph-image",
  imageAlt: "onlinedershanem. Blog",
});

/** BLOG — onaylı tasarım (Web.dc.html → isBlog), gerçek yazılara bağlı. */
export default function BlogPage() {
  return (
    <div className="site-scope">
      <SchemaJsonLd
        schema={breadcrumbJsonLd([
          { name: "Ana Sayfa", url: `${siteUrl}/` },
          { name: "Blog", url: `${siteUrl}/blog` },
        ])}
      />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <EditorialProductHero
          tone="lesson"
          titleId="blog-title"
          lines={[{ text: "Yeni bir bakış açısı." }, { text: "Daha bilinçli", emphasis: "bir adım." }]}
          description="Nasıl çalışmalı, nereden başlamalı, deneme sonuçlarını nasıl okumalı? LGS ve YKS hazırlığında öğrenciler ve veliler için çalışma yöntemleri, planlama ve öğrenme üzerine rehberler."
          actions={<a href="#yazilar">Yazıları keşfet <ArrowDown size={18} aria-hidden="true" /></a>}
        />
        <BlogIndex posts={blogPosts.map((post) => ({
          slug: post.slug, category: post.category, title: post.title,
          excerpt: post.excerpt, cardSnippet: post.cardSnippet, featured: post.featured,
          readingMinutes: estimateBlogReadingMinutes(post), date: formatBlogDate(blogPublishedAt[post.slug]),
        }))} />
        <section className={styles.closing}>
          <div className="site-container"><h2>Okuduklarını <span>bir sonraki adımına taşı.</span></h2><p>Canlı ders, kişisel çalışma planı ve online denemeden ihtiyacın olanı seç; sana uygun hazırlık düzenini kur.</p><Link href="/paketler">Paketini oluştur <ArrowRight size={18} aria-hidden="true" /></Link></div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

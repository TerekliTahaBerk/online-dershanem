import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { BlogIndex } from "@/components/blog/blog-index";
import { ProductClosingCta } from "@/components/product/product-sections";
import { blogPosts } from "@/lib/blog-content";
import { siteUrl } from "@/lib/content";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Online Dershanem Blog",
  description:
    "Online dershane ve online özel ders rehberleri: LGS-YKS çalışma planı, küçük grup ders modeli ve haftalık takip sistemi üzerine yazılar.",
  canonical: "/blog",
  imagePath: "/blog/opengraph-image",
  imageAlt: "Online Dershanem Blog",
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
        <BlogIndex posts={blogPosts} />
        <ProductClosingCta
          title="Yazıyı okudun, sırada plan var."
          body="Ders, koçluk ve denemeyi ihtiyacına göre seç."
        />
      </main>
      <SiteFooter />
    </div>
  );
}

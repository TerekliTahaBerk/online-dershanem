/**
 * JSON-LD structured data helpers — SEO için.
 *
 * Schema.org standartlarına göre. Google Rich Results / Bing / Yandex parse eder.
 *
 * Kullanım:
 *   import { breadcrumbJsonLd, courseJsonLd, productJsonLd } from "@/lib/seo/jsonld";
 *   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([...])) }} />
 */
import { siteUrl } from "@/lib/content";

export type BreadcrumbItem = { name: string; url: string };

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url.startsWith("http") ? it.url : `${siteUrl}${it.url}`,
    })),
  };
}

export type CourseInput = {
  name: string;
  description: string;
  url: string;
  provider?: { name: string; url: string };
  inLanguage?: string;
};

export function courseJsonLd(input: CourseInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: input.name,
    description: input.description,
    url: input.url.startsWith("http") ? input.url : `${siteUrl}${input.url}`,
    inLanguage: input.inLanguage ?? "tr-TR",
    provider: {
      "@type": "Organization",
      name: input.provider?.name ?? "Online Dershanem",
      sameAs: input.provider?.url ?? siteUrl,
    },
  };
}

export type ProductInput = {
  name: string;
  description: string;
  url: string;
  image?: string;
  priceCents: number;
  originalPriceCents?: number | null;
  currency?: string;
  availability?: "InStock" | "OutOfStock";
  sku?: string;
};

export function productJsonLd(input: ProductInput) {
  const currency = input.currency ?? "TRY";
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    url: input.url.startsWith("http") ? input.url : `${siteUrl}${input.url}`,
    image: input.image ? (input.image.startsWith("http") ? input.image : `${siteUrl}${input.image}`) : undefined,
    sku: input.sku,
    brand: { "@type": "Brand", name: "Online Dershanem" },
    offers: {
      "@type": "Offer",
      price: (input.priceCents / 100).toFixed(2),
      priceCurrency: currency,
      availability: `https://schema.org/${input.availability ?? "InStock"}`,
      url: input.url.startsWith("http") ? input.url : `${siteUrl}${input.url}`,
    },
  };
}

export type ArticleInput = {
  headline: string;
  description: string;
  url: string;
  image?: string;
  datePublished: string | Date;
  dateModified?: string | Date;
  authorName?: string;
};

export function articleJsonLd(input: ArticleInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    url: input.url.startsWith("http") ? input.url : `${siteUrl}${input.url}`,
    image: input.image ? (input.image.startsWith("http") ? input.image : `${siteUrl}${input.image}`) : undefined,
    datePublished: new Date(input.datePublished).toISOString(),
    dateModified: new Date(input.dateModified ?? input.datePublished).toISOString(),
    author: {
      "@type": "Organization",
      name: input.authorName ?? "Online Dershanem",
    },
    publisher: {
      "@type": "Organization",
      name: "Online Dershanem",
      logo: { "@type": "ImageObject", url: `${siteUrl}/logo.png` },
    },
  };
}

export type FaqItem = { q: string; a: string };

export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

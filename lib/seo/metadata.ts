import type { Metadata } from "next";
import { siteUrl } from "@/lib/content";

const SITE_NAME = "Online Dershanem";
const DEFAULT_IMAGE_PATH = "/og.png";
const DEFAULT_IMAGE_ALT = "Online Dershanem — LGS ve YKS için ders, koçluk ve deneme ürünleri";

type MarketingOpenGraphType = "website" | "article";

type BuildMarketingMetadataInput = {
  /** Browser, Open Graph and X title. The helper adds the brand when absent. */
  title: string;
  /** Shared browser, Open Graph and X description. */
  description: string;
  /** Canonical pathname. Query strings and trailing slashes are removed. */
  canonical: string;
  type?: MarketingOpenGraphType;
  imagePath?: string;
  imageAlt?: string;
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
};

function normalizePath(path: string): string {
  const pathname = path.split(/[?#]/, 1)[0] || "/";
  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return withLeadingSlash === "/" ? "/" : withLeadingSlash.replace(/\/+$/, "");
}

function absoluteUrl(path: string): string {
  return new URL(path, `${siteUrl}/`).toString();
}

function brandedTitle(title: string): string {
  return title.toLocaleLowerCase("tr-TR").includes(SITE_NAME.toLocaleLowerCase("tr-TR"))
    ? title
    : `${title} | ${SITE_NAME}`;
}

/**
 * Public marketing metadata's single source of truth. Canonical, Open Graph
 * and X cards always share the same title, description and image.
 */
export function buildMarketingMetadata({
  title,
  description,
  canonical,
  type = "website",
  imagePath = DEFAULT_IMAGE_PATH,
  imageAlt = DEFAULT_IMAGE_ALT,
  publishedTime,
  modifiedTime,
  authors,
}: BuildMarketingMetadataInput): Metadata {
  const canonicalPath = normalizePath(canonical);
  const resolvedTitle = brandedTitle(title);
  const canonicalUrl = absoluteUrl(canonicalPath);
  const imageUrl = absoluteUrl(imagePath);
  const image = {
    url: imageUrl,
    width: 1200,
    height: 630,
    alt: imageAlt,
  };

  const openGraph: Metadata["openGraph"] =
    type === "article"
      ? {
          title: resolvedTitle,
          description,
          url: canonicalUrl,
          siteName: SITE_NAME,
          locale: "tr_TR",
          type: "article",
          images: [image],
          publishedTime,
          modifiedTime,
          authors,
        }
      : {
          title: resolvedTitle,
          description,
          url: canonicalUrl,
          siteName: SITE_NAME,
          locale: "tr_TR",
          type: "website",
          images: [image],
        };

  return {
    title: { absolute: resolvedTitle },
    description,
    alternates: { canonical: canonicalPath },
    openGraph,
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description,
      images: [{ url: imageUrl, alt: imageAlt }],
    },
  };
}

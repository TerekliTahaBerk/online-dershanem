import { ImageResponse } from "next/og";
import { blogPosts } from "@/lib/blog-content";
import { OgTemplate, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-template";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const alt = "Online Dershanem Blog yazısı";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  const title = post?.title ?? "Online Dershanem Blog";
  const subtitle = post?.metaDescription ?? "Sınav hazırlığı için içgörü ve rehberler";
  const badge = post?.category ?? "Blog";
  return new ImageResponse(
    <OgTemplate title={title} subtitle={subtitle} badge={badge} variant="blog" />,
    { ...size },
  );
}

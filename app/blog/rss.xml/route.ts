import { blogPosts } from "@/lib/blog-content";
import { blogPublishedAt } from "@/lib/blog-meta";
import { siteUrl } from "@/lib/content";

export const dynamic = "force-static";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function GET() {
  const items = [...blogPosts]
    .sort((a, b) => (blogPublishedAt[b.slug] ?? "").localeCompare(blogPublishedAt[a.slug] ?? ""))
    .map((post) => {
      const url = `${siteUrl}/blog/${post.slug}`;
      const date = new Date(`${blogPublishedAt[post.slug] ?? "2025-01-01"}T09:00:00+03:00`).toUTCString();
      return `<item>
  <title>${escapeXml(post.title)}</title>
  <link>${url}</link>
  <guid isPermaLink="true">${url}</guid>
  <pubDate>${date}</pubDate>
  <category>${escapeXml(post.category)}</category>
  <description>${escapeXml(post.excerpt)}</description>
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Online Dershanem Blog</title>
  <link>${siteUrl}/blog</link>
  <description>LGS, TYT ve AYT matematik çalışma rehberleri ile online ders seçim içerikleri.</description>
  <language>tr-TR</language>
  <atom:link href="${siteUrl}/blog/rss.xml" rel="self" type="application/rss+xml" />
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

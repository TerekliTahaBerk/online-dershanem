"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import type { BlogPost } from "@/lib/blog-content";
import styles from "./blog.module.css";

export type BlogListPost = Pick<BlogPost, "slug" | "category" | "title" | "excerpt" | "cardSnippet" | "featured"> & {
  readingMinutes: number;
  date: string;
};

export function BlogIndex({ posts }: { posts: readonly BlogListPost[] }) {
  const [active, setActive] = useState("Tümü");
  const categories = ["Tümü", ...new Set(posts.map((post) => post.category))];
  const visible = active === "Tümü" ? posts : posts.filter((post) => post.category === active);
  const featured = visible.find((post) => post.featured) ?? visible[0];
  const rest = visible.filter((post) => post.slug !== featured?.slug);

  return (
    <section id="yazilar" className={`site-container ${styles.index}`} aria-label="Blog yazıları">
      <div className={styles.toolbar}>
        <div role="group" aria-label="Kategori filtresi" className={styles.filters}>
          {categories.map((category) => (
            <button key={category} type="button" onClick={() => setActive(category)} aria-pressed={active === category} aria-controls="blog-results">{category}</button>
          ))}
        </div>
        <p className={styles.count} role="status">{visible.length} yazı</p>
      </div>
      <div id="blog-results">
        {featured ? (
          <article className={styles.featured}>
            <div className={styles.featuredIntro}>
              <p className={styles.eyebrow}>ÖNE ÇIKAN YAZI <span aria-hidden="true">↗</span></p>
              <span className={styles.featuredCategory}>{featured.category}</span>
              <p className={styles.featuredMeta}>{featured.date}<span aria-hidden="true"> · </span>{featured.readingMinutes} dk okuma</p>
            </div>
            <div className={styles.featuredBody}>
              <h2><Link href={`/blog/${featured.slug}/`}>{featured.title}</Link></h2>
              <p>{featured.cardSnippet || featured.excerpt}</p>
              <span className={styles.readFeatured} aria-hidden="true">Yazıyı oku <ArrowRight size={18} /></span>
            </div>
          </article>
        ) : null}
        <div className={styles.articles}>
          {rest.map((post) => (
            <article key={post.slug} className={styles.card}>
              <div className={styles.cardMeta}><span>{post.category}</span><span>{post.readingMinutes} dk okuma</span></div>
              <h3><Link href={`/blog/${post.slug}/`}>{post.title}</Link></h3>
              <p>{post.cardSnippet || post.excerpt}</p>
              <div className={styles.cardFooter}><span>{post.date}</span><ArrowUpRight size={22} aria-hidden="true" /></div>
            </article>
          ))}
        </div>
        {!featured ? <p className={styles.empty}>Bu kategoride henüz yazı yok. Başka bir kategoriyi deneyebilirsin.</p> : null}
      </div>
    </section>
  );
}

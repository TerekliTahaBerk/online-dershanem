import assert from "node:assert/strict";
import test from "node:test";
import { blogPosts } from "@/lib/blog-content";
import { blogPublishedAt, blogReviewedAt } from "@/lib/blog-meta";
import { articleProduct, productReading } from "./editorial-links";

test("existing educational articles have a single relevant product destination", () => {
  assert.equal(articleProduct("matematik-deneme-analizi").key, "deneme-ligi");
  assert.equal(articleProduct("deneme-analizi-nasil-yapilir").key, "deneme-ligi");
  assert.equal(articleProduct("lgs-matematik-calisma-programi").key, "yon-kocluk");
  assert.equal(articleProduct("online-ozel-ders-mi-dershane-mi").key, "online-dershanem");
  for (const post of blogPosts) assert.ok(articleProduct(post.slug).href.startsWith("/urunler/"));
});

test("product reading links resolve to existing distinct articles", () => {
  for (const product of ["online-dershanem", "yon-kocluk", "deneme-ligi"] as const) {
    const links = productReading(product);
    assert.equal(links.length, 3);
    assert.equal(new Set(links.map(link => link.href)).size, 3);
    for (const link of links) assert.ok(blogPosts.some(post => link.href === `/blog/${post.slug}`));
  }
});

test("price guide keeps its URL and publication date while disclosing current offer terms", () => {
  const post = blogPosts.find(post => post.slug === "online-dershane-fiyatlari-2026")!;
  assert.equal(blogPublishedAt[post.slug], "2026-02-26");
  assert.equal(blogReviewedAt[post.slug], "2026-10-26");
  const text = JSON.stringify(post);
  for (const term of ["₺2.000", "₺4.000", "1.500 TL", "2.000 TL", "yalnızca ilk ay", "kesin kayıt"]) assert.ok(text.includes(term), term);
  assert.equal(new Set(blogPosts.map(post => post.slug)).size, blogPosts.length);
});

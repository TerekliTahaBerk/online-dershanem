import assert from "node:assert/strict";
import test from "node:test";
import { blogPosts } from "./blog-content";
import { blogPublishedAt } from "./blog-meta";

test("blog slugs and metadata are complete and unique", () => {
  const slugs = blogPosts.map((post) => post.slug);
  assert.equal(new Set(slugs).size, slugs.length);

  for (const post of blogPosts) {
    assert.match(post.slug, /^[a-z0-9-]+$/);
    assert.ok(blogPublishedAt[post.slug], `${post.slug} için yayın tarihi eksik`);
    assert.ok(post.metaDescription.length >= 100, `${post.slug} açıklaması çok kısa`);
    assert.ok(post.metaDescription.length <= 170, `${post.slug} açıklaması çok uzun`);
    assert.ok(post.sections.length >= 3, `${post.slug} yeterince kapsamlı değil`);
  }
});

test("related blog links always resolve", () => {
  const slugs = new Set(blogPosts.map((post) => post.slug));
  for (const post of blogPosts) {
    for (const relatedSlug of post.relatedSlugs) {
      assert.ok(slugs.has(relatedSlug), `${post.slug} bilinmeyen yazıya bağlanıyor: ${relatedSlug}`);
      assert.notEqual(relatedSlug, post.slug);
    }
  }
});

test("blog dates are not in the future", () => {
  const today = "2026-07-13";
  for (const post of blogPosts) {
    assert.ok(blogPublishedAt[post.slug] <= today, `${post.slug} gelecekte yayınlanmış görünüyor`);
  }
});

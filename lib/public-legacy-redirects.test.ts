import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import { publicLegacyRedirects } from "./public-legacy-redirects";
import { visiblePublicProducts } from "./public-marketing-products";
import { footerColumnsForProducts } from "./site-content";
import { getPublicFaqCategories } from "./public-faq";

const aliases = new Set(publicLegacyRedirects.map((route) => route.source));

test("legacy aliases are permanent, unique and resolve without a redirect chain", () => {
  assert.equal(aliases.size, publicLegacyRedirects.length);
  for (const route of publicLegacyRedirects) {
    assert.equal(route.permanent, true);
    assert.equal(aliases.has(route.destination), false);
    assert.ok(existsSync(`app${route.destination}/page.tsx`));
  }
  assert.ok(readFileSync("next.config.ts", "utf8").includes("...publicLegacyRedirects"));
});

test("duplicate marketing pages and their metadata are removed", () => {
  for (const source of aliases) {
    assert.equal(existsSync(`app${source}/page.tsx`), false, source);
  }
  assert.ok(existsSync("app/odk-paketleri/[slug]/page.tsx"));
  assert.ok(existsSync("app/odk-paketleri/[slug]/satin-al/page.tsx"));
});

test("footer discovery follows the registry and avoids legacy aliases", () => {
  for (const codes of [["OD", "OK", "ODK"], ["OD"], []]) {
    const products = visiblePublicProducts(codes);
    const columns = footerColumnsForProducts(products);
    const links = columns.flatMap((column) => column.links);
    assert.equal(links.some((link) => aliases.has(link.href)), false);
    assert.equal(links.some((link) => link.href === "/urunler/kpss"), false);
    for (const product of visiblePublicProducts(["OD", "OK", "ODK"])) {
      assert.equal(links.some((link) => link.href === product.href), codes.includes(product.registryCode));
    }
  }
});

test("FAQ reflects multiple products and the Dino feature flag", () => {
  for (const enabled of [false, true]) {
    const categories = getPublicFaqCategories(enabled);
    const answers = categories.flatMap((category) => category.items).map((item) => item.a).join(" ");
    assert.match(answers, /Yön Koçluk/);
    assert.match(answers, /Deneme Ligi/);
    assert.doesNotMatch(answers, /Evet.*odak matematik|Birebir özel ders değildir/);
    assert.match(answers, enabled ? /sınırlı pilotta/ : /henüz yayında değil/);
  }
});

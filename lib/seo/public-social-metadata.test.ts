import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OgTemplate } from "./og-template";
import { publicLegacyRedirects } from "../public-legacy-redirects";

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(file) : [file];
  });
}

test("social metadata belongs to a page or a parent segment with live descendants", () => {
  const files = filesUnder("app");
  const images = files.filter((file) => /(?:opengraph|twitter)-image\.(?:tsx?|jsx?|png|jpg|jpeg|gif)$/.test(file));
  assert.ok(images.length > 0);
  for (const file of images) {
    const directory = path.dirname(file);
    assert.ok(files.some((candidate) => candidate.startsWith(`${directory}/`) && /\/page\.(?:tsx?|jsx?)$/.test(candidate)), file);
  }
  for (const alias of publicLegacyRedirects) {
    const hasLiveChildren = files.some((file) => file.startsWith(`app${alias.source}/`) && /\/page\.(?:tsx?|jsx?)$/.test(file));
    if (!hasLiveChildren) assert.equal(existsSync(`app${alias.source}/opengraph-image.tsx`), false, alias.source);
  }
  // Parent ODK image is intentionally shared by the working package children.
  assert.ok(existsSync("app/odk-paketleri/[slug]/page.tsx"));
  assert.match(readFileSync("app/odk-paketleri/[slug]/page.tsx", "utf8"), /imagePath: "\/odk-paketleri\/opengraph-image"/);
});

test("shared social image footer reflects the platform rather than a math-only company", () => {
  const html = renderToStaticMarkup(createElement(OgTemplate, { title: "Paketini Oluştur", variant: "package" }));
  assert.match(html, /Öğren · Planla · Ölç/);
  assert.doesNotMatch(html, /LGS · YKS · Matematik/);
});

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

// Yamalı bağımlılık kopyalarının (vendor/npm) gerçekten kullanıldığını ve
// açığı kapattığını doğrular. Ayrıntı: docs/known-dependency-risks.md
const require = createRequire(import.meta.url);

test("sprintf-js: aşırı hassasiyet RangeError fırlatmaz (GHSA-hp3w-g68c-fv3c)", () => {
  const { sprintf } = require("sprintf-js") as { sprintf: (format: string, ...args: unknown[]) => string };
  assert.equal(require("sprintf-js/package.json").version, "1.1.4-od.1");
  assert.doesNotThrow(() => sprintf("%.500f %.500e %.500g", 1.5, 1.5, 1.5));
  assert.equal(sprintf("%.2f %s %05.1f", 3.14159, "a", 2.25), "3.14 a 002.3");
});

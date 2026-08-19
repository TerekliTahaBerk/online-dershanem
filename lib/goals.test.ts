import assert from "node:assert/strict";
import test from "node:test";

import { goalProgress, netScore } from "./goals";

test("hedefe ulaşıldıysa band 'met' ve çubuk tam dolar", () => {
  assert.deepEqual(goalProgress(25, 25), { percent: 100, band: "met" });
  // Hedefi aşmak çubuğu taşırmaz.
  assert.deepEqual(goalProgress(31, 25), { percent: 100, band: "met" });
});

test("tasarımın kendi örnekleri doğru bantlara düşer", () => {
  // 19/25 = %76 → tasarımda kehribar
  assert.deepEqual(goalProgress(19, 25), { percent: 76, band: "behind" });
  // 30,75/32 = %96 → tasarımda yeşil
  assert.deepEqual(goalProgress(30.75, 32), { percent: 96, band: "close" });
  // 78/90 = %87 → tasarımda yeşil
  assert.deepEqual(goalProgress(78, 90), { percent: 87, band: "close" });
});

test("sıfır veya negatif hedef ilerleme üretmez", () => {
  assert.deepEqual(goalProgress(10, 0), { percent: 0, band: "behind" });
});

test("negatif şu anki değer çubuğu ters çevirmez", () => {
  assert.deepEqual(goalProgress(-3, 25), { percent: 0, band: "behind" });
});

test("net = doğru − yanlış/4", () => {
  assert.equal(netScore(20, 4), 19);
  assert.equal(netScore(0, 0), 0);
  assert.equal(netScore(33, 9), 30.75);
});

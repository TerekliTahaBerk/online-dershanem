import assert from "node:assert/strict";
import test from "node:test";
import { bookletSrc, shouldFollowPage } from "./runner-booklet";

test("kitapçık adresi sayfa parçası taşır; sayfa yoksa yalnız görüntüleyici ayarları", () => {
  assert.equal(bookletSrc("/b", 7), "/b#toolbar=1&navpanes=0&page=7");
  assert.equal(bookletSrc("/b", null), "/b#toolbar=1&navpanes=0");
  assert.equal(bookletSrc("/b", 0), "/b#toolbar=1&navpanes=0");
  assert.equal(bookletSrc("/b", 7, 2), "/b#toolbar=1&navpanes=0&page=7&odk=2");
});

test("yalnız hedef sayfa değişince gezinilir (öğrencinin kendi kaydırması korunur)", () => {
  assert.equal(shouldFollowPage(null, 3), true);
  assert.equal(shouldFollowPage(3, 3), false);
  assert.equal(shouldFollowPage(3, 4), true);
  assert.equal(shouldFollowPage(3, null), false);
});

test("kalan süre uyarısı: eşik geçilince bir kez, geç açılışta yalnız geçerli eşik", async () => {
  const { timeWarningToAnnounce } = await import("./runner-booklet");
  assert.equal(timeWarningToAnnounce(11 * 60_000, new Set()), null);
  assert.equal(timeWarningToAnnounce(10 * 60_000, new Set()), 10);
  assert.equal(timeWarningToAnnounce(9 * 60_000, new Set([10])), null);
  assert.equal(timeWarningToAnnounce(4.5 * 60_000, new Set([10])), 5);
  assert.equal(timeWarningToAnnounce(3 * 60_000, new Set()), 5);
  assert.equal(timeWarningToAnnounce(30_000, new Set([10, 5])), 1);
  assert.equal(timeWarningToAnnounce(0, new Set()), null);
});

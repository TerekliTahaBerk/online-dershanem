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

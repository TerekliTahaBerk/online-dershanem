import assert from "node:assert/strict";
import test from "node:test";

import { pilotProgramForProduct } from "./product-pilot";

test("her legacy ürünün pilot programı açıkça tanımlı (OK, OD pilotunu kullanır)", () => {
  assert.equal(pilotProgramForProduct("OD"), "od");
  assert.equal(pilotProgramForProduct("OK"), "od");
  assert.equal(pilotProgramForProduct("ODK"), "odk");
});

test("KPSS eskiden sessizce OD pilotuna düşerdi; artık gürültülü hata verir", () => {
  assert.throws(() => pilotProgramForProduct("KPSS"), /UNSUPPORTED_PILOT_PRODUCT:KPSS/);
  assert.throws(() => pilotProgramForProduct("hasOwnProperty"), /UNSUPPORTED_PILOT_PRODUCT/);
});

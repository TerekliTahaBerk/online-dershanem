import assert from "node:assert/strict";
import test from "node:test";

import {
  decideProductContentPermission,
  productContentPermissionKey,
  type ProductContentDecisionInput,
} from "./content-permission-matrix";

const base: ProductContentDecisionInput = {
  platformRole: "TEACHER",
  isActiveUser: true,
  productCode: "KPSS",
  action: "content:write",
  assignments: [],
};

test("izin anahtarı ürün önekiyle adlandırılır", () => {
  assert.equal(productContentPermissionKey("KPSS", "content:write"), "kpss:content:write");
});

test("OD öğretmeni (ataması yok) KPSS içeriği yazamaz", () => {
  assert.equal(decideProductContentPermission(base), false);
});

test("KPSS içerik editörü KPSS içeriği okuyup yazabilir", () => {
  const assignments = [{ productCode: "KPSS", role: "CONTENT_EDITOR" as const }];
  assert.equal(decideProductContentPermission({ ...base, assignments }), true);
  assert.equal(decideProductContentPermission({ ...base, assignments, action: "content:read" }), true);
});

test("KPSS içerik editörü OD/OK/ODK içeriği yazamaz — legacy atama da yetki açmaz", () => {
  const assignments = [
    { productCode: "KPSS", role: "CONTENT_EDITOR" as const },
    { productCode: "OD", role: "CONTENT_EDITOR" as const },
  ];
  for (const productCode of ["OD", "OK", "ODK"]) {
    assert.equal(decideProductContentPermission({ ...base, assignments, productCode }), false, productCode);
  }
});

test("başka registry ürününün ataması KPSS'ye taşmaz", () => {
  const assignments = [{ productCode: "ALES", role: "CONTENT_EDITOR" as const }];
  assert.equal(decideProductContentPermission({ ...base, assignments }), false);
});

test("öğrenci, veli ve pasif kullanıcı atamayla bile yazamaz; ADMIN platform içerik sahibidir", () => {
  const assignments = [{ productCode: "KPSS", role: "CONTENT_EDITOR" as const }];
  assert.equal(decideProductContentPermission({ ...base, assignments, platformRole: "STUDENT" }), false);
  assert.equal(decideProductContentPermission({ ...base, assignments, platformRole: "PARENT" }), false);
  assert.equal(decideProductContentPermission({ ...base, assignments, isActiveUser: false }), false);
  assert.equal(decideProductContentPermission({ ...base, platformRole: "ADMIN" }), true);
  assert.equal(decideProductContentPermission({ ...base, platformRole: "ADMIN", isActiveUser: false }), false);
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  STAFF_PERMISSIONS,
  STAFF_ROLE_NAMES,
  decideStaffPermission,
  hasOdkStaffWorkspace,
  hasPrivilegedStaffRole,
  isValidStaffAssignment,
  resolveOdkStaffHome,
  staffPermissionsFor,
  staffProductsFor,
  type StaffAssignmentRef,
} from "./staff-permission-matrix";

const as = (...items: Array<[string, StaffAssignmentRef["role"]]>): StaffAssignmentRef[] =>
  items.map(([productCode, role]) => ({ productCode, role }));

test("ADMIN satırsız da her izne sahiptir (break-glass)", () => {
  for (const permission of STAFF_PERMISSIONS) {
    assert.equal(decideStaffPermission({ platformRole: "ADMIN", isActiveUser: true, permission, assignments: [] }), true, permission);
  }
  assert.equal(decideStaffPermission({ platformRole: "ADMIN", isActiveUser: false, permission: "odk:result:release", assignments: [] }), false, "pasif admin");
});

test("öğrenci ve veli hiçbir personel iznine sahip olamaz", () => {
  for (const platformRole of ["STUDENT", "PARENT"] as const) {
    for (const permission of STAFF_PERMISSIONS) {
      assert.equal(decideStaffPermission({ platformRole, isActiveUser: true, permission, assignments: as(["ODK", "EXAM_EDITOR"], ["OK", "COACH"]) }), false);
    }
  }
});

test("OD öğretmeni Yön veya Deneme Ligi izni almaz", () => {
  const perms = staffPermissionsFor(as(["OD", "TEACHER"]));
  assert.ok(perms.has("od:lesson:teach"));
  assert.ok(![...perms].some((permission) => permission.startsWith("ok:") || permission.startsWith("odk:")));
});

test("rol yalnız kendi ürününde geçerlidir", () => {
  assert.equal(isValidStaffAssignment("OD", "COACH"), false);
  assert.equal(isValidStaffAssignment("OK", "EXAM_EDITOR"), false);
  assert.equal(isValidStaffAssignment("KPSS", "TEACHER"), false);
  assert.equal(staffPermissionsFor(as(["OD", "EXAM_EDITOR"])).size, 0);
  assert.equal(isValidStaffAssignment("ODK", "PRODUCT_MANAGER"), true);
});

test("Deneme Ligi rolleri birbirinden ayrıdır", () => {
  const editor = staffPermissionsFor(as(["ODK", "EXAM_EDITOR"]));
  assert.ok(editor.has("odk:exam:edit"));
  assert.ok(!editor.has("odk:result:release"));
  assert.ok(!editor.has("odk:ops:live"));
  const publisher = staffPermissionsFor(as(["ODK", "RESULT_PUBLISHER"]));
  assert.ok(publisher.has("odk:result:release") && publisher.has("odk:key:revise"));
  assert.ok(!publisher.has("odk:exam:edit"));
  const viewer = staffPermissionsFor(as(["ODK", "REPORT_VIEWER"]));
  assert.deepEqual([...viewer], ["odk:report:read_related"]);
});

test("ürün çalışma alanları yalnız geçerli atamalardan gelir", () => {
  assert.deepEqual(staffProductsFor(as(["OD", "TEACHER"], ["ODK", "REPORT_VIEWER"])), ["OD", "ODK"]);
  assert.deepEqual(staffProductsFor(as(["OD", "COACH"])), []);
  assert.deepEqual(staffProductsFor([]), []);
});

test("MFA zorunlu roller: Deneme Ligi'nde değişiklik yapabilenler", () => {
  assert.equal(hasPrivilegedStaffRole(as(["OD", "TEACHER"], ["OK", "COACH"], ["ODK", "REPORT_VIEWER"])), false);
  for (const role of ["EXAM_EDITOR", "EXAM_OPERATOR", "RESULT_PUBLISHER"] as const) {
    assert.equal(hasPrivilegedStaffRole(as(["ODK", role])), true, role);
  }
  assert.equal(hasPrivilegedStaffRole(as(["OK", "PRODUCT_MANAGER"])), true);
});

test("Deneme Ligi personel girişi izinlerden çözülür", () => {
  const home = (...items: Array<[string, StaffAssignmentRef["role"]]>) =>
    resolveOdkStaffHome({ isAdmin: false, permissions: staffPermissionsFor(as(...items)) });
  assert.equal(resolveOdkStaffHome({ isAdmin: true, permissions: new Set() }), "/panel/odk/yonetim");
  assert.equal(home(["ODK", "REPORT_VIEWER"]), "/panel/odk/ogretmen/raporlar");
  assert.equal(home(["ODK", "EXAM_EDITOR"]), "/panel/odk/yonetim/sinavlar");
  assert.equal(home(["ODK", "EXAM_OPERATOR"]), "/panel/odk/yonetim/operasyon");
  assert.equal(home(["ODK", "RESULT_PUBLISHER"]), "/panel/odk/yonetim/sonuclar");
  assert.equal(home(["ODK", "EXAM_EDITOR"], ["ODK", "EXAM_OPERATOR"]), "/panel/odk/yonetim");
  assert.equal(home(["ODK", "PRODUCT_MANAGER"]), "/panel/odk/yonetim/paketler");
  assert.equal(home(["OD", "TEACHER"]), null);
  assert.equal(home(["OK", "COACH"]), null);
  assert.equal(hasOdkStaffWorkspace(staffPermissionsFor(as(["ODK", "REPORT_VIEWER"]))), false);
  assert.equal(hasOdkStaffWorkspace(staffPermissionsFor(as(["ODK", "EXAM_EDITOR"]))), true);
});

test("her rol en az bir üründe en az bir izin açar", () => {
  for (const role of STAFF_ROLE_NAMES) {
    const total = ["OD", "OK", "ODK"].reduce((sum, product) => sum + staffPermissionsFor([{ productCode: product, role }]).size, 0);
    assert.ok(total > 0, role);
  }
});

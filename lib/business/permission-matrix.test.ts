import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ALL_BUSINESS_PERMISSIONS,
  BUSINESS_ROLE_PERMISSIONS,
  BUSINESS_WRITE_PERMISSIONS,
  roleHasPermission,
  type BusinessRoleName,
} from "./permission-matrix";

const ROLES: BusinessRoleName[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "SALES",
  "SUPPORT",
  "ACCOUNTING",
  "VIEWER",
];

test("SUPER_ADMIN tanımlı bütün izinlere sahiptir", () => {
  for (const permission of ALL_BUSINESS_PERMISSIONS) {
    assert.equal(roleHasPermission("SUPER_ADMIN", permission), true, permission);
  }
});

test("VIEWER hiçbir mutation iznine sahip değildir", () => {
  for (const permission of BUSINESS_WRITE_PERMISSIONS) {
    assert.equal(roleHasPermission("VIEWER", permission), false, permission);
  }
});

test("rol atama yalnız SUPER_ADMIN'e açıktır", () => {
  for (const role of ROLES) {
    assert.equal(roleHasPermission(role, "role:write"), role === "SUPER_ADMIN", role);
  }
});

test("ters kayıt yalnız SUPER_ADMIN ve ACCOUNTING'e açıktır", () => {
  for (const role of ROLES) {
    const expected = role === "SUPER_ADMIN" || role === "ACCOUNTING";
    assert.equal(roleHasPermission(role, "finance:reverse"), expected, role);
  }
});

test("SALES finans okuyamaz ve yazamaz", () => {
  assert.equal(roleHasPermission("SALES", "finance:read"), false);
  assert.equal(roleHasPermission("SALES", "finance:write"), false);
  assert.equal(roleHasPermission("SALES", "finance:reverse"), false);
});

test("SUPPORT aday aşamasını yazamaz, finansa dokunamaz", () => {
  assert.equal(roleHasPermission("SUPPORT", "lead:read"), true);
  assert.equal(roleHasPermission("SUPPORT", "lead:write"), false);
  assert.equal(roleHasPermission("SUPPORT", "finance:read"), false);
  assert.equal(roleHasPermission("SUPPORT", "finance:write"), false);
});

test("ACCOUNTING konuşma ve aday PII'sine erişemez", () => {
  assert.equal(roleHasPermission("ACCOUNTING", "conversation:read"), false);
  assert.equal(roleHasPermission("ACCOUNTING", "conversation:reply"), false);
  assert.equal(roleHasPermission("ACCOUNTING", "lead:read"), false);
  assert.equal(roleHasPermission("ACCOUNTING", "finance:write"), true);
});

test("ADMIN ters kayıt ve rol atama yapamaz", () => {
  assert.equal(roleHasPermission("ADMIN", "finance:write"), true);
  assert.equal(roleHasPermission("ADMIN", "finance:reverse"), false);
  assert.equal(roleHasPermission("ADMIN", "role:write"), false);
  assert.equal(roleHasPermission("ADMIN", "role:read"), true);
});

test("her rol dashboard:read ile panele girebilir", () => {
  for (const role of ROLES) {
    assert.equal(roleHasPermission(role, "dashboard:read"), true, role);
  }
});

test("matris yalnız tanımlı izin adlarını kullanır", () => {
  const known = new Set<string>(ALL_BUSINESS_PERMISSIONS);
  for (const role of ROLES) {
    for (const permission of BUSINESS_ROLE_PERMISSIONS[role]) {
      assert.equal(known.has(permission), true, `${role} → bilinmeyen izin ${permission}`);
    }
  }
});

test("write izni olan rol ilgili read iznine de sahiptir", () => {
  const pairs: Array<[string, string]> = [
    ["lead:write", "lead:read"],
    ["campaign:write", "campaign:read"],
    ["finance:write", "finance:read"],
    ["knowledge:write", "knowledge:read"],
    ["automation:write", "automation:read"],
    ["integration:write", "integration:read"],
    ["settings:write", "settings:read"],
  ];
  for (const role of ROLES) {
    for (const [write, read] of pairs) {
      if (roleHasPermission(role, write as never)) {
        assert.equal(roleHasPermission(role, read as never), true, `${role}: ${write} var ama ${read} yok`);
      }
    }
  }
});

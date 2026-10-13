import assert from "node:assert/strict";
import { test } from "node:test";
import { parseWorkspace, resolveWorkspaceScope, withWorkspace } from "./workspace-context";

test("shared management destinations keep distinct workspace URLs", () => {
  for (const path of ["/panel/yonetim", "/panel/yonetim/kisiler", "/panel/yonetim/isler", "/panel/yonetim/raporlar"]) {
    assert.equal(withWorkspace(path, "OK"), `${path}?calismaAlani=OK`);
    assert.notEqual(withWorkspace(path, "OK"), withWorkspace(path, "OD"));
  }
  assert.equal(withWorkspace("/panel/yonetim/kisiler?sekme=koclar&sayfa=2#liste", "OK"), "/panel/yonetim/kisiler?sekme=koclar&sayfa=2&calismaAlani=OK#liste");
  assert.equal(withWorkspace("/panel/yonetim?calismaAlani=OD", "OK"), "/panel/yonetim?calismaAlani=OK");
});

test("dedicated workspaces and external links keep their own destinations", () => {
  for (const path of ["/panel/odk/yonetim/operasyon", "/panel/yonetim/isletme/genel-bakis", "/giris", "https://example.com/panel/yonetim"]) {
    assert.equal(withWorkspace(path, "OK"), path);
  }
  assert.equal(withWorkspace("/panel/yonetim", null), "/panel/yonetim");
});

test("shared pages retain Yön and Deneme Ligi instead of defaulting to OD", () => {
  for (const selected of ["OK", "ODK"] as const) {
    assert.equal(resolveWorkspaceScope({ role: "ADMIN", products: ["OD", "OK", "ODK"], selected }), selected);
  }
  assert.equal(resolveWorkspaceScope({ role: "ADMIN", products: ["OD", "OK"], requested: "OK", selected: "OD" }), "OK");
  assert.equal(resolveWorkspaceScope({ role: "ADMIN", products: ["OD", "OK", "ODK"], product: "ODK", requested: "OK", selected: "OK" }), "ODK");
});

test("workspace hints never expand a non-admin's product access", () => {
  assert.equal(resolveWorkspaceScope({ role: "TEACHER", products: ["OD"], requested: "OK", selected: "ODK" }), "OD");
  assert.equal(resolveWorkspaceScope({ role: "STUDENT", products: [], requested: "OK" }), null);
  assert.equal(parseWorkspace("BUSINESS"), null);
  assert.equal(parseWorkspace("OK"), "OK");
});

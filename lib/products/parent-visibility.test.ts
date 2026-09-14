import assert from "node:assert/strict";
import test from "node:test";

import { isParentVisibleProduct, isStudentParentVisible, parentVisibleProducts } from "./parent-visibility";

test("K-12 ürünleri veliye açık, KPSS ve bilinmeyen registry ürünleri kapalı", () => {
  for (const code of ["OD", "OK", "ODK"]) assert.equal(isParentVisibleProduct(code), true, code);
  for (const code of ["KPSS", "ALES", "constructor"]) assert.equal(isParentVisibleProduct(code), false, code);
});

test("yalnızca KPSS üyeliği olan öğrenci veli akışlarından çıkarılır", () => {
  assert.equal(isStudentParentVisible(["KPSS"]), false);
});

test("KPSS + OD öğrencisi veliye yalnız OD bağlamında görünür", () => {
  assert.equal(isStudentParentVisible(["OD", "KPSS"]), true);
  assert.deepEqual(parentVisibleProducts(["OD", "KPSS"]), ["OD"]);
});

test("aktif ürünü olmayan öğrencide mevcut davranış korunur", () => {
  assert.equal(isStudentParentVisible([]), true);
  assert.deepEqual(parentVisibleProducts([]), []);
});

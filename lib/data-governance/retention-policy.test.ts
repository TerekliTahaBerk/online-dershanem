import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";

import {
  PENDING_LEGAL_APPROVAL,
  RETENTION_POLICY,
  prismaDelegateName,
  summarizeRetentionPolicy,
  validateRetentionCategory,
  type RetentionCategory,
} from "./retention-policy";

const base: RetentionCategory = {
  category: "test",
  description: "test",
  enforcement: "RETENTION_ENGINE",
  targets: [{ model: "Notification", dateField: "createdAt" }],
  retentionDays: PENDING_LEGAL_APPROVAL,
  childData: false,
};

test("hukuki onay gelene kadar hiçbir kategori sayısal süre taşımaz", () => {
  // Bu test bilerek kırılır: süre girilen PR, onay kaydıyla birlikte bu listeyi güncellemeli.
  const numeric = RETENTION_POLICY.filter((category) => category.retentionDays !== PENDING_LEGAL_APPROVAL);
  assert.deepEqual(numeric.map((category) => category.category), []);
});

test("politikadaki her kategori geçerli ve kategori adları tekil", () => {
  for (const category of RETENTION_POLICY) assert.deepEqual(validateRetentionCategory(category), [], category.category);
  assert.equal(new Set(RETENTION_POLICY.map((category) => category.category)).size, RETENTION_POLICY.length);
});

test("hedef model, tarih ve blob alanları şemada gerçekten var", () => {
  const models = new Map(Prisma.dmmf.datamodel.models.map((model) => [model.name, model]));
  for (const category of RETENTION_POLICY) {
    for (const target of category.targets) {
      const model = models.get(target.model);
      assert.ok(model, `${category.category}: ${target.model} yok`);
      const field = (name: string) => model.fields.find((item) => item.name === name);
      assert.equal(field(target.dateField)?.type, "DateTime", `${target.model}.${target.dateField}`);
      assert.ok(field("id"), `${target.model}.id`);
      if (target.blobField) assert.equal(field(target.blobField)?.type, "String");
      for (const key of Object.keys(target.where ?? {})) assert.ok(field(key), `${target.model}.${key}`);
    }
  }
});

test("sayısal süre onaylayan ve onay tarihi olmadan geçersiz", () => {
  assert.ok(validateRetentionCategory({ ...base, retentionDays: 365 }).length >= 2);
  assert.ok(validateRetentionCategory({ ...base, retentionDays: 365, approvedBy: "Hukuk", approvedAt: "01.10.2026" }).length === 1);
  assert.deepEqual(validateRetentionCategory({ ...base, retentionDays: 365, approvedBy: "Hukuk", approvedAt: "2026-10-01" }), []);
  assert.ok(validateRetentionCategory({ ...base, retentionDays: 0, approvedBy: "Hukuk", approvedAt: "2026-10-01" }).length === 1);
  assert.ok(validateRetentionCategory({ ...base, retentionDays: 1.5, approvedBy: "Hukuk", approvedAt: "2026-10-01" }).length === 1);
  assert.ok(validateRetentionCategory({ ...base, targets: [] }).length === 1);
});

test("özet onaylı ve bekleyen kategorileri ayırır", () => {
  const summary = summarizeRetentionPolicy([
    base,
    { ...base, category: "approved", retentionDays: 30, approvedBy: "Hukuk", approvedAt: "2026-10-01" },
    { ...base, category: "outside", enforcement: "LEGAL_HOLD", targets: [] },
  ]);
  assert.deepEqual(summary, { totalCategories: 3, engineCategories: 2, approvedEngineCategories: 1, pendingEngineCategories: 1, outsideEngineCategories: 1 });
  assert.equal(prismaDelegateName("AuditLog"), "auditLog");
});

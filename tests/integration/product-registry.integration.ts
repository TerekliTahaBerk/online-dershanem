import assert from "node:assert/strict";

import {
  getExamFamilyByCode,
  getProductByCode,
  LEGACY_CURRICULUM_EXAM_CODES,
  LEGACY_ODK_EXAM_FAMILY_CODES,
  listActiveExamFamilies,
  listActiveProducts,
} from "../../lib/products/registry";
import { createIntegrationPrismaClient, integration } from "./integration-utils";

const db = createIntegrationPrismaClient();

integration("KPSS ürün ve sınav ailesi veri kaydıyla eklenip registry adapter'ından okunur", async () => {
  const product = await db.product.upsert({
    where: { code: "KPSS" },
    update: { name: "KPSS", targetAudience: "adult", isActive: true },
    create: { code: "KPSS", name: "KPSS", targetAudience: "adult" },
  });
  await db.examFamily.upsert({
    where: { code: "KPSS_EGITIM_BILIMLERI" },
    update: { name: "KPSS Eğitim Bilimleri", productId: product.id, isActive: true },
    create: {
      code: "KPSS_EGITIM_BILIMLERI",
      name: "KPSS Eğitim Bilimleri",
      productId: product.id,
    },
  });

  const [storedProduct, storedFamily, activeProducts] = await Promise.all([
    getProductByCode("KPSS"),
    getExamFamilyByCode("KPSS_EGITIM_BILIMLERI"),
    listActiveProducts(),
  ]);

  assert.equal(storedProduct.targetAudience, "adult");
  assert.equal(storedFamily.productId, storedProduct.id);
  assert.ok(activeProducts.some((item) => item.code === "KPSS"));
});

integration("legacy UI allowlist'leri KPSS'yi kullanıcıya açmadan tablodan okunur", async () => {
  const [curriculumFamilies, odkFamilies] = await Promise.all([
    listActiveExamFamilies({ codes: LEGACY_CURRICULUM_EXAM_CODES }),
    listActiveExamFamilies({ productCode: "ODK", codes: LEGACY_ODK_EXAM_FAMILY_CODES }),
  ]);

  assert.deepEqual(
    new Set(curriculumFamilies.map((item) => item.code)),
    new Set(LEGACY_CURRICULUM_EXAM_CODES),
  );
  assert.deepEqual(
    new Set(odkFamilies.map((item) => item.code)),
    new Set(LEGACY_ODK_EXAM_FAMILY_CODES),
  );
  assert.ok(!curriculumFamilies.some((item) => item.code.startsWith("KPSS")));
  assert.ok(!odkFamilies.some((item) => item.code.startsWith("KPSS")));
});

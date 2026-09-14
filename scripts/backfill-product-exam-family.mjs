import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const products = [
  { code: "OD", name: "Online Dershanem", targetAudience: "k12" },
  { code: "OK", name: "Online Koçum", targetAudience: "k12" },
  { code: "ODK", name: "Online Deneme Kulübü", targetAudience: "k12" },
];

const examFamilies = [
  { code: "LGS", name: "LGS", productCode: "ODK" },
  { code: "TYT", name: "TYT", productCode: "ODK" },
  { code: "AYT", name: "AYT", productCode: "ODK" },
  { code: "YDT", name: "YDT", productCode: "OD" },
];

async function main() {
  for (const product of products) {
    await prisma.product.upsert({
      where: { code: product.code },
      update: { name: product.name, targetAudience: product.targetAudience, isActive: true },
      create: product,
    });
  }

  for (const family of examFamilies) {
    const product = await prisma.product.findUniqueOrThrow({ where: { code: family.productCode } });
    await prisma.examFamily.upsert({
      where: { code: family.code },
      update: { name: family.name, productId: product.id, isActive: true },
      create: { code: family.code, name: family.name, productId: product.id },
    });
  }

  const bridgeStatements = [
    `UPDATE "business_units" source SET "product_ref_id" = registry."id" FROM "products" registry WHERE registry."code" = source."product"::text AND source."product_ref_id" IS DISTINCT FROM registry."id"`,
    `UPDATE "product_memberships" source SET "product_ref_id" = registry."id" FROM "products" registry WHERE registry."code" = source."product"::text AND source."product_ref_id" IS DISTINCT FROM registry."id"`,
    `UPDATE "student_progress_evidence" source SET "product_ref_id" = registry."id" FROM "products" registry WHERE registry."code" = source."product_code"::text AND source."product_ref_id" IS DISTINCT FROM registry."id"`,
    `UPDATE "commerce_order_lines" source SET "product_ref_id" = registry."id" FROM "products" registry WHERE registry."code" = source."product"::text AND source."product_ref_id" IS DISTINCT FROM registry."id"`,
    `UPDATE "curriculum_versions" source SET "exam_family_ref_id" = registry."id" FROM "exam_families" registry WHERE registry."code" = source."exam"::text AND source."exam_family_ref_id" IS DISTINCT FROM registry."id"`,
    `UPDATE "mock_exams" source SET "exam_family_ref_id" = registry."id" FROM "exam_families" registry WHERE registry."code" = source."exam"::text AND source."exam_family_ref_id" IS DISTINCT FROM registry."id"`,
    `UPDATE "odk_exam_series" source SET "exam_family_ref_id" = registry."id" FROM "exam_families" registry WHERE registry."code" = source."family"::text AND source."exam_family_ref_id" IS DISTINCT FROM registry."id"`,
    `UPDATE "odk_exams" source SET "exam_family_ref_id" = registry."id" FROM "exam_families" registry WHERE registry."code" = source."family"::text AND source."exam_family_ref_id" IS DISTINCT FROM registry."id"`,
  ];
  for (const statement of bridgeStatements) {
    await prisma.$executeRawUnsafe(statement);
  }

  const [productCount, examFamilyCount, inconsistencies] = await Promise.all([
    prisma.product.count({ where: { code: { in: products.map((item) => item.code) } } }),
    prisma.examFamily.count({ where: { code: { in: examFamilies.map((item) => item.code) } } }),
    prisma.$queryRawUnsafe(`
      SELECT source_name, COUNT(*)::int AS count
      FROM (
        SELECT 'business_units' AS source_name FROM "business_units" s LEFT JOIN "products" r ON r."id" = s."product_ref_id" WHERE r."code" IS DISTINCT FROM s."product"::text
        UNION ALL SELECT 'product_memberships' FROM "product_memberships" s LEFT JOIN "products" r ON r."id" = s."product_ref_id" WHERE r."code" IS DISTINCT FROM s."product"::text
        UNION ALL SELECT 'student_progress_evidence' FROM "student_progress_evidence" s LEFT JOIN "products" r ON r."id" = s."product_ref_id" WHERE r."code" IS DISTINCT FROM s."product_code"::text
        UNION ALL SELECT 'commerce_order_lines' FROM "commerce_order_lines" s LEFT JOIN "products" r ON r."id" = s."product_ref_id" WHERE r."code" IS DISTINCT FROM s."product"::text
        UNION ALL SELECT 'curriculum_versions' FROM "curriculum_versions" s LEFT JOIN "exam_families" r ON r."id" = s."exam_family_ref_id" WHERE r."code" IS DISTINCT FROM s."exam"::text
        UNION ALL SELECT 'mock_exams' FROM "mock_exams" s LEFT JOIN "exam_families" r ON r."id" = s."exam_family_ref_id" WHERE r."code" IS DISTINCT FROM s."exam"::text
        UNION ALL SELECT 'odk_exam_series' FROM "odk_exam_series" s LEFT JOIN "exam_families" r ON r."id" = s."exam_family_ref_id" WHERE r."code" IS DISTINCT FROM s."family"::text
        UNION ALL SELECT 'odk_exams' FROM "odk_exams" s LEFT JOIN "exam_families" r ON r."id" = s."exam_family_ref_id" WHERE r."code" IS DISTINCT FROM s."family"::text
      ) mismatches
      GROUP BY source_name
      ORDER BY source_name;
    `),
  ]);

  if (inconsistencies.length) {
    throw new Error(`Registry bridge tutarsızlığı: ${JSON.stringify(inconsistencies)}`);
  }

  console.log(JSON.stringify({ productCount, examFamilyCount, inconsistencies: 0 }));
}

main().finally(() => prisma.$disconnect());

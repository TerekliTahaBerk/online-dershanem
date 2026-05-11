/**
 * Permission seed — `lib/rbac/matrix.ts` içindeki PERMISSION_KEYS'i
 * Permission tablosuna upsert eder, sonra defaultRolePermissions'tan
 * RolePermission satırlarını idempotent şekilde yazar.
 *
 * Çalıştırma:
 *   node --loader tsx prisma/seeds/permissions.ts
 *   veya
 *   npx tsx prisma/seeds/permissions.ts
 */

import "dotenv/config";
import { normalizePrismaEnv } from "../../lib/prisma-env";
normalizePrismaEnv();

import { PrismaClient } from "@prisma/client";
import {
  PERMISSION_KEYS,
  defaultRolePermissions,
  permissionCategory,
  type PermissionKey
} from "../../lib/rbac/matrix";

const prisma = new PrismaClient();

async function main() {
  console.log("[seed:permissions] upserting", PERMISSION_KEYS.length, "permissions…");

  const upserts = await Promise.all(
    PERMISSION_KEYS.map((key) =>
      // @ts-ignore — model exists post-migration
      prisma.permission.upsert({
        where: { key },
        create: { key, category: permissionCategory(key) },
        update: { category: permissionCategory(key) }
      })
    )
  );

  const byKey = new Map(upserts.map((p: any) => [p.key as PermissionKey, p.id as string]));

  for (const [role, keys] of Object.entries(defaultRolePermissions)) {
    console.log(`[seed:permissions] upserting role=${role} → ${keys.length} permissions`);
    for (const key of keys) {
      const permissionId = byKey.get(key);
      if (!permissionId) continue;
      // @ts-ignore — model exists post-migration
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role: role as any, permissionId } },
        create: { role: role as any, permissionId },
        update: {}
      });
    }
  }

  console.log("[seed:permissions] ✓ done");
}

main()
  .catch((e) => {
    console.error("[seed:permissions] failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

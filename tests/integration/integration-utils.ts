import { PrismaClient } from "@prisma/client";
import test from "node:test";

import { prisma } from "@/lib/prisma";
import { normalizePrismaEnv } from "@/lib/prisma-env";

export const integrationEnabled = Boolean(process.env.DATABASE_URL);

export const integration = (name: string, fn: () => void | Promise<void>) =>
  test(name, { skip: !integrationEnabled }, fn);

export function createIntegrationPrismaClient() {
  const { databaseUrl, directUrl } = normalizePrismaEnv(process.env);
  const configuredUrl = directUrl ?? databaseUrl;
  if (!configuredUrl) return new PrismaClient();

  if (!configuredUrl.startsWith("postgres")) {
    return new PrismaClient({ datasourceUrl: configuredUrl });
  }

  const parsed = new URL(configuredUrl);
  parsed.searchParams.set("connection_limit", "1");
  return new PrismaClient({ datasourceUrl: parsed.toString() });
}

export async function assertIntegrationSchemaReady(client = prisma) {
  const requiredTables = ["teacher_home_snapshots", "background_jobs", "student_profiles", "RateLimitEntry"];
  const rows = await client.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY(${requiredTables}::text[])
  `;
  if (rows.length !== requiredTables.length) {
    const missing = requiredTables.filter((table) => !rows.some((row) => row.table_name === table));
    throw new Error(`Integration database is not migrated. Missing tables: ${missing.join(", ")}`);
  }
}

/**
 * CI/Vercel migrate deploy with preview-only recovery for foreign failed migrations.
 *
 * Shared preview databases can be left in P3009 by another feature branch's
 * failed migration (e.g. concurrent 0093_*). Production never auto-recovers.
 */
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function runPrisma(args) {
  execFileSync("npx", ["prisma", ...args], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
}

function localMigrationNames() {
  return new Set(
    readdirSync(join(root, "prisma/migrations"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
  );
}

function allowsPreviewRecovery() {
  return (
    process.env.VERCEL_ENV === "preview" ||
    process.env.ALLOW_PREVIEW_MIGRATE_RECOVERY === "true"
  );
}

async function listForeignFailedMigrations() {
  const local = localMigrationNames();
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRaw`
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE finished_at IS NULL
        AND rolled_back_at IS NULL
      ORDER BY started_at ASC
    `;
    return rows
      .map((row) => row.migration_name)
      .filter((name) => typeof name === "string" && !local.has(name));
  } finally {
    await prisma.$disconnect();
  }
}

function deploy() {
  runPrisma(["migrate", "deploy"]);
}

async function main() {
  try {
    deploy();
    return;
  } catch (firstError) {
    if (!allowsPreviewRecovery()) {
      throw firstError;
    }
  }

  const foreignFailed = await listForeignFailedMigrations();
  if (!foreignFailed.length) {
    console.error(
      "prisma migrate deploy failed; no foreign failed migrations available for preview recovery.",
    );
    process.exit(1);
  }

  console.warn(
    JSON.stringify({
      event: "prisma.preview_migrate_recovery",
      action: "resolve_rolled_back",
      migrations: foreignFailed,
      vercelEnv: process.env.VERCEL_ENV ?? null,
    }),
  );

  for (const migrationName of foreignFailed) {
    runPrisma(["migrate", "resolve", "--rolled-back", migrationName]);
  }

  deploy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

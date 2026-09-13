import { PrismaClient } from "@prisma/client";
import { cliLog } from "./lib/cli-logger.mjs";

const expectedIndexes = [
  "weekly_plan_tasks_one_per_assignment_ref",
  "weekly_plan_tasks_one_per_suggestion_ref",
];

const prisma = new PrismaClient();

try {
  const indexes = await prisma.$queryRaw`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'weekly_plan_tasks_one_per_assignment_ref',
        'weekly_plan_tasks_one_per_suggestion_ref'
      )
  `;

  const byName = new Map(indexes.map((index) => [index.indexname, index.indexdef]));
  const missing = expectedIndexes.filter((name) => !byName.has(name));
  if (missing.length) {
    throw new Error(`Fresh DB integrity doğrulaması başarısız; eksik indeksler: ${missing.join(", ")}`);
  }

  for (const name of expectedIndexes) {
    const definition = byName.get(name);
    if (!/CREATE UNIQUE INDEX/i.test(definition) || !/\sWHERE\s/i.test(definition)) {
      throw new Error(`${name} mevcut fakat unique partial index değil: ${definition}`);
    }
  }

  cliLog.info(`Fresh DB integrity doğrulandı: ${expectedIndexes.join(", ")}`);
} finally {
  await prisma.$disconnect();
}

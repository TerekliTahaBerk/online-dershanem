const runtimeDatabaseCandidates = [
  "DATABASE_URL",
  "STORAGE_DATABASE_URL",
  "STORAGE_PRISMA_DATABASE_URL",
  "STORAGE_POSTGRES_URL",
] as const;

const directDatabaseCandidates = [
  "DIRECT_URL",
  "STORAGE_PRISMA_DATABASE_URL",
  "STORAGE_POSTGRES_URL",
  "STORAGE_DATABASE_URL",
] as const;

function firstDefined(keys: readonly string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }

  return undefined;
}

export function normalizePrismaEnv() {
  const databaseUrl = firstDefined(runtimeDatabaseCandidates);
  const directUrl = firstDefined(directDatabaseCandidates);

  if (!process.env.DATABASE_URL && databaseUrl) {
    process.env.DATABASE_URL = databaseUrl;
  }

  if (!process.env.DIRECT_URL && directUrl) {
    process.env.DIRECT_URL = directUrl;
  }

  return {
    databaseUrl: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  };
}

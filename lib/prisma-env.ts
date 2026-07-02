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
  // CI/release environments sometimes expose only DATABASE_URL. Prisma still
  // requires directUrl to resolve while parsing the schema, so use the runtime
  // URL as the final fallback. Production should continue to provide
  // DIRECT_URL when DATABASE_URL points at a transaction pooler.
  "DATABASE_URL",
] as const;

type PrismaEnv = Record<string, string | undefined>;

function firstDefined(keys: readonly string[], env: PrismaEnv) {
  for (const key of keys) {
    const value = env[key];
    if (value) return value;
  }

  return undefined;
}

export function normalizePrismaEnv(env: PrismaEnv = process.env) {
  const databaseUrl = firstDefined(runtimeDatabaseCandidates, env);
  const directUrl = firstDefined(directDatabaseCandidates, env);

  if (!env.DATABASE_URL && databaseUrl) {
    env.DATABASE_URL = databaseUrl;
  }

  if (!env.DIRECT_URL && directUrl) {
    env.DIRECT_URL = directUrl;
  }

  return {
    databaseUrl: env.DATABASE_URL,
    directUrl: env.DIRECT_URL,
  };
}

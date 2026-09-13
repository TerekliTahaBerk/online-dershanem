import "dotenv/config";
import { defineConfig } from "prisma/config";
import { normalizePrismaEnv } from "./lib/prisma-env";

normalizePrismaEnv();

export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.mjs",
  },
});

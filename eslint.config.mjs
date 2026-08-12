import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "warn",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "mobile-app/**",
    "scripts/**",
    "tests/**",
    "prisma/migrations/**",
    "prisma/seed.mjs",
    "prisma/seed-e2e.ts",
    "prisma/backfill-access-tags.mjs",
    "PayTR IFrame API/**",
    "next-env.d.ts",
    "tsconfig.tsbuildinfo",
  ]),
]);

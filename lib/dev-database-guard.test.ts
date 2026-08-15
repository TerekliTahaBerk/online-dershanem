import assert from "node:assert/strict";
import test from "node:test";

import { checkDevDatabase, isLocalDatabaseUrl } from "./dev-database-guard";

const LOCAL = "postgresql://berk@localhost:5432/oddev?schema=public";
const ACCELERATE = "prisma+postgres://accelerate.prisma-data.net/?api_key=xxx";
const REMOTE = "postgres://user:pass@db.prisma.io:5432/main";

test("yerel adresler tanınır", () => {
  for (const url of [
    LOCAL,
    "postgresql://127.0.0.1:5432/db",
    "postgres://user@localhost/db",
    "postgresql:///oddev?host=/tmp",
    "postgresql://user@host.docker.internal:5432/db",
  ]) {
    assert.equal(isLocalDatabaseUrl(url), true, url);
  }
});

test("uzak adresler yerel sayılmaz", () => {
  for (const url of [ACCELERATE, REMOTE, "postgres://user@10.0.0.4:5432/db"]) {
    assert.equal(isLocalDatabaseUrl(url), false, url);
  }
});

test("development'ta uzak DATABASE_URL engellenir", () => {
  const verdict = checkDevDatabase({ NODE_ENV: "development", DATABASE_URL: ACCELERATE });
  assert.equal(verdict.ok, false);
});

test("development'ta uzak DIRECT_URL de engellenir", () => {
  // Yerelde Prisma DIRECT_URL'i tercih ediyor; sadece DATABASE_URL'e bakmak yetmez.
  const verdict = checkDevDatabase({
    NODE_ENV: "development",
    DATABASE_URL: LOCAL,
    DIRECT_URL: REMOTE,
  });
  assert.equal(verdict.ok, false);
});

test("yerel kurulum serbest", () => {
  const verdict = checkDevDatabase({
    NODE_ENV: "development",
    DATABASE_URL: LOCAL,
    DIRECT_URL: LOCAL,
  });
  assert.equal(verdict.ok, true);
});

test("açık onayla uzak veritabanı kullanılabilir", () => {
  const verdict = checkDevDatabase({
    NODE_ENV: "development",
    DATABASE_URL: ACCELERATE,
    ALLOW_REMOTE_DB_IN_DEV: "true",
  });
  assert.equal(verdict.ok, true);
});

test("production ve test çalıştırmaları etkilenmez", () => {
  assert.equal(checkDevDatabase({ NODE_ENV: "production", DATABASE_URL: ACCELERATE }).ok, true);
  assert.equal(checkDevDatabase({ NODE_ENV: "test", DATABASE_URL: REMOTE }).ok, true);
});

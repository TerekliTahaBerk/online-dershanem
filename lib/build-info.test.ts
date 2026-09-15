import assert from "node:assert/strict";
import test from "node:test";
import { formatBuildStamp, resolveBuildInfo } from "./build-info";

const FULL_SHA = "0123456789abcdef0123456789abcdef01234567";

test("Vercel production build'inde commit ve ortam çözülür", () => {
  const info = resolveBuildInfo({
    VERCEL: "1",
    VERCEL_ENV: "production",
    VERCEL_GIT_COMMIT_SHA: FULL_SHA,
    VERCEL_GIT_COMMIT_REF: "main",
    VERCEL_DEPLOYMENT_ID: "dpl_123",
    npm_package_version: "0.1.1",
  });
  assert.equal(info.commitSha, FULL_SHA);
  assert.equal(info.commitShort, "0123456");
  assert.equal(info.commitRef, "main");
  assert.equal(info.environment, "production");
  assert.equal(info.channel, "vercel");
  assert.equal(info.deploymentId, "dpl_123");
  assert.equal(info.version, "0.1.1");
});

test("container build'i APP_BUILD_* değerlerini kullanır ve Vercel'i geçer", () => {
  const info = resolveBuildInfo({
    NODE_ENV: "production",
    APP_BUILD_SHA: FULL_SHA.toUpperCase(),
    APP_BUILD_REF: "main",
    APP_BUILD_VERSION: "0.1.1",
    APP_BUILD_RELEASE: "v0.1.1",
    APP_BUILD_TIME: "2026-09-15T10:00:00Z",
    VERCEL_GIT_COMMIT_SHA: "ffffffffffffffffffffffffffffffffffffffff",
  });
  assert.equal(info.commitSha, FULL_SHA, "APP_BUILD_SHA önceliklidir");
  assert.equal(info.channel, "container");
  assert.equal(info.releaseTag, "v0.1.1");
  assert.equal(info.builtAt, "2026-09-15T10:00:00.000Z");
  assert.equal(info.environment, "production");
});

test("geçersiz SHA ve zaman damgası sessizce null'a düşer", () => {
  const info = resolveBuildInfo({ APP_BUILD_SHA: "not-a-sha", APP_BUILD_TIME: "dün" });
  assert.equal(info.commitSha, null);
  assert.equal(info.commitShort, null);
  assert.equal(info.builtAt, null);
});

test("branch adı release tag'i sayılmaz", () => {
  const onBranch = resolveBuildInfo({ VERCEL_GIT_COMMIT_REF: "main" });
  assert.equal(onBranch.releaseTag, null);
  const onTag = resolveBuildInfo({ GITHUB_REF_NAME: "v2.3.4" });
  assert.equal(onTag.releaseTag, "v2.3.4");
});

test("bilinmeyen build yerel kabul edilir ve damga sürümle yetinir", () => {
  const info = resolveBuildInfo({});
  assert.equal(info.channel, "local");
  assert.equal(info.environment, "development");
  assert.equal(info.version, "0.0.0");
  assert.equal(formatBuildStamp(info), "v0.0.0");
});

test("damga sürüm ve kısa SHA'yı birlikte gösterir", () => {
  const info = resolveBuildInfo({ APP_BUILD_VERSION: "0.1.1", APP_BUILD_SHA: FULL_SHA });
  assert.equal(formatBuildStamp(info), "v0.1.1 · 0123456");
});

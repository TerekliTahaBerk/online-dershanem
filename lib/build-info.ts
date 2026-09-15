/**
 * Çalışan sürümün kimliği — tek kaynak.
 *
 * "Production'da hangi commit var?" sorusunun tek bir tahmin içermeyen cevabı
 * olmalı. Deploy edilen artefakt bu bilgiyi kendisi taşır; `main`'in ucuyla
 * karşılaştırmak `scripts/check-production-version.mjs`'in işidir.
 *
 * Değerler üç kanaldan gelir ve hepsi aynı yere düşer:
 *  - Vercel: `VERCEL_GIT_COMMIT_SHA` / `VERCEL_GIT_COMMIT_REF` sistem değişkenleri.
 *  - Docker: `Dockerfile`'ın `BUILD_*` argümanları `APP_BUILD_*` ENV'ine yazılır.
 *  - CI/yerel: `GITHUB_SHA` / `npm_package_version`.
 *
 * Saf fonksiyon: `process.env`'i parametre alır, böylece test edilebilir ve
 * `next.config.ts` build sırasında aynı mantığı kullanır.
 */

export type DeploymentChannel = "vercel" | "container" | "ci" | "local";

export type BuildInfo = {
  /** `package.json` sürümü — release tag'i ile eşleşmesi beklenir. */
  version: string;
  /** Tam 40 karakterlik commit SHA; bilinmiyorsa `null`. */
  commitSha: string | null;
  /** İnsan gözüyle karşılaştırmak için ilk 7 karakter. */
  commitShort: string | null;
  /** Build'in alındığı branch/tag adı. */
  commitRef: string | null;
  /** Yayınlanmış release tag'i (`v0.1.1`); yalnız tag build'lerinde dolar. */
  releaseTag: string | null;
  /** Artefaktın üretildiği an (ISO 8601). */
  builtAt: string | null;
  /** `production` | `preview` | `development`. */
  environment: string;
  /** Artefaktı hangi boru hattının ürettiği. */
  channel: DeploymentChannel;
  /** Vercel deployment kimliği — rollback hedefini adlandırmak için. */
  deploymentId: string | null;
};

type Env = NodeJS.ProcessEnv | Record<string, string | undefined>;

const SHA_PATTERN = /^[0-9a-f]{7,40}$/i;

function read(env: Env, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value) return value;
  }
  return null;
}

function normalizeSha(raw: string | null): string | null {
  if (!raw) return null;
  return SHA_PATTERN.test(raw) ? raw.toLowerCase() : null;
}

function normalizeTimestamp(raw: string | null): string | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

/** Release tag'i her zaman `v` ile başlar; branch adını tag sanmayalım. */
function normalizeReleaseTag(raw: string | null): string | null {
  if (!raw) return null;
  return /^v\d+\.\d+\.\d+/.test(raw) ? raw : null;
}

function resolveEnvironment(env: Env): string {
  if (env.VERCEL_ENV === "production") return "production";
  if (env.VERCEL_ENV === "preview") return "preview";
  return env.NODE_ENV === "production" ? "production" : "development";
}

function resolveChannel(env: Env): DeploymentChannel {
  if (env.VERCEL === "1" || env.VERCEL_ENV) return "vercel";
  if (read(env, "APP_BUILD_SHA", "APP_BUILD_VERSION")) return "container";
  if (env.GITHUB_ACTIONS === "true") return "ci";
  return "local";
}

export function resolveBuildInfo(env: Env = process.env): BuildInfo {
  const commitSha = normalizeSha(
    read(env, "APP_BUILD_SHA", "VERCEL_GIT_COMMIT_SHA", "GITHUB_SHA"),
  );
  const commitRef = read(env, "APP_BUILD_REF", "VERCEL_GIT_COMMIT_REF", "GITHUB_REF_NAME");
  return {
    version: read(env, "APP_BUILD_VERSION", "npm_package_version") ?? "0.0.0",
    commitSha,
    commitShort: commitSha ? commitSha.slice(0, 7) : null,
    commitRef,
    releaseTag: normalizeReleaseTag(read(env, "APP_BUILD_RELEASE") ?? commitRef),
    builtAt: normalizeTimestamp(read(env, "APP_BUILD_TIME")),
    environment: resolveEnvironment(env),
    channel: resolveChannel(env),
    deploymentId: read(env, "VERCEL_DEPLOYMENT_ID"),
  };
}

/** İnsan tarafından okunan tek satırlık damga: `v0.1.1 · a1b2c3d`. */
export function formatBuildStamp(info: BuildInfo): string {
  return info.commitShort ? `v${info.version} · ${info.commitShort}` : `v${info.version}`;
}

/**
 * `next.config.ts`'in `env` bloğu bu değerleri build sırasında metinsel olarak
 * gömer — fakat yalnız `process.env.X` biçiminde DÜZ yazılmış referansları.
 * `resolveBuildInfo` dinamik anahtarla okuduğu için gömülen değerleri burada
 * statik olarak toplayıp runtime `process.env`'in üzerine yazıyoruz. Vercel
 * fonksiyonlarında `npm_package_version` yoktur; damganın sürüm kısmı ancak bu
 * sayede doğru çıkar.
 */
function bakedEnv(): Record<string, string | undefined> {
  return {
    APP_BUILD_SHA: process.env.APP_BUILD_SHA,
    APP_BUILD_REF: process.env.APP_BUILD_REF,
    APP_BUILD_VERSION: process.env.APP_BUILD_VERSION,
    APP_BUILD_RELEASE: process.env.APP_BUILD_RELEASE,
    APP_BUILD_TIME: process.env.APP_BUILD_TIME,
  };
}

/**
 * Modül yüklendiğinde bir kez çözülür. Değerler process ömrü boyunca sabittir;
 * her istekte yeniden okumak yanıltıcı olurdu (aynı artefakt, aynı sürüm).
 */
export const buildInfo: BuildInfo = resolveBuildInfo({
  ...process.env,
  ...Object.fromEntries(Object.entries(bakedEnv()).filter(([, value]) => Boolean(value))),
});

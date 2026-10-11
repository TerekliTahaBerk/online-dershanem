/**
 * MOBİL SÖZLEŞME — YÖNETİM (ADMIN), Faz 1.
 *
 * YETKİ (sunucuda; burada belgelenir):
 *  - Her yönetim ucu `requireAdminApi` kapısından geçer: gerçek ADMIN oturumu
 *    (önizleme / öğretmen modu overlay'i yönetim yetkisi DOĞURMAZ). Hassas
 *    yazmalar ayrıca taze step-up ister (428 `STEP_UP_REQUIRED`).
 *  - Mobilde bir düğmenin görünmesi yetki değildir; sunucu her istekte yeniden
 *    karar verir.
 *  - `webPath` YALNIZ `/panel/...` web yoludur; mobil onu yetkili menüdeki
 *    native ekrana eşler (`mapAdminWebPath`). Keyfi URL taşınmaz.
 *
 * Bağımlılıksız; yalnız bu dizindeki dosyalardan göreli içe aktarma.
 */

import type { ContractResult } from "./bootstrap";
import { check, ContractError, v, type Infer, type Validator } from "./validate";

export const MOBILE_ADMIN_CONTRACT_VERSION = 1 as const;

const version = v.literal(MOBILE_ADMIN_CONTRACT_VERSION);

/** `/panel/...` web yolu (sorgu dizesi / parça yok); panel dışı / bozuk yol reddedilir. */
const webPath: Validator<string> = (input, path) => {
  const value = v.nonEmpty()(input, path);
  if (!/^\/panel(\/[\w\-./]*)?$/.test(value) || value.includes("..")) throw new ContractError(`${path}: panel yolu bekleniyordu`);
  return value;
};

/* ================================================================== *
 * OPERASYON MERKEZİ — `GET /api/panel/admin/operations-center?grup=`
 * Web `app/panel/yonetim` ile AYNI `getAdminOperationsCenterSnapshot`.
 * ================================================================== */

export const OPS_SEVERITIES = ["BLOCKING", "ACTION_REQUIRED", "WATCH"] as const;
export const OPS_GROUPS = ["OD", "YON", "DL", "COMMERCE", "SECURITY", "SYSTEM"] as const;
export const OPS_GROUP_FILTER_IDS = ["tumu", ...OPS_GROUPS] as const;
export type MobileOpsGroupFilter = (typeof OPS_GROUP_FILTER_IDS)[number];
export const OPS_TILE_TONES = ["neutral", "warning", "critical", "success"] as const;
export const OPS_HEALTH = ["ok", "degraded", "down", "unknown"] as const;

const opsAction = v.object({
  id: v.nonEmpty(),
  code: v.nonEmpty(),
  group: v.oneOf(OPS_GROUPS),
  severity: v.oneOf(OPS_SEVERITIES),
  title: v.string(),
  subject: v.string(),
  ageLabel: v.string(),
  owner: v.nullable(v.string()),
  ctaLabel: v.string(),
  createdAt: v.nullable(v.iso()),
  webPath: v.nullable(webPath),
});

const operationsCenter = v.object({
  contractVersion: version,
  generatedAt: v.iso(),
  partialData: v.boolean(),
  group: v.oneOf(OPS_GROUP_FILTER_IDS),
  groups: v.array(v.object({ id: v.oneOf(OPS_GROUP_FILTER_IDS), label: v.string(), count: v.int(0) })),
  openActionCount: v.int(0),
  blockingCount: v.int(0),
  actions: v.array(opsAction),
  summary: v.array(
    v.object({
      id: v.nonEmpty(),
      label: v.string(),
      value: v.nullable(v.int(0)),
      hint: v.string(),
      tone: v.oneOf(OPS_TILE_TONES),
      available: v.boolean(),
      webPath: v.nullable(webPath),
    }),
  ),
  risk: v.object({ critical: v.int(0), watch: v.int(0), normal: v.int(0), total: v.int(0) }),
  health: v.array(v.object({ id: v.nonEmpty(), label: v.string(), status: v.oneOf(OPS_HEALTH), detail: v.string() })),
  activities: v.array(v.object({ id: v.nonEmpty(), text: v.string(), actorLabel: v.string(), occurredAt: v.iso(), webPath: v.nullable(webPath) })),
});
export type MobileOperationsCenter = Infer<typeof operationsCenter>;
export type MobileOpsAction = MobileOperationsCenter["actions"][number];
export function parseOperationsCenter(input: unknown): ContractResult<MobileOperationsCenter> {
  return check(operationsCenter, input);
}

/* ================================================================== *
 * GLOBAL ARAMA — `GET /api/panel/admin-search?q=` (mevcut uç; web komut
 * paleti ile aynı yanıt). İzin filtresi sunucuda (`runGlobalSearch`).
 * ================================================================== */

export const GLOBAL_SEARCH_KINDS = ["STUDENT", "PARENT", "TEACHER", "USER", "GROUP", "LESSON", "ORDER", "LEAD", "EXAM", "COMMAND"] as const;
export type MobileGlobalSearchKind = (typeof GLOBAL_SEARCH_KINDS)[number];

const searchResult = v.object({
  kind: v.oneOf(GLOBAL_SEARCH_KINDS),
  id: v.nonEmpty(),
  label: v.string(),
  detail: v.string(),
  href: v.string(),
});
const globalSearch = v.object({
  query: v.string(),
  commands: v.array(searchResult),
  results: v.array(searchResult),
});
export type MobileGlobalSearch = Infer<typeof globalSearch>;
export type MobileGlobalSearchResult = MobileGlobalSearch["results"][number];
export function parseGlobalSearch(input: unknown): ContractResult<MobileGlobalSearch> {
  return check(globalSearch, input);
}

/* ================================================================== *
 * STEP-UP — `POST /api/auth/mfa/code/verify` (`purpose: "STEP_UP"`).
 * `stepUpExpiresAt` eklemeli alandır; eski sunucuda yoksa null.
 * ================================================================== */

const stepUpResult = v.object({ verified: v.literal(true), stepUpExpiresAt: v.optional(v.nullable(v.iso()), null) });
export type MobileStepUpResult = Infer<typeof stepUpResult>;
export function parseStepUpResult(input: unknown): ContractResult<MobileStepUpResult> {
  return check(stepUpResult, input);
}

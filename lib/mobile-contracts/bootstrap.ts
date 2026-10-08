/**
 * MOBİL SÖZLEŞME — `GET /api/panel/me` (bootstrap).
 *
 * Bu dizin (`lib/mobile-contracts/`) hem Next.js sunucusu hem Expo mobil
 * uygulaması tarafından import edilir. KURAL: buradaki dosyalar HİÇBİR modül
 * import etmez (Prisma, `server-only`, zod, Node API'leri dahil) —
 * `scripts/check-mobile-contracts.mjs` CI'da bunu doğrular. Tipler kadar
 * çalışma zamanı doğrulayıcıları da burada yaşar: TypeScript uyumu, gerçek
 * JSON'un beklentiye uyduğunun kanıtı değildir.
 *
 * Tarihler daima ISO-8601 UTC dizgisidir (`Date#toISOString`).
 * Sözleşme yalnız EKLEMELİ değişir (docs/mobile/m1-api-contracts.md).
 */

export const MOBILE_BOOTSTRAP_CONTRACT_VERSION = 1 as const;

export const MOBILE_PRODUCT_CODES = ["OD", "OK", "ODK"] as const;
export type MobileProductCode = (typeof MOBILE_PRODUCT_CODES)[number];

export const MOBILE_ROLES = ["ADMIN", "TEACHER", "STUDENT", "PARENT"] as const;
export type MobileRole = (typeof MOBILE_ROLES)[number];

export const MOBILE_PRODUCT_STATES = ["ACTIVE", "PILOT_CLOSED", "PREPARING", "LOCKED"] as const;
export type MobileProductState = (typeof MOBILE_PRODUCT_STATES)[number];

export const MOBILE_GATE_STATUSES = ["PASSWORD_CHANGE_REQUIRED", "MFA_REQUIRED", "READY"] as const;
export type MobileGateStatus = (typeof MOBILE_GATE_STATUSES)[number];

export type MobileNavItem = {
  /** Kararlı kimlik (`lib/panel/navigation.ts`). Mobil rota eşlemesi bununla yapılır. */
  id: string;
  label: string;
  /** Web yolu — YALNIZ eşleme/hata ayıklama içindir; native rota değildir. */
  webPath: string;
};

export type MobileNavSection = { id: string; title: string; items: MobileNavItem[] };

export type MobileMfaMethods = {
  /** Hesapta en az bir ikinci faktör kayıtlı mı? Değilse kayıt web'de yapılır. */
  enrolled: boolean;
  totp: boolean;
  recoveryCodes: boolean;
  passkey: boolean;
};

export type MobileBootstrapGates = {
  status: MobileGateStatus;
  passwordChangeRequired: boolean;
  mfaRequired: boolean;
  /** Yalnız `MFA_REQUIRED` iken dolu; aksi halde null. */
  mfa: MobileMfaMethods | null;
  /** Admin önizleme veya öğretmen modu açık — mobil desteklemez. */
  previewActive: boolean;
};

export type MobileWorkspaceProduct = { code: MobileProductCode; label: string; state: MobileProductState };

export type MobileWorkspace = {
  products: MobileWorkspaceProduct[];
  /** Sunucunun doğruladığı etkin çalışma alanı (yalnız ACTIVE ürün olabilir). */
  activeProduct: MobileProductCode | null;
  /** Birden çok ACTIVE ürün var ve etkin seçim yok. */
  selectionRequired: boolean;
  navigation: { primary: MobileNavItem[]; sections: MobileNavSection[] };
  /** `PanelFeatureFlags` — anahtar adları sunucuyla aynı. */
  flags: Record<string, boolean>;
  capabilities: { staffPermissions: string[] };
  parent: { children: { studentId: string; name: string }[] } | null;
  unreadNotifications: number;
};

export type MobileBootstrap = {
  contractVersion: typeof MOBILE_BOOTSTRAP_CONTRACT_VERSION;
  serverTime: string;
  user: { id: string; fullName: string | null; email: string; role: MobileRole };
  gates: MobileBootstrapGates;
  client: { minSupportedVersion: string | null };
  /** Kapılar `READY` değilken DAİMA null — ürün, navigasyon, yetenek verisi yok. */
  workspace: MobileWorkspace | null;
};

/* ------------------------------------------------------------------ *
 * Çalışma zamanı doğrulayıcı (bağımlılıksız)
 * ------------------------------------------------------------------ */

export type ContractResult<T> = { ok: true; value: T } | { ok: false; error: string };

type Path = string;

class ContractError extends Error {}

function fail(path: Path, expected: string): never {
  throw new ContractError(`${path}: ${expected} bekleniyordu`);
}

function obj(value: unknown, path: Path): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(path, "nesne");
  return value as Record<string, unknown>;
}

function str(value: unknown, path: Path): string {
  if (typeof value !== "string") fail(path, "metin");
  return value;
}

function nullableStr(value: unknown, path: Path): string | null {
  return value === null ? null : str(value, path);
}

function bool(value: unknown, path: Path): boolean {
  if (typeof value !== "boolean") fail(path, "boolean");
  return value;
}

function int(value: unknown, path: Path): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) fail(path, "negatif olmayan tam sayı");
  return value;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], path: Path): T {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) fail(path, allowed.join(" | "));
  return value as T;
}

function arr<T>(value: unknown, path: Path, item: (entry: unknown, path: Path) => T): T[] {
  if (!Array.isArray(value)) fail(path, "dizi");
  return value.map((entry, index) => item(entry, `${path}[${index}]`));
}

function isoDate(value: unknown, path: Path): string {
  const text = str(value, path);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(text) || Number.isNaN(Date.parse(text))) fail(path, "ISO-8601 UTC tarih");
  return text;
}

function navItem(value: unknown, path: Path): MobileNavItem {
  const o = obj(value, path);
  return { id: str(o.id, `${path}.id`), label: str(o.label, `${path}.label`), webPath: str(o.webPath, `${path}.webPath`) };
}

function navSection(value: unknown, path: Path): MobileNavSection {
  const o = obj(value, path);
  return { id: str(o.id, `${path}.id`), title: str(o.title, `${path}.title`), items: arr(o.items, `${path}.items`, navItem) };
}

function gates(value: unknown, path: Path): MobileBootstrapGates {
  const o = obj(value, path);
  const status = oneOf(o.status, MOBILE_GATE_STATUSES, `${path}.status`);
  const passwordChangeRequired = bool(o.passwordChangeRequired, `${path}.passwordChangeRequired`);
  const mfaRequired = bool(o.mfaRequired, `${path}.mfaRequired`);
  const mfa = o.mfa === null ? null : (() => {
    const m = obj(o.mfa, `${path}.mfa`);
    return {
      enrolled: bool(m.enrolled, `${path}.mfa.enrolled`),
      totp: bool(m.totp, `${path}.mfa.totp`),
      recoveryCodes: bool(m.recoveryCodes, `${path}.mfa.recoveryCodes`),
      passkey: bool(m.passkey, `${path}.mfa.passkey`),
    };
  })();
  // İç tutarlılık: durum, bayraklarla çelişemez. Çelişen yanıt "açık kapı"
  // gibi yorumlanmasın diye reddedilir.
  const expected: MobileGateStatus = passwordChangeRequired ? "PASSWORD_CHANGE_REQUIRED" : mfaRequired ? "MFA_REQUIRED" : "READY";
  if (status !== expected) fail(`${path}.status`, expected);
  return { status, passwordChangeRequired, mfaRequired, mfa, previewActive: bool(o.previewActive, `${path}.previewActive`) };
}

function workspace(value: unknown, path: Path): MobileWorkspace {
  const o = obj(value, path);
  const flagsObject = obj(o.flags, `${path}.flags`);
  const flags: Record<string, boolean> = {};
  for (const [key, flag] of Object.entries(flagsObject)) flags[key] = bool(flag, `${path}.flags.${key}`);
  const navigation = obj(o.navigation, `${path}.navigation`);
  const capabilities = obj(o.capabilities, `${path}.capabilities`);
  const parent = o.parent === null ? null : (() => {
    const p = obj(o.parent, `${path}.parent`);
    return {
      children: arr(p.children, `${path}.parent.children`, (entry, entryPath) => {
        const c = obj(entry, entryPath);
        return { studentId: str(c.studentId, `${entryPath}.studentId`), name: str(c.name, `${entryPath}.name`) };
      }),
    };
  })();
  const products = arr(o.products, `${path}.products`, (entry, entryPath) => {
    const p = obj(entry, entryPath);
    return {
      code: oneOf(p.code, MOBILE_PRODUCT_CODES, `${entryPath}.code`),
      label: str(p.label, `${entryPath}.label`),
      state: oneOf(p.state, MOBILE_PRODUCT_STATES, `${entryPath}.state`),
    };
  });
  const activeProduct = o.activeProduct === null ? null : oneOf(o.activeProduct, MOBILE_PRODUCT_CODES, `${path}.activeProduct`);
  return {
    products,
    activeProduct,
    selectionRequired: bool(o.selectionRequired, `${path}.selectionRequired`),
    navigation: {
      primary: arr(navigation.primary, `${path}.navigation.primary`, navItem),
      sections: arr(navigation.sections, `${path}.navigation.sections`, navSection),
    },
    flags,
    capabilities: { staffPermissions: arr(capabilities.staffPermissions, `${path}.capabilities.staffPermissions`, str) },
    parent,
    unreadNotifications: int(o.unreadNotifications, `${path}.unreadNotifications`),
  };
}

/** Bootstrap yanıtını doğrular. Bilinmeyen EK alanlar yok sayılır (eklemeli sözleşme). */
export function parseMobileBootstrap(input: unknown): ContractResult<MobileBootstrap> {
  try {
    const o = obj(input, "$");
    if (o.contractVersion !== MOBILE_BOOTSTRAP_CONTRACT_VERSION) fail("$.contractVersion", String(MOBILE_BOOTSTRAP_CONTRACT_VERSION));
    const user = obj(o.user, "$.user");
    const client = obj(o.client, "$.client");
    const parsedGates = gates(o.gates, "$.gates");
    const parsedWorkspace = o.workspace === null ? null : workspace(o.workspace, "$.workspace");
    // Güvenlik değişmezi: kapılar açık değilken çalışma alanı verisi OLAMAZ.
    if (parsedGates.status !== "READY" && parsedWorkspace !== null) fail("$.workspace", "kapılar açık değilken null");
    return {
      ok: true,
      value: {
        contractVersion: MOBILE_BOOTSTRAP_CONTRACT_VERSION,
        serverTime: isoDate(o.serverTime, "$.serverTime"),
        user: {
          id: str(user.id, "$.user.id"),
          fullName: nullableStr(user.fullName, "$.user.fullName"),
          email: str(user.email, "$.user.email"),
          role: oneOf(user.role, MOBILE_ROLES, "$.user.role"),
        },
        gates: parsedGates,
        client: { minSupportedVersion: nullableStr(client.minSupportedVersion, "$.client.minSupportedVersion") },
        workspace: parsedWorkspace,
      },
    };
  } catch (error) {
    if (error instanceof ContractError) return { ok: false, error: error.message };
    throw error;
  }
}

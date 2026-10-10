/**
 * Mobil bootstrap — SAF projeksiyon (veritabanı / `server-only` yok).
 *
 * İş kuralları (ürün erişimi, pilot, personel izni, navigasyon, flag)
 * BURADA HESAPLANMAZ; `bootstrap-server.ts` mevcut alan servislerini çağırır
 * ve sonuçları buraya verir. Bu dosya yalnız şunlara karar verir:
 *   - kapı durumu (parola → MFA → hazır) ve
 *   - kapılar açık değilken HİÇBİR çalışma alanı verisinin yanıta girmemesi.
 */
import {
  MOBILE_BOOTSTRAP_CONTRACT_VERSION,
  type MobileBootstrap,
  type MobileBootstrapGates,
  type MobileMfaMethods,
  type MobileNavItem,
  type MobileNavSection,
  type MobileProductCode,
  type MobileProductState,
  type MobileRole,
  type MobileWorkspace,
} from "@/lib/mobile-contracts/bootstrap";

export type BootstrapIdentity = {
  userId: string;
  email: string;
  fullName: string | null;
  role: MobileRole;
  mustChangePassword: boolean;
  mfaVerifiedAt: Date | null;
};

/**
 * Kapı sırası sunucu politikasıyla aynıdır (`postAuthenticationPath`,
 * `requireApiAuthorizedRole`): önce geçici parola, sonra giriş MFA'sı.
 * `mfaRequired` girdisi `userRequiresLoginMfa` sonucudur — burada politika
 * icat edilmez.
 */
export function bootstrapGates(input: {
  mustChangePassword: boolean;
  mfaVerifiedAt: Date | null;
  loginMfaRequired: boolean;
  mfaMethods: MobileMfaMethods | null;
  previewActive: boolean;
}): MobileBootstrapGates {
  const passwordChangeRequired = input.mustChangePassword;
  const mfaRequired = !input.mfaVerifiedAt && input.loginMfaRequired;
  const status = passwordChangeRequired ? "PASSWORD_CHANGE_REQUIRED" : mfaRequired ? "MFA_REQUIRED" : "READY";
  return {
    status,
    passwordChangeRequired,
    mfaRequired,
    mfa: status === "MFA_REQUIRED" ? input.mfaMethods : null,
    previewActive: input.previewActive,
  };
}

/**
 * Etkin çalışma alanı: oturumdaki seçim, YALNIZ kullanıcının `ACTIVE`
 * durumdaki ürünlerinden biriyse geçerlidir. Bayat seçim (üyelik bitti,
 * pilot kapandı) yok sayılır; ikiden fazla seçenek varsa kullanıcıya sorulur.
 */
export function selectActiveWorkspace(input: {
  products: readonly { code: MobileProductCode; state: MobileProductState }[];
  sessionActiveProduct: string | null;
}): { activeProduct: MobileProductCode | null; selectionRequired: boolean } {
  const active = input.products.filter((product) => product.state === "ACTIVE").map((product) => product.code);
  const selected = active.find((code) => code === input.sessionActiveProduct) ?? null;
  return { activeProduct: selected, selectionRequired: selected === null && active.length > 1 };
}

/** Web navigasyon modelini mobil sözleşmeye çevirir; `href` yalnız `webPath` olur. */
export function toMobileNavItems(items: readonly { id: string; label: string; href: string }[]): MobileNavItem[] {
  return items.filter((item) => !/(?:^|\/)(?:checkout|paytr|odeme|odemeler|siparis|siparisler|paketler|satin-al|billing|payments?|orders?|subscriptions?)(?:\/|$)/i.test(item.href)).map((item) => ({ id: item.id, label: item.id === "account" ? "Hesap" : item.label, webPath: item.href }));
}

export function toMobileNavSections(sections: readonly { id: string; title: string; items: readonly { id: string; label: string; href: string }[] }[]): MobileNavSection[] {
  return sections.map((section) => ({ id: section.id, title: section.title, items: toMobileNavItems(section.items) }));
}

export function projectBootstrap(input: {
  identity: BootstrapIdentity;
  gates: MobileBootstrapGates;
  minSupportedVersion: string | null;
  now: Date;
  workspace: MobileWorkspace | null;
}): MobileBootstrap {
  return {
    contractVersion: MOBILE_BOOTSTRAP_CONTRACT_VERSION,
    serverTime: input.now.toISOString(),
    user: {
      id: input.identity.userId,
      fullName: input.identity.fullName,
      email: input.identity.email,
      role: input.identity.role,
    },
    gates: input.gates,
    client: { minSupportedVersion: input.minSupportedVersion },
    // Savunma: çağıran yanlışlıkla veri hazırlamış olsa bile kapılar
    // açık değilken çalışma alanı yanıta GİRMEZ.
    workspace: input.gates.status === "READY" ? input.workspace : null,
  };
}

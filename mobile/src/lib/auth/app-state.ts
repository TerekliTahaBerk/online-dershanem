import type { MobileBootstrap, MobileProductCode } from '@contracts/bootstrap';

import type { ApiError } from '@/lib/api/errors';

/**
 * Uygulama kimlik doğrulama durum makinesi — SAF (React / ağ yok).
 *
 *   BOOTING → UNAUTHENTICATED → (AUTHENTICATING) → PASSWORD_CHANGE_REQUIRED
 *     → MFA_REQUIRED → WORKSPACE_SELECTION → WORKSPACE_READY
 *
 * Yan durumlar: UPGRADE_REQUIRED, BOOTSTRAP_ERROR, SESSION_EXPIRED.
 *
 * Kapı kararlarının TEK kaynağı sunucudan gelen ve sözleşmeyle doğrulanan
 * bootstrap'tır. İstemci bir kapıyı "geçildi" diye kendisi işaretleyemez:
 * parola değişikliği veya MFA doğrulaması sonrası bootstrap yeniden çekilir
 * ve ancak sunucu `READY` derse ürün ekranları açılır.
 */
export type AppState =
  | { status: 'BOOTING' }
  | { status: 'UNAUTHENTICATED'; notice: 'SESSION_EXPIRED' | 'SIGNED_OUT' | null }
  | { status: 'AUTHENTICATING' }
  | { status: 'UPGRADE_REQUIRED'; minSupportedVersion: string | null }
  | { status: 'BOOTSTRAP_ERROR'; error: ApiError }
  | { status: 'PASSWORD_CHANGE_REQUIRED'; bootstrap: MobileBootstrap }
  | { status: 'MFA_REQUIRED'; bootstrap: MobileBootstrap }
  | { status: 'WORKSPACE_SELECTION'; bootstrap: MobileBootstrap; autoSelect: MobileProductCode | null }
  | { status: 'WORKSPACE_READY'; bootstrap: MobileBootstrap; workspace: MobileProductCode | null };

export type AppStateInput = {
  tokenLoaded: boolean;
  token: string | null;
  signingIn: boolean;
  signOutNotice: 'SESSION_EXPIRED' | 'SIGNED_OUT' | null;
  bootstrap: MobileBootstrap | undefined;
  bootstrapError: ApiError | null;
  appVersion: string | null;
};

/** `a < b` ise true; ikisi de geçerli `x.y.z` değilse false (sunucu kapısı ayrıca çalışır). */
export function isVersionBelow(a: string | null, b: string | null): boolean {
  const parse = (value: string | null) => (value && /^\d+\.\d+\.\d+/.test(value) ? value.split(/[.+-]/).slice(0, 3).map(Number) : null);
  const left = parse(a);
  const right = parse(b);
  if (!left || !right) return false;
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] < right[index];
  }
  return false;
}

/**
 * ÖĞRENCİ / VELİ çalışma alanı seçimi zorunludur (alt sekmeler ürüne göre
 * kurulur). Personel ve yönetimde M1'de native ürün ekranı yoktur; ürün
 * seçilmeden de bilgi ekranları açılabilir, seçim çalışma alanı
 * değiştiriciden yapılır.
 */
function needsWorkspace(role: MobileBootstrap['user']['role']): boolean {
  return role === 'STUDENT' || role === 'PARENT';
}

export function deriveAppState(input: AppStateInput): AppState {
  if (!input.tokenLoaded) return { status: 'BOOTING' };
  if (!input.token) return input.signingIn ? { status: 'AUTHENTICATING' } : { status: 'UNAUTHENTICATED', notice: input.signOutNotice };

  if (input.bootstrapError?.kind === 'upgrade_required') {
    const minimum = input.bootstrapError.details?.minSupportedVersion;
    return { status: 'UPGRADE_REQUIRED', minSupportedVersion: typeof minimum === 'string' ? minimum : null };
  }
  const bootstrap = input.bootstrap;
  if (!bootstrap) {
    return input.bootstrapError ? { status: 'BOOTSTRAP_ERROR', error: input.bootstrapError } : { status: 'BOOTING' };
  }
  if (isVersionBelow(input.appVersion, bootstrap.client.minSupportedVersion)) {
    return { status: 'UPGRADE_REQUIRED', minSupportedVersion: bootstrap.client.minSupportedVersion };
  }

  switch (bootstrap.gates.status) {
    case 'PASSWORD_CHANGE_REQUIRED':
      return { status: 'PASSWORD_CHANGE_REQUIRED', bootstrap };
    case 'MFA_REQUIRED':
      return { status: 'MFA_REQUIRED', bootstrap };
    case 'READY':
      break;
  }

  const workspace = bootstrap.workspace;
  // READY ama çalışma alanı verisi yok: sözleşme bunu engeller; yine de kapalı tarafta kal.
  if (!workspace) return { status: 'BOOTSTRAP_ERROR', error: input.bootstrapError ?? ({ kind: 'invalid_response', message: 'Panel bilgilerini getiremedik. Bir daha dener misin?' } as ApiError) };

  if (workspace.activeProduct) return { status: 'WORKSPACE_READY', bootstrap, workspace: workspace.activeProduct };
  if (!needsWorkspace(bootstrap.user.role)) return { status: 'WORKSPACE_READY', bootstrap, workspace: null };

  const active = workspace.products.filter((product) => product.state === 'ACTIVE');
  return { status: 'WORKSPACE_SELECTION', bootstrap, autoSelect: active.length === 1 ? active[0].code : null };
}

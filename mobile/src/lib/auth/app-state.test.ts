import { parseMobileBootstrap } from '@contracts/bootstrap';

import { ApiError } from '@/lib/api/errors';
import { makeBootstrap } from '@/test/fixtures';

import { deriveAppState, isVersionBelow, type AppStateInput } from './app-state';

const base: AppStateInput = { tokenLoaded: true, token: 'tok', signingIn: false, signOutNotice: null, bootstrap: undefined, bootstrapError: null, appVersion: '1.0.0' };

describe('kimlik doğrulama durum makinesi', () => {
  it('test fikstürleri paylaşılan sözleşmeden geçer', () => {
    for (const fixture of [makeBootstrap(), makeBootstrap({ gate: 'MFA_REQUIRED' }), makeBootstrap({ role: 'PARENT' }), makeBootstrap({ products: { OD: 'ACTIVE', OK: 'ACTIVE' }, activeProduct: null })]) {
      const parsed = parseMobileBootstrap(JSON.parse(JSON.stringify(fixture)));
      expect(parsed.ok ? null : parsed.error).toBeNull();
    }
  });

  it('token okunmadan BOOTING; token yoksa UNAUTHENTICATED; giriş sürerken AUTHENTICATING', () => {
    expect(deriveAppState({ ...base, tokenLoaded: false }).status).toBe('BOOTING');
    expect(deriveAppState({ ...base, token: null })).toEqual({ status: 'UNAUTHENTICATED', notice: null });
    expect(deriveAppState({ ...base, token: null, signOutNotice: 'SESSION_EXPIRED' })).toEqual({ status: 'UNAUTHENTICATED', notice: 'SESSION_EXPIRED' });
    expect(deriveAppState({ ...base, token: null, signingIn: true }).status).toBe('AUTHENTICATING');
  });

  it('bootstrap gelene kadar ürün ekranı açılmaz (BOOTING)', () => {
    expect(deriveAppState(base).status).toBe('BOOTING');
  });

  it('geçici parola → PASSWORD_CHANGE_REQUIRED; MFA → MFA_REQUIRED (sunucu kapısı)', () => {
    expect(deriveAppState({ ...base, bootstrap: makeBootstrap({ gate: 'PASSWORD_CHANGE_REQUIRED' }) }).status).toBe('PASSWORD_CHANGE_REQUIRED');
    expect(deriveAppState({ ...base, bootstrap: makeBootstrap({ role: 'TEACHER', gate: 'MFA_REQUIRED' }) }).status).toBe('MFA_REQUIRED');
  });

  it.each([
    ['yalnız OD', { OD: 'ACTIVE' as const }, 'OD'],
    ['yalnız Yön', { OK: 'ACTIVE' as const }, 'OK'],
    ['yalnız Deneme Ligi', { ODK: 'ACTIVE' as const }, 'ODK'],
  ])('%s öğrencisi: seçim yoksa tek ürün otomatik seçilecek; seçiliyse hazır', (_, products, code) => {
    expect(deriveAppState({ ...base, bootstrap: makeBootstrap({ products, activeProduct: null }) })).toMatchObject({ status: 'WORKSPACE_SELECTION', autoSelect: code });
    expect(deriveAppState({ ...base, bootstrap: makeBootstrap({ products }) })).toMatchObject({ status: 'WORKSPACE_READY', workspace: code });
  });

  it('üç ürünlü öğrenci seçim yapar (otomatik seçim yok); hiç ürünü olmayan seçim ekranında boş durum görür', () => {
    expect(deriveAppState({ ...base, bootstrap: makeBootstrap({ products: { OD: 'ACTIVE', OK: 'ACTIVE', ODK: 'ACTIVE' }, activeProduct: null }) })).toMatchObject({ status: 'WORKSPACE_SELECTION', autoSelect: null });
    expect(deriveAppState({ ...base, bootstrap: makeBootstrap({ products: {}, activeProduct: null }) })).toMatchObject({ status: 'WORKSPACE_SELECTION', autoSelect: null });
  });

  it('veli de çalışma alanı seçer; öğretmen ve yönetim seçim olmadan bilgi ekranına girer', () => {
    expect(deriveAppState({ ...base, bootstrap: makeBootstrap({ role: 'PARENT', products: { OD: 'ACTIVE', OK: 'ACTIVE' }, activeProduct: null }) }).status).toBe('WORKSPACE_SELECTION');
    expect(deriveAppState({ ...base, bootstrap: makeBootstrap({ role: 'TEACHER', products: { OD: 'ACTIVE', OK: 'ACTIVE' }, activeProduct: null }) })).toMatchObject({ status: 'WORKSPACE_READY', workspace: null });
    expect(deriveAppState({ ...base, bootstrap: makeBootstrap({ role: 'ADMIN', activeProduct: null }) })).toMatchObject({ status: 'WORKSPACE_READY', workspace: null });
  });

  it('sürüm: 426 hatası veya bootstrap minimumu yüklü sürümden yeni → UPGRADE_REQUIRED', () => {
    const upgrade = new ApiError({ kind: 'upgrade_required', status: 426, details: { minSupportedVersion: '2.0.0' } });
    expect(deriveAppState({ ...base, bootstrapError: upgrade })).toEqual({ status: 'UPGRADE_REQUIRED', minSupportedVersion: '2.0.0' });
    expect(deriveAppState({ ...base, bootstrap: makeBootstrap({ minSupportedVersion: '1.1.0' }) }).status).toBe('UPGRADE_REQUIRED');
    expect(deriveAppState({ ...base, bootstrap: makeBootstrap({ minSupportedVersion: '1.0.0' }) }).status).toBe('WORKSPACE_READY');
    // Sürümü okunamayan istemcide istemci tarafı karşılaştırma yapılmaz; sunucu kapısı geçerlidir.
    expect(deriveAppState({ ...base, appVersion: null, bootstrap: makeBootstrap({ minSupportedVersion: '9.0.0' }) }).status).toBe('WORKSPACE_READY');
  });

  it('bootstrap hatası (ağ, bilinmeyen sunucu hatası, geçersiz yanıt) → BOOTSTRAP_ERROR, ürün ekranı yok', () => {
    for (const kind of ['network', 'server', 'invalid_response', 'forbidden'] as const) {
      expect(deriveAppState({ ...base, bootstrapError: new ApiError({ kind }) }).status).toBe('BOOTSTRAP_ERROR');
    }
  });

  it('semver karşılaştırması', () => {
    expect(isVersionBelow('1.0.0', '1.0.1')).toBe(true);
    expect(isVersionBelow('1.10.0', '1.9.9')).toBe(false);
    expect(isVersionBelow('1.0.0', null)).toBe(false);
    expect(isVersionBelow('dev', '1.0.0')).toBe(false);
  });
});

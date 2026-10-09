import type { MobileBootstrap, MobileProductCode, MobileProductState, MobileRole } from '@contracts/bootstrap';

type ProductStates = Partial<Record<MobileProductCode, MobileProductState>>;

const LABELS: Record<MobileProductCode, string> = { OD: 'onlinedershanem.', OK: 'Yön Koçluk', ODK: 'Deneme Ligi' };

/** Sunucu navigasyonunun gerçek çıktısıyla aynı biçimde küçük menüler (lib/panel/navigation.ts). */
const STUDENT_NAV: Record<MobileProductCode, { primary: [string, string, string][]; sections: [string, string, string][] }> = {
  OD: {
    primary: [
      ['today', 'Bugün', '/panel/ogrenci'],
      ['assignments', 'Çalışmalar', '/panel/ogrenci/odevler'],
      ['lessons', 'Dersler', '/panel/ogrenci/takvim'],
      ['analiz', 'Analiz', '/panel/ogrenci/analiz'],
    ],
    sections: [['materials', 'Kaynaklar', '/panel/ogrenci/materyaller']],
  },
  OK: {
    primary: [
      ['today', 'Bugün', '/panel/ogrenci/yon'],
      ['assignments', 'Çalışmalar', '/panel/ogrenci/odevler'],
      ['coaching', 'Koçluk', '/panel/ogrenci/kocluk'],
      ['goals', 'Hedefler', '/panel/ogrenci/hedefler'],
    ],
    sections: [],
  },
  ODK: {
    primary: [
      ['today', 'Bugün', '/panel/odk/ogrenci'],
      ['assignments', 'Çalışmalar', '/panel/ogrenci/odevler'],
      ['odk-exams', 'Denemeler', '/panel/odk/ogrenci/denemeler'],
    ],
    sections: [],
  },
};

const toItems = (rows: [string, string, string][]) => rows.map(([id, label, webPath]) => ({ id, label, webPath }));

export function makeBootstrap(options: {
  role?: MobileRole;
  userId?: string;
  products?: ProductStates;
  activeProduct?: MobileProductCode | null;
  gate?: 'READY' | 'PASSWORD_CHANGE_REQUIRED' | 'MFA_REQUIRED';
  mfa?: { enrolled: boolean; totp: boolean; recoveryCodes: boolean; passkey: boolean };
  minSupportedVersion?: string | null;
  unread?: number;
  /** Sunucu `PanelFeatureFlags` (yalnız verilenler; diğerleri false). */
  flags?: Record<string, boolean>;
  /** Menüye eklenecek öğeler (sunucunun bayrakla eklediği gibi): [id, etiket, webPath]. */
  extraNav?: [string, string, string][];
} = {}): MobileBootstrap {
  const role = options.role ?? 'STUDENT';
  const gate = options.gate ?? 'READY';
  const states: ProductStates = options.products ?? { OD: 'ACTIVE' };
  const products = (['OD', 'OK', 'ODK'] as const).map((code) => ({ code, label: LABELS[code], state: states[code] ?? 'LOCKED' }));
  const activeProduct = options.activeProduct === undefined ? (products.find((product) => product.state === 'ACTIVE')?.code ?? null) : options.activeProduct;
  const nav = activeProduct && (role === 'STUDENT' || role === 'PARENT') ? STUDENT_NAV[activeProduct] : { primary: [], sections: [] };
  const primary = toItems(role === 'PARENT' && activeProduct ? [['today', 'Bugün', '/panel/veli'], ['lessons', 'Dersler', '/panel/veli/takvim']] : nav.primary);
  return {
    contractVersion: 1,
    serverTime: '2026-10-08T09:00:00.000Z',
    user: { id: options.userId ?? 'user-1', fullName: 'Ada Yılmaz', email: 'ada@example.com', role },
    gates: {
      status: gate,
      passwordChangeRequired: gate === 'PASSWORD_CHANGE_REQUIRED',
      mfaRequired: gate === 'MFA_REQUIRED',
      mfa: gate === 'MFA_REQUIRED' ? (options.mfa ?? { enrolled: true, totp: true, recoveryCodes: true, passkey: false }) : null,
      previewActive: false,
    },
    client: { minSupportedVersion: options.minSupportedVersion ?? null },
    workspace:
      gate === 'READY'
        ? {
            products,
            activeProduct,
            selectionRequired: activeProduct === null && products.filter((product) => product.state === 'ACTIVE').length > 1,
            navigation: { primary, sections: [{ id: 'more', title: 'DAHA FAZLA', items: toItems([...nav.sections, ...(options.extraNav ?? [])]) }] },
            flags: { assignmentEvidence: false, ...options.flags },
            capabilities: { staffPermissions: role === 'TEACHER' ? ['od:lesson:teach'] : [] },
            parent: role === 'PARENT' ? { children: [{ studentId: 'sp-1', name: 'Can' }] } : null,
            unreadNotifications: options.unread ?? 0,
          }
        : null,
  };
}

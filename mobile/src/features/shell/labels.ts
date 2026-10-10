import type { MobileProductState, MobileRole } from '@contracts/bootstrap';

import type { Tone } from '@/design/tokens';

/** Web `roleLabel` ile aynı (`lib/auth/roles.ts`). */
export const ROLE_LABEL: Record<MobileRole, string> = {
  ADMIN: 'Yönetim',
  TEACHER: 'Öğretmen',
  STUDENT: 'Öğrenci',
  PARENT: 'Veli',
};

/**
 * Ürün paneli durumları (`ProductPanelState`). Kilitli ürün için satın alma
 * bağlantısı GÖSTERİLMEZ (mağaza ödeme politikası, MD-09 açık karar).
 */
export const PRODUCT_STATE_PRESENTATION: Record<MobileProductState, { label: string; tone: Tone; description: string }> = {
  ACTIVE: { label: 'Aktif', tone: 'success', description: 'Hazır, hemen girebilirsin.' },
  PILOT_CLOSED: { label: 'Erişime kapalı', tone: 'warning', description: 'Bu panel şimdilik kapalı.' },
  PREPARING: { label: 'Hazırlanıyor', tone: 'info', description: 'Öğrenci hesabı açılınca bu panel de açılacak.' },
  LOCKED: { label: 'Hesabında yok', tone: 'neutral', description: 'Bu ürün hesabında açık değil.' },
};

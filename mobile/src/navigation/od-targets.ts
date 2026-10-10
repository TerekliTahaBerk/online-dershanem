import type { MobileNavItem } from '@contracts/bootstrap';
import type { MobileOdTarget } from '@contracts/student';

import { expoHrefFor, targetForNavId } from './route-map';

type Navigation = { primary: MobileNavItem[]; sections: { items: MobileNavItem[] }[] };

/**
 * OD native detay rotaları. Kimlik yalnız URL-güvenli karakterlerle
 * (sunucu cuid'leri) kabul edilir; başka her şey reddedilir.
 */
const SAFE_ID = /^[\w-]{1,64}$/;

export function hasNavItem(navigation: Navigation | null | undefined, navId: string): boolean {
  if (!navigation) return false;
  return navigation.primary.some((item) => item.id === navId) || navigation.sections.some((section) => section.items.some((item) => item.id === navId));
}

export function lessonDetailHref(lessonId: string): string | null {
  return SAFE_ID.test(lessonId) ? `/od/lesson/${lessonId}` : null;
}

export function assignmentDetailHref(assignmentId: string): string | null {
  return SAFE_ID.test(assignmentId) ? `/od/assignment/${assignmentId}` : null;
}

export function reviewRecoveryHref(tab: 'tekrar' | 'telafi', lessonId?: string | null): string {
  const query = new URLSearchParams({ tab });
  if (lessonId && SAFE_ID.test(lessonId)) query.set('lessonId', lessonId);
  return `/od/review-recovery?${query.toString()}`;
}

/**
 * Sunucunun önerdiği hedef → native rota. Hedef, kullanıcının bu çalışma
 * alanındaki YETKİLİ menüsünde karşılığı yoksa `null` döner ve bağlantı hiç
 * gösterilmez (ölü bağlantı / başka ürün ekranı yok). Web yolu native yol
 * olarak kullanılmaz.
 */
export function hrefForOdTarget(target: MobileOdTarget, navigation: Navigation | null | undefined): string | null {
  if (!navigation) return null;
  switch (target.type) {
    case 'lesson':
      return hasNavItem(navigation, 'lessons') ? lessonDetailHref(target.lessonId) : null;
    case 'lessons':
      return expoHrefFor(targetForNavId(navigation, 'lessons'));
    case 'assignment':
      return hasNavItem(navigation, 'assignments') ? assignmentDetailHref(target.assignmentId) : null;
    case 'assignments':
      return expoHrefFor(targetForNavId(navigation, 'assignments'));
    case 'review':
      return hasNavItem(navigation, 'review-recovery') ? reviewRecoveryHref('tekrar') : null;
    case 'recovery':
      return hasNavItem(navigation, 'review-recovery') ? reviewRecoveryHref('telafi', target.lessonId) : null;
    case 'none':
      return null;
  }
}
